const { z } = require('zod');
const scoringService = require('../services/scoring.service');
const logger = require('../utils/logger');

const answerSchema = z.object({
  teamId: z.string().optional(),
  sessionToken: z.string().optional(),
  questionId: z.string().min(1, 'Question ID is required'),
  selectedOption: z.enum(['A', 'B', 'C', 'D', 'a', 'b', 'c', 'd'], {
    errorMap: () => ({ message: 'Selected option must be A, B, C, or D' })
  })
});

exports.submitAnswer = async (req, res) => {
  try {
    const data = answerSchema.parse(req.body);

    // Prefer session token from header or cookie or body
    let sessionToken = data.sessionToken || req.headers['x-team-session'] || req.cookies?.team_session;
    let teamId = data.teamId;

    if (!sessionToken && !teamId) {
      return res.status(401).json({
        success: false,
        error: 'Team authentication session or ID is required to submit an answer'
      });
    }

    const result = await scoringService.submitAnswer({
      teamId,
      sessionToken,
      questionId: data.questionId,
      selectedOption: data.selectedOption
    });

    // Broadcast anonymous submission count update
    const io = req.app.get('io');
    if (io) {
      const stats = await scoringService.getQuestionSubmissionStats(data.questionId);
      io.emit('submission_count_updated', {
        questionId: data.questionId,
        totalSubmissions: stats.totalSubmissions
      });
    }

    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: error.errors.map(e => e.message).join(', ')
      });
    }

    const statusCode = error.status || 500;
    logger.warn(`Answer submission failed: ${error.message}`);
    return res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
};

exports.getStats = async (req, res) => {
  try {
    const { questionId } = req.params;
    const stats = await scoringService.getQuestionSubmissionStats(questionId);
    return res.json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error('Get stats error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve submission stats'
    });
  }
};
