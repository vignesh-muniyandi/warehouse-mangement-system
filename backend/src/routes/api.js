const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');
const redis = require('../services/redisClient');
const { verifyToken, validateOrigin } = require('../middleware/authMiddleware');
const {
  hasPermission,
  requireAnyPermission,
  requirePermission,
  authorize,
} = require('../middleware/permissionMiddleware');

const router = express.Router();

// Apply middleware to all routes in this router
router.use(validateOrigin);
router.use(verifyToken);

async function getUserWarehouseId(req) {
  if (req.user?.warehouse_id) {
    return req.user.warehouse_id;
  }

  const { rows } = await db.query('SELECT warehouse_id FROM users WHERE user_id = $1', [req.user.user_id]);
  return rows[0]?.warehouse_id || null;
}

function appendWarehouseScope(query, params, alias, warehouseId) {
  if (!warehouseId) {
    return `${query} AND 1=0`;
  }

  params.push(warehouseId);
  return `${query} AND ${alias}.warehouse_id = $${params.length}`;
}

const legacyPermissionMap = {
  dashboard: {
    read: ['reports:read'],
  },
  users: {
    read: ['users:read'],
    write: ['users:create', 'users:update'],
    delete: ['users:delete'],
  },
  products: {
    read: ['products:read'],
    write: ['products:create', 'products:update'],
    delete: ['products:delete'],
  },
  inventory: {
    read: ['inventory:read'],
    write: ['inventory:create', 'inventory:update', 'inventory:request_adjust', 'inventory:scan'],
    delete: ['inventory:delete'],
  },
  purchase: {
    read: ['purchase_orders:read'],
    write: ['purchase_orders:create', 'purchase_orders:approve'],
  },
  orders: {
    read: ['orders:read', 'orders:track', 'tasks:read', 'tasks:read_own', 'shipments:read_own'],
    write: ['orders:create', 'orders:update', 'orders:assign', 'tasks:create', 'tasks:update', 'tasks:update_own', 'shipments:update_status'],
  },
  reports: {
    read: ['reports:read', 'reports:read_limited'],
    write: ['reports:export'],
  },
  settings: {
    read: ['settings:read'],
    write: ['settings:update', 'roles:manage'],
  },
};

// Mount delivery routes
const deliveryRoutes = require('./delivery');
router.use('/delivery', deliveryRoutes);

const legacyControlledPermissions = new Set(
  Object.values(legacyPermissionMap)
    .flatMap((actions) => Object.values(actions))
    .flat()
);

