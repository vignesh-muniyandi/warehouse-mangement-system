INSERT INTO roles (role_id, role_name, permissions) VALUES
  (1, 'Admin', '["users:create","users:read","users:update","users:delete","products:create","products:read","products:update","products:delete","inventory:create","inventory:read","inventory:update","inventory:delete","purchase_orders:create","purchase_orders:read","purchase_orders:approve","orders:create","orders:read","orders:update","orders:assign","settings:read","settings:update","reports:read","reports:export","roles:manage"]'),
  (2, 'Warehouse Manager', '["inventory:read","inventory:request_adjust","orders:read","orders:update","orders:assign","orders:track","tasks:create","tasks:read","tasks:update","purchase_orders:read","purchase_orders:receive","reports:read_limited","reports:export","settings:read"]'),
  (3, 'Worker/Operator', '["tasks:read_own","tasks:update_own","inventory:scan","pick:read_own","pick:update_own","pack:update_own","reports:read_limited","reports:export"]'),
  (4, 'Delivery Team', '["shipments:read_own","shipments:update_status","reports:read_limited","reports:export"]')
ON CONFLICT (role_id) DO UPDATE SET permissions = EXCLUDED.permissions;

INSERT INTO permissions (code, description, category) VALUES
  ('users:create', 'Create users', 'Users'),
  ('users:read', 'View users', 'Users'),
  ('users:update', 'Update users', 'Users'),
  ('users:delete', 'Delete users', 'Users'),
  ('products:create', 'Create products', 'Products'),
  ('products:read', 'View products', 'Products'),
  ('products:update', 'Update products', 'Products'),
  ('products:delete', 'Delete products', 'Products'),
  ('inventory:create', 'Create inventory', 'Inventory'),
  ('inventory:read', 'View inventory dashboard', 'Inventory'),
  ('inventory:update', 'Manage stock quantities', 'Inventory'),
  ('inventory:delete', 'Delete inventory', 'Inventory'),
  ('inventory:request_adjust', 'Request stock adjustments', 'Inventory'),
  ('inventory:scan', 'Scan inventory barcodes', 'Inventory'),
  ('purchase_orders:create', 'Create purchase orders', 'Purchase'),
  ('purchase_orders:read', 'View purchase orders', 'Purchase'),
  ('purchase_orders:approve', 'Approve purchase orders', 'Purchase'),
  ('orders:create', 'Create orders', 'Orders'),
  ('orders:read', 'View orders', 'Orders'),
  ('orders:update', 'Update orders', 'Orders'),
  ('orders:assign', 'Assign orders', 'Orders'),
  ('orders:track', 'Track orders', 'Orders'),
  ('tasks:create', 'Create warehouse tasks', 'Tasks'),
  ('tasks:read', 'View all warehouse tasks', 'Tasks'),
  ('tasks:update', 'Update warehouse tasks', 'Tasks'),
  ('tasks:read_own', 'View assigned tasks', 'Tasks'),
  ('tasks:update_own', 'Update assigned tasks', 'Tasks'),
  ('pick:read_own', 'View assigned pick list', 'Tasks'),
  ('pick:update_own', 'Update assigned pick tasks', 'Tasks'),
  ('pack:update_own', 'Update assigned pack tasks', 'Tasks'),
  ('shipments:read_own', 'View assigned shipments', 'Delivery'),
  ('shipments:update_status', 'Update assigned shipments', 'Delivery'),
  ('settings:read', 'View settings', 'Settings'),
  ('settings:update', 'Update settings', 'Settings'),
  ('reports:read', 'View all reports', 'Reports'),
  ('reports:read_limited', 'View warehouse reports', 'Reports'),
  ('reports:export', 'Export reports', 'Reports'),
  ('roles:manage', 'Manage roles and permissions', 'Security')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
