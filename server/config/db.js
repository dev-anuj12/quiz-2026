const { PrismaClient } = require('@prisma/client');
const env = require('./env');

const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
});

prisma.$connect()
  .then(() => {
    console.log('[Database] Connected to PostgreSQL successfully via Prisma.');
  })
  .catch((err) => {
    console.warn('[Database] Initial connection warning (Ensure PostgreSQL is running and DATABASE_URL is configured):', err.message);
  });

module.exports = prisma;
