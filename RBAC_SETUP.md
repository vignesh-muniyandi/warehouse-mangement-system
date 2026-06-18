# Role-Based Access Control (RBAC) — Complete Setup & Deployment Guide

## Overview
Your WMS features a production-ready RBAC system with:
- **JWT-based authentication** (8h access + 7d refresh tokens)
- **Role & permission-based authorization** (Admin, Manager, Worker, Delivery)
- **Encrypted password** storage (bcrypt, 12 rounds)
- **Rate limiting** on login attempts
- **Audit logging** for all sensitive actions
- **Warehouse scoping** for multi-warehouse deployments

---

## Prerequisites

### Backend
- Node.js 16+ and npm 8+
- PostgreSQL 12+ with schema initialized
- Redis 6+ (for refresh tokens + rate limiting)

### Frontend
- React 18+ with React Router 6+
- Axios for HTTP
- Tailwind CSS or Material-UI for styling

---

## Backend Setup

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Create .env File
```env
# Server
PORT=4000
NODE_ENV=development

# JWT Secrets (use strong random strings in production)
JWT_SECRET=your_super_secret_jwt_key_min_32_chars_abc123!@#$%^&*
REFRESH_TOKEN_SECRET=your_refresh_token_secret_min_32_chars_xyz789!@#$%^&*
RESET_PASSWORD_SECRET=your_reset_token_secret_min_32_chars_pqr456!@#$%^&*

# Token Expiry
ACCESS_TOKEN_EXPIRY=8h
REFRESH_TOKEN_EXPIRY=7d
RESET_TOKEN_EXPIRY=15m

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_db_password
DB_NAME=wms_db

# Redis (for refresh tokens, rate limiting, sessions)
REDIS_URL=redis://localhost:6379

# Email (optional, for password resets)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=noreply@wms.example.com

# Audit & Security
MAX_FAILED_LOGIN_ATTEMPTS=5
LOCK_WINDOW_MINUTES=10
```

### 3. Initialize PostgreSQL Schema
```bash
# Connect to your PostgreSQL database and run the schema
psql -U postgres -d wms_db -f backend/src/scripts/schema.sql

# (Optional) Seed test data
psql -U postgres -d wms_db -f backend/src/scripts/seed.sql
```

**Test Users (from seed.sql):**
- **Admin**: `admin@wms.example.com` / `Admin@12345`
- **Manager**: `manager@wms.example.com` / `Manager@12345`
- **Worker**: `worker@wms.example.com` / `Worker@12345`
- **Delivery**: `delivery@wms.example.com` / `Delivery@12345`

### 4. Start Redis
```bash
# macOS (Homebrew)
brew services start redis

# Linux (systemd)
sudo systemctl start redis-server

# Docker
docker run -d -p 6379:6379 redis:latest
```

### 5. Start Backend Server
```bash
npm run dev
# or production: npm run build && npm start
```

Server runs on `http://localhost:4000`

---

## Frontend Setup

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Create .env.local (Optional)
```env
REACT_APP_API_URL=http://localhost:4000/api
```

### 3. Start Development Server
```bash
npm start
```

Frontend runs on `http://localhost:3000`

---

## Authentication Flow

### 1. **Login**
User submits `email` and `password`.

**Backend:**
- Validates input
- Queries `users` table and joins `roles`
- Verifies password using bcrypt
- Generates JWT access token (8h) + refresh token (7d)
- Stores refresh token in Redis for rotation
- Sets `refreshToken` in httpOnly cookie
- Returns `{ token, user }`

**Frontend:**
- Stores `token` in `localStorage`
- Stores `user` in `localStorage` (with role_id, role_name)
- Sets default Authorization header in Axios
- Redirects to role-based dashboard

### 2. **Protected Routes**
`ProtectedRoute` component checks:
- Token exists in localStorage
- User is authenticated
- Allowed roles/permissions match
- Redirects to `/unauthorized` if denied

### 3. **Token Refresh**
When access token expires (8h):
- Frontend sends refresh token (from cookie or localStorage)
- Backend validates it against Redis
- Returns new access token
- Refresh token is rotated (new token issued)

### 4. **Logout**
- Backend invalidates all refresh tokens in Redis
- Clears cookie
- Frontend clears localStorage

---

## API Endpoints

### Authentication Routes

#### POST `/auth/login`
Login with email and password.

**Request:**
```json
{
  "email": "manager@wms.example.com",
  "password": "Manager@12345"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "user_id": 2,
    "first_name": "John",
    "last_name": "Doe",
    "email": "manager@wms.example.com",
    "role_id": 2,
    "role_name": "Warehouse Manager"
  }
}
```

