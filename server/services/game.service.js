const prisma = require('../config/db');
const logger = require('../utils/logger');

class GameService {
  async getOrCreateState() {
    let state = await prisma.gameState.findUnique({
      where: { id: 'global_game_state' }
    });

    if (!state) {
      state = await prisma.gameState.create({
        data: {
          id: 'global_game_state',
          currentRound: 1,
          currentQuestionId: null,
          status: 'LOBBY',
          timerStartedAt: null,
          timerDuration: 30,
          timerPaused: false,
          questionVisible: false,
          answersLocked: false,
          answerRevealed: false,
          leaderboardVisible: false,
          projectorEnabled: false
        }
      });
    }

    return state;
  }

  calculateRemainingTime(state) {
    if (!state.timerStartedAt) return state.timerDuration;
    if (state.timerPaused) {
      // When paused, timerDuration holds remaining seconds
      return state.timerDuration;
    }
    const elapsed = (Date.now() - new Date(state.timerStartedAt).getTime()) / 1000;
    const remaining = Math.max(0, Math.ceil(state.timerDuration - elapsed));
    return remaining;
  }

  isTimerExpired(state) {
    if (!state.timerStartedAt) return false;
    if (state.timerPaused) return false;
    // 1-second network latency grace window
    const elapsed = Date.now() - new Date(state.timerStartedAt).getTime();
    return elapsed > (state.timerDuration * 1000 + 1000);
  }

  async getHydratedState(state = null) {
    // Mutation handlers already have the freshly updated row. Reusing it avoids
    // an extra database read on every host button press.
    state = state || await this.getOrCreateState();
    let currentQuestion = null;

    if (state.currentQuestionId) {
      currentQuestion = await prisma.question.findUnique({
        where: { id: state.currentQuestionId },
        include: { round: true }
      });
    }

    const remainingTime = this.calculateRemainingTime(state);

    // Only expose answer distribution after the host reveals the answer.
    // This keeps live results hidden while teams are still answering.
    let answerStats = null;
    if (state.answerRevealed && state.currentQuestionId) {
      const [totalSubmissions, optionCounts] = await Promise.all([
        prisma.answer.count({
          where: { questionId: state.currentQuestionId }
        }),
        prisma.answer.groupBy({
          by: ['selectedOption'],
          where: { questionId: state.currentQuestionId },
          _count: { selectedOption: true }
        })
      ]);

      const breakdown = { A: 0, B: 0, C: 0, D: 0 };
      for (const item of optionCounts) {
        if (breakdown[item.selectedOption] !== undefined) {
          breakdown[item.selectedOption] = item._count.selectedOption;
        }
      }

      const percentages = { A: 0, B: 0, C: 0, D: 0 };
      if (totalSubmissions > 0) {
        for (const option of Object.keys(percentages)) {
          percentages[option] = Math.round((breakdown[option] / totalSubmissions) * 1000) / 10;
        }
      }

      answerStats = {
        totalSubmissions,
        breakdown,
        percentages
      };
    }

    // Filter out correctOption for students/public if answers are not revealed
    return {
      ...state,
      remainingTime,
      answerStats,
      currentQuestion: currentQuestion
        ? {
            id: currentQuestion.id,
            roundId: currentQuestion.roundId,
            roundNumber: currentQuestion.round.number,
            roundName: currentQuestion.round.name,
            text: currentQuestion.text,
            optionA: currentQuestion.optionA,
            optionB: currentQuestion.optionB,
            optionC: currentQuestion.optionC,
            optionD: currentQuestion.optionD,
            mediaUrl: currentQuestion.mediaUrl,
            // Only expose correctOption if answerRevealed is true
            correctOption: state.answerRevealed ? currentQuestion.correctOption : undefined
          }
        : null
    };
  }

  async recordAuditLog(adminId, action, metadata = {}) {
    try {
      let parsedMetadata = {};
      if (typeof metadata === 'object' && metadata !== null) {
        parsedMetadata = metadata;
      } else if (typeof metadata === 'string') {
        try {
          parsedMetadata = JSON.parse(metadata);
        } catch (_) {
          parsedMetadata = { raw: metadata };
        }
      }
      await prisma.auditLog.create({
        data: {
          adminId: adminId || null,
          action,
          metadata: parsedMetadata
        }
      });
    } catch (err) {
      logger.error('Failed to create audit log:', err.message);
    }
  }

  async updateState(updates, adminId, actionName) {
    const state = await prisma.gameState.update({
      where: { id: 'global_game_state' },
      data: updates
    });

    // The UI state and audit entry do not depend on each other, so do both
    // after the update instead of making the host wait for serial queries.
    const [hydratedState] = await Promise.all([
      this.getHydratedState(state),
      actionName ? this.recordAuditLog(adminId, actionName, updates) : Promise.resolve()
    ]);

    return hydratedState;
  }

