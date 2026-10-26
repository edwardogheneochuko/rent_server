// Creates login tokens (JWT) and stores them in an httpOnly cookie.
//
// httpOnly means browser JavaScript can't read the cookie, so a malicious
// script injected into the page can't steal the login.

const jwt = require('jsonwebtoken');
const config = require('../config');

// Convert JWT_EXPIRES_IN ("7d", "12h", "30m", "45s") to milliseconds so the
// cookie expires at the same time as the token inside it.
function durationToMs(value) {
  const match = /^(\d+)([smhd])$/.exec(String(value).trim());
  if (!match) return 7 * 24 * 60 * 60 * 1000; // fall back to 7 days
  const units = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return Number(match[1]) * units[match[2]];
}

function signToken(user) {
  // Keep the payload tiny: just the user id. Role etc. is re-read from the
  // database on each request so changes take effect immediately.
  return jwt.sign({ sub: user._id.toString() }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
}

function verifyToken(token) {
  return jwt.verify(token, config.jwt.secret);
}

function cookieOptions() {
  return {
    httpOnly: true,
    // In production the frontend (Vercel) and API (Render) live on different
    // domains, which requires SameSite=None + Secure (HTTPS only).
    secure: config.isProduction,
    sameSite: config.isProduction ? 'none' : 'lax',
    maxAge: durationToMs(config.jwt.expiresIn),
    path: '/',
  };
}

function setAuthCookie(res, token) {
  res.cookie(config.cookieName, token, cookieOptions());
}

function clearAuthCookie(res) {
  // clearCookie must use the same options (minus maxAge) to match the cookie
  const { maxAge, ...options } = cookieOptions();
  res.clearCookie(config.cookieName, options);
}

module.exports = { signToken, verifyToken, setAuthCookie, clearAuthCookie };
