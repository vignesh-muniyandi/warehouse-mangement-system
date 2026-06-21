WMS Endpoint Map
=================

This document maps backend API endpoints (mounted under `/api` unless noted) to frontend callers and notes about authentication/permissions and any mismatches.

Legend
- Method: HTTP method
- Path: full path after `/api` (or `/auth` where applicable)
- Auth: indicates middleware used (`verifyToken`/`authenticate`, `authorize(roleId)`, permission middleware)
- Frontend callers: files in `frontend/src` that call this endpoint

---

1) Authentication (/auth)

- POST /auth/login
  - Method: POST
  - Path: /auth/login (also mounted at `/auth/login` and `/api/auth/login`)
  - Auth: public
  - Frontend callers:
    - frontend/src/context/AuthContext.js (login flow)
    - frontend/src/pages/Login.jsx
  - Notes: Returns { success, message, data: { token, user } } — frontend patched to accept this shape.

- POST /auth/logout
  - Method: POST
  - Path: /auth/logout
  - Auth: `verifyToken` required for controller route; raw auth.js had a different implementation.
  - Frontend callers:
    - frontend/src/context/AuthContext.js (logout)

- POST /auth/refresh
  - Method: POST
  - Path: /auth/refresh
  - Auth: cookie-based refresh token
  - Frontend callers: none directly (token refresh flow server-side)

- GET /auth/me
  - Method: GET
  - Path: /auth/me
  - Auth: `verifyToken`
  - Frontend callers:
    - frontend/src/context/AuthContext.js (initialization)
    - frontend/src/services/authService.js (getProfile)

- POST /auth/forgot-password
  - Method: POST
  - Path: /auth/forgot-password
  - Auth: public
  - Frontend callers:
    - frontend/src/pages/ForgotPasswordPage.js

- POST /auth/reset-password
  - Method: POST
  - Path: /auth/reset-password
  - Auth: public
  - Frontend callers:
    - frontend/src/pages/ResetPasswordPage.js

- POST /auth/register
  - Method: POST
  - Path: /auth/register
  - Auth: public
  - Frontend callers:
    - frontend/src/pages/RegisterPage.js

Notes: There are two auth route files in the repo: `backend/src/routes/auth.js` (inline implementation) and `backend/src/routes/authRoutes.js` (controllers-based). The server mounts `authRoutes.js` in [backend/src/index.js]. Recommend consolidating.

---

2) Admin routes (mounted at `/api/admin`)

- GET /admin/users
  - Method: GET
  - Path: /api/admin/users
  - Auth: `authenticate` + `authorize(1)` (Admin)
  - Backend: `backend/src/routes/adminRoutes.js` -> `adminController.getUsers` -> `adminService.getAllUsers`
  - Frontend callers:
    - frontend/src/services/adminService.js -> `fetchUsers`
    - frontend/src/pages/admin/AdminUsers.jsx

- GET /admin/users/search?q=
  - Method: GET
  - Path: /api/admin/users/search
  - Auth: Admin
  - Frontend callers:
    - frontend/src/services/adminService.js -> `searchUsers`
    - frontend/src/pages/admin/AdminUsers.jsx

- POST /admin/users
  - Method: POST
  - Path: /api/admin/users
  - Auth: Admin
  - Frontend callers:
    - frontend/src/services/adminService.js -> `createUser`
    - frontend/src/pages/admin/AdminUsers.jsx (AddUserModal)

- PUT /admin/users/:id
  - Method: PUT
  - Path: /api/admin/users/:id
  - Auth: Admin
  - Frontend callers:
    - frontend/src/services/adminService.js -> `updateUser`
    - frontend/src/pages/admin/AdminUsers.jsx

- GET /admin/roles
  - Method: GET
  - Path: /api/admin/roles
  - Auth: Admin
  - Frontend callers:
    - frontend/src/services/adminService.js -> `fetchRoles`
    - frontend/src/pages/admin/AdminUsers.jsx
    - frontend/src/pages/admin/SystemSettings.jsx

- GET /admin/warehouses
  - Method: GET
  - Path: /api/admin/warehouses
  - Auth: Admin
  - Frontend callers:
    - frontend/src/services/adminService.js -> `fetchWarehouses`
    - frontend/src/pages/admin/AdminUsers.jsx

