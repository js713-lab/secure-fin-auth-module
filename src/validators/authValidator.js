/**
 * Input validation using Zod.
 * SECURITY: Reject malformed input before it reaches business logic (defence in depth).
 */
const { z } = require('zod');

const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be at most 30 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username may only contain letters, numbers, and underscores');

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Invalid email format')
  .max(255, 'Email must be at most 255 characters');

/** Strong password policy: min 8 chars, upper, lower, digit, special char */
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one digit')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

const registerSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required').max(128, 'Password too long'),
});

const verifyRegistrationSchema = z.object({
  registrationId: z.string().uuid('Invalid registration ID'),
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'OTP must be a 6-digit code'),
});

const verifyOtpSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'OTP must be a 6-digit code'),
});

const forgotPasswordSchema = z.object({
  email: emailSchema,
});

const resetPasswordSchema = z.object({
  resetId: z.string().uuid('Invalid reset ID'),
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'OTP must be a 6-digit code'),
  password: passwordSchema,
});

const updateRoleSchema = z.object({
  role: z.enum(['CUSTOMER', 'ADMIN']),
});

function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join('.') || 'body',
        message: e.message,
      }));
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }
    req.validated = result.data;
    next();
  };
}

module.exports = {
  registerSchema,
  loginSchema,
  verifyRegistrationSchema,
  verifyOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateRoleSchema,
  validateBody,
};
