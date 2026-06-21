PR Summary — Align delivery naming, consolidate auth, and frontend fixes

Overview
- Consolidated duplicate auth router: removed `backend/src/routes/auth.js` and standardized on `backend/src/routes/authRoutes.js` with controller/service implementation.
- Normalized delivery API to use `orders` as primary entity.
  - Backend: `backend/src/routes/delivery.js` now accepts both `shipment_id` and `order_id` (normalization middleware) and operates on `orders`.
  - DB schema updated earlier to use `order_id` in delivery tracking/proofs/failed_deliveries.
- Frontend: migrated delivery callers to prefer `order_id` (non-breaking; backend accepts both).
  - Files updated: `frontend/src/components/PODUploader.jsx`, `frontend/src/components/ShipmentTable.jsx`, `frontend/src/pages/DeliveryDashboard.js`, `frontend/src/pages/FailedDeliveryForm.jsx`, `frontend/src/pages/CollectShipment.jsx`, `frontend/src/pages/RouteTracking.jsx`, `frontend/src/pages/ShipmentDetails.jsx`.
- Added endpoint mapping docs: `ENDPOINT_MAP.md` and `ENDPOINT_MAP.json`.
- Added safe DB migration script to populate `shipment_items.order_id`: `backend/src/scripts/migrate_shipmentitems_to_orderid.sql` with `MIGRATION_README.md`.

Why
- Removes ambiguity between `shipment_id` and `order_id` across codebase.
- Allows incremental migration: frontend updated to use `order_id`, backend accepts either, DB migration prepares schema for cleanup.
- Consolidates auth implementation to a single controller-based route, reducing maintenance overhead.

Testing
- Manual smoke tests recommended:
  1. Run DB migration on staging snapshot.
  2. Start backend dev server and frontend (see commands below).
  3. Login as delivery user and exercise: View Shipments, Start Route, Track Route (geolocation), Collect, Dispatch, Deliver, and Failed Delivery flows.

Commands
- Run migration:

```bash
psql "$PG_CONN" -f backend/src/scripts/migrate_shipmentitems_to_orderid.sql
```

- Start backend (dev):

```bash
cd backend
npm install
npm run dev
```

- Start frontend:

```bash
cd frontend
npm install
npm start
```

Notes / Next Steps
- After validating migration and updated frontend, consider dropping legacy `shipment_id` columns and the `shipments` table if it's no longer needed.
- Optionally consolidate `shipment_items` into `order_items` for unified order item management.
- Run integration tests and report any failing endpoints in `ENDPOINT_MAP.md`.
