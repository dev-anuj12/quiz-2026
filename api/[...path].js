// Route all /api/* requests directly through the Express application.
// This replaces the previous proxy-to-external-backend approach so the
// entire project can run as Vercel Serverless Functions (no persistent server).
const app = require('../server.js');
module.exports = app;

