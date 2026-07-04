/**
 * Secure logging utility.
 * SECURITY: Never log passwords, OTPs, JWTs, or password hashes.
 */
const fs = require('fs');
const path = require('path');
const env = require('../config/env');

const logsDir = path.join(process.cwd(), 'logs');
const logFile = path.join(logsDir, 'error.logs');

if (!env.isTest && !fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const SENSITIVE_PATTERNS = [
  /password/i,
  /otp/i,
  /token/i,
  /authorization/i,
  /secret/i,
  /hash/i,
];

function sanitizeMeta(meta) {
  if (!meta || typeof meta !== 'object') return meta;

  const sanitized = {};
  for (const [key, value] of Object.entries(meta)) {
    const isSensitive = SENSITIVE_PATTERNS.some((p) => p.test(key));
    sanitized[key] = isSensitive ? '[REDACTED]' : value;
  }
  return sanitized;
}

function writeToFile(level, message, meta) {
  if (env.isTest) return;

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(meta ? { meta: sanitizeMeta(meta) } : {}),
  };

  try {
    fs.appendFileSync(logFile, JSON.stringify(entry) + '\n');
  } catch {
    // Fallback only — avoid crashing on log write failure
  }
}

const logger = {
  info(message, meta) {
    writeToFile('info', message, meta);
  },

  warn(message, meta) {
    writeToFile('warn', message, meta);
  },

  error(message, meta) {
    writeToFile('error', message, meta);
  },

  /** Prototype-only: OTP printed to server console, never to log file. */
  otpPrototype(userId) {
    if (!env.isTest) {
      console.log(`[PROTOTYPE] OTP generated for user ${userId} — check server stdout only during dev`);
    }
  },
};

module.exports = logger;
