const permissionDenied = {
  success: false,
  message: 'You do not have permission to perform this action',
  errors: null,
};

function normalizePermissions(permissions) {
  if (Array.isArray(permissions)) {
    return permissions;
  }

  if (typeof permissions === 'string') {
    try {
      const parsed = JSON.parse(permissions);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

function hasPermission(user, permissionString) {
  const permissions = normalizePermissions(user?.permissions);
  if (user?.role_name === 'Admin') {
    return true;
  }

  if (permissions.includes(permissionString) || permissions.includes('*:*')) {
    return true;
  }

  const [resource] = permissionString.split(':');
  return permissions.includes(`${resource}:*`);
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role_name)) {
      return res.status(403).json(permissionDenied);
    }
    return next();
  };
}

function authorize(...allowedRoleIds) {
  return (req, res, next) => {
    const roleId = Number(req.user?.role_id ?? req.user?.roleId);
    if (!req.user || !allowedRoleIds.map(Number).includes(roleId)) {
      return res.status(403).json(permissionDenied);
    }
    return next();
  };
}

function requirePermission(permissionString) {
  return (req, res, next) => {
    if (!hasPermission(req.user, permissionString)) {
      return res.status(403).json(permissionDenied);
    }
    return next();
  };
}

function requireAnyPermission(...permissionStrings) {
  return (req, res, next) => {
    if (!permissionStrings.some((permission) => hasPermission(req.user, permission))) {
      return res.status(403).json(permissionDenied);
    }
    return next();
  };
}

module.exports = {
  authorize,
  hasPermission,
  normalizePermissions,
  requireAnyPermission,
  requirePermission,
  requireRole,
};
