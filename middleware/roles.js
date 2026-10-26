// Authorization middleware: checks WHAT the signed-in user is allowed to do.
// Always place it AFTER `protect` so req.user exists.
//
// Example:
//   router.get('/pending', protect, authorize('admin'), getPending);
//   router.post('/', protect, authorize('landlord', 'agent', 'admin'), createListing);

const ApiError = require('../utils/ApiError');

function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden(`This action is only available to: ${allowedRoles.join(', ')}`));
    }
    return next();
  };
}

module.exports = { authorize };
