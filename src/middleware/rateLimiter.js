/**
 * Rate limiting middleware.
 * SECURITY: Mitigates brute-force, credential stuffing, and automated bot abuse.
 */
const rateLimit = require('express-rate-limit');
const env = require('../config/env');

const standardHandler = (_req, res) => {
  res.status(429).json({
    success: false,
    message: 'Too many requests. Please try again later.',
  });
};

/** No-op limiter for test environment */
const noOpLimiter = (_req, _res, next) => next();

function createLimiter(options) {
  if (env.isTest) return noOpLimiter;
  return rateLimit(options);
}

/** Global API rate limit — baseline bot/abuse protection */
const globalLimiter = createLimiter({
  windowMs: env.rateLimitWindowMs,
  max: env.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  handler: standardHandler,
});

/** Login step 1 — strict limit against password guessing */
const loginLimiter = createLimiter({
  windowMs: env.rateLimitWindowMs,
  max: env.loginRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again later.' },
});

/** OTP verification — prevents OTP brute-force */
const otpLimiter = createLimiter({
  windowMs: env.rateLimitWindowMs,
  max: env.otpRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many OTP attempts. Please try again later.' },
});

/** Registration — reduces mass fake account creation by bots */
const registerLimiter = createLimiter({
  windowMs: env.rateLimitWindowMs,
  max: env.registerRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many registration attempts. Please try again later.' },
});

module.exports = {
  globalLimiter,
  loginLimiter,
  otpLimiter,
  registerLimiter,
};
