/**
 * Authentication business logic.
 * SECURITY: bcrypt password hashing, generic failure messages, no credential leakage.
 */
const bcrypt = require('bcrypt');
const env = require('../config/env');
const prisma = require('../db/database');
const { createOtpSession, generateOtpCode, verifyOtpByEmail } = require('./otpService');
const logger = require('../utils/logger');
const jwt = require('../utils/jwt');
const { sendRegistrationOtp, sendPasswordResetOtp } = require('./mailService');
const { recordAudit } = require('./auditService');
const { verifyTotpCode } = require('./totpService');

const GENERIC_AUTH_ERROR = 'Invalid credentials';

async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, env.bcryptRounds);
}

async function registerUser({ username, email, password }) {
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { username }],
    },
  });

  if (existing) {
    // SECURITY: Generic message — do not reveal whether email or username exists
    return { success: false, status: 409, message: 'Registration could not be completed' };
  }

  const passwordHash = await hashPassword(password);
  const otp = generateOtpCode();
  const otpHash = await bcrypt.hash(otp, env.bcryptRounds);
  const expiresAt = new Date(Date.now() + env.otpExpiryMinutes * 60 * 1000);

  const pending = await prisma.pendingRegistration.upsert({
    where: { email },
    update: {
      username,
      passwordHash,
      otpHash,
      expiresAt,
    },
    create: {
      username,
      email,
      passwordHash,
      otpHash,
      expiresAt,
    },
  });

  if (!env.isTest) {
    await sendRegistrationOtp({
      to: email,
      username,
      otp,
      expiresAt,
    });
  }

  logger.info('Pending registration OTP sent', { pendingRegistrationId: pending.id, email, username });

  return {
    success: true,
    username: pending.username,
    email: pending.email,
    expiresAt,
    ...(env.isTest ? { otp } : {}),
  };
}

async function verifyRegistration({ username, email, otp }) {
  const pending = await prisma.pendingRegistration.findUnique({
    where: { email },
  });

  if (
    !pending ||
    pending.username !== username ||
    new Date() > pending.expiresAt
  ) {
    return { success: false, status: 401, message: 'Invalid or expired registration OTP' };
  }

  const otpValid = await bcrypt.compare(otp, pending.otpHash);
  if (!otpValid) {
    return { success: false, status: 401, message: 'Invalid or expired registration OTP' };
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: pending.email }, { username: pending.username }] },
  });

  if (existing) {
    await prisma.pendingRegistration.delete({ where: { id: pending.id } });
    return { success: false, status: 409, message: 'Registration could not be completed' };
  }

  const user = await prisma.user.create({
    data: {
      username: pending.username,
      email: pending.email,
      passwordHash: pending.passwordHash,
      role: 'CUSTOMER',
      mfaEnabled: false,
    },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      mfaEnabled: true,
      mfaMethod: true,
      createdAt: true,
    },
  });

  await prisma.pendingRegistration.delete({ where: { id: pending.id } });
  logger.info('User registered after email OTP verification', { userId: user.id, role: user.role });
  await recordAudit({
    userId: user.id,
    actorId: user.id,
    action: 'REGISTRATION_COMPLETED',
    resource: user.email,
  });

  return { success: true, user };
}

async function lockUserIfNeeded(user) {
  const failedLoginAttempts = user.failedLoginAttempts + 1;
  const shouldLock = failedLoginAttempts >= env.maxFailedLoginAttempts;
  const lockedUntil = shouldLock
    ? new Date(Date.now() + env.accountLockMinutes * 60 * 1000)
    : user.lockedUntil;

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts, lockedUntil },
  });

  if (shouldLock) {
    logger.warn('User account temporarily locked', { userId: user.id });
  }
}

async function resetFailedLoginState(userId) {
  await prisma.user.update({
    where: { id: userId },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  });
}

