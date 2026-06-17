const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const { findUserByEmail, createUser } = require('../models/userModel');
const db = require('../config/db');

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '2h';

const signToken = (user) => jwt.sign({ id: user.id, fullname: user.fullname, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRY });

exports.register = async (req, res) => {
  try {
    const { fullname, email, password, confirmPassword } = req.body;
    if (!fullname || !email || !password || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    const existingUser = await findUserByEmail(db, email);
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Email already exists' });
    }

    const newUser = await createUser(db, { fullname, email, password });
    return res.status(201).json({ success: true, message: 'Registration successful', data: newUser });
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

    const user = await findUserByEmail(db, email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = signToken(user);
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          fullname: user.fullname,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error('[AUTH CONTROLLER] login error', error);
    return res.status(500).json({ success: false, message: 'Server error, please try again' });
  }
};

exports.profile = async (req, res) => {
  try {
    const user = req.user;
    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error('[AUTH CONTROLLER] profile error', error);
    return res.status(500).json({ success: false, message: 'Server error, please try again' });
  }
};
