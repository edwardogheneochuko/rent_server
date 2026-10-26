// Helpers for Agent and Landlord profiles, shared by several controllers.

const { Agent, Landlord } = require('../models');
const { normalizePhone } = require('./phone');

const PROFILE_MODELS = { agent: Agent, landlord: Landlord };

/** The Agent/Landlord profile linked to a user account (null for tenants/admins). */
async function findProfileForUser(user) {
  const Model = PROFILE_MODELS[user.role];
  return Model ? Model.findOne({ userId: user._id }) : null;
}

/**
 * Find a profile by phone number, or create an unclaimed one.
 * Used when an agent lists a property for a landlord who isn't on the
 * platform yet (or vice versa). Matching on phone avoids creating
 * "Mr Tunde" twice.
 */
async function findOrCreateProfile(Model, { name, phone }) {
  const normalized = normalizePhone(phone);
  if (normalized) {
    const existing = await Model.findOne({ phone: normalized });
    if (existing) return existing;
  }
  return Model.create({ name, phone: normalized || undefined });
}

/**
 * Short public name for reviewers: "Ada Obi" -> "Ada O.".
 * Tenants often fear retaliation from landlords, so we never show full names.
 */
function shortName(fullName) {
  if (!fullName) return 'Anonymous';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

module.exports = { PROFILE_MODELS, findProfileForUser, findOrCreateProfile, shortName };
