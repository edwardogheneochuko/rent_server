// /api/admin routes. Every route here requires a signed-in admin.

const express = require('express');
const { body, param, query } = require('express-validator');

const {
  getPending,
  moderateReview,
  moderateScam,
  verifyAgent,
  verifyLandlord,
} = require('../controllers/adminController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const validate = require('../middleware/validate');
const { REVIEW_STATUSES, SCAM_STATUSES } = require('../utils/constants');

const router = express.Router();

// Applies to every route below
router.use(protect, authorize('admin'));

const idParam = param('id').isMongoId().withMessage('Invalid id');

router.get(
  '/pending',
  [
    query('type').optional().isIn(['reviews', 'scams']).withMessage('type must be reviews or scams'),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  validate,
  getPending
);

router.patch(
  '/reviews/:id',
  [idParam, body('status').isIn(REVIEW_STATUSES).withMessage(`status must be one of: ${REVIEW_STATUSES.join(', ')}`)],
  validate,
  moderateReview
);

router.patch(
  '/scams/:id',
  [idParam, body('status').isIn(SCAM_STATUSES).withMessage(`status must be one of: ${SCAM_STATUSES.join(', ')}`)],
  validate,
  moderateScam
);

const verifyRules = [idParam, body('verified').isBoolean({ strict: true }).withMessage('verified must be true or false')];
router.patch('/agents/:id', verifyRules, validate, verifyAgent);
router.patch('/landlords/:id', verifyRules, validate, verifyLandlord);

module.exports = router;
