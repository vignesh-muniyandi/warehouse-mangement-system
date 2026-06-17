const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply verifyToken middleware to all routes in this router
router.use(verifyToken);

// ==========================================
// 1. Dashboard Stats & Notifications
// ==========================================
router.get('/dashboard/stats', async (req, res) => {
  try {
    const productsCount = await db.query('SELECT COUNT(*) FROM products');
    const categoriesCount = await db.query('SELECT COUNT(*) FROM categories');
    const suppliersCount = await db.query('SELECT COUNT(*) FROM suppliers');
    const poCount = await db.query('SELECT COUNT(*) FROM purchase_orders');
    const soCount = await db.query('SELECT COUNT(*) FROM orders');
    const stockValue = await db.query(`
      SELECT COALESCE(SUM(i.quantity_available * p.unit_price), 0) as value 
      FROM inventory i 
      JOIN products p ON i.product_id = p.product_id
    `);
    const lowStock = await db.query(`
      SELECT COUNT(*) 
      FROM products p 
      JOIN inventory i ON p.product_id = i.product_id 
      WHERE i.quantity_available <= p.reorder_level
    `);
    const pendingDeliveries = await db.query("SELECT COUNT(*) FROM orders WHERE status NOT IN ('Delivered')");
    const todayActivities = await db.query('SELECT COUNT(*) FROM audit_logs WHERE created_at >= CURRENT_DATE');
    const notificationsCount = await db.query('SELECT COUNT(*) FROM system_notifications WHERE read_status = false');

    return res.json({
      success: true,
      data: {
        totalProducts: parseInt(productsCount.rows[0].count),
        totalCategories: parseInt(categoriesCount.rows[0].count),
        totalSuppliers: parseInt(suppliersCount.rows[0].count),
        totalPurchaseOrders: parseInt(poCount.rows[0].count),
        totalSalesOrders: parseInt(soCount.rows[0].count),
        currentStockValue: parseFloat(stockValue.rows[0].value),
        lowStockAlerts: parseInt(lowStock.rows[0].count),
        pendingDeliveries: parseInt(pendingDeliveries.rows[0].count),
        todayActivities: parseInt(todayActivities.rows[0].count),
        systemNotifications: parseInt(notificationsCount.rows[0].count)
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats' });
  }
});

router.get('/dashboard/admin/summary', async (req, res) => {
  try {
    const productsCount = await db.query('SELECT COUNT(*) FROM products');
    const categoriesCount = await db.query('SELECT COUNT(*) FROM categories');
    const suppliersCount = await db.query('SELECT COUNT(*) FROM suppliers');
    const poCount = await db.query('SELECT COUNT(*) FROM purchase_orders');
    const soCount = await db.query('SELECT COUNT(*) FROM orders');
    const stockValue = await db.query(`
      SELECT COALESCE(SUM(i.quantity_available * p.unit_price), 0) as value
      FROM inventory i
      JOIN products p ON i.product_id = p.product_id
    `);
    const lowStock = await db.query(`
      SELECT COUNT(*)
      FROM products p
      JOIN inventory i ON p.product_id = i.product_id
      WHERE i.quantity_available <= p.reorder_level
    `);
    const pendingDeliveries = await db.query("SELECT COUNT(*) FROM orders WHERE status NOT IN ('Delivered')");
    const todayActivities = await db.query('SELECT COUNT(*) FROM audit_logs WHERE created_at >= CURRENT_DATE');
    const notificationsCount = await db.query('SELECT COUNT(*) FROM system_notifications WHERE read_status = false');

    return res.json({
      success: true,
      data: {
        totalProducts: parseInt(productsCount.rows[0].count),
        totalCategories: parseInt(categoriesCount.rows[0].count),
        totalSuppliers: parseInt(suppliersCount.rows[0].count),
        totalPurchaseOrders: parseInt(poCount.rows[0].count),
        totalSalesOrders: parseInt(soCount.rows[0].count),
        currentStockValue: parseFloat(stockValue.rows[0].value),
        lowStockAlerts: parseInt(lowStock.rows[0].count),
        pendingDeliveries: parseInt(pendingDeliveries.rows[0].count),
        todayActivities: parseInt(todayActivities.rows[0].count),
        systemNotifications: parseInt(notificationsCount.rows[0].count)
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch admin dashboard summary' });
  }
});

router.get('/dashboard/notifications', async (req, res) => {
  try {
    const notifications = await db.query('SELECT * FROM system_notifications ORDER BY created_at DESC LIMIT 5');
    const activities = await db.query(`
      SELECT a.*, u.first_name, u.last_name 
      FROM audit_logs a 
      LEFT JOIN users u ON a.user_id = u.user_id 
      ORDER BY a.created_at DESC LIMIT 5
    `);
    return res.json({
      success: true,
      data: {
        notifications: notifications.rows,
        activities: activities.rows
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications and activity' });
  }
});

// ==========================================
// 2. Users Management
// ==========================================
router.get('/users', async (req, res) => {
  try {
    const { search = '', role = '' } = req.query;
    let query = `
      SELECT u.user_id, u.first_name, u.last_name, u.email, u.phone, u.status, u.last_login, u.created_at, r.role_name 
      FROM users u 
      JOIN roles r ON u.role_id = r.role_id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (u.first_name ILIKE $${params.length} OR u.last_name ILIKE $${params.length} OR u.email ILIKE $${params.length})`;
    }
    if (role) {
      params.push(role);
      query += ` AND r.role_name = $${params.length}`;
    }

    query += ' ORDER BY u.user_id DESC';
    const { rows } = await db.query(query, params);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

router.get('/users/:id(\\d+)', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT u.user_id, u.first_name, u.last_name, u.email, u.phone, u.status, u.last_login, u.created_at, r.role_name
      FROM users u
      JOIN roles r ON u.role_id = r.role_id
      WHERE u.user_id = $1
    `, [req.params.id]);

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch user details' });
  }
});

router.post('/users', async (req, res) => {
  try {
    const { role_id, first_name, last_name, email, password, phone, status = 'Active' } = req.body;
    if (!role_id || !first_name || !last_name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Required fields missing' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const checkEmail = await db.query('SELECT user_id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (checkEmail.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    const { rows } = await db.query(
      `INSERT INTO users (role_id, first_name, last_name, email, password_hash, phone, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING user_id, first_name, last_name, email, phone, status`,
      [role_id, first_name, last_name, email, passwordHash, phone, status]
    );

    await db.query('INSERT INTO audit_logs (user_id, action, meta) VALUES ($1, $2, $3)', [
      req.user.user_id,
      'create_user',
      JSON.stringify({ created_user_id: rows[0].user_id, email })
    ]);

    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to create user' });
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { role_id, first_name, last_name, email, password, phone, status } = req.body;

    if (!role_id || !first_name || !last_name || !email || !status) {
      return res.status(400).json({ success: false, message: 'Required fields missing' });
    }

    const checkEmail = await db.query('SELECT user_id FROM users WHERE LOWER(email) = LOWER($1) AND user_id <> $2', [email, id]);
    if (checkEmail.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    if (password) {
      const passwordHash = await bcrypt.hash(password, 12);
      await db.query(
        `UPDATE users SET role_id = $1, first_name = $2, last_name = $3, email = $4, password_hash = $5, phone = $6, status = $7 
         WHERE user_id = $8`,
        [role_id, first_name, last_name, email, passwordHash, phone, status, id]
      );
    } else {
      await db.query(
        `UPDATE users SET role_id = $1, first_name = $2, last_name = $3, email = $4, phone = $5, status = $6 
         WHERE user_id = $7`,
        [role_id, first_name, last_name, email, phone, status, id]
      );
    }

    await db.query('INSERT INTO audit_logs (user_id, action, meta) VALUES ($1, $2, $3)', [
      req.user.user_id,
      'update_user',
      JSON.stringify({ updated_user_id: id, email })
    ]);

    return res.json({ success: true, message: 'User updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update user' });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (parseInt(id) === req.user.user_id) {
      return res.status(400).json({ success: false, message: 'Cannot delete yourself' });
    }

    await db.query('DELETE FROM users WHERE user_id = $1', [id]);
    await db.query('INSERT INTO audit_logs (user_id, action, meta) VALUES ($1, $2, $3)', [
      req.user.user_id,
      'delete_user',
      JSON.stringify({ deleted_user_id: id })
    ]);

    return res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to delete user. Make sure user is not assigned to orders.' });
  }
});

router.get('/roles', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT role_id, role_name, permissions FROM roles ORDER BY role_id');
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch roles' });
  }
});

// ==========================================
// 3. Products Management
// ==========================================
router.get('/products', async (req, res) => {
  try {
    const { search = '' } = req.query;
    let query = `
      SELECT p.*, c.name as category_name, s.name as supplier_name, COALESCE(i.quantity_available, 0) as stock_quantity 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.category_id 
      LEFT JOIN suppliers s ON p.supplier_id = s.supplier_id
      LEFT JOIN inventory i ON p.product_id = i.product_id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (p.sku ILIKE $${params.length} OR p.barcode ILIKE $${params.length} OR p.name ILIKE $${params.length})`;
    }

    query += ' ORDER BY p.product_id DESC';
    const { rows } = await db.query(query, params);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch products' });
  }
});

router.get('/products/:id(\\d+)', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT p.*, c.name as category_name, s.name as supplier_name, COALESCE(i.quantity_available, 0) as stock_quantity
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN suppliers s ON p.supplier_id = s.supplier_id
      LEFT JOIN inventory i ON p.product_id = i.product_id
      WHERE p.product_id = $1
    `, [req.params.id]);

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch product details' });
  }
});

router.post('/products', async (req, res) => {
  try {
    const { sku, barcode, name, category_id, supplier_id, unit_price, reorder_level, description } = req.body;
    if (!sku || !name || !unit_price) {
      return res.status(400).json({ success: false, message: 'Required fields missing' });
    }

    const checkSku = await db.query('SELECT product_id FROM products WHERE LOWER(sku) = LOWER($1)', [sku]);
    if (checkSku.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'SKU already exists' });
    }

    const { rows } = await db.query(
      `INSERT INTO products (sku, barcode, name, category_id, supplier_id, unit_price, reorder_level, description) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [sku, barcode, name, category_id || null, supplier_id || null, unit_price, reorder_level || 0, description || '']
    );

    const newProd = rows[0];

    // Seed inventory entry for first warehouse automatically
    const wh = await db.query('SELECT warehouse_id FROM warehouses LIMIT 1');
    if (wh.rows.length > 0) {
      await db.query(
        `INSERT INTO inventory (product_id, warehouse_id, quantity_available, quantity_reserved, damaged_quantity) 
         VALUES ($1, $2, 0, 0, 0) ON CONFLICT DO NOTHING`,
        [newProd.product_id, wh.rows[0].warehouse_id]
      );
    }

    await db.query('INSERT INTO audit_logs (user_id, action, meta) VALUES ($1, $2, $3)', [
      req.user.user_id,
      'create_product',
      JSON.stringify({ product_id: newProd.product_id, sku })
    ]);

    return res.json({ success: true, data: newProd });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to create product' });
  }
});

router.put('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { sku, barcode, name, category_id, supplier_id, unit_price, reorder_level, description } = req.body;

    if (!sku || !name || !unit_price) {
      return res.status(400).json({ success: false, message: 'Required fields missing' });
    }

    const checkSku = await db.query('SELECT product_id FROM products WHERE LOWER(sku) = LOWER($1) AND product_id <> $2', [sku, id]);
    if (checkSku.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'SKU already exists' });
    }

    await db.query(
      `UPDATE products 
       SET sku = $1, barcode = $2, name = $3, category_id = $4, supplier_id = $5, unit_price = $6, reorder_level = $7, description = $8 
       WHERE product_id = $9`,
      [sku, barcode, name, category_id || null, supplier_id || null, unit_price, reorder_level || 0, description || '', id]
    );

    await db.query('INSERT INTO audit_logs (user_id, action, meta) VALUES ($1, $2, $3)', [
      req.user.user_id,
      'update_product',
      JSON.stringify({ product_id: id, sku })
    ]);

    return res.json({ success: true, message: 'Product updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update product' });
  }
});

router.get('/categories', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM categories ORDER BY name');
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
});

router.get('/suppliers', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM suppliers ORDER BY name');
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch suppliers' });
  }
});

// ==========================================
// 4. Inventory Management
// ==========================================
router.get('/inventory', async (req, res) => {
  try {
    const { search = '' } = req.query;
    let query = `
      SELECT i.inventory_id, i.product_id, i.warehouse_id, i.quantity_available, i.quantity_reserved, i.damaged_quantity, i.last_updated,
             p.name as product_name, p.sku, p.barcode, p.reorder_level, w.name as warehouse_name
      FROM inventory i 
      JOIN products p ON i.product_id = p.product_id 
      JOIN warehouses w ON i.warehouse_id = w.warehouse_id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length} OR p.barcode ILIKE $${params.length})`;
    }

    query += ' ORDER BY i.inventory_id DESC';
    const { rows } = await db.query(query, params);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch inventory' });
  }
});

router.get('/inventory/:id(\\d+)', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT i.inventory_id, i.product_id, i.warehouse_id, i.quantity_available, i.quantity_reserved, i.damaged_quantity, i.last_updated,
             p.name as product_name, p.sku, p.barcode, p.reorder_level, w.name as warehouse_name
      FROM inventory i
      JOIN products p ON i.product_id = p.product_id
      JOIN warehouses w ON i.warehouse_id = w.warehouse_id
      WHERE i.inventory_id = $1
    `, [req.params.id]);

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Inventory item not found' });
    }

    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch inventory details' });
  }
});

router.get('/inventory/stats', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT 
        COALESCE(SUM(quantity_available), 0) as available,
        COALESCE(SUM(quantity_reserved), 0) as reserved,
        COALESCE(SUM(damaged_quantity), 0) as damaged,
        COUNT(CASE WHEN quantity_available <= reorder_level THEN 1 END) as low_stock_count
      FROM inventory i
      JOIN products p ON i.product_id = p.product_id
    `);
    const r = rows[0];
    return res.json({
      success: true,
      data: {
        available: parseInt(r.available),
        reserved: parseInt(r.reserved),
        damaged: parseInt(r.damaged),
        lowStock: parseInt(r.low_stock_count)
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch inventory stats' });
  }
});

router.post('/inventory/adjust', async (req, res) => {
  try {
    const { product_id, warehouse_id, adjustment_type, quantity, remarks, to_warehouse_id } = req.body;
    if (!product_id || !warehouse_id || !adjustment_type || !quantity) {
      return res.status(400).json({ success: false, message: 'Required fields missing' });
    }

    const qty = parseInt(quantity);
    if (qty <= 0) {
      return res.status(400).json({ success: false, message: 'Quantity must be positive' });
    }

    // Begin Transaction
    await db.query('BEGIN');

    // Retrieve or create inventory record
    let invRes = await db.query('SELECT inventory_id, quantity_available FROM inventory WHERE product_id = $1 AND warehouse_id = $2', [product_id, warehouse_id]);
    let invId;
    let currentQty = 0;

    if (invRes.rows.length === 0) {
      const insertInv = await db.query(
        `INSERT INTO inventory (product_id, warehouse_id, quantity_available, quantity_reserved, damaged_quantity) 
         VALUES ($1, $2, 0, 0, 0) RETURNING inventory_id, quantity_available`,
        [product_id, warehouse_id]
      );
      invId = insertInv.rows[0].inventory_id;
      currentQty = 0;
    } else {
      invId = invRes.rows[0].inventory_id;
      currentQty = invRes.rows[0].quantity_available;
    }

    if (adjustment_type === 'add') {
      await db.query('UPDATE inventory SET quantity_available = quantity_available + $1, last_updated = NOW() WHERE inventory_id = $2', [qty, invId]);
      await db.query(
        `INSERT INTO stock_movements (inventory_id, to_warehouse_id, movement_type, quantity, remarks) 
         VALUES ($1, $2, $3, $4, $5)`,
        [invId, warehouse_id, 'Adjustment Add', qty, remarks || '']
      );
    } else if (adjustment_type === 'remove') {
      if (currentQty < qty) {
        await db.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Insufficient stock available for removal' });
      }
      await db.query('UPDATE inventory SET quantity_available = quantity_available - $1, last_updated = NOW() WHERE inventory_id = $2', [qty, invId]);
      await db.query(
        `INSERT INTO stock_movements (inventory_id, from_warehouse_id, movement_type, quantity, remarks) 
         VALUES ($1, $2, $3, $4, $5)`,
        [invId, warehouse_id, 'Adjustment Remove', qty, remarks || '']
      );
    } else if (adjustment_type === 'transfer') {
      if (!to_warehouse_id) {
        await db.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Destination warehouse required for transfer' });
      }
      if (parseInt(warehouse_id) === parseInt(to_warehouse_id)) {
        await db.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Source and destination warehouses must be different' });
      }
      if (currentQty < qty) {
        await db.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Insufficient stock available for transfer' });
      }

      // Decrement source
      await db.query('UPDATE inventory SET quantity_available = quantity_available - $1, last_updated = NOW() WHERE inventory_id = $2', [qty, invId]);

      // Increment/Create destination
      let destInvRes = await db.query('SELECT inventory_id FROM inventory WHERE product_id = $1 AND warehouse_id = $2', [product_id, to_warehouse_id]);
      let destInvId;
      if (destInvRes.rows.length === 0) {
        const insertDest = await db.query(
          `INSERT INTO inventory (product_id, warehouse_id, quantity_available, quantity_reserved, damaged_quantity) 
           VALUES ($1, $2, $3, 0, 0) RETURNING inventory_id`,
          [product_id, to_warehouse_id, qty]
        );
        destInvId = insertDest.rows[0].inventory_id;
      } else {
        destInvId = destInvRes.rows[0].inventory_id;
        await db.query('UPDATE inventory SET quantity_available = quantity_available + $1, last_updated = NOW() WHERE inventory_id = $2', [qty, destInvId]);
      }

      await db.query(
        `INSERT INTO stock_movements (inventory_id, from_warehouse_id, to_warehouse_id, movement_type, quantity, remarks) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [invId, warehouse_id, to_warehouse_id, 'Transfer', qty, remarks || '']
      );
    } else {
      await db.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Invalid adjustment type' });
    }

    await db.query('COMMIT');
    return res.json({ success: true, message: 'Stock adjusted successfully' });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to adjust stock' });
  }
});

