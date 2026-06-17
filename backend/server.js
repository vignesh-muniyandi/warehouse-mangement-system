const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes');
const { connect } = require('./config/db');
const { createUserTable } = require('./models/userModel');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);

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
