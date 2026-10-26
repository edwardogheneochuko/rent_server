// A house agent's public profile.
//
// A profile can exist before the agent ever signs up (e.g. a tenant reviews
// "Mr. Tunde, 0803..."). If the agent later creates an account and claims the
// profile, userId links it to their User account so they can reply to reviews.

const mongoose = require('mongoose');
const { normalizePhone } = require('../utils/phone');

const agentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Agent name is required'],
      trim: true,
      maxlength: 100,
    },
    phone: {
      type: String,
      trim: true,
      set: normalizePhone,
    },
    verified: {
      type: Boolean,
      default: false, // set to true by an admin after checking ID / registration
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

// Fast lookup by phone (scam checks, de-duplicating profiles)
agentSchema.index({ phone: 1 });
// One profile per user account. "partial" means profiles without a userId
// are ignored, so many unclaimed profiles can exist.
agentSchema.index(
  { userId: 1 },
  { unique: true, partialFilterExpression: { userId: { $exists: true } } }
);

module.exports = mongoose.model('Agent', agentSchema);
