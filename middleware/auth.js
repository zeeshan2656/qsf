function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  return res.status(401).json({
    success: false,
    message: 'Unauthorized. Please login to continue.'
  });
}

function requireRole(roles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Please login to continue.'
      });
    }

    const userRole = req.session.user.role;
    if (userRole === 'superadmin') return next();

    if (Array.isArray(roles)) {
      if (roles.includes(userRole)) {
        return next();
      }
    } else if (userRole === roles) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Access forbidden: Insufficient permissions.'
    });
  };
}

function requirePermission(moduleName) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Please login to continue.'
      });
    }

    const user = req.session.user;

    // Full system administrators have full access
    if (user.role === 'superadmin' || user.role === 'admin') {
      return next();
    }

    let perms = [];
    if (Array.isArray(user.permissions)) {
      perms = user.permissions;
    } else if (typeof user.permissions === 'string') {
      try {
        perms = JSON.parse(user.permissions);
      } catch (e) {
        perms = user.permissions.split(',').map(s => s.trim());
      }
    }

    if (perms.includes(moduleName)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Access denied. Your account does not have permission for the '${moduleName}' module.`
    });
  };
}

module.exports = {
  requireAuth,
  requireRole,
  requirePermission
};

