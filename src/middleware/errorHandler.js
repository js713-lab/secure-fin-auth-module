/**
 * Centralised error handler.
 * SECURITY: Never leak stack traces or internal details in production responses.
 */
const env = require('../config/env');
const logger = require('../utils/logger');

function errorHandler(err, _req, res, _next) {
  logger.error('Unhandled error', { error: err.message });

  const status = err.status || err.statusCode || 500;
  const message =
    status === 500 && env.isProduction
      ? 'An internal error occurred'
      : err.message || 'An internal error occurred';

  res.status(status).json({
    success: false,
    message,
    ...(env.isProduction ? {} : { stack: err.stack }),
  });
}

module.exports = errorHandler;
