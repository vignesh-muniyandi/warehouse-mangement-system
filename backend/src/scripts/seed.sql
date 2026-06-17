INSERT INTO roles (role_id, role_name, permissions) VALUES
  (1, 'Admin', '{"dashboard":"read,write","users":"read,write,delete","products":"read,write,delete","inventory":"read,write","purchase":"read,write","orders":"read,write","reports":"read","settings":"write"}'),
  (2, 'Warehouse Manager', '{"dashboard":"read","users":"read","products":"read","inventory":"read,write","purchase":"read,write","orders":"read","reports":"read","settings":"read"}'),
  (3, 'Worker/Operator', '{"dashboard":"read","inventory":"read,write","orders":"read","reports":"read"}'),
  (4, 'Delivery Team', '{"dashboard":"read","orders":"read,write","reports":"read"}')
ON CONFLICT (role_id) DO NOTHING;

INSERT INTO permissions (code, description, category) VALUES
  ('users.view', 'View users', 'Users'),
  ('users.manage', 'Create, update or delete users', 'Users'),
  ('products.view', 'View products', 'Products'),
  ('products.manage', 'Create or update products', 'Products'),
  ('inventory.view', 'View inventory dashboard', 'Inventory'),
  ('inventory.manage', 'Manage stock quantities', 'Inventory'),
  ('orders.view', 'View orders', 'Orders'),
  ('orders.manage', 'Create and process orders', 'Orders'),
  ('purchase.view', 'View purchase orders', 'Purchase'),
  ('purchase.manage', 'Create purchase orders', 'Purchase')
ON CONFLICT (code) DO NOTHING;

INSERT INTO users (role_id, first_name, last_name, email, password_hash, phone, status)
VALUES
  (1, 'Admin', 'User', 'admin@wms.example.com', '$2b$12$mFiSSsZdPL0tEBcOHjPkMeekgq2h19t28I.z.RQlAR/mDAnnEGrgq', '555-0100', 'Active')
ON CONFLICT (email) DO NOTHING;

INSERT INTO warehouses (warehouse_code, name, location, capacity)
VALUES
  ('WH-001', 'Central Warehouse', '123 Main St, Cityville', 5000)
ON CONFLICT (warehouse_code) DO NOTHING;

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