---

3) Core API (mounted at `/api`)

A. Dashboard & Notifications
- GET /dashboard/stats
  - Auth: requireAnyPermission('reports:read', 'reports:read_limited')
  - Frontend callers: admin/overview pages (various)
- GET /dashboard/admin/summary
  - Auth: requirePermission('reports:read')
  - Frontend callers: frontend/src/pages/admin/DashboardOverview.jsx
- GET /dashboard/manager/summary
  - Auth: requireAnyPermission('inventory:read','orders:read','tasks:read')
  - Frontend callers: frontend/src/pages/ManagerDashboard.js
- GET /dashboard/manager/kpis
  - Auth: requireAnyPermission('reports:read_limited','reports:read')
  - Frontend callers: frontend/src/pages/ManagerDashboard.js
- GET /dashboard/worker/summary
  - Auth: authorize(3) + requirePermission('tasks:read_own')
  - Frontend callers: frontend/src/pages/WorkerDashboard.js
- GET /dashboard/delivery/summary
  - Auth: requirePermission('shipments:read_own')
  - Frontend callers: frontend/src/pages/DeliveryDashboard.js
- GET /dashboard/notifications
  - Auth: requireAnyPermission('settings:read','reports:read','reports:read_limited')
  - Frontend callers: admin dashboards

B. Users & Roles
- GET /users
  - Auth: requirePermission('users:read')
  - Frontend callers: frontend/src/pages/admin/UsersManagement.jsx
- GET /users/:id
  - Auth: requirePermission('users:read')
- POST /users
  - Auth: requirePermission('users:create')
  - Frontend callers: frontend/src/pages/admin/UsersManagement.jsx (some places also call /api/admin/users via adminService)
- PUT /users/:id
  - Auth: requirePermission('users:update')
- DELETE /users/:id
  - Auth: requirePermission('users:delete')
- GET /roles
  - Auth: requireAnyPermission('roles:manage','users:read')

C. Products / Categories / Suppliers
- GET /products
- GET /products/:id
- POST /products
- PUT /products/:id
- GET /categories
- GET /suppliers
  - Frontend callers: products management pages and admin pages (frontend/src/pages/admin/ProductsManagement.jsx)

D. Inventory
- GET /inventory
  - Auth: requirePermission('inventory:read')
  - Frontend callers: Manager/Inventory pages (ManagerDashboard, admin InventoryManagement)
- GET /inventory/:id
- GET /inventory/stats
- POST /inventory/adjust
  - Auth: requirePermission('inventory:update')
  - Frontend callers: admin InventoryManagement.jsx (inventory adjustments)
- POST /inventory/request-adjustment
  - Auth: requirePermission('inventory:request_adjust')

E. Purchase Orders
- GET /purchases or /purchase-orders
- GET /purchase-orders/:id
- POST /purchases or /purchase-orders
- PUT /purchase-orders/:id/status (approve/receive)
  - Frontend callers: admin purchase pages

F. Orders (Sales Orders) & Shipments
- GET /orders
  - Frontend callers: ManagerDashboard, Admin Orders management
- GET /orders/:id
- PUT /orders/:id/assign
  - Frontend callers: ManagerDashboard (assignOrder), Admin OrdersManagement.jsx
- PUT /orders/:id/status
  - Frontend callers: ManagerDashboard, Admin OrdersManagement.jsx
- GET /staff
  - Returns user list for assignment; frontend uses this when assigning orders/tasks

G. Tasks & Worker flows
- GET /tasks
  - Frontend callers: ManagerDashboard (tasks listing), WorkerDashboard (assigned tasks)
- POST /tasks
  - Frontend callers: ManagerDashboard (createTask)
- PUT /tasks/:id
  - Frontend callers: ManagerDashboard, WorkerDashboard (update task status)
- GET /pick-list
  - Frontend callers: pages PickItems.jsx, WorkerDashboard
- PUT /pick-list/:id
  - Frontend callers: WorkerDashboard, AssignedTasks.jsx
- PUT /pack-station/:id
  - Frontend callers: WorkerDashboard
- POST /inventory/scan
  - Frontend callers: WorkerDashboard, ReceiveGoods.jsx
- POST /locations/validate
  - Frontend callers: WorkerDashboard, PutawayPage.jsx
