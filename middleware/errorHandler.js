// Central error handling. Every error in the app ends up here, so all error
// responses share ONE shape:
//
//   {
//     "success": false,
//     "error": {
//       "message": "Human-readable message",
//       "statusCode": 404,
//       "details": [ { "field": "email", "message": "..." } ]   // only for field errors
//     }
//   }

const config = require('../config');

// Runs when no route matched the URL
function notFound(req, res, next) {
  res.status(404).json({
    success: false,
    error: {
      message: `Route not found: ${req.method} ${req.originalUrl}`,
      statusCode: 404,
    },
  });
}

// Translate known library errors (Mongoose, JWT, JSON parsing) into
// friendly status codes and messages.
function normalizeError(err) {
  // Our own ApiError — already has everything we need
  if (err.name === 'ApiError') {
    return { statusCode: err.statusCode, message: err.message, details: err.details };
  }

  // Mongoose schema validation failed (e.g. required field missing)
  if (err.name === 'ValidationError' && err.errors) {
    const details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return { statusCode: 422, message: 'Some fields are invalid', details };
  }

  // A malformed id like /api/listings/not-an-id
  if (err.name === 'CastError') {
    return { statusCode: 400, message: `Invalid ${err.path}: ${err.value}` };
  }

  // Unique index violated (e.g. email already registered, duplicate review)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || err.keyPattern || {})[0] || 'field';
    const message =
      field === 'email'
        ? 'An account with this email already exists'
        : field === 'targetType'
          ? 'You have already reviewed this'
          : `Duplicate value for ${field}`;
    return { statusCode: 409, message };
  }

  // Login token problems
  if (err.name === 'TokenExpiredError') {
    return { statusCode: 401, message: 'Your session has expired. Please sign in again.' };
  }
  if (err.name === 'JsonWebTokenError' || err.name === 'NotBeforeError') {
    return { statusCode: 401, message: 'Invalid session. Please sign in again.' };
  }

  // Request body wasn't valid JSON, or was too large
  if (err.type === 'entity.parse.failed') {
    return { statusCode: 400, message: 'Request body is not valid JSON' };
  }
  if (err.type === 'entity.too.large') {
    return { statusCode: 413, message: 'Request body is too large' };
  }

  // CORS rejection from app.js
  if (err.name === 'CorsError') {
    return { statusCode: 403, message: err.message };
  }

  // Anything else is a bug or an outage — don't leak internals to users
  return {
    statusCode: err.statusCode || err.status || 500,
    message: err.expose ? err.message : 'Something went wrong on our side. Please try again.',
  };
}

// Express recognises error handlers by their FOUR arguments — keep `next`
// even though we don't call it.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const { statusCode, message, details } = normalizeError(err);

  // Log full details of real server errors so we can fix them
  if (statusCode >= 500) {
    console.error(`💥 ${req.method} ${req.originalUrl}\n`, err);
  }

  const body = {
    success: false,
    error: { message, statusCode },
  };
  if (details) body.error.details = details;
  // In development, include the stack trace to help debugging
  if (!config.isProduction && statusCode >= 500) body.error.stack = err.stack;

  res.status(statusCode).json(body);
}

module.exports = { notFound, errorHandler };
