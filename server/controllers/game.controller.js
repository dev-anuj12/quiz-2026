const gameService = require('../services/game.service');
const prisma = require('../config/db');
const logger = require('../utils/logger');

// Helper to broadcast state via Socket.IO
function broadcast(req, eventName, payload) {
  const io = req.app.get('io');
  if (io) {
    if (eventName) io.emit(eventName, payload);
    io.emit('game_state_updated', payload);
  }
}

exports.getState = async (req, res) => {
  try {
    const state = await gameService.getHydratedState();

    // If admin is requesting, also return correctOption even if answer is not revealed
    if (req.admin && state.currentQuestionId) {
      const q = await prisma.question.findUnique({
        where: { id: state.currentQuestionId },
        select: { correctOption: true }
      });
      if (q && state.currentQuestion) {
        state.currentQuestion.adminCorrectOption = q.correctOption;
      }
    }

    return res.json({
      success: true,
      state
    });
  } catch (error) {
    logger.error('Get state error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch game state'
    });
  }
};

exports.startGame = async (req, res) => {
  try {
    const state = await gameService.startGame(req.admin?.id);
    broadcast(req, 'game_started', state);
    return res.json({ success: true, state });
  } catch (error) {
    logger.error('Start game error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.pauseGame = async (req, res) => {
  try {
    const state = await gameService.pauseGame(req.admin?.id);
    broadcast(req, 'game_paused', state);
    return res.json({ success: true, state });
  } catch (error) {
    logger.error('Pause game error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.resumeGame = async (req, res) => {
  try {
    const state = await gameService.resumeGame(req.admin?.id);
    broadcast(req, 'game_resumed', state);
    return res.json({ success: true, state });
  } catch (error) {
    logger.error('Resume game error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.endGame = async (req, res) => {
  try {
    const state = await gameService.endGame(req.admin?.id);
    broadcast(req, 'game_ended', state);
    return res.json({ success: true, state });
  } catch (error) {
    logger.error('End game error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.resetGame = async (req, res) => {
  try {
    const state = await gameService.resetGame(req.admin?.id);
    broadcast(req, 'game_state_updated', state);
    return res.json({ success: true, state });
  } catch (error) {
    logger.error('Reset game error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.setRound = async (req, res) => {
  try {
    const roundNumber = Number(req.body.roundNumber);
    if (![1, 2, 3].includes(roundNumber)) {
      return res.status(400).json({ success: false, error: 'Round number must be 1, 2, or 3' });
    }
    const state = await gameService.setRound(roundNumber, req.admin?.id);
    broadcast(req, 'round_changed', state);
    return res.json({ success: true, state });
  } catch (error) {
    logger.error('Set round error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.setQuestion = async (req, res) => {
  try {
    const { questionId, show } = req.body;
    if (!questionId) {
      return res.status(400).json({ success: false, error: 'Question ID is required' });
    }
    const state = await gameService.setQuestion(questionId, show, req.admin?.id);
    broadcast(req, 'question_changed', state);
    return res.json({ success: true, state });
  } catch (error) {
    logger.error('Set question error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.toggleQuestionVisibility = async (req, res) => {
  try {
    const visible = Boolean(req.body.visible);
    const state = await gameService.setQuestionVisibility(visible, req.admin?.id);
    broadcast(req, visible ? 'question_shown' : 'question_hidden', state);
    return res.json({ success: true, state });
  } catch (error) {
    logger.error('Toggle question visibility error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.navigateQuestion = async (req, res) => {
  try {
    const direction = req.body.direction; // 'next' or 'prev'
    const currentState = await gameService.getOrCreateState();

    if (!['next', 'prev'].includes(direction)) {
      return res.status(400).json({ success: false, error: 'Direction must be next or prev' });
    }

    const questions = await prisma.question.findMany({
      where: {
        round: { number: currentState.currentRound }
      },
      // createdAt may be identical for imported questions; the ID tie-breaker
      // keeps Previous/Next predictable in that case.
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }]
    });

    if (questions.length === 0) {
      return res.status(400).json({ success: false, error: 'No questions in current round' });
    }

    let currentIndex = questions.findIndex(q => q.id === currentState.currentQuestionId);
    let targetIndex;

    if (direction === 'next') {
      targetIndex = currentIndex === -1 ? 0 : Math.min(currentIndex + 1, questions.length - 1);
    } else {
      targetIndex = currentIndex === -1 ? 0 : Math.max(currentIndex - 1, 0);
    }

    const targetQuestion = questions[targetIndex];
    const state = await gameService.setQuestion(targetQuestion.id, true, req.admin?.id);
    broadcast(req, 'question_changed', state);
    return res.json({ success: true, state });
  } catch (error) {
    logger.error('Navigate question error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.manageTimer = async (req, res) => {
  try {
    const action = req.body.action; // 'start', 'pause', 'reset'
    const duration = req.body.duration || 30;

    let state;
    let eventName;

    if (action === 'start') {
      state = await gameService.startTimer(duration, req.admin?.id);
      eventName = 'timer_started';
    } else if (action === 'pause') {
      state = await gameService.pauseTimer(req.admin?.id);
      eventName = 'timer_paused';
    } else if (action === 'reset') {
      state = await gameService.resetTimer(duration, req.admin?.id);
      eventName = 'timer_reset';
    } else {
      return res.status(400).json({ success: false, error: 'Invalid timer action' });
    }

    broadcast(req, eventName, state);
    return res.json({ success: true, state });
  } catch (error) {
    logger.error('Timer error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.setAnswerLock = async (req, res) => {
  try {
    const locked = Boolean(req.body.locked);
    const state = await gameService.setAnswerLock(locked, req.admin?.id);
    broadcast(req, locked ? 'answers_locked' : 'answers_unlocked', state);
    return res.json({ success: true, state });
  } catch (error) {
    logger.error('Answer lock error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.revealAnswer = async (req, res) => {
  try {
    const reveal = req.body.reveal !== false;
    let state;
    if (reveal) {
      state = await gameService.revealAnswer(req.admin?.id);
      broadcast(req, 'answer_revealed', state);
    } else {
      state = await gameService.hideAnswer(req.admin?.id);
      broadcast(req, 'game_state_updated', state);
    }
    return res.json({ success: true, state });
  } catch (error) {
    logger.error('Reveal answer error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.setLeaderboardVisibility = async (req, res) => {
  try {
    const visible = Boolean(req.body.visible);
    const state = await gameService.setLeaderboardVisibility(visible, req.admin?.id);
    broadcast(req, visible ? 'leaderboard_shown' : 'leaderboard_hidden', state);
    return res.json({ success: true, state });
  } catch (error) {
    logger.error('Leaderboard visibility error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.setProjector = async (req, res) => {
  try {
    const enabled = Boolean(req.body.enabled);
    const state = await gameService.setProjector(enabled, req.admin?.id);
    broadcast(req, 'projector_changed', state);
    return res.json({ success: true, state });
  } catch (error) {
    logger.error('Projector error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.getAuditLogs = async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        admin: {
          select: { email: true }
        }
      }
    });

    return res.json({
      success: true,
      logs
    });
  } catch (error) {
    logger.error('Audit logs error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to retrieve audit logs' });
  }
};
