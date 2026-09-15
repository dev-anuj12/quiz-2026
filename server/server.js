const http = require('http');
const app = require('./app');
const env = require('./config/env');
const initSocket = require('./socket');
const prisma = require('./config/db');
const logger = require('./utils/logger');

const server = http.createServer(app);

// Initialize real-time Socket.IO server
const io = initSocket(server);

// Store io in express app so controllers can broadcast events
app.set('io', io);

const PORT = env.PORT || 3000;

server.listen(PORT, () => {
  logger.info(`=======================================================`);
  logger.info(`  KDK INDUCTION QUIZ 2026 - SERVER LIVE`);
  logger.info(`  Presented by Rotaract Club of KDKCE`);
  logger.info(`  Environment: ${env.NODE_ENV}`);
  logger.info(`  Port: ${PORT}`);
  logger.info(`=======================================================`);
});

// Graceful Shutdown
async function handleShutdown(signal) {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    logger.info('HTTP & Socket.IO server closed.');
    await prisma.$disconnect();
    logger.info('Database disconnected.');
    process.exit(0);
  });

  // Force close if graceful exit takes more than 10 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