JOIN LATERAL jsonb_array_elements_text(r.permissions) rp(code) ON true
JOIN permissions p ON p.code = rp.code
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO users (role_id, first_name, last_name, email, password_hash, phone, status)
VALUES
  (1, 'Admin', 'User', 'admin@wms.example.com', '$2b$12$m7ap4.UFpslTHIbqV4oBDuHsNFRj7Vt1fdVEKF8IxEKnFenCVxdNa', '555-0100', 'Active')
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (role_id, first_name, last_name, email, password_hash, phone, status)
VALUES
  (2, 'Manager', 'User', 'manager@wms.example.com', '$2b$12$m7ap4.UFpslTHIbqV4oBDuHsNFRj7Vt1fdVEKF8IxEKnFenCVxdNa', '555-0101', 'Active'),
  (3, 'Worker', 'User', 'worker@wms.example.com', '$2b$12$m7ap4.UFpslTHIbqV4oBDuHsNFRj7Vt1fdVEKF8IxEKnFenCVxdNa', '555-0102', 'Active'),
  (4, 'Delivery', 'User', 'delivery@wms.example.com', '$2b$12$m7ap4.UFpslTHIbqV4oBDuHsNFRj7Vt1fdVEKF8IxEKnFenCVxdNa', '555-0103', 'Active')
ON CONFLICT (email) DO NOTHING;

INSERT INTO warehouses (warehouse_code, name, location, capacity)
VALUES
  ('WH-001', 'Central Warehouse', '123 Main St, Cityville', 5000)
ON CONFLICT (warehouse_code) DO NOTHING;

UPDATE users
SET warehouse_id = (SELECT warehouse_id FROM warehouses WHERE warehouse_code = 'WH-001')
WHERE warehouse_id IS NULL;

INSERT INTO user_roles (user_id, role_id, is_primary)
SELECT user_id, role_id, TRUE FROM users
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO categories (name, description)
VALUES
  ('Electronics', 'Electronic components and devices'),
  ('Apparel', 'Clothing and textiles'),
  ('Packaging', 'Shipping and packing materials')
ON CONFLICT (name) DO NOTHING;

INSERT INTO suppliers (name, contact_person, email, phone, address)
VALUES
  ('Acme Supplies', 'Jordan Lee', 'orders@acmesupplies.com', '555-0201', '400 Industrial Blvd'),
  ('North Star Logistics', 'Riya Patel', 'supply@northstarlogistics.com', '555-0222', '22 Trade Park')
ON CONFLICT (name) DO NOTHING;

INSERT INTO products (sku, barcode, name, category_id, supplier_id, unit_price, reorder_level, description)
VALUES
  ('P-1001', '100000001', 'Wireless Scanner', 1, 1, 89.99, 10, 'Handheld RFID and barcode scanner'),
  ('P-1002', '100000002', 'Warehouse Jacket', 2, 2, 49.5, 20, 'Durable high-visibility jacket'),
  ('P-1003', '100000003', 'Shipping Box - Medium', 3, 1, 2.15, 100, 'Corrugated cardboard box')
ON CONFLICT (sku) DO NOTHING;

INSERT INTO inventory (product_id, warehouse_id, quantity_available, quantity_reserved, damaged_quantity)
SELECT p.product_id, w.warehouse_id, 120, 8, 2
FROM products p, warehouses w
WHERE p.sku = 'P-1001' AND w.warehouse_code = 'WH-001'
ON CONFLICT (product_id, warehouse_id) DO NOTHING;

INSERT INTO inventory (product_id, warehouse_id, quantity_available, quantity_reserved, damaged_quantity)
SELECT p.product_id, w.warehouse_id, 250, 15, 3
FROM products p, warehouses w
WHERE p.sku = 'P-1002' AND w.warehouse_code = 'WH-001'
ON CONFLICT (product_id, warehouse_id) DO NOTHING;

INSERT INTO inventory (product_id, warehouse_id, quantity_available, quantity_reserved, damaged_quantity)
SELECT p.product_id, w.warehouse_id, 800, 22, 5
FROM products p, warehouses w
WHERE p.sku = 'P-1003' AND w.warehouse_code = 'WH-001'
ON CONFLICT (product_id, warehouse_id) DO NOTHING;

