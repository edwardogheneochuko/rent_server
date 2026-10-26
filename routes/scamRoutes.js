// /api/scams routes and their validation rules.

const express = require('express');
const { body, query } = require('express-validator');

const { checkScam, reportScam } = require('../controllers/scamController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { isValidNigerianPhone } = require('../utils/phone');

const router = express.Router();

const checkRules = [
  query('query').isString().withMessage('query is required').isLength({ max: 100 }),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
];

const reportRules = [
  body('phone')
    .optional({ values: 'falsy' })
    .custom(isValidNigerianPhone)
    .withMessage('Enter a valid Nigerian phone number, e.g. 08031234567'),
  body('name').optional({ values: 'falsy' }).trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters'),
  body('accountNumber')
    .optional({ values: 'falsy' })
    .customSanitizer((value) => String(value).replace(/\s/g, ''))
    .matches(/^\d{10}$/)
    .withMessage('Account number must be 10 digits'),
  body('bankName').optional({ values: 'falsy' }).trim().isLength({ max: 80 }),
  body('description')
    .isString().withMessage('Please describe what happened')
    .trim()
    .isLength({ min: 20, max: 3000 }).withMessage('Description must be 20–3000 characters'),
  body('evidence').optional().isArray({ max: 5 }).withMessage('At most 5 evidence links'),
  body('evidence.*').isURL({ protocols: ['https'], require_protocol: true }).withMessage('Evidence must be https links'),
  // A report must identify someone. Attached to "phone" so the form can show
  // the message under the first identifier field.
  body('phone').custom((value, { req }) => {
    const { name, accountNumber } = req.body;
    if (!value && !name && !accountNumber) {
      throw new Error('Provide at least a phone number, name or account number');
    }
    return true;
  }),
];

router.get('/check', checkRules, validate, checkScam);
router.post('/', protect, reportRules, validate, reportScam);

module.exports = router;
