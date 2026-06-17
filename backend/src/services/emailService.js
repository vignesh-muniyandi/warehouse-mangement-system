const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendResetPasswordEmail(to, token) {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
  const message = {
    from: process.env.EMAIL_FROM,
    to,
    subject: 'WMS Password Reset Request',
    text: `You requested a password reset. Use this link within 15 minutes: ${resetUrl}`,
    html: `<p>You requested a password reset for your Warehouse Management System account.</p>
           <p>Click the link below within 15 minutes to reset your password:</p>
           <p><a href="${resetUrl}">${resetUrl}</a></p>
           <p>If you did not request this, ignore this email.</p>`,
  };

  await transporter.sendMail(message);
}

module.exports = { sendResetPasswordEmail };