- Receiving endpoints: /receiving/scan-po, /receiving/scan-barcode, /receiving/confirm
  - Frontend callers: ReceiveGoods.jsx
- Putaway endpoints: /putaway/items, /putaway/location-scan, /putaway/confirm
  - Frontend callers: PutawayPage.jsx
- Picking/packing endpoints: /picking/list, /picking/pick, /packing/list, /packing/complete
  - Frontend callers: PickItems.jsx, PackItems.jsx

H. Settings & Roles management
- GET /settings
- POST /settings
- PUT /roles/:id/permissions
  - Frontend callers: SystemSettings.jsx

I. Reports
- GET /reports/:type and GET /reports/:type/export
  - Frontend callers: various reports pages (admin and manager)

---

4) Delivery routes (mounted at `/api/delivery` and via `/api` delivery router)

- GET /delivery/dashboard
  - Auth: authorize(4) via delivery router middleware
  - Frontend callers: frontend/src/pages/DeliveryDashboard.jsx

- GET /delivery/shipments
  - Auth: authorize(4)
  - Frontend callers: frontend/src/pages/DeliveryDashboard.jsx, frontend/src/pages/Shipments.jsx, RouteTracking.jsx
  - Notes: The route now returns orders assigned to delivery user (order_id as shipment_id).

- GET /delivery/shipment/:id
  - Auth: authorize(4)
  - Frontend callers: frontend/src/pages/ShipmentDetails.jsx

- POST /delivery/start-route
  - Auth: authorize(4)
  - Frontend callers: Delivery route actions (not always explicit)

- POST /delivery/collect
  - Auth: authorize(4)
  - Frontend callers: ShipmentDetails.jsx, CollectShipment.jsx

- POST /delivery/dispatch
  - Auth: authorize(4)
  - Frontend callers: ShipmentDetails.jsx

- POST /delivery/location
  - Auth: authorize(4)
  - Frontend callers: RouteTracking.jsx (posts updates with shipment_id, lat/lng)
  - Notes: backend stores tracking in `delivery_tracking` (now references `order_id`).

- POST /delivery/proof
  - Auth: authorize(4) (multipart)
  - Frontend callers: DeliveryConfirmation.jsx, PODUploader.jsx
  - Notes: backend now stores proofs in `delivery_proofs(order_id)`.

- POST /delivery/delivered
  - Auth: authorize(4)
  - Frontend callers: DeliveryDashboard.jsx (updateStatus -> PUT /shipments/:id/status or POST /delivery/delivered in some pages)
  - Notes: Backend also exposes `/api/shipments` and `/api/shipments/:id/status` (in `api.js`) — frontend uses both `/delivery/*` and `/shipments`/`/shipments/:id/status` in places. Keep both consistent.

- POST /delivery/failed
  - Auth: authorize(4)
  - Frontend callers: FailedDeliveryForm.jsx

- GET /delivery/tracking/:shipment_id
  - Auth: authorize(4)
  - Frontend callers: RouteTracking.jsx

- GET /delivery/day-summary
  - Auth: authorize(4)
  - Frontend callers: DaySummary.jsx

---

Mismatches / Action Items found
- Duplicate auth route implementations: `backend/src/routes/auth.js` vs `backend/src/routes/authRoutes.js`. The server mounts `authRoutes.js`. Suggest removing `auth.js` or merging features.
- Delivery endpoints existed in two places: `backend/src/routes/delivery.js` and `api.js` had `/shipments` endpoints under `/api` as well. I aligned `delivery.js` to use `orders` instead of a separate `shipments` table, and updated schema accordingly — verify DB migrations before applying to production.
- Frontend uses both `/api/delivery/*` and `/api/shipments`/`/shipments/:id/status`. Backend supports both (one via delivery router, one via api router) — ensure semantics are consistent.
- Response shape differences (auth previously nested `data`) were patched in `frontend/src/context/AuthContext.js`.

---

How to use this file
- Review the list to identify any endpoints used by frontend that lack a backend implementation or vice-versa.
- If you want, I can generate a CSV/JSON mapping or add a minimal Postman collection from this map.

Generated: automated scan of codebase (backend routes + frontend api calls). If you want a machine-readable mapping (CSV/JSON) or a Postman collection next, tell me which format.
