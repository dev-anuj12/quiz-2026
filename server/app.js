const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const env = require('./config/env');
const { apiLimiter } = require('./middleware/rateLimiter');
const logger = require('./utils/logger');

const fs = require('fs');
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
  const host = req.headers['x-forwarded-host'] || req.get('host') || `localhost:${env.PORT || 3000}`;
  const origin = `${protocol}://${host}`;

  // Find local LAN IPv4 for mobile connectivity when accessing from localhost/127.0.0.1
  let lanIp = null;
  const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1') || host.includes('::1') || host.includes('0.0.0.0');
  if (isLocalhost) {
    try {
      const os = require('os');
      const interfaces = os.networkInterfaces();
      for (const name of Object.keys(interfaces)) {
        for (const net of interfaces[name]) {
          if (net.family === 'IPv4' && !net.internal) {
            lanIp = net.address;
            break;
          }
        }
        if (lanIp) break;
      }
    } catch (_) {}
  }

  const port = env.PORT || 3000;
  const lanJoinUrl = lanIp ? `http://${lanIp}:${port}/register.html` : null;
  
  // If PUBLIC_JOIN_URL is not set or points to localhost, prefer the reachable LAN IP for mobile QR scanning
  let effectiveJoinUrl = env.PUBLIC_JOIN_URL;
  if (!effectiveJoinUrl || effectiveJoinUrl.includes('localhost') || effectiveJoinUrl.includes('127.0.0.1')) {
    effectiveJoinUrl = lanJoinUrl || `${origin}/register.html`;
  }

  return res.json({
    publicJoinUrl: effectiveJoinUrl,
    lanJoinUrl: lanJoinUrl,
    originJoinUrl: `${origin}/register.html`,
    lanIp: lanIp,
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
const publicDir = [
  path.join(process.cwd(), 'public'),
  path.join(__dirname, '../public'),
  path.join(__dirname, 'public')
].find(p => fs.existsSync(p)) || path.join(__dirname, '../public');

// Explicit static route for socket.io client fallback
app.get('/socket.io/socket.io.js', (req, res, next) => {
  const possiblePaths = [
    path.join(__dirname, '../node_modules/socket.io/client-dist/socket.io.min.js'),
    path.join(process.cwd(), 'node_modules/socket.io/client-dist/socket.io.min.js'),
    path.join(__dirname, 'node_modules/socket.io/client-dist/socket.io.min.js')
  ];
  const foundPath = possiblePaths.find(p => fs.existsSync(p));
  if (foundPath) {
    return res.sendFile(foundPath);
  }
  res.setHeader('Content-Type', 'application/javascript');
  res.send('// Socket.IO client fallback (polling mode active)');
});

app.use(express.static(publicDir));

// Frontend convenience and exact .html routes
const pages = [
  'index',
  'register',
  'lobby',
  'quiz',
  'admin',
  'admin-login',
  'projector',
  'leaderboard',
  'question-bank'
];

pages.forEach(page => {
  const filePath = path.join(publicDir, `${page}.html`);
  app.get(`/${page}`, (req, res) => res.sendFile(filePath));
  app.get(`/${page}/`, (req, res) => res.sendFile(filePath));
  app.get(`/${page}.html`, (req, res) => res.sendFile(filePath));
});

// Direct participant, play, join, and team aliases so mobile/manual links never 404
const registerAliases = [
  '/participant',
  '/participant/',
  '/participant.html',
  '/join',
  '/join/',
  '/join.html',
  '/play',
  '/play/',
  '/play.html',
  '/team',
  '/team/',
  '/team.html'
];

registerAliases.forEach(alias => {
  app.get(alias, (req, res) => res.sendFile(path.join(publicDir, 'register.html')));
});

app.get('/', (req, res) => res.sendFile(path.join(publicDir, 'index.html')));

// Catch-all 404 for API routes
app.all('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found'
  });
});

// Non-API SPA fallback for all unhandled GET routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(publicDir, 'index.html'));
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

