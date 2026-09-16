const rateLimit = require('express-rate-limit');

// Strict rate limiter for Admin Login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many login attempts from this IP. Please try again after 15 minutes.'
  }
});

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // Limit each IP to 10,000 requests per windowMs for high-concurrency events
  standardHeaders: true,
  legacyHeaders: false,
  // Every screen polls the public game state. At an event, many teams can
  // share one college Wi-Fi IP, so counting these reads causes the limiter to
  // reject real answer and host-control requests after a few minutes.
  skip: (req) => req.method === 'GET' && (
    req.path === '/game/state' || req.path === '/config' || req.path === '/health' || req.path === '/teams' || req.path === '/leaderboard' || req.path === '/questions'
  ),
  message: {
    success: false,
    error: 'Too many requests. Please slow down.'
  }
});

// Team registration rate limiter (allows 35+ to 100+ teams to register on same Wi-Fi)
const registrationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 500, // Allow up to 500 registrations per 5 min for high-volume arena induction
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many registration requests. Please wait a moment.'
  }
});

module.exports = {
  loginLimiter,
  apiLimiter,
  registrationLimiter
};