router.get('/warehouses', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM warehouses ORDER BY name');
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch warehouses' });
  }
});

// ==========================================
// 5. Purchase Orders (PO) Management
// ==========================================
router.get(['/purchases', '/purchase-orders'], async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT po.*, s.name as supplier_name, w.name as warehouse_name, u.first_name, u.last_name 
      FROM purchase_orders po 
      JOIN suppliers s ON po.supplier_id = s.supplier_id 
      JOIN warehouses w ON po.warehouse_id = w.warehouse_id 
      LEFT JOIN users u ON po.created_by_user_id = u.user_id 
      ORDER BY po.created_at DESC
    `);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch purchase orders' });
  }
});

router.get(['/purchases/:id(\\d+)', '/purchase-orders/:id(\\d+)'], async (req, res) => {
  try {
    const { id } = req.params;
    const poRes = await db.query(`
      SELECT po.*, s.name as supplier_name, w.name as warehouse_name, u.first_name, u.last_name 
      FROM purchase_orders po 
      JOIN suppliers s ON po.supplier_id = s.supplier_id 
      JOIN warehouses w ON po.warehouse_id = w.warehouse_id 
      LEFT JOIN users u ON po.created_by_user_id = u.user_id 
      WHERE po.purchase_order_id = $1
    `, [id]);

    if (poRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' });
    }

    const itemsRes = await db.query(`
      SELECT poi.*, p.name as product_name, p.sku 
      FROM purchase_order_items poi 
      JOIN products p ON poi.product_id = p.product_id 
      WHERE poi.purchase_order_id = $1
    `, [id]);

    return res.json({
      success: true,
      data: {
        ...poRes.rows[0],
        items: itemsRes.rows
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch purchase order details' });
  }
});

router.post(['/purchases', '/purchase-orders'], async (req, res) => {
  try {
    const { supplier_id, warehouse_id, items, expected_delivery_date } = req.body;
    if (!supplier_id || !warehouse_id || !items || !items.length) {
      return res.status(400).json({ success: false, message: 'Required fields missing' });
    }

    await db.query('BEGIN');

    let totalAmount = 0;
    for (const item of items) {
      totalAmount += parseFloat(item.unit_price) * parseInt(item.quantity);
    }

    const poRes = await db.query(
      `INSERT INTO purchase_orders (supplier_id, warehouse_id, created_by_user_id, status, total_amount, expected_delivery_date) 
       VALUES ($1, $2, $3, 'Pending', $4, $5) RETURNING purchase_order_id`,
      [supplier_id, warehouse_id, req.user.user_id, totalAmount, expected_delivery_date || null]
    );
    const poId = poRes.rows[0].purchase_order_id;

    for (const item of items) {
      await db.query(
        `INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity_ordered, unit_price) 
         VALUES ($1, $2, $3, $4)`,
        [poId, item.product_id, item.quantity, item.unit_price]
      );
    }

    await db.query('COMMIT');
    return res.json({ success: true, message: 'Purchase order created successfully', data: { purchase_order_id: poId } });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to create purchase order' });
  }
});

router.put([
  '/purchases/:id(\\d+)/status',
  '/purchase-orders/:id(\\d+)/status',
  '/purchase-orders/:id(\\d+)/approve',
  '/purchase-orders/:id(\\d+)/receive'
], async (req, res) => {
  try {
    const { id } = req.params;
    let { status } = req.body; // Submitted, Approved, Rejected, Received, etc.

    if (!status && req.path.endsWith('/approve')) {
      status = 'Approved';
    }
    if (!status && req.path.endsWith('/receive')) {
      status = 'Received';
    }

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }

    await db.query('BEGIN');

    // Retrieve the purchase order
    const poRes = await db.query('SELECT * FROM purchase_orders WHERE purchase_order_id = $1', [id]);
    if (poRes.rows.length === 0) {
      await db.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Purchase order not found' });
    }

    const po = poRes.rows[0];
    const prevStatus = po.status;

    if (prevStatus === 'Received') {
      await db.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Received purchase orders cannot be changed' });
    }

    if (status === 'Received') {
      // Receive goods: increment stock levels in the destination warehouse
      const itemsRes = await db.query('SELECT * FROM purchase_order_items WHERE purchase_order_id = $1', [id]);

      for (const item of itemsRes.rows) {
        // Increment quantity in inventory table
        let invRes = await db.query('SELECT inventory_id FROM inventory WHERE product_id = $1 AND warehouse_id = $2', [item.product_id, po.warehouse_id]);
        let invId;

        if (invRes.rows.length === 0) {
          const insertInv = await db.query(
            `INSERT INTO inventory (product_id, warehouse_id, quantity_available, quantity_reserved, damaged_quantity) 
             VALUES ($1, $2, $3, 0, 0) RETURNING inventory_id`,
            [item.product_id, po.warehouse_id, item.quantity_ordered]
          );
          invId = insertInv.rows[0].inventory_id;
        } else {
          invId = invRes.rows[0].inventory_id;
          await db.query(
            'UPDATE inventory SET quantity_available = quantity_available + $1, last_updated = NOW() WHERE inventory_id = $2',
            [item.quantity_ordered, invId]
          );
        }

        // Record stock movement
        await db.query(
          `INSERT INTO stock_movements (inventory_id, to_warehouse_id, movement_type, quantity, remarks) 
           VALUES ($1, $2, $3, $4, $5)`,
          [invId, po.warehouse_id, 'Purchase Order Receipt', item.quantity_ordered, `Received via PO #${id}`]
        );

        // Update item with received quantity
        await db.query('UPDATE purchase_order_items SET received_quantity = quantity_ordered WHERE item_id = $1', [item.item_id]);
      }

      await db.query(
        'UPDATE purchase_orders SET status = $1, received_date = NOW() WHERE purchase_order_id = $2',
        [status, id]
      );
    } else {
      await db.query('UPDATE purchase_orders SET status = $1 WHERE purchase_order_id = $2', [status, id]);
    }

    await db.query('INSERT INTO audit_logs (user_id, action, meta) VALUES ($1, $2, $3)', [
      req.user.user_id,
      'purchase_order_status',
      JSON.stringify({ purchase_order_id: id, from: prevStatus, to: status })
    ]);

    await db.query('COMMIT');
    return res.json({ success: true, message: `Status updated to ${status}` });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update purchase order status' });
  }
});

