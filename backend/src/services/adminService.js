const bcrypt = require('bcrypt');
const db = require('../db');
const AppError = require('../utils/AppError');

const VALID_STATUS = ['Active', 'Locked', 'Suspended'];

async function getAllUsers() {
  const query = `
    SELECT
      u.user_id,
      u.first_name,
      u.last_name,
      u.email,
      u.phone,
      u.status,
      u.warehouse_id,
      COALESCE(w.name, '') AS warehouse_name,
      r.role_id,
      r.role_name,
      u.last_login,
      u.created_at
    FROM users u
    JOIN roles r ON u.role_id = r.role_id
    LEFT JOIN warehouses w ON u.warehouse_id = w.warehouse_id
    ORDER BY u.user_id DESC
  `;
  const { rows } = await db.query(query, []);
  return rows;
}

async function searchUsers(queryText) {
  const query = `
    SELECT
      u.user_id,
      u.first_name,
      u.last_name,
      u.email,
      u.phone,
      u.status,
      u.warehouse_id,
      COALESCE(w.name, '') AS warehouse_name,
      r.role_id,
      r.role_name,
      u.last_login,
      u.created_at
    FROM users u
    JOIN roles r ON u.role_id = r.role_id
    LEFT JOIN warehouses w ON u.warehouse_id = w.warehouse_id
    WHERE u.first_name ILIKE $1
       OR u.last_name ILIKE $1
       OR u.email ILIKE $1
    ORDER BY u.user_id DESC
  `;
  const { rows } = await db.query(query, [`%${queryText}%`]);
  return rows;
}

async function createUser(userPayload, createdByUserId) {
  const {
    role_id,
    first_name,
    last_name,
    email,
    password,
    phone,
    status,
    warehouse_id,
  } = userPayload;

  if (!role_id || !first_name || !last_name || !email || !password || !warehouse_id || !status) {
    throw new AppError('Missing required fields for new user', 400, [
      { field: 'role_id', message: 'Role is required' },
      { field: 'first_name', message: 'First name is required' },
      { field: 'last_name', message: 'Last name is required' },
      { field: 'email', message: 'Email is required' },
      { field: 'password', message: 'Password is required' },
      { field: 'warehouse_id', message: 'Warehouse is required' },
      { field: 'status', message: 'Status is required' },
    ]);
  }

  if (!VALID_STATUS.includes(status)) {
    throw new AppError('Invalid status value', 400, [{ field: 'status', message: 'Status must be Active, Locked, or Suspended' }]);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existingEmail = await db.query('SELECT user_id FROM users WHERE LOWER(email) = LOWER($1)', [normalizedEmail]);
  if (existingEmail.rows.length > 0) {
    throw new AppError('Email address is already registered', 409, [{ field: 'email', message: 'Email already exists' }]);
  }

  const roleCheck = await db.query('SELECT role_id FROM roles WHERE role_id = $1', [role_id]);
  if (roleCheck.rows.length === 0) {
    throw new AppError('Invalid role selected', 400, [{ field: 'role_id', message: 'Role not found' }]);
  }

  const warehouseCheck = await db.query('SELECT warehouse_id FROM warehouses WHERE warehouse_id = $1', [warehouse_id]);
  if (warehouseCheck.rows.length === 0) {
    throw new AppError('Invalid warehouse selected', 400, [{ field: 'warehouse_id', message: 'Warehouse not found' }]);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const insertQuery = `
    INSERT INTO users (role_id, first_name, last_name, email, password_hash, phone, status, warehouse_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING user_id, role_id, first_name, last_name, email, phone, status, warehouse_id
  `;
  const values = [role_id, first_name.trim(), last_name.trim(), normalizedEmail, passwordHash, phone?.trim() || null, status, warehouse_id];

  const { rows } = await db.query(insertQuery, values);
  const [createdUser] = rows;

  await db.query(
    'INSERT INTO audit_logs (user_id, action, meta) VALUES ($1, $2, $3)',
    [createdByUserId, 'create_user', JSON.stringify({ created_user_id: createdUser.user_id, email: normalizedEmail })]
  );

  return createdUser;
}

async function updateUser(id, userPayload, updatedByUserId) {
  const {
    role_id,
    first_name,
    last_name,
    email,
    password,
    phone,
    status,
    warehouse_id,
  } = userPayload;

  if (!id || !role_id || !first_name || !last_name || !email || !status || !warehouse_id) {
    throw new AppError('Missing required fields for updating user', 400, [
      { field: 'role_id', message: 'Role is required' },
      { field: 'first_name', message: 'First name is required' },
      { field: 'last_name', message: 'Last name is required' },
      { field: 'email', message: 'Email is required' },
      { field: 'warehouse_id', message: 'Warehouse is required' },
      { field: 'status', message: 'Status is required' },
    ]);
  }

  if (!VALID_STATUS.includes(status)) {
    throw new AppError('Invalid status value', 400, [{ field: 'status', message: 'Status must be Active, Locked, or Suspended' }]);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const checkEmail = await db.query('SELECT user_id FROM users WHERE LOWER(email) = LOWER($1) AND user_id <> $2', [normalizedEmail, id]);
  if (checkEmail.rows.length > 0) {
    throw new AppError('Email address is already registered', 409, [{ field: 'email', message: 'Email already exists' }]);
  }

  const roleCheck = await db.query('SELECT role_id FROM roles WHERE role_id = $1', [role_id]);
  if (roleCheck.rows.length === 0) {
    throw new AppError('Invalid role selected', 400, [{ field: 'role_id', message: 'Role not found' }]);
  }

  const warehouseCheck = await db.query('SELECT warehouse_id FROM warehouses WHERE warehouse_id = $1', [warehouse_id]);
  if (warehouseCheck.rows.length === 0) {
    throw new AppError('Invalid warehouse selected', 400, [{ field: 'warehouse_id', message: 'Warehouse not found' }]);
  }

  let query;
  let values;
  if (password) {
    const passwordHash = await bcrypt.hash(password, 12);
    query = `
      UPDATE users
      SET role_id = $1, first_name = $2, last_name = $3, email = $4, password_hash = $5, phone = $6, status = $7, warehouse_id = $8
      WHERE user_id = $9
      RETURNING user_id, role_id, first_name, last_name, email, phone, status, warehouse_id
    `;
    values = [role_id, first_name.trim(), last_name.trim(), normalizedEmail, passwordHash, phone?.trim() || null, status, warehouse_id, id];
  } else {
    query = `
      UPDATE users
      SET role_id = $1, first_name = $2, last_name = $3, email = $4, phone = $5, status = $6, warehouse_id = $7
      WHERE user_id = $8
      RETURNING user_id, role_id, first_name, last_name, email, phone, status, warehouse_id
    `;
    values = [role_id, first_name.trim(), last_name.trim(), normalizedEmail, phone?.trim() || null, status, warehouse_id, id];
  }

  const { rows } = await db.query(query, values);
  const [updatedUser] = rows;
  if (!updatedUser) {
    throw new AppError('User not found', 404);
  }

  await db.query(
    'INSERT INTO audit_logs (user_id, action, meta) VALUES ($1, $2, $3)',
    [updatedByUserId, 'update_user', JSON.stringify({ updated_user_id: updatedUser.user_id, email: normalizedEmail })]
  );

  return updatedUser;
}

module.exports = {
  getAllUsers,
  searchUsers,
  createUser,
  updateUser,
};
