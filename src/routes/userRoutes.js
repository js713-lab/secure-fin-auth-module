const express = require('express');
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const { validateBody, verifyAuthenticatorSchema } = require('../validators/authValidator');

const router = express.Router();

router.get('/profile', authMiddleware, userController.getProfile);
router.get('/profile/audit-trails', authMiddleware, userController.getAuditTrails);
router.post('/profile/mfa/email', authMiddleware, userController.enableEmailMfaHandler);
router.post('/profile/mfa/authenticator/setup', authMiddleware, userController.setupAuthenticatorHandler);
router.post(
  '/profile/mfa/authenticator/verify',
  authMiddleware,
  validateBody(verifyAuthenticatorSchema),
  userController.verifyAuthenticatorHandler
);
router.post('/profile/mfa/disable', authMiddleware, userController.disableMfaHandler);

module.exports = router;
