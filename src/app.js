/**
 * Express application setup with security middleware.
 */
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const env = require('./config/env');
const { globalLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// SECURITY: Helmet sets secure HTTP headers (X-Content-Type-Options, etc.)
app.use(helmet());

// SECURITY: Restrict CORS to configured origins; credentials enabled for cookies
app.use(
  cors({
    origin: env.corsOrigin,
    credentials: true,
  })
);

app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, '../public')));

app.get('/', (_req, res) => {
  res.redirect('/login.html');
});

app.get('/health', (_req, res) => {
  res.json({ success: true, message: 'SecureFin Auth Module is running' });
});

app.post('/api/client-log', (req, res) => {
  const { source, message, detail } = req.body || {};
  logger.warn('Client-side error', {
    source: String(source || 'client').slice(0, 80),
    message: String(message || 'unknown').slice(0, 500),
    detail: String(detail || '').slice(0, 1000),
  });
  res.status(204).end();
});

// SECURITY: Rate limit API routes only — static pages must not consume auth quotas.
app.use('/api', globalLimiter);
app.use('/api/auth', authRoutes);
app.use('/api', userRoutes);
app.use('/api/admin', adminRoutes);

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use(errorHandler);

module.exports = app;
