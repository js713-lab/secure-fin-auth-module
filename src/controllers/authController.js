/**
 * Authentication route handlers.
 */
const env = require('../config/env');
const {
  registerUser,
  verifyRegistration,
  loginStep1,
  loginStep2,
  startPasswordReset,
  completePasswordReset,
} = require('../services/authService');

function setAuthCookie(res, token) {
  // SECURITY: HttpOnly prevents JS access; Secure requires HTTPS in production;
  // SameSite=strict reduces CSRF risk for cookie-based auth.
  res.cookie(env.cookieName, token, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: 'strict',
    maxAge: 60 * 60 * 1000, // 1 hour — align with JWT expiry
    path: '/',
  });
}

function clearAuthCookie(res) {
  res.clearCookie(env.cookieName, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: 'strict',
    path: '/',
  });
}

async function register(req, res, next) {
  try {
    const result = await registerUser(req.validated);

    if (!result.success) {
      return res.status(result.status).json({
        success: false,
        message: result.message,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Registration OTP sent to email',
      data: {
        username: result.username,
        email: result.email,
        expiresAt: result.expiresAt,
        ...(env.isTest && result.otp ? { otp: result.otp } : {}),
      },
    });
  } catch (err) {
    next(err);
  }
}

async function verifyRegistrationHandler(req, res, next) {
  try {
    const result = await verifyRegistration(req.validated);

    if (!result.success) {
      return res.status(result.status).json({
        success: false,
        message: result.message,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Registration verified successfully',
      data: result.user,
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const result = await loginStep1(req.validated);

    if (!result.success) {
      return res.status(result.status).json({
        success: false,
        message: result.message,
      });
    }

    if (result.authenticated) {
      setAuthCookie(res, result.token);
      return res.status(200).json({
        success: true,
        message: 'Authentication successful',
        data: {
          authenticated: true,
          mfaRequired: false,
          user: result.user,
        },
      });
    }

    const response = {
      success: true,
      message: 'OTP sent to registered email.',
      data: {
        authenticated: false,
        mfaRequired: true,
        sessionId: result.sessionId,
        expiresAt: result.expiresAt,
      },
    };

    if (env.isTest && result.otp) {
      response.data.otp = result.otp;
    }

    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const result = await startPasswordReset(req.validated);
    const response = {
      success: true,
      message: 'If the email exists, a password reset OTP has been sent.',
    };

    if (env.isTest && result.resetId) {
      response.data = { resetId: result.resetId, otp: result.otp };
    }

    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const result = await completePasswordReset(req.validated);

    if (!result.success) {
      return res.status(result.status).json({
        success: false,
        message: result.message,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Password reset successful',
    });
  } catch (err) {
    next(err);
  }
}

async function verifyOtpHandler(req, res, next) {
  try {
    const result = await loginStep2(req.validated);

    if (!result.success) {
      return res.status(result.status).json({
        success: false,
        message: result.message,
      });
    }

    setAuthCookie(res, result.token);

    res.status(200).json({
      success: true,
      message: 'Authentication successful',
      data: { user: result.user },
    });
  } catch (err) {
    next(err);
  }
}

const { recordAudit } = require('../services/auditService');

function logout(req, res) {
  if (req.user) {
    recordAudit({
      userId: req.user.id,
      actorId: req.user.id,
      action: 'LOGOUT',
      resource: req.user.email,
    });
  }
  clearAuthCookie(res);
  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
}

module.exports = {
  register,
  verifyRegistrationHandler,
  login,
  verifyOtpHandler,
  forgotPassword,
  resetPassword,
  logout,
  setAuthCookie,
  clearAuthCookie,
};
