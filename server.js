// Vercel serverless entrypoint.
// Socket.IO needs a persistent server, so it continues to run from
// server/server.js on Railway, Render, or another Node host.
const app = require('./server/app');

// Vercel invokes an Express application; exporting an http.Server here leaves
// API requests without a valid serverless handler.
module.exports = app;
