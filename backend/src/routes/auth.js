const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const redis = require('../services/redisClient');
const { sendResetPasswordEmail } = require('../services/emailService');
const { logAudit } = require('../services/auditService');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_WINDOW_MINUTES = 10;

async function getUserByEmail(email) {
  const query = `SELECT u.*, r.role_name FROM users u JOIN roles r ON u.role_id = r.role_id WHERE LOWER(email) = LOWER($1)`;
  const { rows } = await db.query(query, [email]);
  return rows[0];
}

function generateAccessToken(user) {
  const payload = {
    user_id: user.user_id,
    role_id: user.role_id,
    role_name: user.role_name,
    first_name: user.first_name,
    last_name: user.last_name,
  };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '8h' });
}

function generateRefreshToken(user) {
  return jwt.sign({ user_id: user.user_id, token_id: uuidv4() }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '7d' });
}

function generateResetToken(user) {
  return jwt.sign({ user_id: user.user_id, email: user.email }, process.env.RESET_PASSWORD_SECRET, { expiresIn: process.env.RESET_TOKEN_EXPIRY || '15m' });
}

async function recordFailedLogin(userId, ip) {
  const key = `login_fail:${userId || ip}`;
  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, LOCK_WINDOW_MINUTES * 60);
  }
  return current;
}

async function getFailedLoginCount(userId, ip) {
  const key = `login_fail:${userId || ip}`;
  const count = await redis.get(key);
  return Number(count || 0);
}

async function clearFailedLogin(userId, ip) {
  const key = `login_fail:${userId || ip}`;
  await redis.del(key);
}

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  try {
    const user = await getUserByEmail(email);
    if (!user || user.status !== 'Active') {
      const failCount = await recordFailedLogin(user ? user.user_id : null, req.ip);
      await logAudit({ user_id: user ? user.user_id : null, action: 'failed_login', ip_address: req.ip });
      if (failCount >= MAX_FAILED_ATTEMPTS) {
        return res.status(403).json({ success: false, message: 'Account locked, contact admin' });
      }
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const locked = await getFailedLoginCount(user.user_id, req.ip);
    if (locked >= MAX_FAILED_ATTEMPTS) {
      return res.status(403).json({ success: false, message: 'Account locked, contact admin' });
    }

    const passwordOk = await bcrypt.compare(password, user.password_hash);
    if (!passwordOk) {
      const failCount = await recordFailedLogin(user.user_id, req.ip);
      await logAudit({ user_id: user.user_id, action: 'failed_login', ip_address: req.ip });
      if (failCount >= MAX_FAILED_ATTEMPTS) {
        return res.status(403).json({ success: false, message: 'Account locked, contact admin' });
      }
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    await clearFailedLogin(user.user_id, req.ip);
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    const decodedRefresh = jwt.decode(refreshToken);

    await redis.set(`refresh_token:${user.user_id}:${decodedRefresh.token_id}`, refreshToken, 'EX', 7 * 24 * 60 * 60);
    await db.query('UPDATE users SET last_login = NOW() WHERE user_id = $1', [user.user_id]);
    await logAudit({ user_id: user.user_id, action: 'login_success', ip_address: req.ip });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      success: true,
      token: accessToken,
      user: {
        user_id: user.user_id,
        role_name: user.role_name,
        first_name: user.first_name,
        last_name: user.last_name,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Login failed' });
  }
});

router.post('/logout', async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
    if (refreshToken) {
      const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
      await redis.del(`refresh_token:${decoded.user_id}:${decoded.token_id}`);
      await logAudit({ user_id: decoded.user_id, action: 'logout', ip_address: req.ip });
    }
    res.clearCookie('refreshToken');
    return res.json({ success: true, message: 'Logged out' });
  } catch (err) {
    return res.status(200).json({ success: true, message: 'Logged out' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'Refresh token required' });
    }

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const stored = await redis.get(`refresh_token:${decoded.user_id}:${decoded.token_id}`);
    if (!stored || stored !== refreshToken) {
      return res.status(401).json({ success: false, message: 'Refresh token invalid' });
    }

    const userQuery = `SELECT u.*, r.role_name FROM users u JOIN roles r ON u.role_id = r.role_id WHERE u.user_id = $1`;
    const { rows } = await db.query(userQuery, [decoded.user_id]);
    const user = rows[0];
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    const accessToken = generateAccessToken(user);
    return res.json({ success: true, token: accessToken });
  } catch (err) {
    console.error(err);
    return res.status(401).json({ success: false, message: 'Refresh failed' });
  }
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  try {
    const user = await getUserByEmail(email);
    if (!user) {
      return res.json({ success: true, message: 'If the email exists, a reset link will be sent' });
    }

    const token = generateResetToken(user);
    await sendResetPasswordEmail(user.email, token);
    await logAudit({ user_id: user.user_id, action: 'forgot_password', ip_address: req.ip });
    return res.json({ success: true, message: 'If the email exists, a reset link will be sent' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Unable to process request' });
  }
});

router.post('/reset-password', async (req, res) => {
  const { token, new_password } = req.body;
  if (!token || !new_password) {
    return res.status(400).json({ success: false, message: 'Token and new password are required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.RESET_PASSWORD_SECRET);
    const passwordHash = await bcrypt.hash(new_password, 12);
    await db.query('UPDATE users SET password_hash = $1 WHERE user_id = $2', [passwordHash, decoded.user_id]);
    await logAudit({ user_id: decoded.user_id, action: 'reset_password', ip_address: req.ip });
    return res.json({ success: true, message: 'Password reset successful' });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ success: false, message: 'Invalid or expired token' });
  }
});

router.get('/me', verifyToken, async (req, res) => {
  try {
    const userQuery = `SELECT u.user_id, u.first_name, u.last_name, u.email, u.phone, u.status, r.role_name FROM users u JOIN roles r ON u.role_id = r.role_id WHERE u.user_id = $1`;
    const { rows } = await db.query(userQuery, [req.user.user_id]);
    const user = rows[0];
    if (!user) {
      return res.status(404).json({ success: false, message: 'User profile not found' });
    }
    return res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Unable to load profile' });
  }
});

module.exports = router;
