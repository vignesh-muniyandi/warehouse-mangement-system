const jwt = require('jsonwebtoken');

const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '8h';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';
const RESET_TOKEN_EXPIRY = process.env.RESET_TOKEN_EXPIRY || '15m';

function generateAccessToken(user) {
  return jwt.sign(
    {
      userId: user.user_id,
      roleId: user.role_id,
      roleName: user.role_name,
      user_id: user.user_id,
      role_id: user.role_id,
      role_name: user.role_name,
      first_name: user.first_name,
      last_name: user.last_name,
      permissions: Array.isArray(user.permissions) ? user.permissions : [],
      warehouse_id: user.warehouse_id || null,
    },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    {
      user_id: user.user_id,
      token_id: require('uuid').v4(),
    },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
}

function generateResetToken(user) {
  return jwt.sign(
    {
      user_id: user.user_id,
      email: user.email,
    },
    process.env.RESET_PASSWORD_SECRET,
    { expiresIn: RESET_TOKEN_EXPIRY }
  );
}

function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
}

function verifyResetToken(token) {
  return jwt.verify(token, process.env.RESET_PASSWORD_SECRET);
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateResetToken,
  verifyRefreshToken,
  verifyResetToken,
};
