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

// SECURITY: Global rate limit — baseline protection against automated abuse
app.use(globalLimiter);

app.use(express.static(path.join(__dirname, '../public')));

app.get('/', (_req, res) => {
  res.redirect('/login.html');
});

app.get('/health', (_req, res) => {
  res.json({ success: true, message: 'SecureFin Auth Module is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api', userRoutes);
app.use('/api/admin', adminRoutes);

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use(errorHandler);

module.exports = app;
