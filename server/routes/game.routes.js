const express = require('express');
const router = express.Router();
const gameController = require('../controllers/game.controller');
const { requireAdmin, optionalAdmin } = require('../middleware/auth.middleware');

router.get('/state', optionalAdmin, gameController.getState);
router.post('/start', requireAdmin, gameController.startGame);
router.post('/pause', requireAdmin, gameController.pauseGame);
router.post('/resume', requireAdmin, gameController.resumeGame);
router.post('/end', requireAdmin, gameController.endGame);
router.post('/reset', requireAdmin, gameController.resetGame);
router.post('/round', requireAdmin, gameController.setRound);
router.post('/question', requireAdmin, gameController.setQuestion);
router.post('/question-visibility', requireAdmin, gameController.toggleQuestionVisibility);
router.post('/question-nav', requireAdmin, gameController.navigateQuestion);
router.post('/timer', requireAdmin, gameController.manageTimer);
router.post('/answer-lock', requireAdmin, gameController.setAnswerLock);
router.post('/reveal', requireAdmin, gameController.revealAnswer);
router.post('/leaderboard', requireAdmin, gameController.setLeaderboardVisibility);
router.post('/projector', requireAdmin, gameController.setProjector);
router.get('/audit-logs', requireAdmin, gameController.getAuditLogs);

module.exports = router;