function normalizeExactPermissions(permissions) {
  if (Array.isArray(permissions)) {
    return permissions;
  }

  if (typeof permissions === 'string') {
    try {
      const parsed = JSON.parse(permissions);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

function exactPermissionsToLegacy(permissions) {
  const exact = new Set(normalizeExactPermissions(permissions));
  return Object.entries(legacyPermissionMap).reduce((legacy, [moduleName, actions]) => {
    const enabledActions = Object.entries(actions)
      .filter(([, mappedPermissions]) => mappedPermissions.some((permission) => exact.has(permission)))
      .map(([action]) => action);

    if (enabledActions.length) {
      legacy[moduleName] = enabledActions.join(',');
    }

    return legacy;
  }, {});
}

function legacyPermissionsToExact(permissions, existingPermissions = []) {
  if (Array.isArray(permissions)) {
    return permissions;
  }

  const preserved = normalizeExactPermissions(existingPermissions).filter((permission) => !legacyControlledPermissions.has(permission));
  const selected = [];

  Object.entries(permissions || {}).forEach(([moduleName, actionList]) => {
    const actions = String(actionList || '')
      .split(',')
      .map((action) => action.trim())
      .filter(Boolean);

    actions.forEach((action) => {
      selected.push(...(legacyPermissionMap[moduleName]?.[action] || []));
    });
  });

  return [...new Set([...preserved, ...selected])];
}

// ==========================================
// 1. Dashboard Stats & Notifications
// ==========================================
router.get('/dashboard/stats', requireAnyPermission('reports:read', 'reports:read_limited'), async (req, res) => {
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

router.get('/dashboard/admin/summary', requirePermission('reports:read'), async (req, res) => {
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

router.get('/dashboard/notifications', requireAnyPermission('settings:read', 'reports:read', 'reports:read_limited'), async (req, res) => {
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

router.get('/dashboard/manager/summary', requireAnyPermission('inventory:read', 'orders:read', 'tasks:read'), async (req, res) => {
  try {
    const warehouseId = await getUserWarehouseId(req);
    const warehouseParams = warehouseId ? [warehouseId] : [];
    const warehouseWhere = warehouseId ? 'WHERE i.warehouse_id = $1' : '';
    const orderWhere = warehouseId ? 'WHERE o.warehouse_id = $1' : '';
    const taskWhere = warehouseId ? 'WHERE t.warehouse_id = $1' : '';

    const inventoryValue = await db.query(`
      SELECT COALESCE(SUM(i.quantity_available * p.unit_price), 0) as value
      FROM inventory i
      JOIN products p ON i.product_id = p.product_id
      ${warehouseWhere}
    `, warehouseParams);
    const orders = await db.query(`SELECT COUNT(*) as total FROM orders o ${orderWhere}`, warehouseParams);
    const pendingTasks = await db.query(`SELECT COUNT(*) as total FROM tasks t ${taskWhere} ${taskWhere ? 'AND' : 'WHERE'} t.status NOT IN ('Completed','Packed','Picked')`, warehouseParams);
    const lowStock = await db.query(`
      SELECT COUNT(*) as total
      FROM inventory i
      JOIN products p ON i.product_id = p.product_id
      WHERE i.quantity_available <= p.reorder_level ${warehouseId ? 'AND i.warehouse_id = $1' : ''}
    `, warehouseParams);
    const overdueTasks = await db.query(`SELECT COUNT(*) as total FROM tasks t ${taskWhere} ${taskWhere ? 'AND' : 'WHERE'} t.status <> 'Completed' AND t.created_at < NOW() - INTERVAL '1 day'`, warehouseParams);
    const inbound = await db.query(`SELECT COUNT(*) as total FROM purchase_orders po ${warehouseId ? 'WHERE po.warehouse_id = $1 AND' : 'WHERE'} po.status IN ('Pending','Approved','In Transit')`, warehouseParams);
    const outbound = await db.query(`SELECT COUNT(*) as total FROM orders o ${orderWhere} ${orderWhere ? 'AND' : 'WHERE'} o.status IN ('Pending','Packed','Collected','Dispatched','En Route','Shipped','Out for Delivery')`, warehouseParams);
    const today = await db.query('SELECT COUNT(*) as total FROM audit_logs WHERE created_at >= CURRENT_DATE');

    return res.json({
      success: true,
      data: {
        totalInventoryValue: Number(inventoryValue.rows[0].value || 0),
        totalOrders: Number(orders.rows[0].total || 0),
        pendingTasks: Number(pendingTasks.rows[0].total || 0),
        inboundShipments: Number(inbound.rows[0].total || 0),
        outboundShipments: Number(outbound.rows[0].total || 0),
        lowStockAlerts: Number(lowStock.rows[0].total || 0),
        overdueTasks: Number(overdueTasks.rows[0].total || 0),
        todaysActivities: Number(today.rows[0].total || 0),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch manager dashboard summary' });
  }
});

router.get('/dashboard/manager/kpis', requireAnyPermission('reports:read_limited', 'reports:read'), async (req, res) => {
  try {
    const warehouseId = await getUserWarehouseId(req);
    const warehouseParams = warehouseId ? [warehouseId] : [];
    const warehouseWhere = warehouseId ? 'WHERE i.warehouse_id = $1' : '';
    const orderWhere = warehouseId ? 'WHERE o.warehouse_id = $1' : '';

    const [inventorySold, totalInventory, deliveredOrders, totalOrders, accurateCounts] = await Promise.all([
      db.query(`
        SELECT COALESCE(SUM(oi.quantity * p.unit_price), 0) as value
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.order_id
        JOIN products p ON oi.product_id = p.product_id
        ${orderWhere} ${orderWhere ? 'AND' : 'WHERE'} o.status IN ('Delivered','Shipped')
        AND o.updated_at >= NOW() - INTERVAL '30 days'
      `, warehouseParams),
      db.query(`
        SELECT COALESCE(SUM(i.quantity_available * p.unit_price), 0) as value
        FROM inventory i JOIN products p ON i.product_id = p.product_id
        ${warehouseWhere}
      `, warehouseParams),
      db.query(`
        SELECT COUNT(*) as total FROM orders o
        ${orderWhere} ${orderWhere ? 'AND' : 'WHERE'} o.status = 'Delivered'
        AND o.updated_at >= NOW() - INTERVAL '30 days'
      `, warehouseParams),
      db.query(`SELECT COUNT(*) as total FROM orders o ${orderWhere}`, warehouseParams),
      db.query(`
        SELECT
          COUNT(*) FILTER (WHERE i.quantity_available >= 0) as accurate,
          COUNT(*) as total
        FROM inventory i ${warehouseWhere}
      `, warehouseParams),
    ]);

    const soldValue = Number(inventorySold.rows[0].value || 0);
    const invValue = Number(totalInventory.rows[0].value || 0);
    const avgInventory = invValue || 1;
    const inventoryTurnover = Number((soldValue / avgInventory).toFixed(2));
    const orderTotal = Number(totalOrders.rows[0].total || 0);
    const deliveredTotal = Number(deliveredOrders.rows[0].total || 0);
    const orderFulfillmentRate = orderTotal ? Number(((deliveredTotal / orderTotal) * 100).toFixed(1)) : 0;
    const onTimeDelivery = orderTotal ? Number(((deliveredTotal / orderTotal) * 92).toFixed(1)) : 0;
    const accurate = Number(accurateCounts.rows[0].accurate || 0);
    const stockTotal = Number(accurateCounts.rows[0].total || 0);
    const stockAccuracy = stockTotal ? Number(((accurate / stockTotal) * 100).toFixed(1)) : 100;

    return res.json({
      success: true,
      data: {
        inventoryTurnover,
        orderFulfillmentRate,
        onTimeDelivery,
        stockAccuracy,
        chartData: [
          { label: 'Inventory Turnover', value: Math.min(inventoryTurnover * 10, 100) },
          { label: 'Fulfillment Rate', value: orderFulfillmentRate },
          { label: 'On-Time Delivery', value: onTimeDelivery },
          { label: 'Stock Accuracy', value: stockAccuracy },
        ],
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch manager KPIs' });
  }
});

router.get('/dashboard/worker/summary', authorize(3), requirePermission('tasks:read_own'), async (req, res) => {
  try {
    const params = [req.user.user_id];
    const assignedTasks = await db.query('SELECT COUNT(*) as total FROM tasks WHERE assigned_user_id = $1', params);
    const completedToday = await db.query("SELECT COUNT(*) as total FROM tasks WHERE assigned_user_id = $1 AND status IN ('Completed','Picked','Packed') AND updated_at >= CURRENT_DATE", params);
    const pendingPick = await db.query("SELECT COUNT(*) as total FROM tasks WHERE assigned_user_id = $1 AND task_type = 'pick' AND status NOT IN ('Completed','Picked')", params);
    const pendingPack = await db.query("SELECT COUNT(*) as total FROM tasks WHERE assigned_user_id = $1 AND task_type = 'pack' AND status NOT IN ('Completed','Packed')", params);
    const inProgress = await db.query("SELECT COUNT(*) as total FROM tasks WHERE assigned_user_id = $1 AND status = 'In Progress'", params);
    const notifications = await db.query('SELECT COUNT(*) as total FROM system_notifications WHERE (user_id = $1 OR user_id IS NULL) AND read_status = false', params);
    const assignedTotal = Number(assignedTasks.rows[0].total || 0);
    const completedTotal = Number(completedToday.rows[0].total || 0);
    return res.json({
      success: true,
      data: {
        assignedTasks: assignedTotal,
        pendingPickOrders: Number(pendingPick.rows[0].total || 0),
        pendingPackOrders: Number(pendingPack.rows[0].total || 0),
        pendingPickPackOrders: Number(pendingPick.rows[0].total || 0) + Number(pendingPack.rows[0].total || 0),
        ordersCompleted: completedTotal,
        todaysTarget: completedTotal,
        tasksInProgress: Number(inProgress.rows[0].total || 0),
        performanceOverview: assignedTotal ? Math.round((completedTotal / assignedTotal) * 100) : 0,
        notifications: Number(notifications.rows[0].total || 0),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch worker dashboard summary' });
  }
});

router.get('/dashboard/delivery/summary', requirePermission('shipments:read_own'), async (req, res) => {
  try {
    const params = [req.user.user_id];
    const shipments = await db.query('SELECT COUNT(*) as total FROM orders WHERE assigned_delivery_user_id = $1', params);
    const pending = await db.query("SELECT COUNT(*) as total FROM orders WHERE assigned_delivery_user_id = $1 AND status IN ('Pending','Collected','Dispatched','Shipped')", params);
    const out = await db.query("SELECT COUNT(*) as total FROM orders WHERE assigned_delivery_user_id = $1 AND status IN ('En Route','Out for Delivery')", params);
    const deliveredToday = await db.query("SELECT COUNT(*) as total FROM orders WHERE assigned_delivery_user_id = $1 AND status = 'Delivered' AND updated_at >= CURRENT_DATE", params);
    const cod = await db.query("SELECT COALESCE(SUM(cod_amount), 0) as total FROM orders WHERE assigned_delivery_user_id = $1 AND cod_amount > 0 AND cod_collected = false", params);
    const failed = await db.query("SELECT COUNT(*) as total FROM orders WHERE assigned_delivery_user_id = $1 AND status = 'Delivery Failed'", params);
    const notifications = await db.query('SELECT COUNT(*) as total FROM system_notifications WHERE (user_id = $1 OR user_id IS NULL) AND read_status = false', params);
    const packages = await db.query(`
      SELECT COALESCE(SUM(package_count), 0) as total
      FROM (
        SELECT o.order_id, GREATEST(COUNT(oi.order_item_id), 1) as package_count
        FROM orders o
        LEFT JOIN order_items oi ON o.order_id = oi.order_id
        WHERE o.assigned_delivery_user_id = $1
        GROUP BY o.order_id
      ) package_totals
    `, params);
    const routeDistanceKm = Math.max(0, Number(shipments.rows[0].total || 0) * 8.5);
    return res.json({
      success: true,
      data: {
        assignedShipments: Number(shipments.rows[0].total || 0),
        todaysRoute: Number(shipments.rows[0].total || 0),
        pendingDeliveries: Number(pending.rows[0].total || 0),
        outForDelivery: Number(out.rows[0].total || 0),
        deliveredToday: Number(deliveredToday.rows[0].total || 0),
        codToCollect: Number(cod.rows[0].total || 0),
        failedDeliveries: Number(failed.rows[0].total || 0),
        totalDistance: routeDistanceKm,
        totalPackages: Number(packages.rows[0].total || 0),
        notifications: Number(notifications.rows[0].total || 0),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch delivery dashboard summary' });
  }
});

// ==========================================
// 2. Users Management
// ==========================================
router.get('/users', requirePermission('users:read'), async (req, res) => {
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

router.get('/users/:id(\\d+)', requirePermission('users:read'), async (req, res) => {
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

router.post('/users', requirePermission('users:create'), async (req, res) => {
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

router.put('/users/:id', requirePermission('users:update'), async (req, res) => {
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

router.delete('/users/:id', requirePermission('users:delete'), async (req, res) => {
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

router.get('/roles', requireAnyPermission('roles:manage', 'users:read'), async (req, res) => {
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
router.get('/products', requirePermission('products:read'), async (req, res) => {
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

router.get('/products/:id(\\d+)', requirePermission('products:read'), async (req, res) => {
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

router.post('/products', requirePermission('products:create'), async (req, res) => {
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

router.put('/products/:id', requirePermission('products:update'), async (req, res) => {
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

router.get('/categories', requirePermission('products:read'), async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM categories ORDER BY name');
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
});

router.get('/suppliers', requireAnyPermission('products:read', 'purchase_orders:read'), async (req, res) => {
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
router.get('/inventory', requirePermission('inventory:read'), async (req, res) => {
  try {
    const { search = '' } = req.query;
    const params = [];
    const warehouseId = req.user.role_name === 'Warehouse Manager' ? await getUserWarehouseId(req) : null;
    let query = `
      SELECT i.inventory_id, i.product_id, i.warehouse_id, i.quantity_available, i.quantity_reserved, i.damaged_quantity, i.last_updated,
             p.name as product_name, p.sku, p.barcode, p.reorder_level, w.name as warehouse_name
      FROM inventory i 
      JOIN products p ON i.product_id = p.product_id 
      JOIN warehouses w ON i.warehouse_id = w.warehouse_id
      WHERE 1=1
    `;
    if (req.user.role_name === 'Warehouse Manager') {
      query = appendWarehouseScope(query, params, 'i', warehouseId);
    }

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

router.get('/inventory/:id(\\d+)', requirePermission('inventory:read'), async (req, res) => {
  try {
    const params = [req.params.id];
    let scopeSql = '';
    if (req.user.role_name === 'Warehouse Manager') {
      const warehouseId = await getUserWarehouseId(req);
      if (!warehouseId) {
        return res.status(404).json({ success: false, message: 'Inventory item not found' });
      }
      params.push(warehouseId);
      scopeSql = ` AND i.warehouse_id = $${params.length}`;
    }
    const { rows } = await db.query(`
      SELECT i.inventory_id, i.product_id, i.warehouse_id, i.quantity_available, i.quantity_reserved, i.damaged_quantity, i.last_updated,
             p.name as product_name, p.sku, p.barcode, p.reorder_level, w.name as warehouse_name
      FROM inventory i
      JOIN products p ON i.product_id = p.product_id
      JOIN warehouses w ON i.warehouse_id = w.warehouse_id
      WHERE i.inventory_id = $1${scopeSql}
    `, params);

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Inventory item not found' });
    }

    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch inventory details' });
  }
});

router.get('/inventory/stats', requirePermission('inventory:read'), async (req, res) => {
  try {
    const params = [];
    let scopeSql = '';
    if (req.user.role_name === 'Warehouse Manager') {
      const warehouseId = await getUserWarehouseId(req);
      if (!warehouseId) {
        return res.json({ success: true, data: { available: 0, reserved: 0, damaged: 0, lowStock: 0 } });
      }
      params.push(warehouseId);
      scopeSql = ` WHERE i.warehouse_id = $${params.length}`;
    }

    const { rows } = await db.query(`
      SELECT 
        COALESCE(SUM(quantity_available), 0) as available,
        COALESCE(SUM(quantity_reserved), 0) as reserved,
        COALESCE(SUM(damaged_quantity), 0) as damaged,
        COUNT(CASE WHEN quantity_available <= reorder_level THEN 1 END) as low_stock_count
      FROM inventory i
      JOIN products p ON i.product_id = p.product_id
      ${scopeSql}
    `, params);
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

router.post('/inventory/adjust', requirePermission('inventory:update'), async (req, res) => {
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

router.post('/inventory/request-adjustment', requirePermission('inventory:request_adjust'), async (req, res) => {
  try {
    const { inventory_id, product_id, warehouse_id, adjustment_type, quantity, reason } = req.body;
    const scopedWarehouseId = req.user.role_name === 'Warehouse Manager' ? await getUserWarehouseId(req) : warehouse_id;
    if (!product_id || !scopedWarehouseId || !adjustment_type || !quantity) {
      return res.status(400).json({ success: false, message: 'Required fields missing' });
    }

    const { rows } = await db.query(
      `INSERT INTO inventory_adjustment_requests
       (inventory_id, product_id, warehouse_id, requested_by_user_id, adjustment_type, quantity, reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [inventory_id || null, product_id, scopedWarehouseId, req.user.user_id, adjustment_type, quantity, reason || '']
    );

    return res.json({ success: true, message: 'Stock adjustment request submitted', data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to submit adjustment request' });
  }
});

router.get('/warehouses', requireAnyPermission('inventory:read', 'purchase_orders:read', 'orders:read'), async (req, res) => {
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
router.get(['/purchases', '/purchase-orders'], requirePermission('purchase_orders:read'), async (req, res) => {
  try {
    const warehouseId = await getUserWarehouseId(req);
    const params = [];
    let warehouseFilter = '';
    if (req.user.role_name === 'Warehouse Manager' && warehouseId) {
      params.push(warehouseId);
      warehouseFilter = `WHERE po.warehouse_id = $${params.length}`;
    }

    const { rows } = await db.query(`
      SELECT po.*, s.name as supplier_name, w.name as warehouse_name, u.first_name, u.last_name 
      FROM purchase_orders po 
      JOIN suppliers s ON po.supplier_id = s.supplier_id 
      JOIN warehouses w ON po.warehouse_id = w.warehouse_id 
      LEFT JOIN users u ON po.created_by_user_id = u.user_id 
      ${warehouseFilter}
      ORDER BY po.created_at DESC
    `, params);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch purchase orders' });
  }
});

router.get(['/purchases/:id(\\d+)', '/purchase-orders/:id(\\d+)'], requirePermission('purchase_orders:read'), async (req, res) => {
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

router.post(['/purchases', '/purchase-orders'], requirePermission('purchase_orders:create'), async (req, res) => {
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
], requireAnyPermission('purchase_orders:approve', 'purchase_orders:receive'), async (req, res) => {
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
router.get('/orders', requirePermission('orders:read'), async (req, res) => {
  try {
    const { search = '', status = '' } = req.query;
    const params = [];
    const warehouseId = req.user.role_name === 'Warehouse Manager' ? await getUserWarehouseId(req) : null;
    let query = `
      SELECT o.*, w.name as warehouse_name, u.first_name, u.last_name 
      FROM orders o 
      LEFT JOIN warehouses w ON o.warehouse_id = w.warehouse_id 
      LEFT JOIN users u ON o.assigned_user_id = u.user_id
      WHERE 1=1
    `;
    if (req.user.role_name === 'Warehouse Manager') {
      query = appendWarehouseScope(query, params, 'o', warehouseId);
    }

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

router.get('/orders/:id', requirePermission('orders:read'), async (req, res) => {
  try {
    const { id } = req.params;
    const params = [id];
    let scopeSql = '';
    if (req.user.role_name === 'Warehouse Manager') {
      const warehouseId = await getUserWarehouseId(req);
      if (!warehouseId) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }
      params.push(warehouseId);
      scopeSql = ` AND o.warehouse_id = $${params.length}`;
    }
    const orderRes = await db.query(`
      SELECT o.*, w.name as warehouse_name, u.first_name, u.last_name 
      FROM orders o 
      LEFT JOIN warehouses w ON o.warehouse_id = w.warehouse_id 
      LEFT JOIN users u ON o.assigned_user_id = u.user_id 
      WHERE o.order_id = $1${scopeSql}
    `, params);

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

router.put('/orders/:id/assign', requirePermission('orders:assign'), async (req, res) => {
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

router.put('/orders/:id/status', requirePermission('orders:update'), async (req, res) => {
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

router.get('/staff', requireAnyPermission('orders:assign', 'tasks:create'), async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT u.user_id, u.first_name, u.last_name, r.role_name 
      FROM users u 
      JOIN roles r ON u.role_id = r.role_id 
      WHERE r.role_name IN ('Worker/Operator', 'Delivery Team') 
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
router.get('/tasks', requireAnyPermission('tasks:read', 'tasks:read_own'), async (req, res) => {
  try {
    const params = [];
    let query = `
      SELECT t.*, u.first_name, u.last_name, w.name as warehouse_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_user_id = u.user_id
      LEFT JOIN warehouses w ON t.warehouse_id = w.warehouse_id
      WHERE 1=1
    `;

    if (hasPermission(req.user, 'tasks:read_own') && !hasPermission(req.user, 'tasks:read')) {
      params.push(req.user.user_id);
      query += ` AND t.assigned_user_id = $${params.length}`;
    } else if (req.user.role_name === 'Warehouse Manager') {
      const warehouseId = await getUserWarehouseId(req);
      query = appendWarehouseScope(query, params, 't', warehouseId);
    }

    query += ' ORDER BY t.created_at DESC';
    const { rows } = await db.query(query, params);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch tasks' });
  }
});

router.post('/tasks', requirePermission('tasks:create'), async (req, res) => {
  try {
    const { title, assigned_user_id, task_type = 'general', priority = 'Normal', notes = '' } = req.body;
    const warehouseId = await getUserWarehouseId(req);
    if (!title || !assigned_user_id) {
      return res.status(400).json({ success: false, message: 'Title and assigned user are required' });
    }

    const { rows } = await db.query(
      `INSERT INTO tasks (warehouse_id, assigned_user_id, created_by_user_id, title, task_type, priority, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [warehouseId, assigned_user_id, req.user.user_id, title, task_type, priority, notes]
    );
    return res.json({ success: true, data: rows[0], message: 'Task created successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to create task' });
  }
});

router.put('/tasks/:id(\\d+)', requireAnyPermission('tasks:update', 'tasks:update_own'), async (req, res) => {
  try {
    const { status, priority, notes, assigned_user_id, title, scanned_code, location_code } = req.body;
    const params = [req.params.id];
    let scopeSql = '';

    if (hasPermission(req.user, 'tasks:update_own') && !hasPermission(req.user, 'tasks:update')) {
      params.push(req.user.user_id);
      scopeSql = ` AND assigned_user_id = $${params.length}`;
    } else if (req.user.role_name === 'Warehouse Manager') {
      const warehouseId = await getUserWarehouseId(req);
      params.push(warehouseId || -1);
      scopeSql = ` AND warehouse_id = $${params.length}`;
    }

    const existing = await db.query(`SELECT task_id FROM tasks WHERE task_id = $1${scopeSql}`, params);
    if (!existing.rows.length) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    await db.query(
      `UPDATE tasks
       SET title = COALESCE($1, title),
           assigned_user_id = COALESCE($2, assigned_user_id),
           status = COALESCE($3, status),
           priority = COALESCE($4, priority),
           notes = COALESCE($5, notes),
           scanned_code = COALESCE($7, scanned_code),
           location_code = COALESCE($8, location_code),
           updated_at = NOW()
       WHERE task_id = $6`,
      [title || null, assigned_user_id || null, status || null, priority || null, notes ?? null, req.params.id, scanned_code || null, location_code || null]
    );

    return res.json({ success: true, message: 'Task updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update task' });
  }
});

router.get('/pick-list', authorize(3), requirePermission('pick:read_own'), async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM tasks
       WHERE assigned_user_id = $1 AND task_type IN ('pick', 'general')
       ORDER BY created_at DESC`,
      [req.user.user_id]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch pick list' });
  }
});

router.put('/pick-list/:id(\\d+)', authorize(3), requirePermission('pick:update_own'), async (req, res) => {
  try {
    const { status = 'Completed' } = req.body;
    const result = await db.query(
      `UPDATE tasks SET status = $1, updated_at = NOW()
       WHERE task_id = $2 AND assigned_user_id = $3 AND task_type IN ('pick', 'general')`,
      [status, req.params.id, req.user.user_id]
    );
    if (!result.rowCount) {
      return res.status(404).json({ success: false, message: 'Pick task not found' });
    }
    return res.json({ success: true, message: 'Pick task updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update pick task' });
  }
});

router.put('/pack-station/:id(\\d+)', authorize(3), requirePermission('pack:update_own'), async (req, res) => {
  try {
    const { status = 'Packed' } = req.body;
    const result = await db.query(
      `UPDATE tasks SET status = $1, updated_at = NOW()
       WHERE task_id = $2 AND assigned_user_id = $3 AND task_type IN ('pack', 'general')`,
      [status, req.params.id, req.user.user_id]
    );
    if (!result.rowCount) {
      return res.status(404).json({ success: false, message: 'Pack task not found' });
    }
    return res.json({ success: true, message: 'Pack task updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update pack task' });
  }
});

router.post('/inventory/scan', authorize(3), requirePermission('inventory:scan'), async (req, res) => {
  try {
    const { barcode, sku } = req.body;
    const { rows } = await db.query(
      `SELECT p.product_id, p.sku, p.barcode, p.name, COALESCE(SUM(i.quantity_available), 0) as quantity_available
       FROM products p
       LEFT JOIN inventory i ON p.product_id = i.product_id
       WHERE ($1::text IS NOT NULL AND p.barcode = $1) OR ($2::text IS NOT NULL AND p.sku = $2)
       GROUP BY p.product_id`,
      [barcode || null, sku || null]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Item not valid. Rescan or report an exception.', data: null });
    }
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to scan inventory' });
  }
});

router.post('/locations/validate', authorize(3), requireAnyPermission('inventory:scan', 'tasks:update_own'), async (req, res) => {
  try {
    const { location_code } = req.body;
    const allowed = ['DOCK-01', 'BIN-A1', 'BIN-B2', 'PACK-02', 'STAGE-01'];
    if (!location_code || !allowed.includes(String(location_code).toUpperCase())) {
      return res.status(404).json({ success: false, message: 'Location not valid. Confirm aisle/bin and retry.', data: null });
    }
    return res.json({ success: true, data: { location_code: String(location_code).toUpperCase(), validated: true } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to validate location' });
  }
});

// ==========================================
// Receiving / Putaway / Picking / Packing
// Lightweight endpoints for worker flows
// ==========================================

router.post('/receiving/scan-po', authorize(3), requirePermission('tasks:read_own'), async (req, res) => {
  try {
    const { po_number } = req.body;
    if (!po_number) return res.status(400).json({ success: false, message: 'PO number required' });
    const { rows } = await db.query('SELECT * FROM purchase_orders WHERE purchase_order_id::text = $1 OR po_number = $1', [String(po_number)]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'PO not found', data: null });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to scan PO' });
  }
});

router.post('/receiving/scan-barcode', authorize(3), requirePermission('inventory:scan'), async (req, res) => {
  try {
    const { barcode, sku } = req.body;
    const { rows } = await db.query(
      `SELECT p.product_id, p.sku, p.barcode, p.name, COALESCE(SUM(i.quantity_available), 0) as quantity_available
       FROM products p
       LEFT JOIN inventory i ON p.product_id = i.product_id
       WHERE ($1::text IS NOT NULL AND p.barcode = $1) OR ($2::text IS NOT NULL AND p.sku = $2)
       GROUP BY p.product_id`,
      [barcode || null, sku || null]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Item not valid', data: null });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to scan barcode' });
  }
});

router.patch('/receiving/confirm', authorize(3), requirePermission('tasks:update_own'), async (req, res) => {
  try {
    const { po_number, barcode, quantity = 1 } = req.body;
    if (!po_number || !barcode) return res.status(400).json({ success: false, message: 'PO and barcode required' });
    const tasks = await db.query(`SELECT task_id FROM tasks WHERE assigned_user_id = $1 AND task_type IN ('receive','inbound') LIMIT 1`, [req.user.user_id]);
    if (!tasks.rows.length) {
      return res.status(404).json({ success: false, message: 'Receive task not found' });
    }
    const taskId = tasks.rows[0].task_id;
    await db.query('UPDATE tasks SET status = $1, updated_at = NOW() WHERE task_id = $2', ['Received', taskId]);
    await db.query('INSERT INTO audit_logs (user_id, action, meta) VALUES ($1,$2,$3)', [req.user.user_id, 'receive_confirm', JSON.stringify({ po_number, barcode, quantity })]);

    // Create a follow-up putaway task so warehouse staff can put items away
    try {
      const poRow = await db.query('SELECT * FROM purchase_orders WHERE purchase_order_id::text = $1 OR po_number = $1 LIMIT 1', [String(po_number)]);
      const warehouseId = poRow.rows[0]?.warehouse_id || null;
      const putawayTitle = `Putaway for PO ${po_number}`;
      const putRes = await db.query(
        `INSERT INTO tasks (warehouse_id, assigned_user_id, created_by_user_id, title, task_type, status, priority, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [warehouseId, req.user.user_id, req.user.user_id, putawayTitle, 'putaway', 'Pending', 'Normal', JSON.stringify({ from_po: po_number, barcode })]
      );
      await db.query('INSERT INTO audit_logs (user_id, action, meta) VALUES ($1,$2,$3)', [req.user.user_id, 'create_putaway_task', JSON.stringify({ task: putRes.rows[0] })]);
    } catch (e) {
      console.error('Failed to create putaway task', e);
    }

    return res.json({ success: true, message: 'Receive confirmed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to confirm receive' });
  }
});

router.get('/putaway/items', authorize(3), requirePermission('tasks:read_own'), async (req, res) => {
  try {
    const { rows } = await db.query(`SELECT * FROM tasks WHERE assigned_user_id = $1 AND task_type = 'putaway' ORDER BY created_at DESC`, [req.user.user_id]);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch putaway items' });
  }
});

router.post('/putaway/location-scan', authorize(3), requireAnyPermission('inventory:scan', 'tasks:update_own'), async (req, res) => {
  try {
    const { location_code } = req.body;
    const allowed = ['DOCK-01', 'BIN-A1', 'BIN-B2', 'PACK-02', 'STAGE-01'];
    if (!location_code || !allowed.includes(String(location_code).toUpperCase())) {
      return res.status(404).json({ success: false, message: 'Location not valid. Confirm aisle/bin and retry.', data: null });
    }
    return res.json({ success: true, data: { location_code: String(location_code).toUpperCase(), validated: true } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to validate location' });
  }
});

router.patch('/putaway/confirm', authorize(3), requirePermission('tasks:update_own'), async (req, res) => {
  try {
    const { task_id, location_code } = req.body;
    if (!task_id || !location_code) return res.status(400).json({ success: false, message: 'Task id and location code required' });
    const result = await db.query('UPDATE tasks SET status = $1, location_code = $2, updated_at = NOW() WHERE task_id = $3 AND assigned_user_id = $4', ['Completed', location_code, task_id, req.user.user_id]);
    if (!result.rowCount) return res.status(404).json({ success: false, message: 'Task not found or not assigned to you' });
    await db.query('INSERT INTO audit_logs (user_id, action, meta) VALUES ($1,$2,$3)', [req.user.user_id, 'putaway_confirm', JSON.stringify({ task_id, location_code })]);
    return res.json({ success: true, message: 'Putaway confirmed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to confirm putaway' });
  }
});

// Picking
router.get('/picking/list', authorize(3), requirePermission('pick:read_own'), async (req, res) => {
  try {
    const { rows } = await db.query(`SELECT * FROM tasks WHERE assigned_user_id = $1 AND task_type IN ('pick','general') ORDER BY created_at DESC`, [req.user.user_id]);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch picking list' });
  }
});

router.patch('/picking/pick', authorize(3), requirePermission('pick:update_own'), async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ success: false, message: 'Task id required' });
    const result = await db.query('UPDATE tasks SET status = $1, updated_at = NOW() WHERE task_id = $2 AND assigned_user_id = $3', ['Picked', id, req.user.user_id]);
    if (!result.rowCount) return res.status(404).json({ success: false, message: 'Pick task not found' });
    return res.json({ success: true, message: 'Pick task updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update pick task' });
  }
});

// Packing
router.get('/packing/list', authorize(3), requireAnyPermission('pack:read_own','pack:update_own'), async (req, res) => {
  try {
    const { rows } = await db.query(`SELECT * FROM tasks WHERE assigned_user_id = $1 AND task_type IN ('pack','general') ORDER BY created_at DESC`, [req.user.user_id]);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch packing list' });
  }
});

router.patch('/packing/complete', authorize(3), requirePermission('pack:update_own'), async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ success: false, message: 'Task id required' });
    const result = await db.query('UPDATE tasks SET status = $1, updated_at = NOW() WHERE task_id = $2 AND assigned_user_id = $3', ['Packed', id, req.user.user_id]);
    if (!result.rowCount) return res.status(404).json({ success: false, message: 'Pack task not found' });
    return res.json({ success: true, message: 'Pack task updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update pack task' });
  }
});

// Admin: unlock user endpoint
router.post('/admin/unlock-user', authorize(1), async (req, res) => {
  try {
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ success: false, message: 'user_id required' });
    await db.query('UPDATE users SET status = $1 WHERE user_id = $2', ['Active', user_id]);
    try {
      await redis.del(`login_fail:${user_id}`);
    } catch (e) {}
    await db.query('INSERT INTO audit_logs (user_id, action, meta) VALUES ($1,$2,$3)', [req.user.user_id, 'admin_unlock_user', JSON.stringify({ unlocked_user: user_id })]);
    return res.json({ success: true, message: 'User unlocked' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to unlock user' });
  }
});

router.get('/shipments', requirePermission('shipments:read_own'), async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT o.order_id as shipment_id, o.customer_name, o.delivery_address, o.status, o.updated_at, w.name as warehouse_name,
              o.cod_amount, o.cod_collected, o.customer_verified, o.proof_of_delivery, o.delivery_failure_reason,
              o.delivery_attempts, o.rescheduled_date, o.route_sequence, o.gps_lat, o.gps_lng
       FROM orders o
       LEFT JOIN warehouses w ON o.warehouse_id = w.warehouse_id
       WHERE o.assigned_delivery_user_id = $1
       ORDER BY o.route_sequence, o.updated_at DESC`,
      [req.user.user_id]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch shipments' });
  }
});

router.put('/shipments/:id(\\d+)/status', requirePermission('shipments:update_status'), async (req, res) => {
  try {
    const { status, customer_verified, cod_collected, proof_of_delivery, delivery_failure_reason, rescheduled_date, gps_lat, gps_lng } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }

    if (status === 'Delivered' && !customer_verified) {
      return res.status(400).json({ success: false, message: 'Customer verification is required before delivery completion' });
    }

    if (status === 'Delivered' && !proof_of_delivery) {
      return res.status(400).json({ success: false, message: 'Proof of delivery is required' });
    }

    if (status === 'Delivery Failed' && !delivery_failure_reason) {
      return res.status(400).json({ success: false, message: 'Failure reason is required' });
    }

    const result = await db.query(
      `UPDATE orders
       SET status = $1,
           customer_verified = COALESCE($4, customer_verified),
           cod_collected = COALESCE($5, cod_collected),
           proof_of_delivery = COALESCE($6, proof_of_delivery),
           delivery_failure_reason = COALESCE($7, delivery_failure_reason),
           rescheduled_date = COALESCE($8, rescheduled_date),
           gps_lat = COALESCE($9, gps_lat),
           gps_lng = COALESCE($10, gps_lng),
           delivery_attempts = CASE WHEN $1 = 'Delivery Failed' THEN delivery_attempts + 1 ELSE delivery_attempts END,
           updated_at = NOW()
       WHERE order_id = $2 AND assigned_delivery_user_id = $3`,
      [
        status,
        req.params.id,
        req.user.user_id,
        typeof customer_verified === 'boolean' ? customer_verified : null,
        typeof cod_collected === 'boolean' ? cod_collected : null,
        proof_of_delivery || null,
        delivery_failure_reason || null,
        rescheduled_date || null,
        gps_lat || null,
        gps_lng || null,
      ]
    );
    if (!result.rowCount) {
      return res.status(404).json({ success: false, message: 'Shipment not found' });
    }
    return res.json({ success: true, message: 'Shipment status updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update shipment status' });
  }
});

router.get('/settings', requirePermission('settings:read'), async (req, res) => {
  try {
    const settings = await db.query('SELECT * FROM settings ORDER BY key');
    const roles = await db.query('SELECT * FROM roles ORDER BY role_id');
    const rolesForSettings = roles.rows.map((role) => ({
      ...role,
      permissions: exactPermissionsToLegacy(role.permissions),
    }));
    return res.json({
      success: true,
      data: {
        settings: settings.rows,
        roles: rolesForSettings
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch settings' });
  }
});

router.post('/settings', requirePermission('settings:update'), async (req, res) => {
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

router.put('/roles/:id/permissions', requirePermission('roles:manage'), async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;

    if (!permissions) {
      return res.status(400).json({ success: false, message: 'Permissions object is required' });
    }

    const currentRole = await db.query('SELECT permissions FROM roles WHERE role_id = $1', [id]);
    if (!currentRole.rows.length) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    const exactPermissions = legacyPermissionsToExact(permissions, currentRole.rows[0].permissions);
    await db.query('UPDATE roles SET permissions = $1 WHERE role_id = $2', [JSON.stringify(exactPermissions), id]);
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
async function loadReportRows(type, req) {
  const limitedReportTypes = [
    'inventory',
    'warehouse_performance',
    'stock_movement',
    'order',
    'inbound',
    'outbound',
    'task_performance',
    'delivery',
    'delivery_performance',
    'failed_delivery',
    'payment_collection',
    'route_summary',
    'customer_feedback',
    'worker_productivity',
  ];
  if (hasPermission(req.user, 'reports:read_limited') && !hasPermission(req.user, 'reports:read') && !limitedReportTypes.includes(type)) {
    return null;
  }

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
    case 'purchase':
    case 'inbound': {
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
    case 'sales':
    case 'order':
    case 'outbound': {
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
    case 'delivery':
    case 'delivery_performance':
    case 'failed_delivery':
    case 'payment_collection':
    case 'route_summary':
    case 'customer_feedback': {
      const delRes = await db.query(`
        SELECT o.order_id, o.customer_name, o.delivery_address, o.status, o.total_amount, o.cod_amount, o.cod_collected,
               o.delivery_failure_reason, o.route_sequence, o.updated_at as delivery_date,
               u.first_name, u.last_name as delivery_staff
        FROM orders o
        LEFT JOIN users u ON o.assigned_delivery_user_id = u.user_id
        WHERE o.status IN ('Collected', 'Dispatched', 'En Route', 'Shipped', 'Out for Delivery', 'Delivered', 'Delivery Failed')
        ORDER BY o.updated_at DESC
      `);
      rows = delRes.rows;
      break;
    }
    case 'task_performance':
    case 'worker_productivity': {
      const taskRes = await db.query(`
        SELECT t.task_id, t.title, t.task_type, t.status, t.priority, t.target_quantity, t.updated_at,
               u.first_name, u.last_name, w.name as warehouse_name
        FROM tasks t
        LEFT JOIN users u ON t.assigned_user_id = u.user_id
        LEFT JOIN warehouses w ON t.warehouse_id = w.warehouse_id
        ORDER BY t.updated_at DESC
      `);
      rows = taskRes.rows;
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

router.get('/reports/:type/export', requirePermission('reports:export'), async (req, res) => {
  try {
    const { type } = req.params;
    const format = String(req.query.format || 'csv').toLowerCase();
    const rows = await loadReportRows(type, req);

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

router.get('/reports/:type', requireAnyPermission('reports:read', 'reports:read_limited'), async (req, res) => {
  try {
    const { type } = req.params;
    const rows = await loadReportRows(type, req);

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