// ==========================================
// 6. Orders Management (Sales Orders)
// ==========================================
router.get('/orders', async (req, res) => {
  try {
    const { search = '', status = '' } = req.query;
    let query = `
      SELECT o.*, w.name as warehouse_name, u.first_name, u.last_name 
      FROM orders o 
      LEFT JOIN warehouses w ON o.warehouse_id = w.warehouse_id 
      LEFT JOIN users u ON o.assigned_user_id = u.user_id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      // Check if search query looks like a numeric order ID
      const orderIdSearch = parseInt(search);
      if (!isNaN(orderIdSearch)) {
        params.push(orderIdSearch);
        query += ` AND (o.order_id = $${params.length})`;
      } else {
        params.push(`%${search}%`);
        query += ` AND (o.customer_name ILIKE $${params.length} OR o.delivery_address ILIKE $${params.length})`;
      }
    }

    if (status) {
      params.push(status);
      query += ` AND o.status = $${params.length}`;
    }

    query += ' ORDER BY o.order_id DESC';
    const { rows } = await db.query(query, params);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch sales orders' });
  }
});

router.get('/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const orderRes = await db.query(`
      SELECT o.*, w.name as warehouse_name, u.first_name, u.last_name 
      FROM orders o 
      LEFT JOIN warehouses w ON o.warehouse_id = w.warehouse_id 
      LEFT JOIN users u ON o.assigned_user_id = u.user_id 
      WHERE o.order_id = $1
    `, [id]);

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const itemsRes = await db.query(`
      SELECT oi.*, p.name as product_name, p.sku 
      FROM order_items oi 
      JOIN products p ON oi.product_id = p.product_id 
      WHERE oi.order_id = $1
    `, [id]);

    return res.json({
      success: true,
      data: {
        ...orderRes.rows[0],
        items: itemsRes.rows
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch order details' });
  }
});

router.put('/orders/:id/assign', async (req, res) => {
  try {
    const { id } = req.params;
    const { assigned_user_id } = req.body;

    await db.query('UPDATE orders SET assigned_user_id = $1, updated_at = NOW() WHERE order_id = $2', [assigned_user_id || null, id]);
    await db.query('INSERT INTO audit_logs (user_id, action, meta) VALUES ($1, $2, $3)', [
      req.user.user_id,
      'assign_order_staff',
      JSON.stringify({ order_id: id, assigned_user_id })
    ]);

    return res.json({ success: true, message: 'Warehouse staff assigned successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to assign warehouse staff' });
  }
});

router.put('/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }

    await db.query('UPDATE orders SET status = $1, updated_at = NOW() WHERE order_id = $2', [status, id]);
    await db.query('INSERT INTO audit_logs (user_id, action, meta) VALUES ($1, $2, $3)', [
      req.user.user_id,
      'order_status_update',
      JSON.stringify({ order_id: id, status })
    ]);

    return res.json({ success: true, message: 'Order status updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update order status' });
  }
});

router.get('/staff', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT u.user_id, u.first_name, u.last_name, r.role_name 
      FROM users u 
      JOIN roles r ON u.role_id = r.role_id 
      WHERE r.role_name IN ('Admin', 'Warehouse Manager', 'Worker/Operator') 
      ORDER BY u.first_name
    `);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch warehouse staff list' });
  }
});

