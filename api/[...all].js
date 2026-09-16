const app = require('../server/app');

module.exports = (req, res) => {
  const matched = req.headers['x-matched-path'] || req.headers['x-forwarded-uri'] || req.headers['x-now-route-matches'];
  if (matched && (req.url === '/api/index.js' || req.url === '/api' || req.url === '/index.js' || req.url === '/' || req.url.startsWith('/api/[...all]'))) {
    req.url = matched;
  }
  return app(req, res);
};
