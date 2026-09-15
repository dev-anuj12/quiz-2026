// Public runtime configuration for the frontend.
// In the Vercel-only deployment, backend and frontend share the same origin.
// realtime: "polling" tells the client to poll /api/game/state instead of Socket.IO.
module.exports = (req, res) => {
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const origin = `${protocol}://${host}`;

  return res.status(200).json({
    publicJoinUrl: process.env.PUBLIC_JOIN_URL || `${origin}/register.html`,
    backendUrl:    origin,
    socketUrl:     origin,
    realtime:      'polling'   // Signal to client: use HTTP polling, not Socket.IO
  });
};

