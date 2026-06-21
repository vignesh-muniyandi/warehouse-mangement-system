const adminService = require('../services/adminService');
const emailService = require('../services/emailService');
const db = require('../db');
const AppError = require('../utils/AppError');

exports.getUsers = async (req, res) => {
  try {
    const users = await adminService.getAllUsers();
    return res.json({ success: true, data: users });
  } catch (error) {
    console.error('[ADMIN CONTROLLER] getUsers error:', error);
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ success: false, message: error.message, errors: error.errors || null });
    }
    return res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
};

exports.searchUsers = async (req, res) => {
  try {
    const queryText = (req.query.q || '').trim();
    if (!queryText) {
      const users = await adminService.getAllUsers();
      return res.json({ success: true, data: users });
    }
    const users = await adminService.searchUsers(queryText);
    return res.json({ success: true, data: users });
  } catch (error) {
    console.error('[ADMIN CONTROLLER] searchUsers error:', error);
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ success: false, message: error.message, errors: error.errors || null });
    }
    return res.status(500).json({ success: false, message: 'Failed to search users' });
  }
};

exports.createUser = async (req, res) => {
  try {
    const payload = {
      role_id: Number(req.body.role_id),
      first_name: req.body.first_name?.trim(),
      last_name: req.body.last_name?.trim(),
      email: req.body.email?.trim(),
      password: req.body.password,
      phone: req.body.phone?.trim(),
      status: req.body.status?.trim(),
      warehouse_id: Number(req.body.warehouse_id),
    };
    const createdUser = await adminService.createUser(payload, req.user.user_id);

    // fetch role name for email
    try {
      const roleRes = await db.query('SELECT role_name FROM roles WHERE role_id = $1', [createdUser.role_id]);
      const roleName = roleRes.rows[0]?.role_name || '';
      // send welcome email asynchronously (do not block response)
      emailService.sendWelcomeEmail({
        first_name: createdUser.first_name,
        last_name: createdUser.last_name,
        email: createdUser.email,
        role_name: roleName,
      }).then(() => {
        // no-op
      }).catch((e) => console.error('[ADMIN CONTROLLER] email send failed', e));
    } catch (e) {
      console.error('[ADMIN CONTROLLER] failed to fetch role or send email', e);
    }

    return res.status(201).json({ success: true, message: 'User created successfully', data: createdUser });
  } catch (error) {
    console.error('[ADMIN CONTROLLER] createUser error:', error);
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ success: false, message: error.message, errors: error.errors || null });
    }
    return res.status(500).json({ success: false, message: 'Failed to create user' });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const payload = {
      role_id: Number(req.body.role_id),
      first_name: req.body.first_name?.trim(),
      last_name: req.body.last_name?.trim(),
      email: req.body.email?.trim(),
      password: req.body.password,
      phone: req.body.phone?.trim(),
      status: req.body.status?.trim(),
      warehouse_id: Number(req.body.warehouse_id),
    };
    const updatedUser = await adminService.updateUser(id, payload, req.user.user_id);
    return res.json({ success: true, message: 'User updated successfully', data: updatedUser });
  } catch (error) {
    console.error('[ADMIN CONTROLLER] updateUser error:', error);
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ success: false, message: error.message, errors: error.errors || null });
    }
    return res.status(500).json({ success: false, message: 'Failed to update user' });
  }
};
