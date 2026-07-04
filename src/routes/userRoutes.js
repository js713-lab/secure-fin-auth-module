const express = require('express');
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/profile', authMiddleware, userController.getProfile);
router.get('/profile/audit-trails', authMiddleware, userController.getAuditTrails);
router.post('/profile/mfa/enable', authMiddleware, userController.enableMfa);

module.exports = router;
