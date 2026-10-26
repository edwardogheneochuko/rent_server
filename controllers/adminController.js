// Moderation tools for admins: approve/reject reviews and scam reports, and
// mark agent/landlord profiles as verified.

const { Review, ScamReport, Agent, Landlord } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, paginationMeta } = require('../utils/pagination');
const { queryString } = require('../utils/query');

/**
 * GET /api/admin/pending?type=reviews|scams&page=1
 * The moderation queue, oldest first (first in, first out).
 * Without `type`, returns one page of each.
 */
async function getPending(req, res) {
  const type = queryString(req.query.type);
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 20 });
  const filter = { status: 'pending' };
  const data = {};

  if (!type || type === 'reviews') {
    const [total, items] = await Promise.all([
      Review.countDocuments(filter),
      Review.find(filter)
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .populate('authorId', 'name email')
        .populate('targetId', 'name address area state type'),
    ]);
    data.reviews = { items, pagination: paginationMeta(total, page, limit) };
  }

  if (!type || type === 'scams') {
    const [total, items] = await Promise.all([
      ScamReport.countDocuments(filter),
      ScamReport.find(filter)
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .populate('reporterId', 'name email'),
    ]);
    data.scams = { items, pagination: paginationMeta(total, page, limit) };
  }

  res.json({ success: true, data });
}

/**
 * PATCH /api/admin/reviews/:id
 * Body: { status: "approved" | "rejected" | "pending" }
 * Afterwards, recalculate the target's averageRating and reviewCount.
 * This runs on every status change, because rejecting a review that was
 * previously approved must lower the count too.
 */
async function moderateReview(req, res) {
  const review = await Review.findById(req.params.id);
  if (!review) throw ApiError.notFound('Review not found');

  review.status = req.body.status;
  await review.save();

  const targetStats = await Review.recalculateTargetStats(review.targetType, review.targetId);

  res.json({ success: true, data: { review, targetStats } });
}

/**
 * PATCH /api/admin/scams/:id
 * Body: { status: "confirmed" | "rejected" | "pending" }
 */
async function moderateScam(req, res) {
  const report = await ScamReport.findById(req.params.id);
  if (!report) throw ApiError.notFound('Scam report not found');

  report.status = req.body.status;
  await report.save();

  res.json({ success: true, data: { report } });
}

/**
 * PATCH /api/admin/agents/:id   and   PATCH /api/admin/landlords/:id
 * Body: { verified: true | false }
 * Returns a handler for the given model, so both routes share one function.
 */
function verifyProfile(Model) {
  return async (req, res) => {
    const profile = await Model.findById(req.params.id);
    if (!profile) throw ApiError.notFound(`${Model.modelName} not found`);

    profile.verified = req.body.verified;
    await profile.save();

    res.json({ success: true, data: { profile } });
  };
}

module.exports = {
  getPending,
  moderateReview,
  moderateScam,
  verifyAgent: verifyProfile(Agent),
  verifyLandlord: verifyProfile(Landlord),
};
