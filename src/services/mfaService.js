/**
 * MFA setup and management for email OTP and authenticator apps.
 */
const prisma = require('../db/database');
const logger = require('../utils/logger');
const { recordAudit } = require('./auditService');
const { getPublicProfile } = require('./authService');
const {
  generateTotpSecret,
  buildOtpAuthUrl,
  buildQrCodeDataUrl,
  verifyTotpCode,
} = require('./totpService');

const profileSelect = {
  id: true,
  username: true,
  email: true,
  role: true,
  mfaEnabled: true,
  mfaMethod: true,
  createdAt: true,
};

async function enableEmailMfa(userId) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      mfaEnabled: true,
      mfaMethod: 'EMAIL',
      totpSecret: null,
      totpPendingSecret: null,
    },
    select: profileSelect,
  });

  logger.info('Email MFA enabled', { userId });
  await recordAudit({
    userId,
    actorId: userId,
    action: 'MFA_ENABLED',
    resource: `${user.email}:EMAIL`,
  });

  return user;
}

async function startAuthenticatorSetup(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, mfaEnabled: true },
  });

  if (!user) {
    return { success: false, status: 404, message: 'User not found' };
  }

  if (user.mfaEnabled) {
    return { success: false, status: 400, message: 'Two-factor authentication is already enabled' };
  }

  const secret = generateTotpSecret();
  await prisma.user.update({
    where: { id: userId },
    data: { totpPendingSecret: secret },
  });

  const otpAuthUrl = buildOtpAuthUrl(user.email, secret);
  const qrCodeDataUrl = await buildQrCodeDataUrl(otpAuthUrl);

  return {
    success: true,
    qrCodeDataUrl,
    manualSecret: secret,
    otpAuthUrl,
  };
}

async function verifyAuthenticatorSetup(userId, code) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      mfaEnabled: true,
      totpPendingSecret: true,
    },
  });

  if (!user?.totpPendingSecret) {
    return { success: false, status: 400, message: 'Start authenticator setup before verifying a code' };
  }

  if (!verifyTotpCode(user.totpPendingSecret, code)) {
    return { success: false, status: 401, message: 'Invalid authenticator code' };
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      mfaEnabled: true,
      mfaMethod: 'TOTP',
      totpSecret: user.totpPendingSecret,
      totpPendingSecret: null,
    },
    select: profileSelect,
  });

  logger.info('Authenticator MFA enabled', { userId });
  await recordAudit({
    userId,
    actorId: userId,
    action: 'MFA_ENABLED',
    resource: `${updated.email}:TOTP`,
  });

  return { success: true, user: updated };
}

async function disableMfa(userId) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      mfaEnabled: false,
      mfaMethod: null,
      totpSecret: null,
      totpPendingSecret: null,
    },
    select: profileSelect,
  });

  logger.info('MFA disabled', { userId });
  await recordAudit({
    userId,
    actorId: userId,
    action: 'MFA_DISABLED',
    resource: user.email,
  });

  return user;
}

module.exports = {
  enableEmailMfa,
  startAuthenticatorSetup,
  verifyAuthenticatorSetup,
  disableMfa,
};