  async startGame(adminId) {
    const currentState = await this.getOrCreateState();
    let questionId = currentState.currentQuestionId;

    if (!questionId) {
      const firstQ = await prisma.question.findFirst({
        where: { round: { number: currentState.currentRound } },
        orderBy: { createdAt: 'asc' }
      });
      if (firstQ) {
        questionId = firstQ.id;
      }
    }

    if (!questionId) {
      throw new Error('No questions are available in this round. Add a question before starting the quiz.');
    }

    // Starting is the host's publish action: it must never leave a prepared
    // question hidden on participant screens.
    const updates = {
      status: 'ACTIVE',
      currentQuestionId: questionId,
      questionVisible: true,
      leaderboardVisible: false,
      answersLocked: false,
      answerRevealed: false,
      timerPaused: false
    };

    if (currentState.status === 'PAUSED' && currentState.timerPaused) {
      // A paused timer stores its remaining duration. Resume it from now.
      updates.timerStartedAt = new Date();
    } else if (!currentState.timerStartedAt || this.isTimerExpired(currentState)) {
      updates.timerStartedAt = new Date();
      updates.timerDuration = 30;
    }

    return await this.updateState(updates, adminId, 'GAME_STARTED');
  }

  async pauseGame(adminId) {
    return await this.updateState({ status: 'PAUSED' }, adminId, 'GAME_PAUSED');
  }

  async resumeGame(adminId) {
    return await this.updateState({ status: 'ACTIVE' }, adminId, 'GAME_RESUMED');
  }

  async endGame(adminId) {
    return await this.updateState({
      status: 'ENDED',
      answersLocked: true
    }, adminId, 'GAME_ENDED');
  }

  async resetGame(adminId) {
    const firstQ = await prisma.question.findFirst({
      where: { round: { number: 1 } },
      orderBy: { createdAt: 'asc' }
    });

    return await this.updateState({
      currentRound: 1,
      currentQuestionId: firstQ ? firstQ.id : null,
      status: 'LOBBY',
      timerStartedAt: null,
      timerDuration: 30,
      timerPaused: false,
      questionVisible: false,
      answersLocked: false,
      answerRevealed: false,
      leaderboardVisible: false,
      projectorEnabled: false
    }, adminId, 'GAME_RESET');
  }

  async setRound(roundNumber, adminId) {
    const round = await prisma.round.findUnique({
      where: { number: roundNumber }
    });
    if (!round) throw new Error(`Round ${roundNumber} does not exist`);

    const firstQ = await prisma.question.findFirst({
      where: { roundId: round.id },
      orderBy: { createdAt: 'asc' }
    });

    return await this.updateState({
      currentRound: roundNumber,
      currentQuestionId: firstQ ? firstQ.id : null,
      leaderboardVisible: false,
      questionVisible: true,
      answersLocked: false,
      answerRevealed: false,
      timerStartedAt: null,
      timerDuration: 30,
      timerPaused: false
    }, adminId, `ROUND_CHANGED_TO_${roundNumber}`);
  }

  async setQuestion(questionId, show = true, adminId) {
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: { round: true }
    });
    if (!question) throw new Error('Question not found');

    const updates = {
      currentRound: question.round.number,
      currentQuestionId: question.id,
      leaderboardVisible: false,
      questionVisible: Boolean(show),
      answersLocked: false,
      answerRevealed: false,
      timerStartedAt: null,
      timerDuration: 30,
      timerPaused: false
    };

    return await this.updateState(updates, adminId, `QUESTION_SET_${question.id}`);
  }

  async setQuestionVisibility(visible, adminId) {
    const updates = {
      questionVisible: Boolean(visible)
    };
    return await this.updateState(
      updates,
      adminId,
      visible ? 'QUESTION_SHOWN' : 'QUESTION_HIDDEN'
    );
  }

  async startTimer(duration = 30, adminId) {
    return await this.updateState({
      status: 'ACTIVE',
      timerStartedAt: new Date(),
      timerDuration: Number(duration) || 30,
      timerPaused: false,
      answersLocked: false
    }, adminId, `TIMER_STARTED_${duration}S`);
  }

  async pauseTimer(adminId) {
    const currentState = await this.getOrCreateState();
    const remaining = this.calculateRemainingTime(currentState);

    return await this.updateState({
      timerPaused: true,
      timerDuration: remaining,
      timerStartedAt: null
    }, adminId, 'TIMER_PAUSED');
  }

  async resetTimer(duration = 30, adminId) {
    return await this.updateState({
      timerStartedAt: null,
      timerDuration: Number(duration) || 30,
      timerPaused: false,
      answersLocked: false,
      answerRevealed: false
    }, adminId, 'TIMER_RESET');
  }

  async setAnswerLock(locked, adminId) {
    return await this.updateState(
      { answersLocked: Boolean(locked) },
      adminId,
      locked ? 'ANSWERS_LOCKED' : 'ANSWERS_UNLOCKED'
    );
  }

  async revealAnswer(adminId) {
    return await this.updateState({
      answerRevealed: true,
      answersLocked: true
    }, adminId, 'ANSWER_REVEALED');
  }

  async hideAnswer(adminId) {
    return await this.updateState({
      answerRevealed: false
    }, adminId, 'ANSWER_HIDDEN');
  }

  async setLeaderboardVisibility(visible, adminId) {
    return await this.updateState(
      { leaderboardVisible: Boolean(visible) },
      adminId,
      visible ? 'LEADERBOARD_SHOWN' : 'LEADERBOARD_HIDDEN'
    );
  }

  async setProjector(enabled, adminId) {
    return await this.updateState(
      { projectorEnabled: Boolean(enabled) },
      adminId,
      enabled ? 'PROJECTOR_ENABLED' : 'PROJECTOR_DISABLED'
    );
  }
}

module.exports = new GameService();
