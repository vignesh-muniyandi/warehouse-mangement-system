require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/authRoutes');
const { logAudit } = require('./services/auditService');
const { connectToDb } = require('./db');

const app = express();
const port = process.env.PORT || 4000;

app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(cors({ origin: true, credentials: true }));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logAudit({
      user_id: null,
      action: 'rate_limited_login',
      ip_address: req.ip,
    });
    return res.status(429).json({ success: false, message: 'Too many login attempts from this IP. Please try again later.' });
  },
});

const apiRoutes = require('./routes/api');

app.use('/auth/login', loginLimiter);
app.use('/auth', authRoutes);
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

app.get('/health', (req, res) => res.json({ success: true, uptime: process.uptime() }));

app.use((err, req, res, next) => {
  console.error('[SERVER] Unhandled error:', err);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Internal Server Error' });
});

async function startServer() {
  try {
    await connectToDb();
    app.listen(port, () => {
      console.log(`[SERVER] Auth service listening on port ${port}`);
    });
  } catch (err) {
    console.error('[SERVER] Startup aborted because database connection failed.');
    process.exit(1);
  }
}

startServer();
