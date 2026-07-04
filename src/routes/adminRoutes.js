const express = require('express');
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { validateBody, updateRoleSchema } = require('../validators/authValidator');

const router = express.Router();

router.get('/users', authMiddleware, requireRole('ADMIN'), adminController.listUsers);
router.patch(
  '/users/:userId/role',
  authMiddleware,
  requireRole('ADMIN'),
  validateBody(updateRoleSchema),
  adminController.updateUserRole
);

module.exports = router;
