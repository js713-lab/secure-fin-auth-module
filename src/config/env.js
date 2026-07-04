/**
 * Environment variable configuration.
 * SECURITY: Centralises secrets and tunables; never hard-code credentials in source.
 */
require('dotenv').config();

function requireEnv(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',

  databaseUrl: requireEnv('DATABASE_URL', 'file:./test.db'),

  jwtSecret: requireEnv(
    'JWT_SECRET',
    process.env.NODE_ENV === 'test' ? 'test-jwt-secret-minimum-32-characters-long' : undefined
  ),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',

  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),

  otpExpiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10),
  otpLength: parseInt(process.env.OTP_LENGTH || '6', 10),

  maxFailedLoginAttempts: parseInt(process.env.MAX_FAILED_LOGIN_ATTEMPTS || '5', 10),
  accountLockMinutes: parseInt(process.env.ACCOUNT_LOCK_MINUTES || '15', 10),

  // SECURITY: HttpOnly cookie flags — Secure should be true in production (HTTPS/TLS).
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  cookieName: process.env.COOKIE_NAME || 'securefin_token',

  // SMTP email configuration. Secrets are loaded from .env only.
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: parseInt(process.env.SMTP_PORT || '465', 10),
  smtpSecure: process.env.SMTP_SECURE !== 'false',
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpFrom: process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@securefin.test',

  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim()),

  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  loginRateLimitMax: parseInt(process.env.LOGIN_RATE_LIMIT_MAX || '5', 10),
  otpRateLimitMax: parseInt(process.env.OTP_RATE_LIMIT_MAX || '5', 10),
  registerRateLimitMax: parseInt(process.env.REGISTER_RATE_LIMIT_MAX || '10', 10),
};

module.exports = env;
