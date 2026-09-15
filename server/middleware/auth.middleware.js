const jwt = require('jsonwebtoken');
const env = require('../config/env');
const prisma = require('../config/db');

async function requireAdmin(req, res, next) {
  try {
    let token = null;

    // Check HTTP-only cookie first
    if (req.cookies && req.cookies.admin_token) {
      token = req.cookies.admin_token;
    } 
    // Otherwise check Authorization header (Bearer <token>)
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Admin authentication token required'
      });
    }

    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (!decoded || !decoded.adminId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Invalid token payload'
      });
    }

    const admin = await prisma.admin.findUnique({
      where: { id: decoded.adminId },
      select: { id: true, email: true, createdAt: true }
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Admin account no longer exists'
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Session expired: Please log in again'
      });
    }
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid authentication credentials'
    });
  }
}

async function optionalAdmin(req, res, next) {
  try {
    let token = null;
    if (req.cookies && req.cookies.admin_token) {
      token = req.cookies.admin_token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      if (decoded && decoded.adminId) {
        const admin = await prisma.admin.findUnique({
          where: { id: decoded.adminId },
          select: { id: true, email: true }
        });
        if (admin) req.admin = admin;
      }
    }
  } catch (_) {
    // Ignore invalid tokens in optional middleware
  }
  next();
}

module.exports = {
  requireAdmin,
  optionalAdmin
};
