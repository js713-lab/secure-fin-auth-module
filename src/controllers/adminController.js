/**
 * Admin route handlers.
 * SECURITY: RBAC enforced at route level — only ADMIN role reaches this controller.
 */
const prisma = require('../db/database');
const { getPublicProfile } = require('../services/authService');

async function listUsers(_req, res, next) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        mfaEnabled: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: users.map(getPublicProfile),
    });
  } catch (err) {
    next(err);
  }
}

async function updateUserRole(req, res, next) {
  try {
    if (req.params.userId === req.user.id && req.validated.role !== 'ADMIN') {
      return res.status(400).json({
        success: false,
        message: 'Admins cannot remove their own ADMIN role',
      });
    }

    const user = await prisma.user.update({
      where: { id: req.params.userId },
      data: { role: req.validated.role },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        mfaEnabled: true,
        createdAt: true,
      },
    });

    res.status(200).json({
      success: true,
      message: 'User role updated',
      data: getPublicProfile(user),
    });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    next(err);
  }
}

module.exports = { listUsers, updateUserRole };
