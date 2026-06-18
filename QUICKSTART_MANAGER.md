# WMS Quick Start Guide (Manager Dashboard)

## ⚡ 5-Minute Setup

### Prerequisites
- Node.js 16+ and npm 8+
- PostgreSQL 12+ running
- Redis 6+ running
- Git

### Step 1: Clone & Navigate
```bash
cd /path/to/wms
```

### Step 2: Create Backend Config
```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` with your local database:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_NAME=wms_db
```

### Step 3: Initialize Database
```bash
# Create database and schema
createdb wms_db
psql -U postgres -d wms_db -f src/scripts/schema.sql

# (Optional) Load test data
psql -U postgres -d wms_db -f src/scripts/seed.sql
```

### Step 4: Start Backend
```bash
npm install
npm run dev
# Backend runs on http://localhost:4000
```

### Step 5: Start Frontend (in another terminal)
```bash
cd frontend
npm install
npm start
# Frontend opens on http://localhost:3000
```

### Step 6: Login as Manager
```
Email: manager@wms.example.com
Password: Manager@12345
```

---

## 📊 Manager Dashboard Walkthrough

### Dashboard Summary
Shows key metrics:
- **Total Inventory Value** — Current stock valuation
- **Total Orders** — All orders in system
- **Pending Tasks** — Tasks not yet completed
- **Inbound Shipments** — Pending purchase orders
- **Outbound Shipments** — Orders awaiting dispatch
- **Low Stock Alerts** — Items below reorder level
- **Overdue Tasks** — Tasks past due date
- **Today's Activities** — Audit log entries today

### Inventory Monitoring
- Search products by **SKU**, **name**, or **barcode**
- View stock levels per warehouse
- Identify low stock items
- Request stock adjustments (approval workflow)

### Order Management
- View all orders with status
- Search orders by **Order ID** or **customer name**
- Assign orders to warehouse workers
- Update order status (Pending → Packed → Shipped → Delivered)
- Track order progress

### Task Management
- Create new picking/packing tasks
- Assign tasks to specific workers
- Set priority (High, Normal, Low)
- Track completion status
- Mark tasks as completed

### Inbound Management (Purchase Orders)
- View all inbound shipments
- Update PO status (Pending → Approved → In Transit → Received)
- Receive shipments (auto-increments inventory)
- Track expected delivery dates

### Outbound Management (Sales Orders)
- Monitor outbound shipments
- Review pick & pack lists
- Approve shipments for dispatch
- Update delivery status
- Track delivery progress

### Reports & Analytics
- **KPI Metrics:**
  - Inventory Turnover
  - Order Fulfillment Rate
  - On-Time Delivery %
  - Stock Accuracy %
- **Export Reports:**
  - Inventory report (CSV/Excel)
  - Stock movement history
  - Order fulfillment report
  - Warehouse performance metrics

### Settings
- Manage warehouse staff roles
- Configure system settings
- View role permissions
- Manage user access levels

---

## 🔑 Role-Based Dashboard Access

| Role | Login Email | Dashboard | Access |
|------|-------------|-----------|--------|
| **Admin** | admin@wms.example.com | /admin | All modules, system settings, user management |
| **Manager** | manager@wms.example.com | /manager | Inventory, orders, tasks, reports, staff |
| **Worker** | worker@wms.example.com | /worker | My tasks, picking, packing, scanning |
| **Delivery** | delivery@wms.example.com | /delivery | My shipments, delivery tracking, GPS, COD |

---

## 📡 API Usage Examples

All API calls use the token from login response in the Authorization header.

### 1. Get Dashboard Summary
```bash
curl -X GET http://localhost:4000/api/dashboard/manager/summary \
  -H "Authorization: Bearer $TOKEN"
```

### 2. List Inventory
```bash
curl -X GET "http://localhost:4000/api/inventory?search=PROD" \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Create Task
```bash
curl -X POST http://localhost:4000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Pick Order #1234",
    "assigned_user_id": 3,
    "task_type": "pick",
    "priority": "High"
  }'
```

### 4. Update Order Status
```bash
curl -X PUT http://localhost:4000/api/orders/1001/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"status": "Shipped"}'
```

### 5. Export Report
```bash
curl -X GET "http://localhost:4000/api/reports/inventory/export?format=csv" \
  -H "Authorization: Bearer $TOKEN" \
  -o inventory.csv
```

---

## 🐛 Troubleshooting

### Login fails
```bash
# Check if user exists
psql -c "SELECT email, role_name FROM users JOIN roles ON users.role_id = roles.role_id;"

# Reset password manually
psql -c "UPDATE users SET password_hash = bcrypt('newpassword', 12) WHERE email = 'email@wms.example.com';"
```

### Backend won't start
```bash
# Check Node version
node --version  # Must be 16+

# Check database connection
psql -U postgres -d wms_db -c "SELECT 1;"

# Check Redis
redis-cli ping  # Must respond "PONG"
```

### Frontend won't connect to backend
```bash
# Verify backend is running
curl http://localhost:4000/health

# Check CORS is enabled
grep ALLOWED_ORIGINS backend/.env
```

### Database is locked
```bash
# Terminate active connections
psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='wms_db' AND pid <> pg_backend_pid();"

# Restart service
sudo systemctl restart postgresql
```

---

## 📚 Full Documentation
See [RBAC_SETUP.md](./RBAC_SETUP.md) for:
- Complete API endpoint reference
- Security features
- Production deployment
- cURL examples for all endpoints
- Permission matrix
- Database schema

---

## ✅ Next Steps

1. **Configure Warehouse Scoping**
   - Assign manager to specific warehouse
   - Update `users.warehouse_id` in database

2. **Customize Permissions**
   - Edit role permissions in Settings
   - Grant/revoke granular permissions per role

3. **Setup Email for Password Reset**
   - Configure SMTP credentials in `.env`
   - Test password reset flow

4. **Enable Audit Logging**
   - Monitor `audit_logs` table
   - Set up alerts for sensitive actions

5. **Deploy to Production**
   - Use Docker or PM2 for process management
   - Enable HTTPS/TLS
   - Use strong JWT secrets
   - Configure Redis persistence

---

## 🆘 Support

For issues or questions:
1. Check [RBAC_SETUP.md](./RBAC_SETUP.md) Troubleshooting section
2. Review backend logs: `npm run dev` (watch terminal)
3. Check PostgreSQL logs: `/var/log/postgresql/`
4. Inspect browser DevTools (Frontend) → Network tab
5. Check audit_logs table for action history

---

**Happy Warehouse Managing! 🚀**
