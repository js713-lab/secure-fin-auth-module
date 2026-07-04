/**
 * User profile route handler.
 * SECURITY: Users may only view their own profile — no password hash exposed.
 */
const { getPublicProfile } = require('../services/authService');
const { recordAudit, listAuditLogs } = require('../services/auditService');
const {
  enableEmailMfa,
  startAuthenticatorSetup,
  verifyAuthenticatorSetup,
  disableMfa,
} = require('../services/mfaService');

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

async function enableEmailMfaHandler(req, res, next) {
  try {
    if (req.user.mfaEnabled) {
      return res.status(400).json({
        success: false,
        message: 'Two-factor authentication is already enabled',
      });
    }

    const user = await enableEmailMfa(req.user.id);

    res.status(200).json({
      success: true,
      message: 'Email OTP two-factor authentication enabled',
      data: getPublicProfile(user),
    });
  } catch (err) {
    next(err);
  }
}

async function setupAuthenticatorHandler(req, res, next) {
  try {
    const result = await startAuthenticatorSetup(req.user.id);

    if (!result.success) {
      return res.status(result.status).json({
        success: false,
        message: result.message,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Scan the QR code in Microsoft Authenticator, then verify with a 6-digit code',
      data: {
        qrCodeDataUrl: result.qrCodeDataUrl,
        manualSecret: result.manualSecret,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function verifyAuthenticatorHandler(req, res, next) {
  try {
    const result = await verifyAuthenticatorSetup(req.user.id, req.validated.code);

    if (!result.success) {
      return res.status(result.status).json({
        success: false,
        message: result.message,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Microsoft Authenticator two-factor authentication enabled',
      data: getPublicProfile(result.user),
    });
  } catch (err) {
    next(err);
  }
}

async function disableMfaHandler(req, res, next) {
  try {
    if (!req.user.mfaEnabled) {
      return res.status(400).json({
        success: false,
        message: 'Two-factor authentication is already disabled',
      });
    }

    const user = await disableMfa(req.user.id);

    res.status(200).json({
      success: true,
      message: 'Two-factor authentication disabled',
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

module.exports = {
  getProfile,
  enableEmailMfaHandler,
  setupAuthenticatorHandler,
  verifyAuthenticatorHandler,
  disableMfaHandler,
  getAuditTrails,
};
