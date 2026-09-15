const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { requireAdmin } = require('../middleware/auth.middleware');
const { loginLimiter } = require('../middleware/rateLimiter');

router.post('/login', loginLimiter, authController.login);
router.get('/me', requireAdmin, authController.me);
router.post('/logout', authController.logout);

module.exports = router;
