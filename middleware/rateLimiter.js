// Limits how many requests one IP address can make, to slow down bots,
// password-guessing and spam.

const rateLimit = require('express-rate-limit');

// Respond in the same JSON shape as every other error
function handler(req, res, next, options) {
  res.status(options.statusCode).json({
    success: false,
    error: {
      message: options.message,
      statusCode: options.statusCode,
    },
  });
}

// General limit for the whole API: 300 requests per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7', // send RateLimit-* headers
  legacyHeaders: false,
  message: 'Too many requests. Please slow down and try again in a few minutes.',
  handler,
});

// Stricter limit for login/register: 10 attempts per 15 minutes per IP.
// Successful logins don't count, so real users are rarely affected.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: 'Too many sign-in attempts. Please wait 15 minutes and try again.',
  handler,
});

module.exports = { apiLimiter, authLimiter };
