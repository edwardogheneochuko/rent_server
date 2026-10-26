// A report about a suspected rental scammer.
//
// Before paying anyone, a tenant can search a phone number, name or bank
// account number. Reports start "pending" and only appear in search results
// after an admin confirms them.

const mongoose = require('mongoose');
const { SCAM_STATUSES } = require('../utils/constants');
const { normalizePhone } = require('../utils/phone');

const scamReportSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      trim: true,
      set: normalizePhone,
    },
    name: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    accountNumber: {
      // Nigerian bank account numbers (NUBAN) are exactly 10 digits
      type: String,
      trim: true,
      match: [/^\d{10}$/, 'Account number must be 10 digits'],
    },
    bankName: {
      type: String,
      trim: true,
      maxlength: 80,
    },
    description: {
      type: String,
      required: [true, 'Please describe what happened'],
      trim: true,
      minlength: [20, 'Please write at least 20 characters'],
      maxlength: [3000, 'Description can be at most 3000 characters'],
    },
    evidence: {
      type: [String], // Screenshot URLs (Cloudinary, Phase 5)
      default: [],
    },
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: SCAM_STATUSES,
      default: 'pending',
    },
  },
  { timestamps: true }
);

// A report is useless if it doesn't identify anyone, so require at least one
// of phone, name or account number.
scamReportSchema.pre('validate', function requireIdentifier() {
  if (!this.phone && !this.name && !this.accountNumber) {
    this.invalidate('phone', 'Provide at least a phone number, name or account number');
  }
});

// Indexes for the scam-check search
scamReportSchema.index({ phone: 1, status: 1 });
scamReportSchema.index({ accountNumber: 1, status: 1 });
scamReportSchema.index({ name: 1, status: 1 });
scamReportSchema.index({ status: 1, createdAt: 1 }); // admin queue

module.exports = mongoose.model('ScamReport', scamReportSchema);
