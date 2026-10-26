// A custom error class that carries an HTTP status code.
//
// In a controller you can write:
//     throw ApiError.notFound('Listing not found');
// and the central error handler (middleware/errorHandler.js) turns it into
//     404 { success: false, error: { message: 'Listing not found', ... } }

class ApiError extends Error {
  /**
   * @param {number} statusCode HTTP status, e.g. 400 or 404
   * @param {string} message    Human-readable message safe to show users
   * @param {Array}  [details]  Optional list of field errors
   */
  constructor(statusCode, message, details) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }

  static badRequest(message = 'Bad request', details) {
    return new ApiError(400, message, details);
  }

  static unauthorized(message = 'Please sign in to continue') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'You are not allowed to do this') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }

  static conflict(message = 'This already exists') {
    return new ApiError(409, message);
  }

  static validation(details, message = 'Some fields are invalid') {
    return new ApiError(422, message, details);
  }
}

module.exports = ApiError;
