const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const redis = require('./redisClient');
const { sendResetPasswordEmail } = require('./emailService');
const { logAudit } = require('./auditService');
const { User, Role } = require('../models');
const AppError = require('../utils/AppError');
const {
  generateAccessToken,
  generateRefreshToken,
  generateResetToken,
  verifyRefreshToken,
  verifyResetToken,
} = require('../utils/generateToken');

const MAX_FAILED_ATTEMPTS = Number(process.env.MAX_FAILED_LOGIN_ATTEMPTS) || 5;
const LOCK_WINDOW_SECONDS = Number(process.env.LOCK_WINDOW_MINUTES || 10) * 60;
const REFRESH_TOKEN_TTL_SECONDS = Number(process.env.REFRESH_TOKEN_TTL_SECONDS) || 7 * 24 * 60 * 60;

const loginAliasMap = {
  admin: 'admin@wms.example.com',
  manager: 'manager@wms.example.com',
  warehousemanager: 'manager@wms.example.com',
  'warehouse-manager': 'manager@wms.example.com',
  worker: 'worker@wms.example.com',
  operator: 'worker@wms.example.com',
  delivery: 'delivery@wms.example.com',
  deliveryteam: 'delivery@wms.example.com',
  'delivery-team': 'delivery@wms.example.com',
};

function normalizeLoginIdentifier(identifier) {
  const value = typeof identifier === 'string' ? identifier.trim().toLowerCase() : '';
  const compact = value.replace(/[\s_/]+/g, '');
  return loginAliasMap[value] || loginAliasMap[compact] || value;
}

async function getFailedLoginCount(userId, ip) {
  const key = `login_fail:${userId || ip}`;
  const count = await redis.get(key);
  return Number(count || 0);
}

async function recordFailedLogin(userId, ip) {
  const key = `login_fail:${userId || ip}`;
  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, LOCK_WINDOW_SECONDS);
  }
  return current;
}

async function clearFailedLogin(userId, ip) {
  const key = `login_fail:${userId || ip}`;
  await redis.del(key);
}

function sanitizeUser(user) {
  if (!user) return null;
  const plain = user.get ? user.get({ plain: true }) : { ...user };
  const roleName = plain.role?.role_name || plain.role_name || null;
  const permissions = plain.role?.permissions || plain.permissions || [];
  return {
    user_id: plain.user_id,
    first_name: plain.first_name,
    last_name: plain.last_name,
    email: plain.email,
    phone: plain.phone,
    status: plain.status,
    role_name: roleName,
    role_id: plain.role_id,
    permissions: Array.isArray(permissions) ? permissions : [],
    warehouse_id: plain.warehouse_id || null,
    last_login: plain.last_login || null,
  };
}

async function findUserWithRole(filter) {
  return User.findOne({
    where: filter,
    include: [{ model: Role, as: 'role', attributes: ['role_name', 'permissions'] }],
  });
}

