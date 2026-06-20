const express = require('express');
const { authenticate, authorize, validateOrigin } = require('../middleware/authMiddleware');
const adminController = require('../controllers/adminController');
const db = require('../db');

const router = express.Router();
router.use(validateOrigin);
router.use(authenticate);
router.use(authorize(1));

router.get('/users', adminController.getUsers);
router.get('/users/search', adminController.searchUsers);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);

// Admin-only endpoint to fetch roles for dropdowns
router.get('/roles', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT role_id, role_name, permissions FROM roles ORDER BY role_id');
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[ADMIN ROUTES] /roles error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch roles' });
  }
});

// Admin-only endpoint to fetch warehouses for dropdowns
router.get('/warehouses', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM warehouses ORDER BY name');
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[ADMIN ROUTES] /warehouses error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch warehouses' });
  }
});

module.exports = router;
