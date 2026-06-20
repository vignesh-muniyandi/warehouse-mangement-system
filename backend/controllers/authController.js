const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const db = require('../config/db');

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '8h';

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

exports.register = async (req, res) => {
  try {
    const { first_name, last_name, email, password, role_id = 3 } = req.body;
    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    const { rows: existing } = await db.query('SELECT user_id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [email]);
    if (existing.length) {
      return res.status(409).json({ success: false, message: 'Email already exists' });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const insertQuery = `INSERT INTO users (role_id, first_name, last_name, email, password_hash, status, created_at)
      VALUES ($1,$2,$3,$4,$5,'Active',now()) RETURNING user_id, first_name, last_name, email, role_id, status, created_at`;
    const { rows } = await db.query(insertQuery, [role_id, first_name, last_name, email, password_hash]);
    return res.status(201).json({ success: true, message: 'Registration successful', data: rows[0] });
  } catch (error) {
    console.error('[AUTH CONTROLLER] register error', error);
    return res.status(500).json({ success: false, message: 'Server error, please try again' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const { rows } = await db.query(`
      SELECT u.user_id, u.first_name, u.last_name, u.email, u.password_hash, u.role_id, r.role_name
      FROM users u
      JOIN roles r ON u.role_id = r.role_id
      WHERE LOWER(u.email) = LOWER($1) LIMIT 1
    `, [email]);
    const user = rows[0];
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const tokenPayload = { user_id: user.user_id, email: user.email, role_id: user.role_id, role_name: user.role_name, first_name: user.first_name, last_name: user.last_name };
    const token = signToken(tokenPayload);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: { user_id: user.user_id, first_name: user.first_name, last_name: user.last_name, email: user.email, role_id: user.role_id, role_name: user.role_name },
      },
    });
  } catch (error) {
    console.error('[AUTH CONTROLLER] login error', error);
    return res.status(500).json({ success: false, message: 'Server error, please try again' });
  }
};

exports.profile = async (req, res) => {
  try {
    return res.status(200).json({ success: true, data: req.user || null });
  } catch (error) {
    console.error('[AUTH CONTROLLER] profile error', error);
    return res.status(500).json({ success: false, message: 'Server error, please try again' });
  }
};
