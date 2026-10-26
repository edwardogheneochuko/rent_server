// A structured review of a property, an agent or a landlord.
//
// Reviews start as "pending" and only show publicly after an admin approves
// them. Each user can review a given target only once.

const mongoose = require('mongoose');
const {
  REVIEW_TARGET_TYPES,
  REVIEW_STATUSES,
  CAUTION_REFUNDED,
} = require('../utils/constants');

// Maps targetType values to Mongoose model names (used for .populate())
const TARGET_MODELS = {
  property: 'Property',
  agent: 'Agent',
  landlord: 'Landlord',
};

// A single 1–5 star rating. Optional, because not every question applies to
// every target (an agent doesn't have "water" or "flooding").
const star = {
  type: Number,
  min: [1, 'Ratings must be between 1 and 5'],
  max: [5, 'Ratings must be between 1 and 5'],
  validate: {
    validator: Number.isInteger,
    message: 'Ratings must be whole numbers',
  },
};

const reviewSchema = new mongoose.Schema(
  {
    targetType: {
      type: String,
      enum: REVIEW_TARGET_TYPES,
      required: [true, 'targetType is required'],
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'targetId is required'],
      // refPath tells populate() which collection to look in, based on the
      // value of the targetModel field below.
      refPath: 'targetModel',
    },
    // Filled in automatically from targetType — you never set it yourself
    targetModel: {
      type: String,
      enum: Object.values(TARGET_MODELS),
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    ratings: {
      light: star,
      water: star,
      security: star,
      flooding: star, // 5 = never floods, 1 = floods badly
      landlordBehaviour: star,
      overall: { ...star, required: [true, 'An overall rating is required'] },
    },
    cautionRefunded: {
      type: String,
      enum: CAUTION_REFUNDED,
      default: 'not-applicable',
    },
    text: {
      type: String,
      required: [true, 'Review text is required'],
      trim: true,
      minlength: [20, 'Please write at least 20 characters'],
      maxlength: [2000, 'Reviews can be at most 2000 characters'],
    },
    status: {
      type: String,
      enum: REVIEW_STATUSES,
      default: 'pending',
    },
    // The reviewed agent/landlord can post one public reply
    reply: {
      text: { type: String, trim: true, maxlength: 1000 },
      date: Date,
      authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
  },
  { timestamps: true }
);

// Rule: one review per user per target. The database enforces this, so even
// two requests sent at the same moment can't create duplicates.
reviewSchema.index({ targetType: 1, targetId: 1, authorId: 1 }, { unique: true });
// Public listing of a target's approved reviews, newest first
reviewSchema.index({ targetType: 1, targetId: 1, status: 1, createdAt: -1 });
// Admin moderation queue
reviewSchema.index({ status: 1, createdAt: 1 });

// Keep targetModel in sync with targetType
reviewSchema.pre('validate', function setTargetModel() {
  if (this.targetType) this.targetModel = TARGET_MODELS[this.targetType];
});

/**
 * Recompute averageRating and reviewCount on the reviewed Property, Agent or
 * Landlord from its APPROVED reviews. Call this whenever a review is
 * approved, rejected or deleted (Phase 2 admin routes).
 */
reviewSchema.statics.recalculateTargetStats = async function recalculateTargetStats(
  targetType,
  targetId
) {
  const [stats] = await this.aggregate([
    {
      $match: {
        targetType,
        targetId: new mongoose.Types.ObjectId(String(targetId)),
        status: 'approved',
      },
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$ratings.overall' },
        reviewCount: { $sum: 1 },
      },
    },
  ]);

  const update = {
    // Round to 1 decimal place, e.g. 4.333 -> 4.3
    averageRating: stats ? Math.round(stats.averageRating * 10) / 10 : 0,
    reviewCount: stats ? stats.reviewCount : 0,
  };

  const TargetModel = mongoose.model(TARGET_MODELS[targetType]);
  await TargetModel.findByIdAndUpdate(targetId, update);
  return update;
};

reviewSchema.statics.TARGET_MODELS = TARGET_MODELS;

module.exports = mongoose.model('Review', reviewSchema);
