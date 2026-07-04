/**
 * Email delivery service.
 * SECURITY: Messages intentionally avoid including passwords, JWTs, or hashes.
 */
const mailConfig = require('../config/mail');
const logger = require('../utils/logger');

let transporter;

function getNodemailer() {
  // Lazy load so the server can still start before dependencies/config are verified.
  // eslint-disable-next-line global-require
  return require('nodemailer');
}

function getTransporter() {
  if (!mailConfig.isMailConfigured()) {
    throw new Error('SMTP is not configured');
  }

  if (!transporter) {
    const nodemailer = getNodemailer();
    transporter = nodemailer.createTransport({
      host: mailConfig.host,
      port: mailConfig.port,
      secure: mailConfig.secure,
      auth: mailConfig.auth,
    });
  }

  return transporter;
}

async function sendMail({ to, subject, text }) {
  const smtp = getTransporter();
  await smtp.sendMail({
    from: mailConfig.from,
    to,
    subject,
    text,
  });
  logger.info('Security email sent', { to, subject });
}

async function sendRegistrationOtp({ to, username, otp, expiresAt }) {
  await sendMail({
    to,
    subject: 'SecureFin Registration OTP',
    text: [
      'SecureFin account registration verification',
      '',
      `Username: ${username}`,
      `Email: ${to}`,
      `OTP: ${otp}`,
      `Expires: ${expiresAt.toISOString()}`,
      '',
      'If you did not request this registration, ignore this email.',
    ].join('\n'),
  });
}

async function sendLoginOtp({ to, otp, sessionId, expiresAt }) {
  await sendMail({
    to,
    subject: 'SecureFin Login OTP',
    text: [
      'SecureFin login verification',
      '',
      `Session ID: ${sessionId}`,
      `OTP: ${otp}`,
      `Expires: ${expiresAt.toISOString()}`,
      '',
      'If you did not attempt to log in, contact support immediately.',
    ].join('\n'),
  });
}

async function sendPasswordResetOtp({ to, otp, resetId, expiresAt }) {
  await sendMail({
    to,
    subject: 'SecureFin Password Reset OTP',
    text: [
      'SecureFin password reset verification',
      '',
      `Reset ID: ${resetId}`,
      `OTP: ${otp}`,
      `Expires: ${expiresAt.toISOString()}`,
      '',
      'If you did not request a password reset, ignore this email.',
    ].join('\n'),
  });
}

module.exports = {
  sendRegistrationOtp,
  sendLoginOtp,
  sendPasswordResetOtp,
};
