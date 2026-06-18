const express = require('express');
const multer = require('multer');
const db = require('../db');
const { authorize } = require('../middleware/permissionMiddleware');
const router = express.Router();

const upload = multer({ dest: 'uploads/' });

router.use(authorize(4));

function emitDeliveryEvent(req, event, payload) {
  const io = req.app.get('io');
  if (!io || !req.user?.user_id) return;
  io.to(`delivery:${req.user.user_id}`).emit(event, payload);
}

// Dashboard KPIs
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user.user_id;
    const assigned = await db.query('SELECT COUNT(*) FROM shipments WHERE assigned_user_id = $1', [userId]);
    const pending = await db.query("SELECT COUNT(*) FROM shipments WHERE assigned_user_id = $1 AND status = 'assigned'", [userId]);
    const outFor = await db.query("SELECT COUNT(*) FROM shipments WHERE assigned_user_id = $1 AND status = 'en_route'", [userId]);
    const delivered = await db.query("SELECT COUNT(*) FROM shipments WHERE assigned_user_id = $1 AND status = 'delivered'", [userId]);
    const payload = {
      assigned_shipments: Number(assigned.rows[0].count || 0),
      pending_deliveries: Number(pending.rows[0].count || 0),
      out_for_delivery: Number(outFor.rows[0].count || 0),
      delivered_today: Number(delivered.rows[0].count || 0),
    };
    emitDeliveryEvent(req, 'delivery:kpis', payload);
    return res.json({ success: true, data: payload });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard' });
  }
});

// Shipments list
router.get('/shipments', async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { rows } = await db.query(
      `SELECT shipment_id, order_id, customer_name, address, phone, package_count, payment_type, status
       FROM shipments WHERE assigned_user_id = $1 ORDER BY created_at DESC`, [userId]
    );
    const payload = rows;
    emitDeliveryEvent(req, 'delivery:shipments', payload);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch shipments' });
  }
});

router.get('/shipment/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const s = await db.query('SELECT * FROM shipments WHERE shipment_id = $1 LIMIT 1', [id]);
    if (!s.rows.length) return res.status(404).json({ success: false, message: 'Shipment not found' });
    const items = await db.query('SELECT * FROM shipment_items WHERE shipment_id = $1', [id]);
    return res.json({ success: true, data: { shipment: s.rows[0], items: items.rows } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch shipment' });
  }
});

// Start route (accept)
router.post('/start-route', async (req, res) => {
  try {
    const userId = req.user.user_id;
    // mark route accepted - for demo we update shipments assigned to user to status 'accepted'
    await db.query("UPDATE shipments SET status = 'assigned', last_update = NOW() WHERE assigned_user_id = $1", [userId]);
    emitDeliveryEvent(req, 'delivery:status', { action: 'route_accepted' });
    return res.json({ success: true, message: 'Route accepted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to accept route' });
  }
});

// Collect shipment
router.post('/collect', async (req, res) => {
  try {
    const { shipment_id, collected_count } = req.body;
    if (!shipment_id) return res.status(400).json({ success: false, message: 'shipment_id required' });
    await db.query("UPDATE shipments SET status = 'collected', last_update = NOW() WHERE shipment_id = $1", [shipment_id]);
    emitDeliveryEvent(req, 'delivery:status', { action: 'collected', shipment_id });
    return res.json({ success: true, message: 'Collected' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to collect shipment' });
  }
});

router.post('/dispatch', async (req, res) => {
  try {
    const { shipment_ids } = req.body;
    if (!Array.isArray(shipment_ids)) return res.status(400).json({ success: false, message: 'shipment_ids array required' });
    await db.query("UPDATE shipments SET status = 'dispatched', last_update = NOW() WHERE shipment_id = ANY($1::int[])", [shipment_ids]);
    emitDeliveryEvent(req, 'delivery:status', { action: 'dispatched', shipment_ids });
    return res.json({ success: true, message: 'Dispatched' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to dispatch' });
  }
});

router.post('/location', async (req, res) => {
  try {
    const { shipment_id, latitude, longitude } = req.body;
    await db.query('INSERT INTO delivery_tracking (shipment_id, user_id, latitude, longitude) VALUES ($1,$2,$3,$4)', [shipment_id, req.user.user_id, latitude, longitude]);
    await db.query("UPDATE shipments SET status = 'en_route', last_update = NOW() WHERE shipment_id = $1", [shipment_id]);
    const latestTracking = { shipment_id, latitude, longitude, recorded_at: new Date().toISOString() };
    emitDeliveryEvent(req, 'delivery:location', latestTracking);
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to record location' });
  }
});

router.post('/proof', upload.fields([{ name: 'signature' }, { name: 'photo' }]), async (req, res) => {
  try {
    const { shipment_id } = req.body;
    const signature = req.files?.signature?.[0]?.path || null;
    const photo = req.files?.photo?.[0]?.path || null;
    await db.query('INSERT INTO delivery_proofs (shipment_id, signature_image, delivery_photo) VALUES ($1,$2,$3)', [shipment_id, signature, photo]);
    return res.json({ success: true, message: 'Proof uploaded' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to upload proof' });
  }
});

router.post('/delivered', async (req, res) => {
  try {
    const { shipment_id } = req.body;
    await db.query("UPDATE shipments SET status = 'delivered', last_update = NOW() WHERE shipment_id = $1", [shipment_id]);
    emitDeliveryEvent(req, 'delivery:status', { action: 'delivered', shipment_id });
    return res.json({ success: true, message: 'Delivery recorded' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to record delivery' });
  }
});

router.post('/failed', async (req, res) => {
  try {
    const { shipment_id, reason, notes } = req.body;
    await db.query("UPDATE shipments SET status = 'failed', last_update = NOW() WHERE shipment_id = $1", [shipment_id]);
    await db.query('INSERT INTO failed_deliveries (shipment_id, reason, notes) VALUES ($1,$2,$3)', [shipment_id, reason, notes]);
    emitDeliveryEvent(req, 'delivery:status', { action: 'failed', shipment_id, reason });
    return res.json({ success: true, message: 'Failure recorded' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to record failure' });
  }
});

router.get('/tracking/:shipment_id', async (req, res) => {
  try {
    const { shipment_id } = req.params;
    const result = await db.query(
      'SELECT latitude, longitude, recorded_at FROM delivery_tracking WHERE shipment_id = $1 ORDER BY recorded_at ASC',
      [shipment_id]
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch shipment tracking data' });
  }
});

router.get('/day-summary', async (req, res) => {
  try {
    const userId = req.user.user_id;
    const total = await db.query('SELECT COUNT(*) FROM shipments WHERE assigned_user_id = $1', [userId]);
    const delivered = await db.query("SELECT COUNT(*) FROM shipments WHERE assigned_user_id = $1 AND status = 'delivered'", [userId]);
    const failed = await db.query("SELECT COUNT(*) FROM shipments WHERE assigned_user_id = $1 AND status = 'failed'", [userId]);
    return res.json({ success: true, data: {
      total: Number(total.rows[0].count || 0),
      delivered: Number(delivered.rows[0].count || 0),
      failed: Number(failed.rows[0].count || 0)
    }});
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch day summary' });
  }
});

module.exports = router;
