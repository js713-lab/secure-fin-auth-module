/**
 * Minimal HS256 JWT helper using Node's built-in crypto module.
 * SECURITY: Tokens are signed with JWT_SECRET and verified with timing-safe
 * comparison. Payload intentionally stores only userId, role, iat, and exp.
 */
const crypto = require('crypto');
const env = require('../config/env');

function base64UrlEncode(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(input) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(normalized, 'base64').toString('utf8');
}

function parseExpiryToSeconds(value) {
  const match = /^(\d+)([smhd])?$/.exec(value);
  if (!match) return 60 * 60;

  const amount = Number(match[1]);
  const unit = match[2] || 's';

  const multipliers = {
    s: 1,
    m: 60,
    h: 60 * 60,
    d: 24 * 60 * 60,
  };

  return amount * multipliers[unit];
}

function sign(data) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    userId: data.userId,
    role: data.role,
    iat: now,
    exp: now + parseExpiryToSeconds(env.jwtExpiresIn),
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac('sha256', env.jwtSecret)
    .update(signingInput)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${signingInput}.${signature}`;
}

function verify(token) {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = crypto
    .createHmac('sha256', env.jwtSecret)
    .update(signingInput)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    throw new Error('Invalid JWT signature');
  }

  const header = JSON.parse(base64UrlDecode(encodedHeader));
  if (header.alg !== 'HS256' || header.typ !== 'JWT') {
    throw new Error('Invalid JWT header');
  }

  const payload = JSON.parse(base64UrlDecode(encodedPayload));
  if (!payload.exp || Math.floor(Date.now() / 1000) >= payload.exp) {
    throw new Error('JWT expired');
  }

  return {
    userId: payload.userId,
    role: payload.role,
  };
}

module.exports = {
  sign,
  verify,
};
