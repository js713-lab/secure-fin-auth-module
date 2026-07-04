const express = require('express');
const authController = require('../controllers/authController');
const {
  validateBody,
  registerSchema,
  verifyRegistrationSchema,
  loginSchema,
  verifyOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require('../validators/authValidator');
const { loginLimiter, otpLimiter, registerLimiter } = require('../middleware/rateLimiter');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', registerLimiter, validateBody(registerSchema), authController.register);
router.post(
  '/verify-registration',
  otpLimiter,
  validateBody(verifyRegistrationSchema),
  authController.verifyRegistrationHandler
);
router.post('/login', loginLimiter, validateBody(loginSchema), authController.login);
router.post('/verify-otp', otpLimiter, validateBody(verifyOtpSchema), authController.verifyOtpHandler);
router.post('/forgot-password', loginLimiter, validateBody(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', otpLimiter, validateBody(resetPasswordSchema), authController.resetPassword);
router.post('/logout', authMiddleware, authController.logout);

module.exports = router;
