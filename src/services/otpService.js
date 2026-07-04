/**
 * OTP generation and verification service.
 * SECURITY: Store only bcrypt-hashed OTP; short expiry; single-use tokens.
 */
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const env = require('../config/env');
const prisma = require('../db/database');
const { sendLoginOtp } = require('./mailService');

function generateOtpCode() {
  const max = 10 ** env.otpLength;
  const code = crypto.randomInt(0, max).toString().padStart(env.otpLength, '0');
  return code;
}

async function createOtpSession(userId) {
  const otp = generateOtpCode();
  const otpHash = await bcrypt.hash(otp, env.bcryptRounds);
  const expiresAt = new Date(Date.now() + env.otpExpiryMinutes * 60 * 1000);

  // Invalidate any previous unused OTP sessions for this user
  await prisma.otpSession.updateMany({
    where: { userId, used: false },
    data: { used: true },
  });

  const session = await prisma.otpSession.create({
    data: {
      userId,
      otpHash,
      expiresAt,
    },
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!env.isTest && user) {
    await sendLoginOtp({
      to: user.email,
      otp,
      expiresAt,
    });
  }

  return {
    email: user?.email,
    expiresAt,
    ...(env.isTest ? { otp } : {}),
  };
}

async function verifyOtpByEmail(email, otp) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return { valid: false, reason: 'invalid' };
  }

  const session = await prisma.otpSession.findFirst({
    where: {
      userId: user.id,
      used: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
    include: { user: true },
  });

  if (!session) {
    return { valid: false, reason: 'invalid' };
  }

  const matches = await bcrypt.compare(otp, session.otpHash);
  if (!matches) {
    return { valid: false, reason: 'invalid' };
  }

  await prisma.otpSession.update({
    where: { id: session.id },
    data: { used: true },
  });

  return { valid: true, user: session.user };
}

async function verifyOtp(sessionId, otp) {
  const session = await prisma.otpSession.findUnique({
    where: { id: sessionId },
    include: { user: true },
  });

  if (!session || session.used) {
    return { valid: false, reason: 'invalid' };
  }

  if (new Date() > session.expiresAt) {
    return { valid: false, reason: 'expired' };
  }

  const matches = await bcrypt.compare(otp, session.otpHash);
  if (!matches) {
    return { valid: false, reason: 'invalid' };
  }

  await prisma.otpSession.update({
    where: { id: sessionId },
    data: { used: true },
  });

  return { valid: true, user: session.user };
}

module.exports = {
  createOtpSession,
  generateOtpCode,
  verifyOtp,
  verifyOtpByEmail,
};