#### POST `/auth/logout`
Logout (requires authentication).

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### POST `/auth/refresh`
Refresh access token (uses httpOnly refresh cookie).

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### GET `/auth/me`
Get current user profile (requires authentication).

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "user_id": 2,
      "first_name": "John",
      "last_name": "Doe",
      "email": "manager@wms.example.com",
      "phone": "555-1234",
      "status": "Active",
      "role_name": "Warehouse Manager",
      "role_id": 2
    }
  }
}
```

#### POST `/auth/forgot-password`
Request password reset link (email sent).

**Request:**
```json
{
  "email": "manager@wms.example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "If this email exists, a reset link has been sent"
}
```

#### POST `/auth/reset-password`
Reset password with token from email.

**Request:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "newPassword": "NewPassword@12345"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successful"
}
```

---

### Manager Dashboard Endpoints

All endpoints require `Authorization: Bearer {token}` header.

#### GET `/api/dashboard/manager/summary`
Summary cards (inventory value, orders, tasks, etc.).

**Response:**
```json
{
  "success": true,
  "data": {
    "totalInventoryValue": 125450.50,
    "totalOrders": 42,
    "pendingTasks": 8,
    "inboundShipments": 5,
    "outboundShipments": 12,
    "lowStockAlerts": 3,
    "overdueTasks": 2,
    "todaysActivities": 18
  }
}
```

#### GET `/api/dashboard/manager/kpis`
KPI metrics (turnover, fulfillment rate, on-time delivery, stock accuracy).

**Response:**
```json
{
  "success": true,
  "data": {
    "inventoryTurnover": 3.45,
    "orderFulfillmentRate": 92.5,
    "onTimeDelivery": 88.3,
    "stockAccuracy": 97.8
  }
}
```

#### GET `/api/inventory`
List all inventory items (with search by SKU/name/barcode).

**Query Parameters:**
- `search`: Filter by SKU, product name, or barcode

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "inventory_id": 1,
      "product_id": 101,
      "warehouse_id": 1,
      "sku": "PROD-001",
      "product_name": "Widget A",
      "quantity_available": 150,
      "quantity_reserved": 20,
      "damaged_quantity": 2,
      "reorder_level": 50
    }
  ]
}
```

#### POST `/api/inventory/request-adjustment`
Request stock adjustment (creates approval request).

**Request:**
```json
{
  "product_id": 101,
  "warehouse_id": 1,
  "adjustment_type": "add",
  "quantity": 50,
  "reason": "Received shipment from supplier"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Stock adjustment request submitted"
}
```

#### GET `/api/orders`
List all orders (with search, filter by status).

**Query Parameters:**
- `search`: Filter by order ID, customer name
- `status`: Filter by status (Pending, Packed, Shipped, Delivered, etc.)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "order_id": 1001,
      "customer_name": "ABC Corp",
      "status": "Packed",
      "total_amount": 5250.75,
      "warehouse_id": 1,
      "assigned_user_id": 3
    }
  ]
}
```

#### PUT `/api/orders/{id}/assign`
Assign order to warehouse staff.

**Request:**
```json
{
  "assigned_user_id": 3
}
```

**Response:**
```json
{
  "success": true,
  "message": "Warehouse staff assigned successfully"
}
```

#### PUT `/api/orders/{id}/status`
Update order status.

**Request:**
```json
{
  "status": "Shipped"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Order status updated successfully"
}
```

#### GET `/api/tasks`
List all tasks assigned to workers.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "task_id": 501,
      "title": "Pick Order #1001",
      "task_type": "pick",
      "status": "In Progress",
      "priority": "High",
      "assigned_user_id": 3,
      "assigned_user_name": "John Worker"
    }
  ]
}
```

#### POST `/api/tasks`
Create new task.

**Request:**
```json
{
  "title": "Pick Order #1002",
  "assigned_user_id": 3,
  "task_type": "pick",
  "priority": "Normal",
  "notes": "Urgent order"
}
```

**Response:**
```json
{
  "success": true,
  "data": { "task_id": 502 },
  "message": "Task created successfully"
}
```

#### PUT `/api/tasks/{id}`
Update task (status, priority, notes).

**Request:**
```json
{
  "status": "Completed"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Task updated successfully"
}
```

#### GET `/api/purchase-orders`
List all purchase orders (inbound shipments).

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "purchase_order_id": 2001,
      "supplier_id": 5,
      "supplier_name": "Supplier Corp",
      "status": "In Transit",
      "total_amount": 15000.00,
      "expected_delivery_date": "2026-06-25"
    }
  ]
}
```

