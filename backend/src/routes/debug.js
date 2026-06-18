const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');
const redis = require('../services/redisClient');

const router = express.Router();

// Safety: only allow in non-production or when ALLOW_DEBUG=true
function debugAllowed() {
  return process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEBUG === 'true';
}

router.post('/reset-demo-passwords', async (req, res) => {
  if (!debugAllowed()) return res.status(403).json({ success: false, message: 'Not allowed' });
  try {
    const password = req.body.password || 'Password123';
    const hash = await bcrypt.hash(password, 12);
    // update manager, worker, delivery
    await db.query("UPDATE users SET password_hash = $1 WHERE email IN ('manager@wms.example.com','worker@wms.example.com','delivery@wms.example.com')", [hash]);
    try {
      const { rows } = await db.query("SELECT user_id, email FROM users WHERE email IN ('manager@wms.example.com','worker@wms.example.com','delivery@wms.example.com')");
      const ids = rows.map((r) => r.user_id).filter(Boolean);
      for (const id of ids) {
        await redis.del(`login_fail:${id}`);
      }
    } catch (e) {
      console.warn('[DEBUG] failed to clear login_fail keys', e.message || e);
    }

    return res.json({ success: true, message: 'Demo passwords reset and login counters cleared', password });
  } catch (err) {
    console.error('[DEBUG] reset-demo-passwords error', err);
    return res.status(500).json({ success: false, message: 'Failed to reset demo passwords' });
  }
});

module.exports = router;
