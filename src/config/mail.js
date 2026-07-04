/**
 * SMTP mail configuration.
 * SECURITY: SMTP credentials must live in .env only; never hard-code secrets.
 */
const env = require('./env');

function isMailConfigured() {
  return Boolean(env.smtpHost && env.smtpUser && env.smtpPass);
}

module.exports = {
  host: env.smtpHost,
  port: env.smtpPort,
  secure: env.smtpSecure,
  auth: {
    user: env.smtpUser,
    pass: env.smtpPass,
  },
  from: env.smtpFrom,
  isMailConfigured,
};
