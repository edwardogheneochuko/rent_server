// Authentication middleware: figures out WHO is making the request.
//
//   protect      -> request must come from a signed-in user (else 401)
//   optionalAuth -> attach the user if signed in, but allow guests too
//
// After either runs, the signed-in user is available as req.user.

const config = require('../config');
const { User } = require('../models');
const ApiError = require('../utils/ApiError');
const { verifyToken } = require('../utils/token');

// Read the token from the httpOnly cookie (browsers) or from an
// "Authorization: Bearer <token>" header (handy for Postman/mobile apps).
function getTokenFromRequest(req) {
  if (req.cookies && req.cookies[config.cookieName]) {
    return req.cookies[config.cookieName];
  }
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) {
    return header.slice(7).trim();
  }
  return null;
}

// Returns the User for a valid token, or null. Throws for bad/expired tokens.
async function loadUser(token) {
  const payload = verifyToken(token); // throws JsonWebTokenError / TokenExpiredError
  return User.findById(payload.sub);
}

async function protect(req, res, next) {
  const token = getTokenFromRequest(req);
  if (!token) {
    return next(ApiError.unauthorized());
  }

  try {
    const user = await loadUser(token);
    if (!user) {
      // Token was valid but the account has since been deleted
      return next(ApiError.unauthorized('Your account no longer exists'));
    }
    req.user = user;
    return next();
  } catch (err) {
    // Hand JWT errors to the central error handler, which returns a 401
    return next(err);
  }
}

async function optionalAuth(req, res, next) {
  const token = getTokenFromRequest(req);
  if (!token) return next();

  try {
    const user = await loadUser(token);
    if (user) req.user = user;
  } catch {
    // An expired/invalid token on a public route just means "guest"
  }
  return next();
}

module.exports = { protect, optionalAuth };