exports.loginUser = async (identifier, password, ip) => {
  const normalizedIdentifier = normalizeLoginIdentifier(identifier);
  const filter = /^\d+$/.test(normalizedIdentifier)
    ? { user_id: Number(normalizedIdentifier) }
    : { email: normalizedIdentifier };
  const user = await findUserWithRole(filter);

  if (!user) {
    await recordFailedLogin(null, ip);
    throw new AppError('Invalid email or password', 401);
  }

  if (user.status !== 'Active') {
    const message = user.status === 'Suspended' || user.status === 'Locked'
      ? 'Account suspended or locked. Contact administrator.'
      : 'Invalid email or password';
    throw new AppError(message, 403);
  }

  const failedCount = await getFailedLoginCount(user.user_id, ip);
  if (failedCount >= MAX_FAILED_ATTEMPTS) {
    throw new AppError('Account suspended or locked. Contact administrator.', 403);
  }

  const passwordOk = await bcrypt.compare(password, user.password_hash);
  if (!passwordOk) {
    const attempts = await recordFailedLogin(user.user_id, ip);
    await logAudit({ user_id: user.user_id, action: 'failed_login', ip_address: ip });
    if (attempts >= MAX_FAILED_ATTEMPTS) {
      throw new AppError('Account suspended or locked. Contact administrator.', 403);
    }
    throw new AppError('Invalid email or password', 401);
  }

  await clearFailedLogin(user.user_id, ip);
  await user.update({ last_login: new Date() });

  const payload = {
    user_id: user.user_id,
    role_id: user.role_id,
    role_name: user.role?.role_name,
    first_name: user.first_name,
    last_name: user.last_name,
    permissions: Array.isArray(user.role?.permissions) ? user.role.permissions : [],
    warehouse_id: user.warehouse_id || null,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  const decoded = verifyRefreshToken(refreshToken);

  await redis.set(`refresh_token:${user.user_id}:${decoded.token_id}`, refreshToken, 'EX', REFRESH_TOKEN_TTL_SECONDS);
  await logAudit({ user_id: user.user_id, action: 'login_success', ip_address: ip });

  return {
    accessToken,
    refreshToken,
    user: sanitizeUser(user),
  };
};

exports.invalidateSession = async (userId) => {
  const pattern = `refresh_token:${userId}:*`;
  const keys = await redis.keys(pattern);
  if (Array.isArray(keys) && keys.length) {
    await redis.del(...keys);
  }
  await logAudit({ user_id: userId, action: 'logout' });
};

exports.refreshAccessToken = async (refreshToken) => {
  const decoded = verifyRefreshToken(refreshToken);
  const storedToken = await redis.get(`refresh_token:${decoded.user_id}:${decoded.token_id}`);

  if (!storedToken || storedToken !== refreshToken) {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  const user = await findUserWithRole({ user_id: decoded.user_id });
  if (!user) {
    throw new AppError('User not found', 401);
  }

  const payload = {
    user_id: user.user_id,
    role_id: user.role_id,
    role_name: user.role?.role_name,
    first_name: user.first_name,
    last_name: user.last_name,
    permissions: Array.isArray(user.role?.permissions) ? user.role.permissions : [],
    warehouse_id: user.warehouse_id || null,
  };

  return { accessToken: generateAccessToken(payload) };
};

exports.getUserProfile = async (userId) => {
  const user = await findUserWithRole({ user_id: userId });
  return sanitizeUser(user);
};

exports.generateResetToken = async (email) => {
  const normalizedEmail = normalizeLoginIdentifier(email);
  const user = await findUserWithRole({ email: normalizedEmail });
  if (!user) {
    return;
  }

  const resetToken = generateResetToken({ user_id: user.user_id, email: user.email });
  await sendResetPasswordEmail(user.email, resetToken);
  await logAudit({ user_id: user.user_id, action: 'forgot_password' });
};

exports.resetPassword = async (token, newPassword) => {
  const payload = verifyResetToken(token);
  const user = await User.findByPk(payload.user_id);
  if (!user) {
    throw new AppError('Invalid or expired token', 400);
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await user.update({ password_hash: passwordHash });
  await logAudit({ user_id: user.user_id, action: 'reset_password' });
};

exports.createUser = async (payload) => {
  const email = normalizeLoginIdentifier(payload.email);
  const existing = await User.findOne({ where: { email } });
  if (existing) {
    throw new AppError('Email already registered', 409);
  }

  const roleId = payload.role_id || 3;
  const role = await Role.findByPk(roleId);
  if (!role) {
    throw new AppError('Invalid role selection', 400);
  }

  const passwordHash = await bcrypt.hash(payload.password, 12);
  const user = await User.create({
    first_name: payload.first_name,
    last_name: payload.last_name,
    email,
    password_hash: passwordHash,
    phone: payload.phone,
    role_id: roleId,
    status: 'Active',
  });

  const createdUser = await findUserWithRole({ user_id: user.user_id });
  return sanitizeUser(createdUser);
};