INSERT INTO settings (key, value, category, description)
VALUES
  ('warehouse.name', 'Central Warehouse Management', 'General', 'Display name for the warehouse system'),
  ('notifications.email_enabled', 'true', 'Notifications', 'Send email alerts for new orders and low stock'),
  ('audit.retention_days', '90', 'Security', 'Days to keep audit logs')
ON CONFLICT (key) DO NOTHING;

INSERT INTO system_notifications (user_id, title, message)
SELECT u.user_id, 'Welcome to WMS', 'Your Warehouse Management System account is ready. Explore dashboard summaries and manage inventory.'
FROM users u
WHERE u.email = 'admin@wms.example.com'
ON CONFLICT DO NOTHING;

INSERT INTO orders (customer_name, warehouse_id, assigned_user_id, assigned_delivery_user_id, status, total_amount, delivery_address, cod_amount, route_sequence, gps_lat, gps_lng)
SELECT 'Aarav Retail', w.warehouse_id, worker.user_id, delivery.user_id, 'Pending', 239.98, '18 Market Road, Cityville', 0, 1, 12.971600, 77.594600
FROM warehouses w
JOIN users worker ON worker.email = 'worker@wms.example.com'
JOIN users delivery ON delivery.email = 'delivery@wms.example.com'
WHERE w.warehouse_code = 'WH-001'
ON CONFLICT DO NOTHING;

INSERT INTO orders (customer_name, warehouse_id, assigned_user_id, assigned_delivery_user_id, status, total_amount, delivery_address, cod_amount, route_sequence, gps_lat, gps_lng)
SELECT 'Nimbus Stores', w.warehouse_id, worker.user_id, delivery.user_id, 'Out for Delivery', 148.50, '42 Lake View Street, Cityville', 148.50, 2, 12.976400, 77.603300
FROM warehouses w
JOIN users worker ON worker.email = 'worker@wms.example.com'
JOIN users delivery ON delivery.email = 'delivery@wms.example.com'
WHERE w.warehouse_code = 'WH-001'
ON CONFLICT DO NOTHING;

INSERT INTO tasks (warehouse_id, assigned_user_id, created_by_user_id, title, task_type, status, priority, notes, target_quantity, location_code)
SELECT w.warehouse_id, worker.user_id, manager.user_id, 'Receive PO #1001 and validate cartons', 'receive', 'In Progress', 'High', 'Check supplier ASN before putaway.', 12, 'DOCK-01'
FROM warehouses w
JOIN users worker ON worker.email = 'worker@wms.example.com'
JOIN users manager ON manager.email = 'manager@wms.example.com'
WHERE w.warehouse_code = 'WH-001'
ON CONFLICT DO NOTHING;

INSERT INTO tasks (warehouse_id, assigned_user_id, created_by_user_id, title, task_type, status, priority, notes, target_quantity, location_code)
SELECT w.warehouse_id, worker.user_id, manager.user_id, 'Pick scanners for Aarav Retail', 'pick', 'Pending', 'High', 'Scan item and confirm BIN-A1 before pick.', 2, 'BIN-A1'
FROM warehouses w
JOIN users worker ON worker.email = 'worker@wms.example.com'
JOIN users manager ON manager.email = 'manager@wms.example.com'
WHERE w.warehouse_code = 'WH-001'
ON CONFLICT DO NOTHING;

INSERT INTO tasks (warehouse_id, assigned_user_id, created_by_user_id, title, task_type, status, priority, notes, target_quantity, location_code)
SELECT w.warehouse_id, worker.user_id, manager.user_id, 'Pack Nimbus COD order', 'pack', 'Pending', 'Normal', 'Verify COD label before sealing.', 3, 'PACK-02'
FROM warehouses w
JOIN users worker ON worker.email = 'worker@wms.example.com'
JOIN users manager ON manager.email = 'manager@wms.example.com'
WHERE w.warehouse_code = 'WH-001'
ON CONFLICT DO NOTHING;
