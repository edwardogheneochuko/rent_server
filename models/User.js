// A person with an account: tenant, landlord, agent or admin.

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { ROLES } = require('../utils/constants');
const { normalizePhone } = require('../utils/phone');

// bcrypt "cost". 12 is a good balance of security and speed (~250ms/hash).
const SALT_ROUNDS = 12;

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: 80,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true, // creates a unique index — duplicates fail with code 11000
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // never returned by queries unless asked for with .select('+passwordHash')
    },
    role: {
      type: String,
      enum: ROLES,
      default: 'tenant',
    },
    phone: {
      type: String,
      trim: true,
      set: normalizePhone, // "0803..." is stored as "234803..."
    },
  },
  {
    // Adds createdAt and updatedAt automatically
    timestamps: true,
  }
);

// Hash a plain-text password and store the hash (never the password itself).
userSchema.methods.setPassword = async function setPassword(plainPassword) {
  this.passwordHash = await bcrypt.hash(plainPassword, SALT_ROUNDS);
};

// Check a login attempt. Requires passwordHash to have been selected.
userSchema.methods.comparePassword = function comparePassword(plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

// Remove private fields whenever a user is converted to JSON (e.g. res.json)
userSchema.set('toJSON', {
  transform(doc, ret) {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
