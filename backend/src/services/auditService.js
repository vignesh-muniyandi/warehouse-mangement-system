const db = require('../db');

async function logAudit({ user_id = null, action, ip_address = null, meta = null }) {
  const query = `INSERT INTO audit_logs (user_id, action, ip_address, meta, created_at) VALUES ($1, $2, $3, $4, NOW())`;
  await db.query(query, [user_id, action, ip_address, meta ? JSON.stringify(meta) : null]);
}

module.exports = { logAudit };
