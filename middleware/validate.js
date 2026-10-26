// Runs after a list of express-validator rules and stops the request with a
// 422 error if any rule failed.
//
// Example:
//   router.post('/register', [body('email').isEmail(), ...], validate, register);
//
// Error response:
//   { success: false, error: { message: 'Some fields are invalid',
//     details: [{ field: 'email', message: 'Enter a valid email address' }] } }

const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  // Only report the first error per field to keep messages short
  const details = result.array({ onlyFirstError: true }).map((err) => ({
    field: err.path,
    message: err.msg,
  }));

  return next(ApiError.validation(details));
}

module.exports = validate;
