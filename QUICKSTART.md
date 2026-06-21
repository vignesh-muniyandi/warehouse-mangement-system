# WMS Authentication System - Quick Start Guide

## ✅ System Status
- **Backend Auth Service**: Running on `http://localhost:4000`
- **Frontend React App**: Running on `http://localhost:3000`
- **Database**: In-memory fallback (no PostgreSQL needed)
- **Cache/Sessions**: In-memory fallback (no Redis needed)

---

## 🔐 Test Credentials

All demo accounts use password: **`Demo@123`**

### Admin User
- **Email**: `admin@wms.example.com`
- **Password**: `Demo@123`
- **Dashboard**: http://localhost:3000/dashboard/admin
- **Access**: Full system control

### Warehouse Manager
- **Email**: `manager@wms.example.com`
- **Password**: `Demo@123`
- **Dashboard**: http://localhost:3000/dashboard/manager
- **Access**: Inventory, Orders, Tasks, Reports, KPIs

### Worker / Operator
- **Email**: `worker@wms.example.com`
- **Password**: `Demo@123`
- **Dashboard**: http://localhost:3000/dashboard/worker
- **Access**: Tasks, Scan, Pick List, Pack Station

### Delivery Team
- **Email**: `delivery@wms.example.com`
- **Password**: `Demo@123`
- **Dashboard**: http://localhost:3000/dashboard/delivery
- **Access**: My Deliveries, Shipment Status, Routes

---

## 🚀 Getting Started

1. Open browser to **http://localhost:3000**
2. Login with any test account above
3. You'll be auto-redirected to the appropriate dashboard based on your role
4. Use the sidebar menu to navigate role-specific features

---

## 📋 Implemented Features

### Authentication
✅ Single unified login page for all roles  
✅ JWT access token (8-hour expiry)  
✅ Refresh token with httpOnly cookie (7-day expiry)  
✅ Account lockout after 5 failed attempts (10-minute window)  
✅ Password hashing with bcrypt (12 salt rounds)  

### Role-Based Access
✅ Admin dashboard with full system control  
✅ Warehouse Manager operations dashboard  
✅ Worker mobile-friendly task interface  
✅ Delivery Team shipment management  
✅ Role-based navigation sidebars  
✅ Protected routes with role validation  

### Security
✅ JWT verification on all protected endpoints  
✅ Role-based middleware enforcement  
✅ Audit logging for login/logout attempts  
✅ CORS and rate limiting on auth endpoints  
✅ Helmet.js for security headers  

### Development Features
✅ In-memory fallback for Redis (no server needed)  
✅ In-memory fallback for PostgreSQL (no server needed)  
✅ Nodemon for auto-restart on code changes  
✅ React hot-reload for frontend changes  

---

## 🛠️ API Endpoints

**Base URL**: `http://localhost:4000/auth`

### Public Routes
- `POST /auth/login` — Login with email/password
- `POST /auth/forgot-password` — Request password reset
- `POST /auth/reset-password` — Reset password with token

### Protected Routes
- `GET /auth/me` — Get current user profile (requires auth)
- `POST /auth/logout` — Logout and clear session
- `POST /auth/refresh` — Refresh access token

---

## 📂 Project Structure

```
/home/vignesh/Desktop/wms/
├── backend/
│   ├── src/
│   │   ├── index.js           (Express server + middleware)
│   │   ├── routes/authRoutes.js     (Auth endpoints)
│   │   ├── middleware/        (verifyToken, requireRole)
│   │   ├── services/          (Redis, Email, Audit)
│   │   └── db/                (PostgreSQL with fallback)
│   ├── package.json
│   └── .env                   (Configuration)
│
├── frontend/
│   ├── src/
│   │   ├── App.js             (Router & protected routes)
│   │   ├── api/axios.js       (HTTP client + interceptors)
│   │   ├── context/           (Auth context & hooks)
│   │   ├── components/        (Sidebar, ProtectedRoute)
│   │   └── pages/             (Login, Dashboards, Password reset)
│   ├── package.json
│   └── .env                   (API base URL)
│
├── README.md
└── .gitignore
```

---

## 🔄 Next Steps for Production

1. **Set up PostgreSQL**:
   ```bash
   psql $DATABASE_URL -f backend/src/scripts/schema.sql
   psql $DATABASE_URL -f backend/src/scripts/seed.sql
   ```

2. **Set up Redis** (optional for session caching):
   ```bash
   sudo apt install redis-server
   redis-server
   ```

3. **Generate secure JWT secrets** in `.env`:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

4. **Configure SMTP** for password reset emails

5. **Deploy** to production with HTTPS enabled

---

## 📞 Support

Both services auto-fallback gracefully:
- No PostgreSQL? Uses in-memory database
- No Redis? Uses in-memory session storage
- All features work without external services for development

Fully production-ready once you connect real PostgreSQL and Redis.
