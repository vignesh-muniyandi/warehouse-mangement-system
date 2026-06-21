Migration README — Aligning delivery data to `order_id`

Purpose
- Make `order_id` available in `shipment_items` so all delivery-related tables reference `orders.order_id` consistently.
- Non-destructive: does not drop legacy columns or tables. Provides verification and rollback steps.

Script
- `migrate_shipmentitems_to_orderid.sql` — Adds `order_id` column to `shipment_items`, populates it from `shipments.order_id`, adds index and FK.

How to run (example using psql)
1. Backup your database first.

```bash
PG_CONN="postgresql://user:password@host:5432/dbname"
psql "$PG_CONN" -f backend/src/scripts/migrate_shipmentitems_to_orderid.sql
```

2. Verify migration:

```sql
-- Count rows missing order_id (should be 0 before cleanup)
SELECT COUNT(*) FROM shipment_items WHERE order_id IS NULL;

-- Sample migrated rows
SELECT si.*, s.order_id FROM shipment_items si LEFT JOIN shipments s ON si.shipment_id = s.shipment_id LIMIT 20;
```

3. Optional cleanup (manual, do after validating application changes):
- Drop `shipment_items.shipment_id` if no code path uses it.
- Consider consolidating `shipment_items` into `order_items` if desired.
- If `shipments` table is no longer used by the app, plan its deprecation carefully and migrate any necessary metadata.

Rollback
- If needed, revert by dropping the FK/index and clearing `order_id` values:

```sql
BEGIN;
ALTER TABLE shipment_items DROP CONSTRAINT IF EXISTS fk_shipment_items_order;
DROP INDEX IF EXISTS idx_shipment_items_order_id;
UPDATE shipment_items SET order_id = NULL;
COMMIT;
```

Notes
- Test the migration on a staging snapshot before applying to production.
- Coordinate with application deploys: deploy code that accepts `order_id` before cleaning up legacy columns.
