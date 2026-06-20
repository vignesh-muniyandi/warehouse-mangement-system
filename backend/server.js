const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes');
const apiRoutes = require('./src/routes/api');
const adminRoutes = require('./src/routes/adminRoutes');
const { connect } = require('./config/db');
const { createUserTable } = require('./models/userModel');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', apiRoutes);

app.get('/', (req, res) => {
  res.json({ success: true, message: 'Auth API is running' });
});

app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err);
  res.status(500).json({ success: false, message: 'Server error' });
});

const start = async () => {
  try {
    await connect();
    await createUserTable(require('./config/db'));
    app.listen(PORT, () => console.log(`[SERVER] Running on port ${PORT}`));
  } catch (error) {
    console.error('[SERVER] Failed to connect to database', error);
    process.exit(1);
  }
};

start();
