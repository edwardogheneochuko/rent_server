// A property that is (or was) on the market, with its full move-in cost.
//
// In Nigeria the yearly rent is only part of what you pay up front. The
// agent fee, legal/agreement fee, caution deposit and service charge are
// added on top. We total them automatically so tenants see the REAL number.

const mongoose = require('mongoose');
const { LISTING_STATUSES } = require('../utils/constants');
const { formatNaira } = require('../utils/money');

// Every fee is a whole number of naira and can't be negative.
const moneyField = (label, required = false) => ({
  type: Number,
  required: required ? [true, `${label} is required`] : false,
  min: [0, `${label} cannot be negative`],
  default: required ? undefined : 0,
});

const listingSchema = new mongoose.Schema(
  {
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: [true, 'Property is required'],
    },
    agentId: {
      // Optional — some landlords list directly without an agent
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agent',
    },
    rent: moneyField('Yearly rent', true),
    agentFee: moneyField('Agent fee'),
    legalFee: moneyField('Legal fee'),
    caution: moneyField('Caution deposit'),
    serviceCharge: moneyField('Service charge'),

    // Stored (not just a virtual) so we can sort and filter by it in queries.
    // Calculated automatically in the pre('validate') hook below.
    totalMoveInCost: {
      type: Number,
      min: 0,
    },

    status: {
      type: String,
      enum: LISTING_STATUSES,
      default: 'available',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    // Include virtuals (like costBreakdown) when sending JSON
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Recalculate the total every time a listing is created or saved.
// NOTE: this hook runs on .save() / .create(), NOT on updateOne() or
// findByIdAndUpdate(). In Phase 2 we update listings with .save() for this reason.
listingSchema.pre('validate', function computeTotal() {
  this.totalMoveInCost =
    (this.rent || 0) +
    (this.agentFee || 0) +
    (this.legalFee || 0) +
    (this.caution || 0) +
    (this.serviceCharge || 0);
});

// Ready-to-display strings, e.g. { rent: "₦1,200,000", ..., total: "₦1,740,000" }
listingSchema.virtual('costBreakdown').get(function costBreakdown() {
  return {
    rent: formatNaira(this.rent),
    agentFee: formatNaira(this.agentFee),
    legalFee: formatNaira(this.legalFee),
    caution: formatNaira(this.caution),
    serviceCharge: formatNaira(this.serviceCharge),
    total: formatNaira(this.totalMoveInCost),
  };
});

listingSchema.index({ status: 1, createdAt: -1 }); // "recent available listings"
listingSchema.index({ propertyId: 1 });
listingSchema.index({ agentId: 1 });
listingSchema.index({ createdBy: 1 }); // "my listings" on the dashboard
listingSchema.index({ rent: 1 }); // budget filters

module.exports = mongoose.model('Listing', listingSchema);