#### PUT `/api/purchase-orders/{id}/status`
Update purchase order status (Pending, Approved, In Transit, Received).

**Request:**
```json
{
  "status": "Received"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Status updated to Received"
}
```

#### GET `/api/staff`
List warehouse staff (workers and delivery team).

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "user_id": 3,
      "first_name": "John",
      "last_name": "Worker",
      "role_name": "Worker/Operator"
    }
  ]
}
```

#### GET `/api/settings`
Get system settings and role permissions.

**Response:**
```json
{
  "success": true,
  "data": {
    "settings": [
      { "key": "max_order_value", "value": "50000" },
      { "key": "default_warehouse", "value": "1" }
    ],
    "roles": [
      {
        "role_id": 1,
        "role_name": "Admin",
        "permissions": {
          "users": "read,write,delete",
          "products": "read,write",
          "inventory": "read,write,delete"
        }
      }
    ]
  }
}
```

#### POST `/api/settings`
Update system settings.

**Request:**
```json
{
  "settings": {
    "max_order_value": "60000",
    "default_warehouse": "2"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Settings saved successfully"
}
```

#### GET `/api/reports/{type}/export`
Export report (CSV, Excel, PDF).

**Query Parameters:**
- `format`: csv | excel | pdf

**Report Types:**
- `inventory` — Stock levels and valuation
- `stock_movement` — All stock transfers
- `inbound` — Purchase orders
- `outbound` — Sales orders
- `warehouse_performance` — Warehouse metrics
- `delivery_performance` — Delivery KPIs
- `task_performance` — Worker productivity

**Example:**
```
GET /api/reports/inventory/export?format=csv
```

---

## cURL Examples

### 1. Login
```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "manager@wms.example.com",
    "password": "Manager@12345"
  }' \
  -c cookies.txt
```

### 2. Get Current User
```bash
# Save token from login response
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X GET http://localhost:4000/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Get Manager Dashboard Summary
```bash
curl -X GET http://localhost:4000/api/dashboard/manager/summary \
  -H "Authorization: Bearer $TOKEN"
```

### 4. List Inventory
```bash
curl -X GET "http://localhost:4000/api/inventory?search=PROD-001" \
  -H "Authorization: Bearer $TOKEN"
```

### 5. Create Task
```bash
curl -X POST http://localhost:4000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Pick Order #1005",
    "assigned_user_id": 3,
    "task_type": "pick",
    "priority": "High",
    "notes": "Customer urgent request"
  }'
```

### 6. Assign Order to Worker
```bash
curl -X PUT http://localhost:4000/api/orders/1001/assign \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "assigned_user_id": 3
  }'
```

### 7. Update Order Status
```bash
curl -X PUT http://localhost:4000/api/orders/1001/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "status": "Shipped"
  }'
```

### 8. Request Stock Adjustment
```bash
curl -X POST http://localhost:4000/api/inventory/request-adjustment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "product_id": 101,
    "warehouse_id": 1,
    "adjustment_type": "add",
    "quantity": 50,
    "reason": "Received shipment from supplier"
  }'
```

### 9. Update Purchase Order Status
```bash
curl -X PUT http://localhost:4000/api/purchase-orders/2001/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "status": "Received"
  }'
```

### 10. Export Report (CSV)
```bash
curl -X GET "http://localhost:4000/api/reports/inventory/export?format=csv" \
  -H "Authorization: Bearer $TOKEN" \
  -o inventory_report.csv
```

### 11. Refresh Token
```bash
curl -X POST http://localhost:4000/auth/refresh \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

### 12. Logout
```bash
curl -X POST http://localhost:4000/auth/logout \
  -H "Authorization: Bearer $TOKEN" \
  -b cookies.txt
```

---

## Role Hierarchy & Permissions

| Role | ID | Permissions |
|------|-------|-----------|
| **Admin** | 1 | Full access to all modules and settings |
| **Warehouse Manager** | 2 | Inventory, orders, tasks, inbound/outbound, reports (limited) |
| **Worker/Operator** | 3 | Tasks (own), pick/pack operations, inventory scan |
| **Delivery Team** | 4 | Shipments (own), delivery updates, GPS tracking, COD collection |

**Permission Matrix:**

```
Admin:
  - users:read, users:create, users:update, users:delete
  - products:read, products:create, products:update, products:delete
  - inventory:read, inventory:create, inventory:update, inventory:delete
  - purchase_orders:read, purchase_orders:create, purchase_orders:approve
  - orders:read, orders:create, orders:update, orders:assign
  - tasks:read, tasks:create, tasks:update
  - reports:read, reports:export
  - settings:read, settings:update, roles:manage

