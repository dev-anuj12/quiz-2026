const { Server } = require('socket.io');
const env = require('../config/env');
const { registerSocketHandlers } = require('./handlers');
const logger = require('../utils/logger');

function initSocket(httpServer) {
  let corsOrigin = env.ALLOWED_ORIGINS;
  if (corsOrigin.includes(',')) {
    corsOrigin = corsOrigin.split(',').map(s => s.trim());
  }

  const io = new Server(httpServer, {
    cors: {
      origin: corsOrigin === '*' ? true : corsOrigin,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true
    },
    pingInterval: 10000,
    pingTimeout: 5000,
    transports: ['websocket', 'polling']
  });

  io.on('connection', (socket) => {
    registerSocketHandlers(io, socket);
  });

  logger.info('[Socket.IO] Server initialized with real-time room synchronization.');
  return io;
}

module.exports = initSocket;
