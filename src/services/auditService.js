/**
 * Audit trail service for security-relevant events.
 * SECURITY: Never store passwords, OTPs, tokens, or hashes in audit entries.
 */
const prisma = require('../db/database');
const logger = require('../utils/logger');

async function recordAudit({ userId, actorId, action, resource, outcome = 'SUCCESS' }) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        actorId: actorId || null,
        action,
        resource: resource || null,
        outcome,
      },
    });
  } catch (err) {
    logger.error('Failed to write audit log', { action, message: err.message });
  }
}

async function listAuditLogs({ userId, limit = 50 }) {
  return prisma.auditLog.findMany({
    where: userId ? { userId } : undefined,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      user: { select: { username: true, email: true } },
      actor: { select: { username: true, email: true } },
    },
  });
}

module.exports = { recordAudit, listAuditLogs };
