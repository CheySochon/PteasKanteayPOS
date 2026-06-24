function roleMiddleware(allowedRoles) {
  return function checkRole(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const userRole = normalizeRole(req.user.role);
    const allowed = allowedRoles.map(normalizeRole);

    if (userRole !== 'superadmin' && !allowed.includes(userRole)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }

    next();
  };
}

function normalizeRole(role) {
  return String(role || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

module.exports = roleMiddleware;
