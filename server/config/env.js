require('dotenv').config();
const { z } = require('zod');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  ADMIN_EMAIL: z.string().email().default('admin@kdkce.edu'),
  ADMIN_PASSWORD: z.string().min(8).default('KdkQuiz@2026'),
  PUBLIC_JOIN_URL: z.string().url().optional().or(z.literal('')),
  FRONTEND_URL: z.string().optional().default(''),
  BACKEND_URL: z.string().optional().default(''),
  SOCKET_URL: z.string().optional().default(''),
  ALLOWED_ORIGINS: z.string().optional().default('*')
});

let parsedEnv;
try {
  parsedEnv = envSchema.parse(process.env);
} catch (error) {
  console.warn('[Env Warning] Environment validation issues:');
  if (error instanceof z.ZodError) {
    for (const issue of error.issues) {
      console.warn(` - ${issue.path.join('.')}: ${issue.message}`);
    }
  }
  // Provide safe runtime fallbacks for local / fresh setups
  parsedEnv = {
    NODE_ENV: process.env.NODE_ENV || 'production',
    PORT: Number(process.env.PORT) || 3000,
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/kdk_induction_quiz?schema=public',
    JWT_SECRET: process.env.JWT_SECRET || 'kdk-induction-quiz-super-secret-key-2026',
    ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@kdkce.edu',
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'KdkQuiz@2026',
    PUBLIC_JOIN_URL: process.env.PUBLIC_JOIN_URL || '',
    FRONTEND_URL: process.env.FRONTEND_URL || '',
    BACKEND_URL: process.env.BACKEND_URL || '',
    SOCKET_URL: process.env.SOCKET_URL || '',
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || '*'
  };
}

module.exports = parsedEnv;
