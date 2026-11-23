/**
 * Role-based authorization middleware
 * @param {string[]|string} roles - Permitted role names (e.g. ['Admin', 'Support Staff'])
 */
function authorize(roles = []) {
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthenticated request.',
        errors: ['Authentication required before authorization check'],
      });
    }

    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to perform this action.',
        errors: [`Role '${req.user.role}' is not authorized for this resource`],
      });
    }

    next();
  };
}

module.exports = { authorize };
