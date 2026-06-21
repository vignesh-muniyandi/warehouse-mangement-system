-- PostgreSQL schema for Warehouse Management System

CREATE TABLE IF NOT EXISTS roles (
  role_id SERIAL PRIMARY KEY,
  role_name VARCHAR(64) NOT NULL UNIQUE,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE roles
  ALTER COLUMN permissions SET DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS permissions (
  permission_id SERIAL PRIMARY KEY,
  code VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  category VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_permission_id SERIAL PRIMARY KEY,
  role_id INTEGER NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES permissions(permission_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS users (
  user_id SERIAL PRIMARY KEY,
  role_id INTEGER NOT NULL REFERENCES roles(role_id) ON DELETE RESTRICT,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(32),
  status VARCHAR(32) NOT NULL DEFAULT 'Active',
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_role_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  role_id INTEGER NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT TRUE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role_id)
);

CREATE TABLE IF NOT EXISTS warehouses (
  warehouse_id SERIAL PRIMARY KEY,
  warehouse_code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  location TEXT,
  capacity INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS warehouse_id INTEGER REFERENCES warehouses(warehouse_id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS categories (
  category_id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suppliers (
  supplier_id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL UNIQUE,
  contact_person VARCHAR(150),
  email VARCHAR(255),
  phone VARCHAR(64),
  address TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  product_id SERIAL PRIMARY KEY,
  sku VARCHAR(100) NOT NULL UNIQUE,
  barcode VARCHAR(100) UNIQUE,
  name VARCHAR(255) NOT NULL,
  category_id INTEGER REFERENCES categories(category_id) ON DELETE SET NULL,
  supplier_id INTEGER REFERENCES suppliers(supplier_id) ON DELETE SET NULL,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  reorder_level INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory (
  inventory_id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  warehouse_id INTEGER NOT NULL REFERENCES warehouses(warehouse_id) ON DELETE CASCADE,
  quantity_available INTEGER NOT NULL DEFAULT 0,
  quantity_reserved INTEGER NOT NULL DEFAULT 0,
  damaged_quantity INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, warehouse_id)
);

CREATE TABLE IF NOT EXISTS stock_movements (
  movement_id SERIAL PRIMARY KEY,
  inventory_id INTEGER NOT NULL REFERENCES inventory(inventory_id) ON DELETE CASCADE,
  from_warehouse_id INTEGER REFERENCES warehouses(warehouse_id) ON DELETE SET NULL,
  to_warehouse_id INTEGER REFERENCES warehouses(warehouse_id) ON DELETE SET NULL,
  movement_type VARCHAR(80) NOT NULL,
  quantity INTEGER NOT NULL,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  purchase_order_id SERIAL PRIMARY KEY,
  supplier_id INTEGER NOT NULL REFERENCES suppliers(supplier_id) ON DELETE RESTRICT,
  warehouse_id INTEGER NOT NULL REFERENCES warehouses(warehouse_id) ON DELETE RESTRICT,
  created_by_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Pending',
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  expected_delivery_date TIMESTAMPTZ,
  received_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  item_id SERIAL PRIMARY KEY,
  purchase_order_id INTEGER NOT NULL REFERENCES purchase_orders(purchase_order_id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(product_id) ON DELETE RESTRICT,
  quantity_ordered INTEGER NOT NULL DEFAULT 0,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  received_quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  order_id SERIAL PRIMARY KEY,
  customer_name VARCHAR(255) NOT NULL,
  warehouse_id INTEGER REFERENCES warehouses(warehouse_id) ON DELETE SET NULL,
  assigned_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  assigned_delivery_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Pending',
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  delivery_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS assigned_delivery_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS cod_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cod_collected BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS customer_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS proof_of_delivery TEXT,
  ADD COLUMN IF NOT EXISTS delivery_failure_reason TEXT,
  ADD COLUMN IF NOT EXISTS delivery_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rescheduled_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS route_sequence INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gps_lat NUMERIC(10,6),
  ADD COLUMN IF NOT EXISTS gps_lng NUMERIC(10,6);

CREATE TABLE IF NOT EXISTS tasks (
  task_id SERIAL PRIMARY KEY,
  warehouse_id INTEGER REFERENCES warehouses(warehouse_id) ON DELETE SET NULL,
  assigned_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  created_by_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  task_type VARCHAR(64) NOT NULL DEFAULT 'general',
  status VARCHAR(50) NOT NULL DEFAULT 'Pending',
  priority VARCHAR(50) NOT NULL DEFAULT 'Normal',
  notes TEXT,
  target_quantity INTEGER NOT NULL DEFAULT 1,
  scanned_code VARCHAR(100),
  location_code VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS target_quantity INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS scanned_code VARCHAR(100),
  ADD COLUMN IF NOT EXISTS location_code VARCHAR(100);

CREATE TABLE IF NOT EXISTS inventory_adjustment_requests (
  request_id SERIAL PRIMARY KEY,
  inventory_id INTEGER REFERENCES inventory(inventory_id) ON DELETE SET NULL,
  product_id INTEGER REFERENCES products(product_id) ON DELETE SET NULL,
  warehouse_id INTEGER REFERENCES warehouses(warehouse_id) ON DELETE SET NULL,
  requested_by_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  adjustment_type VARCHAR(50) NOT NULL,
  quantity INTEGER NOT NULL,
  reason TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  order_item_id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(product_id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
  setting_id SERIAL PRIMARY KEY,
  key VARCHAR(150) NOT NULL UNIQUE,
  value TEXT NOT NULL,
  category VARCHAR(100),
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_notifications (
  notification_id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  read_status BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  audit_id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  action VARCHAR(128) NOT NULL,
  ip_address VARCHAR(64),
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Delivery specific schema
CREATE TABLE IF NOT EXISTS delivery_assignments (
  assignment_id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  route_id INTEGER,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shipments (
  shipment_id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(order_id) ON DELETE SET NULL,
  customer_name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  phone VARCHAR(64),
  package_count INTEGER NOT NULL DEFAULT 1,
  payment_type VARCHAR(32) DEFAULT 'Prepaid',
  cod_amount NUMERIC(12,2) DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'assigned',
  assigned_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  route_id INTEGER,
  last_update TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shipment_items (
  id SERIAL PRIMARY KEY,
  shipment_id INTEGER REFERENCES shipments(shipment_id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(product_id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS delivery_tracking (
  tracking_id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(order_id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  latitude NUMERIC(10,6),
  longitude NUMERIC(10,6),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_proofs (
  proof_id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(order_id) ON DELETE CASCADE,
  signature_image TEXT,
  delivery_photo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS failed_deliveries (
  failed_id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(order_id) ON DELETE CASCADE,
  reason VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
