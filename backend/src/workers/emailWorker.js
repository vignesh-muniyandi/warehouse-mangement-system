require('dotenv').config();
const redis = require('../services/redisClient');
const nodemailer = require('nodemailer');

const EMAIL_FROM = process.env.EMAIL_FROM || process.env.EMAIL_USER;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function processJob(raw) {
  try {
    const job = JSON.parse(raw);
    if (!job || !job.mailOptions) return;
    const info = await transporter.sendMail(job.mailOptions);
    console.log('[emailWorker] Sent email:', info.messageId, 'type=', job.type);
  } catch (err) {
    console.error('[emailWorker] failed to process job', err);
  }
}

async function start() {
  if (!redis || typeof redis.brpop !== 'function') {
    console.error('[emailWorker] Redis not available or does not support blocking pop. Worker exiting.');
    process.exit(1);
  }

  console.log('[emailWorker] Waiting for jobs on email:queue');
  while (true) {
    try {
      // BRPOP returns [key, value]
      const res = await redis.brpop('email:queue', 0);
      if (res && res[1]) {
        await processJob(res[1]);
      }
    } catch (err) {
      console.error('[emailWorker] Redis BRPOP error, retrying in 3s', err);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

start().catch((err) => {
  console.error('[emailWorker] fatal error', err);
  process.exit(1);
});
