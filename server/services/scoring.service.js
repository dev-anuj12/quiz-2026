const prisma = require('../config/db');
const gameService = require('./game.service');
const logger = require('../utils/logger');

class ScoringService {
  async submitAnswer({ teamId, sessionToken, questionId, selectedOption }) {
    // 1. Team validation: resolve team by sessionToken or teamId
    let team;
    if (sessionToken) {
      team = await prisma.team.findUnique({
        where: { sessionToken }
      });
    } else if (teamId) {
      team = await prisma.team.findUnique({
        where: { id: teamId }
      });
    }

    if (!team) {
      const err = new Error('Invalid team credentials or session expired');
      err.status = 401;
      throw err;
    }

    // 2. Fetch authoritative GameState
    const state = await gameService.getOrCreateState();

    if (state.status === 'ENDED') {
      const err = new Error('Quiz has ended');
      err.status = 400;
      throw err;
    }

    if (state.status === 'PAUSED' || state.timerPaused) {
      const err = new Error('Quiz is currently paused by the host');
      err.status = 400;
      throw err;
    }

    // 3. Question validation: must be currently active question
    if (!state.currentQuestionId || state.currentQuestionId !== questionId) {
      const err = new Error('Submitted question is not the currently active question');
      err.status = 400;
      throw err;
    }

    if (!state.questionVisible) {
      const err = new Error('Question is currently hidden by the host');
      err.status = 400;
      throw err;
    }

    // 4. Validate answers are not locked
    if (state.answersLocked) {
      const err = new Error('Answers are locked for this question');
      err.status = 400;
      throw err;
    }

    // 5. Authoritative timer check
    if (state.timerStartedAt && gameService.isTimerExpired(state)) {
      const err = new Error('Time expired! Answer cannot be accepted.');
      err.status = 400;
      throw err;
    }

    // 6. Fetch Question and verify it belongs to current active round
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: { round: true }
    });

    if (!question) {
      const err = new Error('Question not found');
      err.status = 404;
      throw err;
    }

    if (question.round.number !== state.currentRound) {
      const err = new Error('Question does not belong to the active round');
      err.status = 400;
      throw err;
    }

    // 7. Check if team has already answered this question (prevent duplicate submissions)
    const existingAnswer = await prisma.answer.findUnique({
      where: {
        teamId_questionId: {
          teamId: team.id,
          questionId: question.id
        }
      }
    });

    if (existingAnswer) {
      const err = new Error('Your team has already submitted an answer for this question');
      err.status = 409;
      throw err;
    }

    // 8. Server computes response time accurately
    const now = Date.now();
    const timerStartMs = state.timerStartedAt ? new Date(state.timerStartedAt).getTime() : now;
    const responseTime = Math.max(0, now - timerStartMs); // in milliseconds

    // 9. Server determines correctness
    const cleanSelected = String(selectedOption).trim().toUpperCase();
    const isCorrect = cleanSelected === question.correctOption.toUpperCase();

    // 10. Server calculates points (1000 base + up to 500 speed bonus based on duration)
    let points = 0;
    if (isCorrect) {
      const maxDurationMs = (state.timerDuration || 30) * 1000;
      const speedFraction = Math.max(0, (maxDurationMs - responseTime) / maxDurationMs);
      const speedBonus = Math.round(500 * speedFraction);
      points = 1000 + speedBonus;
    }

    // 11. Transactionally save Answer and Score
    const [savedAnswer, savedScore] = await prisma.$transaction([
      prisma.answer.create({
        data: {
          teamId: team.id,
          questionId: question.id,
          selectedOption: cleanSelected,
          isCorrect,
          responseTime,
          submittedAt: new Date()
        }
      }),
      prisma.score.create({
        data: {
          teamId: team.id,
          questionId: question.id,
          points,
          responseTime,
          createdAt: new Date()
        }
      })
    ]);

    logger.info(`[Answer Submitted] Team: ${team.name}, Question: ${question.id}, Correct: ${isCorrect}, Points: ${points}, ResponseTime: ${responseTime}ms`);

    return {
      success: true,
      teamId: team.id,
      questionId: question.id,
      submittedAt: savedAnswer.submittedAt,
      // Note: Do not return correctness or points yet to client if answers are not revealed
      answerLocked: true
    };
  }

  async getQuestionSubmissionStats(questionId) {
    const totalAnswers = await prisma.answer.count({
      where: { questionId }
    });

    const optionCounts = await prisma.answer.groupBy({
      by: ['selectedOption'],
      where: { questionId },
      _count: { selectedOption: true }
    });

    const breakdown = { A: 0, B: 0, C: 0, D: 0 };
    for (const item of optionCounts) {
      if (breakdown[item.selectedOption] !== undefined) {
        breakdown[item.selectedOption] = item._count.selectedOption;
      }
    }

    return {
      questionId,
      totalSubmissions: totalAnswers,
      breakdown
    };
  }
}

module.exports = new ScoringService();
