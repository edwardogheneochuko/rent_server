// /api/insights routes. Public: no sign-in needed.

const express = require('express');
const { query } = require('express-validator');

const { getRentInsights, getAreas } = require('../controllers/insightController');
const validate = require('../middleware/validate');
const { findState } = require('../utils/query');

const router = express.Router();

const stateRule = query('state')
  .optional()
  .custom((value) => Boolean(findState(String(value))))
  .withMessage('Unknown state. Try Lagos or FCT (Abuja)');

router.get(
  '/rent',
  [
    stateRule,
    query('area').optional().isLength({ max: 80 }),
    query('months').optional().isInt({ min: 1, max: 120 }).withMessage('months must be 1–120'),
  ],
  validate,
  getRentInsights
);
router.get('/areas', [stateRule], validate, getAreas);

module.exports = router;
