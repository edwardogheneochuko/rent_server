// /api/listings routes and their validation rules.

const express = require('express');
const { body, param, query } = require('express-validator');

const {
  getListings,
  getMyListings,
  getListing,
  createListing,
  updateListing,
  deleteListing,
} = require('../controllers/listingController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const validate = require('../middleware/validate');
const { PROPERTY_TYPES, LISTING_STATUSES } = require('../utils/constants');
const { findState } = require('../utils/query');
const { isValidNigerianPhone } = require('../utils/phone');

const router = express.Router();

// ---- Validation rules -------------------------------------------------------

const idParam = param('id').isMongoId().withMessage('Invalid listing id');

// Rules for a money field. `required` is true only for rent on create.
const money = (field, label, { required = false } = {}) => {
  const chain = body(field);
  return (required ? chain.exists({ values: 'null' }).withMessage(`${label} is required`) : chain.optional())
    .isInt({ min: 0, max: 10_000_000_000 })
    .withMessage(`${label} must be a whole number of naira (no commas)`)
    .toInt();
};

const feeRules = (requireRent) => [
  money('rent', 'Yearly rent', { required: requireRent }),
  money('agentFee', 'Agent fee'),
  money('legalFee', 'Legal fee'),
  money('caution', 'Caution deposit'),
  money('serviceCharge', 'Service charge'),
  body('status').optional().isIn(LISTING_STATUSES).withMessage('Status must be available or taken'),
];

// Rules for the nested `property` object. `isRequired` is true on create
// (a new property needs address, area, state and type).
const propertyRules = (isRequired) => {
  // Optional on edits; on create only required when no propertyId was sent
  const field = (name) => {
    const chain = body(`property.${name}`);
    return isRequired ? chain.if(body('propertyId').not().exists()) : chain.optional();
  };
  return [
    field('address').trim().notEmpty().withMessage('Address is required').isLength({ max: 200 }),
    field('area').trim().notEmpty().withMessage('Area is required').isLength({ max: 80 }),
    field('state')
      .custom((value) => Boolean(findState(String(value))))
      .withMessage('Choose a Nigerian state')
      .customSanitizer((value) => findState(String(value))),
    field('type').isIn(PROPERTY_TYPES).withMessage(`Type must be one of: ${PROPERTY_TYPES.join(', ')}`),
    body('property.lga').optional().trim().isLength({ max: 80 }),
    body('property.amenities').optional().isArray({ max: 30 }).withMessage('Amenities must be a list'),
    body('property.amenities.*').isString().trim().isLength({ min: 1, max: 50 }),
    body('property.photos').optional().isArray({ max: 10 }).withMessage('At most 10 photos'),
    body('property.photos.*').isURL({ protocols: ['https'], require_protocol: true }).withMessage('Photos must be https URLs'),
    body('property.coordinates.lat').optional().isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude').toFloat(),
    body('property.coordinates.lng').optional().isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude').toFloat(),
  ];
};

// { name, phone } for an agent or landlord who isn't on the platform yet
const personRules = (key) => [
  body(`${key}.name`).optional().trim().isLength({ min: 2, max: 100 }).withMessage(`${key} name must be 2–100 characters`),
  body(`${key}.phone`).optional({ values: 'falsy' }).custom(isValidNigerianPhone).withMessage(`Enter a valid phone number for the ${key}`),
];

const listQueryRules = [
  query('type').optional().isIn(PROPERTY_TYPES).withMessage('Unknown property type'),
  query('minRent').optional().isInt({ min: 0 }).withMessage('minRent must be a number'),
  query('maxRent').optional().isInt({ min: 0 }).withMessage('maxRent must be a number'),
  query('status').optional().isIn([...LISTING_STATUSES, 'all']),
  query('sort').optional().isIn(['newest', 'cheapest', 'priciest']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
];

const createRules = [
  body('propertyId').optional().isMongoId().withMessage('Invalid propertyId'),
  body('property')
    .if(body('propertyId').not().exists())
    .isObject()
    .withMessage('Send either propertyId or a property object'),
  ...propertyRules(true),
  ...feeRules(true),
  body('agentId').optional().isMongoId().withMessage('Invalid agentId'),
  body('landlordId').optional().isMongoId().withMessage('Invalid landlordId'),
  ...personRules('agent'),
  ...personRules('landlord'),
];

const updateRules = [
  idParam,
  ...feeRules(false),
  body('agentId').optional({ values: 'null' }).isMongoId().withMessage('Invalid agentId'),
  body('property').optional().isObject(),
  ...propertyRules(false),
];

// ---- Routes -----------------------------------------------------------------
// NOTE: '/mine' must come before '/:id', otherwise "mine" is treated as an id.

const canList = authorize('landlord', 'agent', 'admin');

router.get('/', listQueryRules, validate, getListings);
router.get('/mine', protect, getMyListings);
router.get('/:id', idParam, validate, getListing);
router.post('/', protect, canList, createRules, validate, createListing);
router.patch('/:id', protect, canList, updateRules, validate, updateListing);
router.delete('/:id', protect, canList, idParam, validate, deleteListing);

module.exports = router;
