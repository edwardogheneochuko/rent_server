// Public agent and landlord profile pages (reviews are fetched separately
// from /api/reviews?targetType=agent&targetId=...).

const { Agent, Landlord, Listing, Property } = require('../models');
const ApiError = require('../utils/ApiError');

// Hide the linked account id; just say whether the profile is claimed
// (only claimed profiles can reply to reviews).
function toPublicProfile(doc, hiddenFields = []) {
  const { userId, __v, ...profile } = doc.toObject();
  hiddenFields.forEach((field) => delete profile[field]);
  return { ...profile, claimed: Boolean(userId) };
}

/**
 * GET /api/agents/:id
 * The agent's profile plus their newest available listings.
 */
async function getAgent(req, res) {
  const agent = await Agent.findById(req.params.id);
  if (!agent) throw ApiError.notFound('Agent not found');

  const listings = await Listing.find({ agentId: agent._id, status: 'available' })
    .sort({ createdAt: -1 })
    .limit(12)
    .populate('propertyId', 'address area state type photos averageRating reviewCount');

  res.json({ success: true, data: { profile: toPublicProfile(agent), listings } });
}

/**
 * GET /api/landlords/:id
 * The landlord's profile (phone number kept private) plus their properties.
 */
async function getLandlord(req, res) {
  const landlord = await Landlord.findById(req.params.id);
  if (!landlord) throw ApiError.notFound('Landlord not found');

  const properties = await Property.find({ landlordId: landlord._id })
    .sort({ createdAt: -1 })
    .limit(12)
    .select('address area state type photos averageRating reviewCount');

  res.json({
    success: true,
    data: { profile: toPublicProfile(landlord, ['phone']), properties },
  });
}

module.exports = { getAgent, getLandlord };