async function loginStep1({ email, password }) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  // SECURITY: Same error whether user missing or password wrong (timing-safe-ish pattern)
  if (!user) {
    await bcrypt.compare(password, '$2b$12$invalidhashinvalidhashinvalidha');
    return { success: false, status: 401, message: GENERIC_AUTH_ERROR };
  }

  if (user.lockedUntil && new Date() < user.lockedUntil) {
    logger.warn('Login blocked by account lockout', { userId: user.id });
    return { success: false, status: 423, message: 'Account temporarily locked. Try again later.' };
  }

  const passwordValid = await bcrypt.compare(password, user.passwordHash);
  if (!passwordValid) {
    logger.warn('Failed login attempt', { userId: user.id });
    await lockUserIfNeeded(user);
    await recordAudit({
      userId: user.id,
      actorId: user.id,
      action: 'LOGIN_FAILED',
      resource: email,
      outcome: 'FAILURE',
    });
    return { success: false, status: 401, message: GENERIC_AUTH_ERROR };
  }

  await resetFailedLoginState(user.id);

  if (!user.mfaEnabled) {
    const token = jwt.sign({ userId: user.id, role: user.role });
    logger.info('User authenticated without MFA', { userId: user.id, role: user.role });
    await recordAudit({
      userId: user.id,
      actorId: user.id,
      action: 'LOGIN_SUCCESS',
      resource: 'password-only',
    });

    return {
      success: true,
      authenticated: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    };
  }

  const mfaMethod = user.mfaMethod || 'EMAIL';

  if (mfaMethod === 'TOTP') {
    await recordAudit({
      userId: user.id,
      actorId: user.id,
      action: 'LOGIN_TOTP_REQUIRED',
      resource: email,
    });

    return {
      success: true,
      email: user.email,
      mfaMethod: 'TOTP',
    };
  }

  const otpSession = await createOtpSession(user.id);
  await recordAudit({
    userId: user.id,
    actorId: user.id,
    action: 'LOGIN_OTP_SENT',
    resource: email,
  });

  return {
    success: true,
    email: user.email,
    mfaMethod: 'EMAIL',
    expiresAt: otpSession.expiresAt,
    otp: otpSession.otp,
  };
}

async function loginStep2({ email, otp }) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !user.mfaEnabled) {
    return { success: false, status: 401, message: 'Invalid or expired OTP' };
  }

  const mfaMethod = user.mfaMethod || 'EMAIL';
  let authenticatedUser = user;

  if (mfaMethod === 'TOTP') {
    if (!verifyTotpCode(user.totpSecret, otp)) {
      return { success: false, status: 401, message: 'Invalid or expired authenticator code' };
    }
  } else {
    const result = await verifyOtpByEmail(email, otp);

    if (!result.valid) {
      const message =
        result.reason === 'expired'
          ? 'OTP has expired. Please log in again.'
          : 'Invalid or expired OTP';
      return { success: false, status: 401, message };
    }

    authenticatedUser = result.user;
  }

  const token = jwt.sign({ userId: authenticatedUser.id, role: authenticatedUser.role });

  logger.info('User authenticated via MFA', {
    userId: authenticatedUser.id,
    role: authenticatedUser.role,
    mfaMethod,
  });
  await recordAudit({
    userId: authenticatedUser.id,
    actorId: authenticatedUser.id,
    action: 'LOGIN_SUCCESS',
    resource: mfaMethod === 'TOTP' ? 'authenticator' : 'email-otp',
  });

  return {
    success: true,
    token,
    user: {
      id: authenticatedUser.id,
      username: authenticatedUser.username,
      email: authenticatedUser.email,
      role: authenticatedUser.role,
    },
  };
}

async function startPasswordReset({ email }) {
  const user = await prisma.user.findUnique({ where: { email } });

  // SECURITY: Always return success to avoid email enumeration.
  if (!user) {
    await bcrypt.hash(generateOtpCode(), env.bcryptRounds);
    return { success: true };
  }

  const otp = generateOtpCode();
  const otpHash = await bcrypt.hash(otp, env.bcryptRounds);
  const expiresAt = new Date(Date.now() + env.otpExpiryMinutes * 60 * 1000);

  await prisma.passwordReset.updateMany({
    where: { userId: user.id, used: false },
    data: { used: true },
  });

  const reset = await prisma.passwordReset.create({
    data: {
      userId: user.id,
      otpHash,
      expiresAt,
    },
  });

  if (!env.isTest) {
    await sendPasswordResetOtp({
      to: email,
      otp,
      resetId: reset.id,
      expiresAt,
    });
  }

  logger.info('Password reset OTP sent', { userId: user.id });
  return { success: true, resetId: reset.id, ...(env.isTest ? { otp } : {}) };
}

async function completePasswordReset({ resetId, otp, password }) {
  const reset = await prisma.passwordReset.findUnique({
    where: { id: resetId },
  });

  if (!reset || reset.used || new Date() > reset.expiresAt) {
    return { success: false, status: 401, message: 'Invalid or expired reset OTP' };
  }

  const otpValid = await bcrypt.compare(otp, reset.otpHash);
  if (!otpValid) {
    return { success: false, status: 401, message: 'Invalid or expired reset OTP' };
  }

  const passwordHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: reset.userId },
      data: {
        passwordHash,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    }),
    prisma.passwordReset.update({
      where: { id: reset.id },
      data: { used: true },
    }),
  ]);

  logger.info('Password reset completed', { userId: reset.userId });
  return { success: true };
}

function getPublicProfile(user) {
  const mfaMethod = user.mfaEnabled ? user.mfaMethod || 'EMAIL' : null;

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    mfaEnabled: user.mfaEnabled,
    mfaMethod,
    createdAt: user.createdAt,
  };
}

module.exports = {
  registerUser,
  verifyRegistration,
  loginStep1,
  loginStep2,
  startPasswordReset,
  completePasswordReset,
  getPublicProfile,
  GENERIC_AUTH_ERROR,
};
