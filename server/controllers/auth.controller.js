const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const prisma = require('../config/db');
const env = require('../config/env');
const logger = require('../utils/logger');

const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required')
});

exports.login = async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const admin = await prisma.admin.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    const isValidPassword = await bcrypt.compare(password, admin.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    const token = jwt.sign(
      { adminId: admin.id, email: admin.email },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Set secure HTTP-only cookie
    res.cookie('admin_token', token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    logger.info(`[Auth] Admin logged in: ${admin.email}`);

    return res.json({
      success: true,
      token,
      admin: {
        id: admin.id,
        email: admin.email
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: error.errors.map(e => e.message).join(', ')
      });
    }
    logger.error('Login error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'An internal error occurred during authentication'
    });
  }
};

exports.me = async (req, res) => {
  return res.json({
    success: true,
    admin: {
      id: req.admin.id,
      email: req.admin.email,
      createdAt: req.admin.createdAt
    }
  });
};

exports.logout = async (req, res) => {
  res.clearCookie('admin_token', {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax'
  });

  return res.json({
    success: true,
    message: 'Logged out successfully'
  });
};
