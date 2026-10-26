// Handles sign up, sign in, sign out and "who am I".
//
// Express 5 automatically catches errors thrown inside async functions and
// sends them to the error handler, so we can simply `throw` here.

const { User } = require('../models');
const ApiError = require('../utils/ApiError');
const { signToken, setAuthCookie, clearAuthCookie } = require('../utils/token');
// Landlords and agents get a public profile that reviews can attach to
const { PROFILE_MODELS, findProfileForUser } = require('../utils/profiles');

// Send the user (plus their profile, if any) and set the login cookie
async function sendAuthResponse(res, statusCode, user) {
  const token = signToken(user);
  setAuthCookie(res, token);
  const profile = await findProfileForUser(user);
  res.status(statusCode).json({
    success: true,
    data: { user, profile },
  });
}

/**
 * POST /api/auth/register
 * Body: { name, email, password, role?, phone? }
 */
async function register(req, res) {
  const { name, email, password, role = 'tenant', phone } = req.body;

  // Friendly message instead of waiting for the unique-index error
  const existing = await User.findOne({ email });
  if (existing) {
    throw ApiError.conflict('An account with this email already exists');
  }

  const user = new User({ name, email, role, phone });
  await user.setPassword(password);
  await user.save();

  // Create the public Agent/Landlord profile for this account.
  // If that fails, remove the user so we don't leave a half-created account.
  const ProfileModel = PROFILE_MODELS[role];
  if (ProfileModel) {
    try {
      await ProfileModel.create({ name, phone, userId: user._id });
    } catch (err) {
      await User.deleteOne({ _id: user._id });
      throw err;
    }
  }

  await sendAuthResponse(res, 201, user);
}

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
async function login(req, res) {
  const { email, password } = req.body;

  // passwordHash is hidden by default, so ask for it explicitly
  const user = await User.findOne({ email }).select('+passwordHash');

  // Same message whether the email or the password is wrong, so attackers
  // can't use this endpoint to discover which emails are registered.
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  await sendAuthResponse(res, 200, user);
}

/**
 * POST /api/auth/logout
 * Clears the login cookie. Works even if you're already signed out.
 */
function logout(req, res) {
  clearAuthCookie(res);
  res.status(200).json({ success: true, data: { message: 'Signed out' } });
}

/**
 * GET /api/auth/me
 * Returns the signed-in user. The frontend calls this on page load to find
 * out whether someone is logged in.
 */
async function getMe(req, res) {
  const profile = await findProfileForUser(req.user);
  res.status(200).json({
    success: true,
    data: { user: req.user, profile },
  });
}

module.exports = { register, login, logout, getMe };
