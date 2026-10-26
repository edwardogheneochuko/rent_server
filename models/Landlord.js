// A landlord's public profile.
//
// Works exactly like Agent: the profile can exist before the landlord signs
// up, and userId is set once they claim it.

const mongoose = require('mongoose');
const { normalizePhone } = require('../utils/phone');

const landlordSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Landlord name is required'],
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
      default: false,
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

landlordSchema.index({ phone: 1 });
landlordSchema.index(
  { userId: 1 },
  { unique: true, partialFilterExpression: { userId: { $exists: true } } }
);

module.exports = mongoose.model('Landlord', landlordSchema);
