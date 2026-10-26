// Shared lists of allowed values. Models, validators and (later) the seed
// script all import from here so the values never drift apart.

const ROLES = ['tenant', 'landlord', 'agent', 'admin'];

// Roles a person can pick when signing up. Admins are created with
// `npm run create-admin`, never through the public register route.
const SELF_REGISTER_ROLES = ['tenant', 'landlord', 'agent'];

const PROPERTY_TYPES = [
  'self-contain',
  'mini-flat',
  '1-bedroom',
  '2-bedroom',
  '3-bedroom',
  'duplex',
];

const LISTING_STATUSES = ['available', 'taken'];

const REVIEW_TARGET_TYPES = ['property', 'agent', 'landlord'];
const REVIEW_STATUSES = ['pending', 'approved', 'rejected'];
const CAUTION_REFUNDED = ['yes', 'no', 'not-applicable'];
const RATING_FIELDS = ['light', 'water', 'security', 'flooding', 'landlordBehaviour', 'overall'];

const SCAM_STATUSES = ['pending', 'confirmed', 'rejected'];

// 36 states + the Federal Capital Territory
const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
  'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT',
  'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi',
  'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo',
  'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
];

module.exports = {
  ROLES,
  SELF_REGISTER_ROLES,
  PROPERTY_TYPES,
  LISTING_STATUSES,
  REVIEW_TARGET_TYPES,
  REVIEW_STATUSES,
  CAUTION_REFUNDED,
  RATING_FIELDS,
  SCAM_STATUSES,
  NIGERIAN_STATES,
};
