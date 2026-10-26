// URL -> controller mapping for /api/auth, plus input validation rules.

const express = require('express');
const { body } = require('express-validator');

const { register, login, logout, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');
const { SELF_REGISTER_ROLES } = require('../utils/constants');
const { isValidNigerianPhone } = require('../utils/phone');

const router = express.Router();

// ---- Validation rules -------------------------------------------------------

const emailRule = body('email')
  .trim()
  .notEmpty().withMessage('Email is required')
  .isEmail().withMessage('Enter a valid email address')
  .toLowerCase();

const registerRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 80 }).withMessage('Name must be 2–80 characters'),
  emailRule,
  body('password')
    .isString().withMessage('Password is required')
    .isLength({ min: 8, max: 128 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Za-z]/).withMessage('Password must contain a letter')
    .matches(/\d/).withMessage('Password must contain a number'),
  body('role')
    .optional()
    .isIn(SELF_REGISTER_ROLES)
    .withMessage(`Role must be one of: ${SELF_REGISTER_ROLES.join(', ')}`),
  body('phone')
    .optional({ values: 'falsy' }) // allow "" or missing
    .custom(isValidNigerianPhone)
    .withMessage('Enter a valid Nigerian phone number, e.g. 08031234567'),
];

const loginRules = [
  emailRule,
  body('password').isString().notEmpty().withMessage('Password is required'),
];

// ---- Routes -----------------------------------------------------------------

router.post('/register', authLimiter, registerRules, validate, register);
router.post('/login', authLimiter, loginRules, validate, login);
router.post('/logout', logout);
router.get('/me', protect, getMe);

module.exports = router;
