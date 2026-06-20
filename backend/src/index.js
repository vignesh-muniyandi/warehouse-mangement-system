require('dotenv').config();
const http = require('http');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
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
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim())
  : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'];

app.use(cors({ origin: allowedOrigins, credentials: true }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

app.set('io', io);

function normalizeSocketUser(decoded) {
  return {
    ...decoded,
    user_id: decoded.user_id ?? decoded.userId,
    role_id: decoded.role_id ?? decoded.roleId,
    role_name: decoded.role_name ?? decoded.roleName,
  };
}

io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) {
    return next(new Error('Authentication required'));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = normalizeSocketUser(decoded);
    return next();
  } catch (err) {
    return next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  const userId = socket.user?.user_id;
  if (userId) {
    socket.join(`delivery:${userId}`);
    socket.emit('delivery:connected', { message: 'Delivery real-time channel connected' });
  }

  socket.on('disconnect', () => {
    // Clean-up if any user-specific resources are needed in future.
  });
});

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
const adminRoutes = require('./routes/adminRoutes');
const debugRoutes = require('./routes/debug');

app.use('/auth/login', loginLimiter);
app.use('/auth', authRoutes);
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authRoutes);
app.options('*', cors({ origin: allowedOrigins, credentials: true }));
const path = require('path');
const fs = require('fs');

// Serve frontend build if present and provide SPA fallback so direct
// navigation to client-side routes (e.g. /dashboard/manager/kpis) works.
const frontendBuildPath = path.join(__dirname, '..', '..', 'frontend', 'build');
if (fs.existsSync(frontendBuildPath)) {
  app.use(express.static(frontendBuildPath));

  // Serve index.html for routes that are not API/auth so the SPA can handle routing
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/auth')) return next();
    return res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
}

// Mount debug routes (dev-only) before the secured /api router
app.use('/api/debug', debugRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', apiRoutes);

app.get('/health', (req, res) => res.json({ success: true, uptime: process.uptime() }));

app.use((err, req, res, next) => {
  console.error('[SERVER] Unhandled error:', err);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Internal Server Error' });
});

async function startServer() {
  try {
    await connectToDb();
    server.listen(port, () => {
      console.log(`[SERVER] Auth service listening on port ${port}`);
    });
  } catch (err) {
    console.error('[SERVER] Startup aborted because database connection failed.');
    process.exit(1);
  }
}

startServer();
