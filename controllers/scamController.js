// Scam checks ("is it safe to pay this person?") and scam reports.

const { ScamReport } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, paginationMeta } = require('../utils/pagination');
const { queryString, containsRegex } = require('../utils/query');
const { normalizePhone, isValidNigerianPhone, toLocalFormat } = require('../utils/phone');

// Only these fields are shown publicly. The reporter's identity is never
// revealed, so scammers can't retaliate against the people who reported them.
function toPublicReport(report) {
  return {
    _id: report._id,
    name: report.name,
    phone: toLocalFormat(report.phone),
    accountNumber: report.accountNumber,
    bankName: report.bankName,
    description: report.description,
    evidence: report.evidence,
    reportedAt: report.createdAt,
  };
}

/**
 * Work out what the search text could be: a phone number, a bank account
 * number, a name, or several at once. "8031234567" is 10 digits, so it could
 * be a phone number without the leading 0 OR an account number, and we check both.
 */
function buildSearchConditions(text) {
  const conditions = [];
  const digits = text.replace(/\D/g, '');

  if (isValidNigerianPhone(text)) {
    conditions.push({ phone: normalizePhone(text) });
  }
  if (/^\d{10}$/.test(digits) && digits.length === text.replace(/[\s-]/g, '').length) {
    conditions.push({ accountNumber: digits });
  }
  // Names must contain letters and be at least 3 characters long
  if (/[a-z]/i.test(text) && text.length >= 3) {
    conditions.push({ name: containsRegex(text) });
  }
  return conditions;
}

/**
 * GET /api/scams/check?query=08031234567
 * Searches CONFIRMED reports only. Pending reports could be false or
 * malicious, so they stay hidden until an admin checks them.
 */
async function checkScam(req, res) {
  const text = queryString(req.query.query);
  if (!text) throw ApiError.badRequest('Enter a phone number, account number or name to check');

  const conditions = buildSearchConditions(text);
  if (conditions.length === 0) {
    throw ApiError.badRequest(
      'Enter a full phone number (e.g. 08031234567), a 10-digit account number, or a name of at least 3 letters'
    );
  }

  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 10 });
  const filter = { status: 'confirmed', $or: conditions };

  const [total, reports] = await Promise.all([
    ScamReport.countDocuments(filter),
    ScamReport.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
  ]);

  res.json({
    success: true,
    data: {
      query: text,
      flagged: total > 0,
      message:
        total > 0
          ? `⚠️ ${total} confirmed scam report${total === 1 ? '' : 's'} found. Do not pay.`
          : 'No confirmed reports found. That is not a guarantee: always inspect the property and verify ownership before paying.',
      items: reports.map(toPublicReport),
      pagination: paginationMeta(total, page, limit),
    },
  });
}

/**
 * POST /api/scams   (signed in)
 * Body: { phone?, name?, accountNumber?, bankName?, description, evidence?: [url] }
 * At least one of phone, name or accountNumber is required.
 */
async function reportScam(req, res) {
  const { phone, name, accountNumber, bankName, description, evidence } = req.body;

  const report = await ScamReport.create({
    phone,
    name,
    accountNumber,
    bankName,
    description,
    evidence,
    reporterId: req.user._id,
    // status defaults to "pending" until an admin confirms it
  });

  res.status(201).json({
    success: true,
    data: {
      report,
      message: 'Thank you. A moderator will review your report before it appears in scam checks.',
    },
  });
}

module.exports = { checkScam, reportScam };