// ==========================================
// 7. Settings Management
// ==========================================
router.get('/settings', async (req, res) => {
  try {
    const settings = await db.query('SELECT * FROM settings ORDER BY key');
    const roles = await db.query('SELECT * FROM roles ORDER BY role_id');
    return res.json({
      success: true,
      data: {
        settings: settings.rows,
        roles: roles.rows
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch settings' });
  }
});

router.post('/settings', async (req, res) => {
  try {
    const { settings } = req.body; // Expect an object of key-value pairs
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ success: false, message: 'Settings object is required' });
    }

    await db.query('BEGIN');
    for (const [key, value] of Object.entries(settings)) {
      await db.query('UPDATE settings SET value = $1, updated_at = NOW() WHERE key = $2', [value.toString(), key]);
    }
    await db.query('COMMIT');

    await db.query('INSERT INTO audit_logs (user_id, action, meta) VALUES ($1, $2, $3)', [
      req.user.user_id,
      'update_settings',
      JSON.stringify(Object.keys(settings))
    ]);

    return res.json({ success: true, message: 'Settings saved successfully' });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to save settings' });
  }
});

router.put('/roles/:id/permissions', async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body; // JSON object of permissions

    if (!permissions) {
      return res.status(400).json({ success: false, message: 'Permissions object is required' });
    }

    await db.query('UPDATE roles SET permissions = $1 WHERE role_id = $2', [JSON.stringify(permissions), id]);
    await db.query('INSERT INTO audit_logs (user_id, action, meta) VALUES ($1, $2, $3)', [
      req.user.user_id,
      'update_role_permissions',
      JSON.stringify({ role_id: id })
    ]);

    return res.json({ success: true, message: 'Role permissions updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update role permissions' });
  }
});

