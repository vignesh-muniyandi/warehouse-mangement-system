const jwt = require('jsonwebtoken');
const { authorize: authorizeByRoleId, requireRole } = require('./permissionMiddleware');

function normalizeUser(decoded) {
  return {
    ...decoded,
    user_id: decoded.user_id ?? decoded.userId,
    role_id: decoded.role_id ?? decoded.roleId,
    role_name: decoded.role_name ?? decoded.roleName,
    userId: decoded.userId ?? decoded.user_id,
    roleId: decoded.roleId ?? decoded.role_id,
    roleName: decoded.roleName ?? decoded.role_name,
  };
}

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = normalizeUser(decoded);
    req.tokenExpiresAt = new Date(decoded.exp * 1000);
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

// CSRF Protection: Validate origin for state-changing requests
function validateOrigin(req, res, next) {
  const defaultAllowed = ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'];
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim())
    : defaultAllowed;
  const origin = req.headers.origin || req.headers.referer?.split('/').slice(0, 3).join('/');

  if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
    if (origin && !allowedOrigins.includes(origin.trim())) {
      console.warn(`[SECURITY] Rejected request from untrusted origin: ${origin}`);
      return res.status(403).json({ success: false, message: 'Request rejected: untrusted origin' });
    }
  }
  next();
}

const verifyToken = authenticate;

module.exports = { authenticate, authorize: authorizeByRoleId, requireRole, verifyToken, validateOrigin };
