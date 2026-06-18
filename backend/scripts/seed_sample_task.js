const db = require('../src/db');

async function upsert(table, uniqueCol, uniqueVal, cols) {
  const exists = await db.query(`SELECT * FROM ${table} WHERE ${uniqueCol} = $1 LIMIT 1`, [uniqueVal]);
  if (exists.rows.length) return exists.rows[0];
  const colsList = Object.keys(cols).join(', ');
  const vals = Object.values(cols);
  const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');
  const res = await db.query(`INSERT INTO ${table} (${colsList}) VALUES (${placeholders}) RETURNING *`, vals);
  return res.rows[0];
}

async function main() {
  try {
    // Find worker user
    const userRes = await db.query("SELECT user_id, email FROM users WHERE email = $1 LIMIT 1", ['worker@wms.example.com']);
    if (!userRes.rows.length) {
      console.error('Worker user not found: worker@wms.example.com');
      process.exit(1);
    }
    const worker = userRes.rows[0];

    // Warehouse
    const wh = await upsert('warehouses', 'warehouse_code', 'WH-1', { warehouse_code: 'WH-1', name: 'Main Warehouse' });

    // Supplier
    const supplier = await upsert('suppliers', 'name', 'ACME Supplies', { name: 'ACME Supplies', contact_person: 'Procurement', email: 'procure@acme.example' });

    // Product
    const product = await upsert('products', 'sku', 'SAMPLE-SKU-001', { sku: 'SAMPLE-SKU-001', barcode: '000000', name: 'Sample Product', unit_price: 1.0 });

    // Purchase Order
    const poRes = await db.query(
      `INSERT INTO purchase_orders (supplier_id, warehouse_id, created_by_user_id, status, total_amount)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [supplier.supplier_id || supplier.supplierid || supplier.id, wh.warehouse_id || wh.warehouseid || wh.id, worker.user_id, 'Pending', 10.00]
    );
    const po = poRes.rows[0];

    // Purchase order item
    await db.query(
      `INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity_ordered, unit_price) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
      [po.purchase_order_id, product.product_id || product.productid || product.id, 10, 1.0]
    );

    // Create a receive task assigned to worker
    const taskRes = await db.query(
      `INSERT INTO tasks (warehouse_id, assigned_user_id, created_by_user_id, title, task_type, status, priority, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [wh.warehouse_id, worker.user_id, worker.user_id, `Receive PO ${po.purchase_order_id}`, 'receive', 'Pending', 'High', 'Auto-seeded task for testing']
    );

    // Also create a putaway task for testing (idempotent check)
    const putawayTitle = `Putaway for PO ${po.purchase_order_id}`;
    const existing = await db.query('SELECT * FROM tasks WHERE title = $1 LIMIT 1', [putawayTitle]);
    let putTask = null;
    if (!existing.rows.length) {
      const p = await db.query(
        `INSERT INTO tasks (warehouse_id, assigned_user_id, created_by_user_id, title, task_type, status, priority, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [wh.warehouse_id, worker.user_id, worker.user_id, putawayTitle, 'putaway', 'Pending', 'Normal', JSON.stringify({ from_po: po.purchase_order_id })]
      );
      putTask = p.rows[0];
    } else {
      putTask = existing.rows[0];
    }

    console.log('Seeded PO:', po.purchase_order_id);
    console.log('Seeded receive task:', taskRes.rows[0].task_id);
    console.log('Seeded putaway task:', putTask.task_id);
    // write identifiers for test scripts
    try { require('fs').writeFileSync('/tmp/seed_po_id', String(po.purchase_order_id)); } catch {}
    try { require('fs').writeFileSync('/tmp/seed_putaway_id', String(putTask.task_id)); } catch {}
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(2);
  }
}

main();
