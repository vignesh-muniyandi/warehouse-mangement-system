# WMS Authentication Module

This workspace contains a production-ready authentication microservice and React-based role-specific dashboard shell for a Warehouse Management System.

## Tech Stack
- Frontend: React.js, Material UI, React Router DOM, Axios
- Backend: Node.js, Express.js
- Database: PostgreSQL
- Cache / session storage: Redis
- Auth: JWT (access + refresh), bcrypt password hashing

## Backend Setup
1. Copy `.env.example` to `backend/.env` and fill values.
2. Install dependencies:
   - `cd backend && npm install`
3. Create PostgreSQL schema and seed default roles:
   - `psql $DATABASE_URL -f backend/src/scripts/schema.sql`
   - `psql $DATABASE_URL -f backend/src/scripts/seed.sql`
4. Start backend:
   - `cd backend && npm run dev`

## Frontend Setup
1. Install dependencies:
   - `cd frontend && npm install`
2. Start frontend:
   - `cd frontend && npm start`

## Features
- Single login page for all four roles.
- Role-based redirects and dashboards.
- Password hashing with bcrypt.
- JWT access token (8h) plus httpOnly refresh token (7d).
- Redis-backed refresh token storage and session invalidation.
- Forgot password / reset password flow.
- Account lockout after 5 failed login attempts.
- Audit log entries for login, logout, and failed attempts.
- Protected route wrapper with `requireRole` checks.

## Routes
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/refresh`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `GET /auth/me`