// ==========================================
// 8. Reports & Analytics
// ==========================================
async function loadReportRows(type) {
  let rows = [];

  switch (type) {
    case 'inventory': {
      const invRes = await db.query(`
        SELECT p.sku, p.name as product_name, c.name as category_name, i.quantity_available, i.quantity_reserved, i.damaged_quantity, p.unit_price,
               (i.quantity_available * p.unit_price) as valuation
        FROM inventory i
        JOIN products p ON i.product_id = p.product_id
        LEFT JOIN categories c ON p.category_id = c.category_id
        ORDER BY p.name
      `);
      rows = invRes.rows;
      break;
    }
    case 'stock_movement': {
      const moveRes = await db.query(`
        SELECT sm.movement_id, sm.movement_type, sm.quantity, sm.remarks, sm.created_at,
               p.sku, p.name as product_name, w1.name as from_warehouse, w2.name as to_warehouse
        FROM stock_movements sm
        JOIN inventory i ON sm.inventory_id = i.inventory_id
        JOIN products p ON i.product_id = p.product_id
        LEFT JOIN warehouses w1 ON sm.from_warehouse_id = w1.warehouse_id
        LEFT JOIN warehouses w2 ON sm.to_warehouse_id = w2.warehouse_id
        ORDER BY sm.created_at DESC
      `);
      rows = moveRes.rows;
      break;
    }
    case 'purchase': {
      const purRes = await db.query(`
        SELECT po.purchase_order_id, po.status, po.total_amount, po.expected_delivery_date, po.received_date, po.created_at,
               s.name as supplier_name, w.name as warehouse_name
        FROM purchase_orders po
        JOIN suppliers s ON po.supplier_id = s.supplier_id
        JOIN warehouses w ON po.warehouse_id = w.warehouse_id
        ORDER BY po.created_at DESC
      `);
      rows = purRes.rows;
      break;
    }
    case 'sales': {
      const salesRes = await db.query(`
        SELECT o.order_id, o.customer_name, o.status, o.total_amount, o.delivery_address, o.created_at,
               w.name as warehouse_name, u.first_name, u.last_name
        FROM orders o
        LEFT JOIN warehouses w ON o.warehouse_id = w.warehouse_id
        LEFT JOIN users u ON o.assigned_user_id = u.user_id
        ORDER BY o.created_at DESC
      `);
      rows = salesRes.rows;
      break;
    }
    case 'supplier': {
      const supRes = await db.query(`
        SELECT s.supplier_id, s.name, s.contact_person, s.email, s.phone, s.status,
               COUNT(p.product_id) as total_products, COALESCE(SUM(i.quantity_available), 0) as total_stock
        FROM suppliers s
        LEFT JOIN products p ON s.supplier_id = p.supplier_id
        LEFT JOIN inventory i ON p.product_id = i.product_id
        GROUP BY s.supplier_id
        ORDER BY s.name
      `);
      rows = supRes.rows;
      break;
    }
    case 'warehouse_performance': {
      const whRes = await db.query(`
        SELECT w.warehouse_id, w.warehouse_code, w.name, w.location, w.capacity,
               COUNT(DISTINCT o.order_id) as total_orders, COALESCE(SUM(o.total_amount), 0) as sales_volume,
               COUNT(DISTINCT po.purchase_order_id) as total_purchases
        FROM warehouses w
        LEFT JOIN orders o ON w.warehouse_id = o.warehouse_id
        LEFT JOIN purchase_orders po ON w.warehouse_id = po.warehouse_id
        GROUP BY w.warehouse_id
        ORDER BY w.name
      `);
      rows = whRes.rows;
      break;
    }
    case 'delivery': {
      const delRes = await db.query(`
        SELECT o.order_id, o.customer_name, o.delivery_address, o.status, o.total_amount, o.updated_at as delivery_date,
               u.first_name, u.last_name as delivery_staff
        FROM orders o
        LEFT JOIN users u ON o.assigned_user_id = u.user_id
        WHERE o.status IN ('Shipped', 'Delivered')
        ORDER BY o.updated_at DESC
      `);
      rows = delRes.rows;
      break;
    }
    default:
      return null;
  }

  return rows;
}

function rowsToCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  return [headers.join(','), ...rows.map((row) => headers.map((header) => escape(row[header])).join(','))].join('\n');
}

router.get('/reports/:type/export', async (req, res) => {
  try {
    const { type } = req.params;
    const format = String(req.query.format || 'csv').toLowerCase();
    const rows = await loadReportRows(type);

    if (!rows) {
      return res.status(400).json({ success: false, message: 'Invalid report type' });
    }

    const csv = rowsToCsv(rows);
    const extension = format === 'excel' ? 'xlsx' : format;
    const contentType = format === 'pdf'
      ? 'application/pdf'
      : format === 'excel'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${type}-report.${extension}"`);
    return res.send(csv || 'No records found');
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to export report' });
  }
});

router.get('/reports/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const rows = await loadReportRows(type);

    if (!rows) {
        return res.status(400).json({ success: false, message: 'Invalid report type' });
    }

    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch report data' });
  }
});

module.exports = router;
