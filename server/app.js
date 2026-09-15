const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const env = require('./config/env');
const { apiLimiter } = require('./middleware/rateLimiter');
const logger = require('./utils/logger');

const path = require('path');
const authRoutes = require('./routes/auth.routes');
const teamsRoutes = require('./routes/teams.routes');
const questionsRoutes = require('./routes/questions.routes');
const gameRoutes = require('./routes/game.routes');
const answersRoutes = require('./routes/answers.routes');
const leaderboardRoutes = require('./routes/leaderboard.routes');

const app = express();

// Security Headers with relaxed CSP for CDNs (Tailwind, Fonts, QR code, Socket.IO)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          'https://cdn.tailwindcss.com',
          'https://cdnjs.cloudflare.com',
          'https://cdn.jsdelivr.net'
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://fonts.googleapis.com',
          'https://cdnjs.cloudflare.com'
        ],
        fontSrc: [
          "'self'",
          'https://fonts.gstatic.com',
          'data:'
        ],
        imgSrc: [
          "'self'",
          'data:',
          'blob:',
          'https:'
        ],
        connectSrc: [
          "'self'",
          'ws:',
          'wss:',
          'http:',
          'https:'
        ],
        objectSrc: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: false
  })
);

// CORS configuration
let corsOrigin = env.ALLOWED_ORIGINS;
if (corsOrigin.includes(',')) {
  corsOrigin = corsOrigin.split(',').map(s => s.trim());
}

app.use(
  cors({
    origin: corsOrigin === '*' ? true : corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  })
);

// Request parsing & limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// General rate limiter on API endpoints
app.use('/api/', apiLimiter);

// Public dynamic client configuration (NEVER expose secrets or passwords)
app.get('/api/config', (req, res) => {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  const origin = `${protocol}://${host}`;

  return res.json({
    publicJoinUrl: env.PUBLIC_JOIN_URL || `${origin}/register.html`,
    backendUrl: env.BACKEND_URL || origin,
    socketUrl: env.SOCKET_URL || origin,
    realtime: 'polling',
    environment: env.NODE_ENV
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/questions', questionsRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/answers', answersRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    event: 'KDK INDUCTION QUIZ 2026'
  });
});

// Serve static frontend files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Frontend convenience routes
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../public', 'index.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, '../public', 'register.html')));
app.get('/lobby', (req, res) => res.sendFile(path.join(__dirname, '../public', 'lobby.html')));
app.get('/quiz', (req, res) => res.sendFile(path.join(__dirname, '../public', 'quiz.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, '../public', 'admin.html')));
app.get('/admin-login', (req, res) => res.sendFile(path.join(__dirname, '../public', 'admin-login.html')));
app.get('/projector', (req, res) => res.sendFile(path.join(__dirname, '../public', 'projector.html')));
app.get('/leaderboard', (req, res) => res.sendFile(path.join(__dirname, '../public', 'leaderboard.html')));
app.get('/question-bank', (req, res) => res.sendFile(path.join(__dirname, '../public', 'question-bank.html')));

// Catch-all 404 for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found'
  });
});

// Centralized Safe Error Handler
app.use((err, req, res, next) => {
  logger.error('Unhandled server error:', err.stack || err.message);
  res.status(err.status || 500).json({
    success: false,
    error: env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

module.exports = app;