Warehouse Manager:
  - inventory:read, inventory:update, inventory:request_adjust
  - purchase_orders:read
  - orders:read, orders:assign, orders:update
  - tasks:read, tasks:create, tasks:update
  - reports:read_limited, reports:export
  - settings:read

Worker/Operator:
  - tasks:read_own, tasks:update_own
  - inventory:scan
  - pick:read_own, pick:update_own
  - pack:update_own

Delivery Team:
  - shipments:read_own, shipments:update_status
  - tasks:read_own
```

---

## Security Features

### 1. **Password Encryption**
- bcrypt with 12 salt rounds
- Never stored in plain text

### 2. **JWT Tokens**
- Access token: 8 hours (short-lived)
- Refresh token: 7 days (long-lived, stored in Redis)
- Signature verification on all endpoints
- Prevents token tampering

### 3. **Rate Limiting**
- Login endpoint: 10 requests per 15 minutes per IP
- Failed login: Account locked after 5 attempts for 10 minutes
- Audit log entry for all rate-limit violations

### 4. **RBAC & Authorization**
- Role-based access checks on every endpoint
- Permission-based granular control
- Warehouse scoping for multi-warehouse isolation

### 5. **Audit Logging**
- All sensitive actions logged (login, logout, create/update/delete, settings changes)
- Includes user ID, action, IP address, timestamp, metadata

### 6. **Refresh Token Rotation**
- Each refresh invalidates the old token
- All old tokens stored in Redis with expiry
- Prevents token reuse attacks

### 7. **httpOnly Cookies**
- Refresh token stored in httpOnly cookie (not accessible to JavaScript)
- Secure flag set in production
- SameSite=lax to prevent CSRF

### 8. **HTTPS/TLS**
- All communication encrypted in production
- Secure cookies enforced

---

## Deployment (Production)

### Backend (Node.js + Express)

#### Option 1: Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json .
RUN npm ci --only=production
COPY src src
EXPOSE 4000
CMD ["node", "src/index.js"]
```

```bash
docker build -t wms-backend .
docker run -p 4000:4000 --env-file .env wms-backend
```

#### Option 2: PM2 (Process Manager)
```bash
npm install -g pm2
pm2 start src/index.js --name "wms-backend" --env production
pm2 save
pm2 startup
```

### Frontend (React)

#### Build
```bash
npm run build
# Creates optimized build in frontend/build/
```

#### Deploy to Vercel / Netlify
```bash
# Vercel
npm i -g vercel
vercel --prod

# Netlify
npm run build
# Connect to Netlify and upload build/ folder
```

#### Deploy to Nginx
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/wms-frontend/build;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api/ {
        proxy_pass http://localhost:4000/api/;
    }
}
```

---

## Troubleshooting

### Login fails with "Invalid email or password"
- Verify email is correct
- Confirm user exists in database: `SELECT * FROM users WHERE email = 'email@example.com';`
- Check password by testing bcrypt: `bcrypt.compare(inputPassword, storedHash)`

### Token expiration before 8 hours
- Check `ACCESS_TOKEN_EXPIRY` in .env
- Verify JWT_SECRET is not being reset

### Database connection refused
- Ensure PostgreSQL is running: `psql -c "SELECT 1"`
- Verify `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` in .env
- Check schema is initialized

### Redis connection failed
- Ensure Redis is running: `redis-cli ping`
- Verify `REDIS_URL` in .env
- Check firewall allows port 6379

### "Account locked" after failed logins
- Wait 10 minutes (LOCK_WINDOW_MINUTES)
- Or manually clear Redis: `redis-cli DEL login_fail:{user_id}`
- Admin can unlock: `UPDATE users SET status = 'Active' WHERE user_id = {id};`

---

## Summary

✅ **Complete RBAC System:**
- Backend: Node.js + Express with JWT auth, role/permission checks, audit logging
- Frontend: React with protected routes, localStorage persistence, role-based redirects
- Database: PostgreSQL with users, roles, permissions (JSONB)
- Caching: Redis for refresh tokens + rate limiting
- Security: bcrypt, rate limiting, audit logging, HTTPS ready

✅ **Production-Ready:**
- Clean architecture (routes → controllers → services → db)
- Error handling and validation on all endpoints
- Transaction support for multi-step operations
- Warehouse scoping for multi-warehouse deployments
- Scalable permission model (role + granular permissions)

Next: Configure `.env`, initialize database, and start both servers. Open `http://localhost:3000` to access the frontend.
