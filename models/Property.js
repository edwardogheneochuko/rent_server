// A physical building / apartment. One property can have many listings over
// time (e.g. listed in 2025, taken, listed again in 2026), and reviews about
// the property itself (light, water, flooding...) attach here.

const mongoose = require('mongoose');
const { PROPERTY_TYPES, NIGERIAN_STATES } = require('../utils/constants');

// GeoJSON Point. IMPORTANT: MongoDB expects [longitude, latitude] — in that
// order — which is the reverse of how Google Maps shows coordinates.
const pointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      validate: {
        validator: (value) =>
          Array.isArray(value) &&
          value.length === 2 &&
          value[0] >= -180 && value[0] <= 180 && // longitude
          value[1] >= -90 && value[1] <= 90, // latitude
        message: 'Coordinates must be [longitude, latitude]',
      },
    },
  },
  { _id: false }
);

const propertySchema = new mongoose.Schema(
  {
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
      maxlength: 200,
    },
    area: {
      // Neighbourhood, e.g. "Yaba", "Lekki Phase 1", "Gwarinpa"
      type: String,
      required: [true, 'Area is required'],
      trim: true,
      maxlength: 80,
    },
    lga: {
      // Local Government Area, e.g. "Lagos Mainland"
      type: String,
      trim: true,
      maxlength: 80,
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      enum: { values: NIGERIAN_STATES, message: '{VALUE} is not a Nigerian state' },
    },
    type: {
      type: String,
      required: [true, 'Property type is required'],
      enum: { values: PROPERTY_TYPES, message: '{VALUE} is not a valid property type' },
    },
    coordinates: {
      // Optional — properties without a location just won't show on the map
      type: pointSchema,
      default: undefined,
    },
    photos: {
      type: [String], // Cloudinary URLs (Phase 5)
      default: [],
    },
    landlordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Landlord',
    },
    amenities: {
      type: [String], // e.g. ["prepaid meter", "borehole", "parking"]
      default: [],
    },

    // Rating summary for reviews with targetType "property".
    // Kept up to date by Review.recalculateTargetStats().
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

// Enables "find properties near me" queries for the map
propertySchema.index({ coordinates: '2dsphere' });
// Speeds up the most common search: state + area + type
propertySchema.index({ state: 1, area: 1, type: 1 });

module.exports = mongoose.model('Property', propertySchema);
