// /api/reviews routes and their validation rules.

const express = require('express');
const { body, param, query } = require('express-validator');

const {
  getReviews,
  getMyReviews,
  createReview,
  replyToReview,
} = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { REVIEW_TARGET_TYPES, CAUTION_REFUNDED, RATING_FIELDS } = require('../utils/constants');

const router = express.Router();

// ---- Validation rules -------------------------------------------------------

const listRules = [
  query('targetType').isIn(REVIEW_TARGET_TYPES).withMessage('targetType must be property, agent or landlord'),
  query('targetId').isMongoId().withMessage('targetId must be a valid id'),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
];

// overall is required; every other rating is optional
const ratingRules = RATING_FIELDS.map((field) => {
  const chain = body(`ratings.${field}`);
  return (field === 'overall' ? chain.exists().withMessage('An overall rating is required') : chain.optional())
    .isInt({ min: 1, max: 5 })
    .withMessage(`${field} rating must be a whole number from 1 to 5`)
    .toInt();
});

const createRules = [
  body('targetType').isIn(REVIEW_TARGET_TYPES).withMessage('targetType must be property, agent or landlord'),
  body('targetId').isMongoId().withMessage('targetId must be a valid id'),
  body('ratings').isObject().withMessage('ratings must be an object, e.g. { "overall": 4 }'),
  ...ratingRules,
  body('cautionRefunded').optional().isIn(CAUTION_REFUNDED).withMessage('cautionRefunded must be yes, no or not-applicable'),
  body('text')
    .isString().withMessage('Review text is required')
    .trim()
    .isLength({ min: 20, max: 2000 }).withMessage('Reviews must be 20–2000 characters'),
];

const replyRules = [
  param('id').isMongoId().withMessage('Invalid review id'),
  body('text')
    .isString().withMessage('Reply text is required')
    .trim()
    .isLength({ min: 2, max: 1000 }).withMessage('Replies must be 2–1000 characters'),
];

// ---- Routes -----------------------------------------------------------------

router.get('/', listRules, validate, getReviews);
router.get('/mine', protect, getMyReviews);
router.post('/', protect, createRules, validate, createReview);
router.post('/:id/reply', protect, replyRules, validate, replyToReview);

module.exports = router;
