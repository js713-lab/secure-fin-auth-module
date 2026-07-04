/**
 * User profile route handler.
 * SECURITY: Users may only view their own profile — no password hash exposed.
 */
const { getPublicProfile } = require('../services/authService');
const { recordAudit, listAuditLogs } = require('../services/auditService');
const prisma = require('../db/database');
const logger = require('../utils/logger');

async function getProfile(req, res, next) {
  try {
    await recordAudit({
      userId: req.user.id,
      actorId: req.user.id,
      action: 'PROFILE_VIEW',
      resource: req.user.email,
    });

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
    await recordAudit({
      userId: user.id,
      actorId: user.id,
      action: 'MFA_ENABLED',
      resource: user.email,
    });

    res.status(200).json({
      success: true,
      message: 'Two-factor authentication enabled',
      data: getPublicProfile(user),
    });
  } catch (err) {
    next(err);
  }
}

async function getAuditTrails(req, res, next) {
  try {
    const logs = await listAuditLogs({ userId: req.user.id, limit: 50 });
    res.status(200).json({
      success: true,
      data: logs.map((entry) => ({
        id: entry.id,
        action: entry.action,
        resource: entry.resource,
        outcome: entry.outcome,
        createdAt: entry.createdAt,
        actor: entry.actor
          ? { username: entry.actor.username, email: entry.actor.email }
          : null,
      })),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getProfile, enableMfa, getAuditTrails };
