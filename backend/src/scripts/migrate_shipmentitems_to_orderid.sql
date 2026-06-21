-- Migration: populate `shipment_items.order_id` from `shipments.order_id` and add FK/index
-- Non-destructive: This adds a new column, populates it, and adds an index + FK. It does NOT drop the legacy `shipment_id` column or the `shipments` table.

BEGIN;

-- 1) Add nullable order_id column if it doesn't exist
ALTER TABLE shipment_items
  ADD COLUMN IF NOT EXISTS order_id INTEGER;

-- 2) Populate order_id from shipments table where possible
UPDATE shipment_items si
SET order_id = s.order_id
FROM shipments s
WHERE si.shipment_id = s.shipment_id
  AND (si.order_id IS NULL OR si.order_id <> s.order_id);

-- 3) Add index for performance
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'idx_shipment_items_order_id' AND n.nspname = current_schema()
  ) THEN
    CREATE INDEX idx_shipment_items_order_id ON shipment_items(order_id);
  END IF;
END$$;

-- 4) Add FK constraint (nullable column allowed)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    WHERE tc.constraint_name = 'fk_shipment_items_order'
      AND tc.table_name = 'shipment_items'
  ) THEN
    ALTER TABLE shipment_items
      ADD CONSTRAINT fk_shipment_items_order FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE;
  END IF;
END$$;

COMMIT;

-- Optional cleanup (manual, do after validating no code paths still use shipment_id):
-- 1) Verify there are no shipment_items rows lacking order_id
--    SELECT COUNT(*) FROM shipment_items WHERE order_id IS NULL;
-- 2) If zero, you can drop the legacy column:
--    ALTER TABLE shipment_items DROP COLUMN shipment_id;
-- 3) If you plan to retire the `shipments` table entirely (only if your application no longer uses it), ensure all data is migrated and then drop:
--    DROP TABLE IF EXISTS shipments;

-- Rollback (manual): If migration must be reverted before cleanup,
-- you can restore the previous state by setting order_id back to NULL and dropping added constraints/index:
-- BEGIN;
-- ALTER TABLE shipment_items DROP CONSTRAINT IF EXISTS fk_shipment_items_order;
-- DROP INDEX IF EXISTS idx_shipment_items_order_id;
-- UPDATE shipment_items SET order_id = NULL WHERE TRUE;
-- COMMIT;
