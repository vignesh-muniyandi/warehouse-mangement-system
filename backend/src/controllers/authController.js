const authService = require('../services/authService');
const AppError = require('../utils/AppError');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordStrengthRegex = /^(?=.*\d).{8,}$/;

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

exports.login = async (req, res) => {
  try {
    const email = normalizeString(req.body.email).toLowerCase();
    const password = normalizeString(req.body.password);

    if (!email || !password) {
      return res.status(422).json({
        success: false,
        message: 'Email and password are required',
        data: null,
        errors: [{ field: 'email,password', message: 'Email and password are required' }],
      });
    }

    const result = await authService.loginUser(email, password, req.ip);

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: Number(process.env.REFRESH_TOKEN_TTL_MS) || 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token: result.accessToken,
        user: result.user,
      },
      errors: null,
    });
  } catch (error) {
    console.error('[AUTH CONTROLLER] login error:', error);
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ success: false, message: error.message, data: null, errors: null });
    }
    return res.status(500).json({ success: false, message: 'Something went wrong, please try again', data: null, errors: null });
  }
};

exports.logout = async (req, res) => {
  try {
    const userId = req.user?.user_id;
    if (userId) {
      await authService.invalidateSession(userId);
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
      data: null,
      errors: null,
    });
  } catch (error) {
    console.error('[AUTH CONTROLLER] logout error:', error);
    return res.status(500).json({ success: false, message: 'Something went wrong, please try again', data: null, errors: null });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'Refresh token required', data: null, errors: null });
    }

    const result = await authService.refreshAccessToken(refreshToken);
    return res.status(200).json({ success: true, message: 'Token refreshed successfully', data: { token: result.accessToken }, errors: null });
  } catch (error) {
    console.error('[AUTH CONTROLLER] refreshToken error:', error);
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ success: false, message: error.message, data: null, errors: null });
    }
    return res.status(500).json({ success: false, message: 'Something went wrong, please try again', data: null, errors: null });
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    const userId = req.user?.user_id;
    const user = await authService.getUserProfile(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found', data: null, errors: null });
    }

    return res.status(200).json({ success: true, message: 'User profile loaded', data: { user }, errors: null });
  } catch (error) {
    console.error('[AUTH CONTROLLER] getCurrentUser error:', error);
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ success: false, message: error.message, data: null, errors: null });
    }
    return res.status(500).json({ success: false, message: 'Something went wrong, please try again', data: null, errors: null });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const email = normalizeString(req.body.email).toLowerCase();
    if (!email) {
      return res.status(422).json({
        success: false,
        message: 'Email is required',
        data: null,
        errors: [{ field: 'email', message: 'Email is required' }],
      });
    }

    await authService.generateResetToken(email);
    return res.status(200).json({
      success: true,
      message: 'If this email exists, a reset link has been sent',
      data: null,
      errors: null,
    });
  } catch (error) {
    console.error('[AUTH CONTROLLER] forgotPassword error:', error);
    return res.status(500).json({ success: false, message: 'Something went wrong, please try again', data: null, errors: null });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const token = normalizeString(req.body.token);
    const newPassword = normalizeString(req.body.newPassword);

    if (!token || !newPassword) {
      return res.status(422).json({
        success: false,
        message: 'Token and new password are required',
        data: null,
        errors: [{ field: 'token,newPassword', message: 'Token and new password are required' }],
      });
    }

    if (!passwordStrengthRegex.test(newPassword)) {
      return res.status(422).json({
        success: false,
        message: 'Password must be at least 8 characters and contain at least one number',
        data: null,
        errors: [{ field: 'newPassword', message: 'Password must be at least 8 characters and contain at least one number' }],
      });
    }

    await authService.resetPassword(token, newPassword);
    return res.status(200).json({ success: true, message: 'Password reset successful', data: null, errors: null });
  } catch (error) {
    console.error('[AUTH CONTROLLER] resetPassword error:', error);
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ success: false, message: error.message, data: null, errors: null });
    }
    return res.status(500).json({ success: false, message: 'Something went wrong, please try again', data: null, errors: null });
  }
};

exports.registerUser = async (req, res) => {
  try {
    const fullname = normalizeString(req.body.fullname || req.body.fullName || req.body.full_name);
    const first_name = normalizeString(req.body.first_name || req.body.firstName);
    const last_name = normalizeString(req.body.last_name || req.body.lastName);
    const email = normalizeString(req.body.email).toLowerCase();
    const password = normalizeString(req.body.password);
    const confirmPassword = normalizeString(req.body.confirmPassword || req.body.confirm_password || req.body.confirm);
    const phone = normalizeString(req.body.phone);
    const role_id = Number(req.body.role_id || req.body.roleId) || 3;

    const nameParts = fullname ? fullname.split(' ').filter(Boolean) : [];
    const resolvedFirstName = first_name || nameParts[0] || '';
    const resolvedLastName = last_name || nameParts.slice(1).join(' ') || resolvedFirstName;

    const missingFields = [];
    if (!resolvedFirstName) missingFields.push('first_name');
    if (!resolvedLastName) missingFields.push('last_name');
    if (!email) missingFields.push('email');
    if (!password) missingFields.push('password');

    if (missingFields.length) {
      return res.status(422).json({
        success: false,
        message: 'Required fields are missing',
        data: null,
        errors: missingFields.map((field) => ({ field, message: `${field} is required` })),
      });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(422).json({
        success: false,
        message: 'Password and confirm password do not match',
        data: null,
        errors: [{ field: 'confirmPassword', message: 'Password and confirm password do not match' }],
      });
    }

    if (!emailRegex.test(email)) {
      return res.status(422).json({
        success: false,
        message: 'Email format is invalid',
        data: null,
        errors: [{ field: 'email', message: 'Email format is invalid' }],
      });
    }

    if (!passwordStrengthRegex.test(password)) {
      return res.status(422).json({
        success: false,
        message: 'Password must be at least 8 characters and contain at least one number',
        data: null,
        errors: [{ field: 'password', message: 'Password must be at least 8 characters and contain at least one number' }],
      });
    }

    const user = await authService.createUser({
      first_name: resolvedFirstName,
      last_name: resolvedLastName,
      email,
      password,
      phone,
      role_id,
    });

    return res.status(201).json({ success: true, message: 'User registered successfully', data: { user }, errors: null });
  } catch (error) {
    console.error('[AUTH CONTROLLER] registerUser error:', error);
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ success: false, message: error.message, data: null, errors: null });
    }
    return res.status(500).json({ success: false, message: 'Something went wrong, please try again', data: null, errors: null });
  }
};
