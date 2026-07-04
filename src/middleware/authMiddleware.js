/**
 * JWT authentication middleware.
 * SECURITY: Reads JWT from HttpOnly cookie only — not from Authorization header
 * to reduce XSS token theft risk when combined with HttpOnly flag.
 */
const env = require('../config/env');
const prisma = require('../db/database');
const logger = require('../utils/logger');
const jwt = require('../utils/jwt');

async function authMiddleware(req, res, next) {
  try {
    const token = req.cookies[env.cookieName];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token);
    } catch {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired session',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
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

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired session',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    logger.error('Auth middleware error', { error: err.message });
    next(err);
  }
}

module.exports = authMiddleware;
