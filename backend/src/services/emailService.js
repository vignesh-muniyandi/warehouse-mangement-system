require('dotenv').config();
const nodemailer = require('nodemailer');
const redis = require('../services/redisClient');

const EMAIL_FROM = process.env.EMAIL_FROM || process.env.EMAIL_USER;
const USE_QUEUE = String(process.env.USE_EMAIL_QUEUE || 'false').toLowerCase() === 'true';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify((err) => {
  if (err) {
    console.warn('[emailService] SMTP verify failed:', err.message);
  } else {
    console.log('[emailService] SMTP connection verified');
  }
});

async function enqueueEmail(job) {
  try {
    if (USE_QUEUE && redis && typeof redis.lpush === 'function') {
      await redis.lpush('email:queue', JSON.stringify(job));
      console.log('[emailService] Enqueued email job');
      return { queued: true };
    }
    return null;
  } catch (err) {
    console.error('[emailService] enqueueEmail error:', err);
    return null;
  }
}

async function sendMailDirect(mailOptions) {
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('[emailService] Email sent:', info.messageId);
    return { success: true, info };
  } catch (err) {
    console.error('[emailService] sendMailDirect error:', err);
    return { success: false, error: err };
  }
}

async function sendWelcomeEmail(user) {
  try {
    if (!user || !user.email) {
      console.warn('[emailService] sendWelcomeEmail called without user.email');
      return { success: false, message: 'Missing recipient email' };
    }

    const subject = 'Welcome to Warehouse Management System';
    const text = `Hello ${user.first_name},\n\n` +
      'Your WMS account has been created successfully.\n\n' +
      'Account Details:\n' +
      `Name: ${user.first_name} ${user.last_name}\n` +
      `Email: ${user.email}\n` +
      `Role: ${user.role_name || ''}\n\n` +
      'You can now login to the system using your credentials.\n\n' +
      'Regards,\nWMS Admin Team';

    const html = `<p>Hello ${user.first_name},</p>
      <p>Your WMS account has been created successfully.</p>
      <h4>Account Details:</h4>
      <ul>
        <li><strong>Name:</strong> ${user.first_name} ${user.last_name}</li>
        <li><strong>Email:</strong> ${user.email}</li>
        <li><strong>Role:</strong> ${user.role_name || ''}</li>
      </ul>
      <p>You can now login to the system using your credentials.</p>
      <p>Regards,<br/>WMS Admin Team</p>`;

    const mailOptions = { from: EMAIL_FROM, to: user.email, subject, text, html };

    // enqueue when configured
    const queued = await enqueueEmail({ type: 'welcome', mailOptions, meta: { user } });
    if (queued) return { queued: true };

    return await sendMailDirect(mailOptions);
  } catch (err) {
    console.error('[emailService] sendWelcomeEmail error:', err);
    return { success: false, error: err };
  }
}

async function sendTaskAssignmentEmail(worker, task) {
  try {
    if (!worker || !worker.email) {
      console.warn('[emailService] sendTaskAssignmentEmail missing worker.email');
      return { success: false, message: 'Missing worker email' };
    }

    const subject = 'New Task Assigned in WMS';
    const dueText = task.due_date ? new Date(task.due_date).toLocaleString() : 'N/A';
    const text = `Hello ${worker.first_name},\n\n` +
      'A new task has been assigned to you.\n\n' +
      'Task Details:\n' +
      `Task Name: ${task.task_name || task.title || ''}\n` +
      `Description: ${task.description || task.notes || ''}\n` +
      `Priority: ${task.priority || 'Normal'}\n` +
      `Status: ${task.status || 'Pending'}\n` +
      `Due Date: ${dueText}\n\n` +
      'Please login and complete the task.\n\n' +
      'Regards,\nWarehouse Manager';

    const html = `<p>Hello ${worker.first_name},</p>
      <p>A new task has been assigned to you.</p>
      <h4>Task Details:</h4>
      <ul>
        <li><strong>Task Name:</strong> ${task.task_name || task.title || ''}</li>
        <li><strong>Description:</strong> ${task.description || task.notes || ''}</li>
        <li><strong>Priority:</strong> ${task.priority || 'Normal'}</li>
        <li><strong>Status:</strong> ${task.status || 'Pending'}</li>
        <li><strong>Due Date:</strong> ${dueText}</li>
      </ul>
      <p>Please login and complete the task.</p>
      <p>Regards,<br/>Warehouse Manager</p>`;

    const mailOptions = { from: EMAIL_FROM, to: worker.email, subject, text, html };

    const queued = await enqueueEmail({ type: 'task_assignment', mailOptions, meta: { worker, task } });
    if (queued) return { queued: true };

    return await sendMailDirect(mailOptions);
  } catch (err) {
    console.error('[emailService] sendTaskAssignmentEmail error:', err);
    return { success: false, error: err };
  }
}

async function sendResetPasswordEmail(to, token) {
  try {
    if (!to) return { success: false, message: 'Missing recipient' };
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
    const subject = 'WMS Password Reset Request';
    const text = `You requested a password reset. Use this link within 15 minutes: ${resetUrl}`;
    const html = `<p>You requested a password reset for your Warehouse Management System account.</p>
      <p>Click the link below within 15 minutes to reset your password:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>If you did not request this, ignore this email.</p>`;

    const mailOptions = { from: EMAIL_FROM, to, subject, text, html };
    const queued = await enqueueEmail({ type: 'reset_password', mailOptions, meta: { to } });
    if (queued) return { queued: true };
    return await sendMailDirect(mailOptions);
  } catch (err) {
    console.error('[emailService] sendResetPasswordEmail error:', err);
    return { success: false, error: err };
  }
}

module.exports = {
  sendWelcomeEmail,
  sendTaskAssignmentEmail,
  sendResetPasswordEmail,
};
