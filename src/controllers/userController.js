/**
 * User profile route handler.
 * SECURITY: Users may only view their own profile — no password hash exposed.
 */
const { getPublicProfile } = require('../services/authService');
const prisma = require('../db/database');
const logger = require('../utils/logger');

async function getProfile(req, res, next) {
  try {
    res.status(200).json({
      success: true,
      data: getPublicProfile(req.user),
    });
  } catch (err) {
    next(err);
  }
}

async function enableMfa(req, res, next) {
  try {
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { mfaEnabled: true },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        mfaEnabled: true,
        createdAt: true,
      },
    });

    logger.info('MFA enabled for user', { userId: user.id });

    res.status(200).json({
      success: true,
      message: 'Two-factor authentication enabled',
      data: getPublicProfile(user),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getProfile, enableMfa };
