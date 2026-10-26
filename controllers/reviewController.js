// Reading, writing and replying to reviews.

const mongoose = require('mongoose');
const { Review, Property, Agent, Landlord } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, paginationMeta } = require('../utils/pagination');
const { RATING_FIELDS } = require('../utils/constants');
const { shortName } = require('../utils/profiles');

const TARGET_MODELS = { property: Property, agent: Agent, landlord: Landlord };

// ---- Helpers ----------------------------------------------------------------

/**
 * Shape a review for public display: the author's name is shortened
 * ("Ada O.") and their account id is removed, so landlords can't track down
 * tenants who left honest reviews.
 */
function toPublicReview(review) {
  const obj = review.toObject();
  const author = { name: shortName(obj.authorId?.name) };
  delete obj.authorId;
  delete obj.targetModel;
  delete obj.__v;
  if (obj.reply) delete obj.reply.authorId;
  return { ...obj, author };
}

/**
 * Average of each rating field plus how often caution deposits were
 * refunded, across a target's approved reviews.
 * Example: { count: 4, averages: { water: 3.5, overall: 4.2, ... },
 *            cautionRefunded: { yes: 2, no: 1 } }
 */
async function summarizeReviews(targetType, targetId) {
  const groupStage = { _id: null, count: { $sum: 1 } };
  RATING_FIELDS.forEach((field) => {
    groupStage[field] = { $avg: `$ratings.${field}` }; // $avg skips missing values
  });
  groupStage.cautionYes = { $sum: { $cond: [{ $eq: ['$cautionRefunded', 'yes'] }, 1, 0] } };
  groupStage.cautionNo = { $sum: { $cond: [{ $eq: ['$cautionRefunded', 'no'] }, 1, 0] } };

  const [stats] = await Review.aggregate([
    {
      $match: {
        targetType,
        targetId: new mongoose.Types.ObjectId(String(targetId)),
        status: 'approved',
      },
    },
    { $group: groupStage },
  ]);

  const averages = {};
  RATING_FIELDS.forEach((field) => {
    const value = stats?.[field];
    averages[field] = typeof value === 'number' ? Math.round(value * 10) / 10 : null;
  });

  return {
    count: stats?.count || 0,
    averages,
    cautionRefunded: { yes: stats?.cautionYes || 0, no: stats?.cautionNo || 0 },
  };
}

/**
 * The user account allowed to reply to a review: the claimed agent or
 * landlord being reviewed. For a property review, it's the property's landlord.
 * Returns undefined if the profile hasn't been claimed.
 */
async function getTargetOwnerUserId(targetType, targetId) {
  if (targetType === 'agent') {
    return (await Agent.findById(targetId).select('userId'))?.userId;
  }
  if (targetType === 'landlord') {
    return (await Landlord.findById(targetId).select('userId'))?.userId;
  }
  const property = await Property.findById(targetId).populate('landlordId', 'userId');
  return property?.landlordId?.userId;
}

// ---- Controllers ------------------------------------------------------------

/**
 * GET /api/reviews?targetType=agent&targetId=...&page=1
 * Approved reviews for one target, newest first, plus a rating summary.
 */
async function getReviews(req, res) {
  const { targetType, targetId } = req.query;
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 10 });
  const filter = { targetType, targetId, status: 'approved' };

  const [total, reviews, summary] = await Promise.all([
    Review.countDocuments(filter),
    Review.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .populate('authorId', 'name'),
    summarizeReviews(targetType, targetId),
  ]);

  res.json({
    success: true,
    data: {
      items: reviews.map(toPublicReview),
      summary,
      pagination: paginationMeta(total, page, limit),
    },
  });
}

/**
 * GET /api/reviews/mine
 * The signed-in user's own reviews in every status (pending, approved,
 * rejected), so they can see what's still waiting for moderation.
 */
async function getMyReviews(req, res) {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 10 });
  const filter = { authorId: req.user._id };

  const [total, reviews] = await Promise.all([
    Review.countDocuments(filter),
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      // refPath lets one populate() fetch a Property, Agent or Landlord
      .populate('targetId', 'name address area state type'),
  ]);

  res.json({
    success: true,
    data: { items: reviews, pagination: paginationMeta(total, page, limit) },
  });
}

/**
 * POST /api/reviews   (signed in)
 * Body: { targetType, targetId, ratings: { overall, light?, water?, ... },
 *         cautionRefunded?, text }
 */
async function createReview(req, res) {
  const { targetType, targetId, ratings = {}, cautionRefunded, text } = req.body;
  const { user } = req;

  // The thing being reviewed must exist
  const target = await TARGET_MODELS[targetType].findById(targetId);
  if (!target) throw ApiError.notFound(`That ${targetType} doesn't exist`);

  // No reviewing yourself or your own property
  const ownerUserId = await getTargetOwnerUserId(targetType, targetId);
  if (ownerUserId && ownerUserId.equals(user._id)) {
    throw ApiError.forbidden("You can't review yourself or your own property");
  }

  // Rule: one review per user per target. The unique index also enforces
  // this; checking first just gives a clearer message.
  const existing = await Review.exists({ targetType, targetId, authorId: user._id });
  if (existing) throw ApiError.conflict('You have already reviewed this');

  // Keep only the rating fields we know about
  const cleanRatings = {};
  RATING_FIELDS.forEach((field) => {
    if (ratings[field] !== undefined) cleanRatings[field] = ratings[field];
  });

  const review = await Review.create({
    targetType,
    targetId,
    authorId: user._id,
    ratings: cleanRatings,
    cautionRefunded,
    text,
    // status defaults to "pending" — an admin must approve it first
  });

  res.status(201).json({
    success: true,
    data: {
      review,
      message: 'Thanks! Your review will appear once a moderator approves it.',
    },
  });
}

/**
 * POST /api/reviews/:id/reply   (the reviewed agent/landlord only)
 * Body: { text }. Posting again replaces the previous reply.
 */
async function replyToReview(req, res) {
  const review = await Review.findById(req.params.id);
  if (!review) throw ApiError.notFound('Review not found');

  // Pending/rejected reviews aren't public, so there's nothing to reply to
  if (review.status !== 'approved') {
    throw ApiError.badRequest('You can only reply to approved reviews');
  }

  const ownerUserId = await getTargetOwnerUserId(review.targetType, review.targetId);
  if (!ownerUserId || !ownerUserId.equals(req.user._id)) {
    throw ApiError.forbidden('Only the agent or landlord being reviewed can reply');
  }

  review.reply = { text: req.body.text, date: new Date(), authorId: req.user._id };
  await review.save();
  await review.populate('authorId', 'name');

  res.json({ success: true, data: { review: toPublicReview(review) } });
}

module.exports = { getReviews, getMyReviews, createReview, replyToReview };
