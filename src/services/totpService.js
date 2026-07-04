/**
 * TOTP helpers for Microsoft Authenticator and compatible apps.
 * SECURITY: Secrets are stored server-side only; never log OTP codes or secrets.
 */
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

const ISSUER = 'SecureFin OS';

function generateTotpSecret() {
  return speakeasy.generateSecret({ length: 20 }).base32;
}

function buildOtpAuthUrl(email, secret) {
  return speakeasy.otpauthURL({
    secret,
    label: email,
    issuer: ISSUER,
    encoding: 'base32',
  });
}

async function buildQrCodeDataUrl(otpAuthUrl) {
  return QRCode.toDataURL(otpAuthUrl);
}

function verifyTotpCode(secret, token) {
  if (!secret || !token) return false;
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 1,
  });
}

module.exports = {
  generateTotpSecret,
  buildOtpAuthUrl,
  buildQrCodeDataUrl,
  verifyTotpCode,
};
