const { z } = require('zod');
const prisma = require('../config/db');
const logger = require('../utils/logger');

const questionSchema = z.object({
  roundId: z.string().uuid('Valid Round ID is required'),
  text: z.string().trim().min(3, 'Question text must be at least 3 characters'),
  optionA: z.string().trim().min(1, 'Option A is required'),
  optionB: z.string().trim().min(1, 'Option B is required'),
  optionC: z.string().trim().min(1, 'Option C is required'),
  optionD: z.string().trim().min(1, 'Option D is required'),
  correctOption: z.enum(['A', 'B', 'C', 'D'], {
    errorMap: () => ({ message: 'Correct option must be A, B, C, or D' })
  }),
  mediaUrl: z.string().url('Invalid media URL').optional().or(z.literal('')).nullable()
});

exports.getQuestions = async (req, res) => {
  try {
    const { roundId, roundNumber } = req.query;

    const where = {};
    if (roundId) where.roundId = roundId;
    if (roundNumber) {
      const round = await prisma.round.findUnique({
        where: { number: Number(roundNumber) }
      });
      if (round) where.roundId = round.id;
    }

    const questions = await prisma.question.findMany({
      where,
      include: {
        round: {
          select: { id: true, number: true, name: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    const rounds = await prisma.round.findMany({
      orderBy: { number: 'asc' }
    });

    return res.json({
      success: true,
      questions,
      rounds,
      count: questions.length
    });
  } catch (error) {
    logger.error('Get questions error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve questions'
    });
  }
};

exports.createQuestion = async (req, res) => {
  try {
    const data = questionSchema.parse(req.body);

    const round = await prisma.round.findUnique({
      where: { id: data.roundId }
    });

    if (!round) {
      return res.status(404).json({
        success: false,
        error: 'Target round does not exist'
      });
    }

    const question = await prisma.question.create({
      data: {
        roundId: data.roundId,
        text: data.text,
        optionA: data.optionA,
        optionB: data.optionB,
        optionC: data.optionC,
        optionD: data.optionD,
        correctOption: data.correctOption,
        mediaUrl: data.mediaUrl || null
      },
      include: { round: true }
    });

    logger.info(`[Question Created] ID: ${question.id} in ${question.round.name}`);

    return res.status(201).json({
      success: true,
      question
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: error.errors.map(e => e.message).join(', ')
      });
    }
    logger.error('Create question error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to create question'
    });
  }
};

exports.updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const data = questionSchema.parse(req.body);

    const existing = await prisma.question.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Question not found'
      });
    }

    const updated = await prisma.question.update({
      where: { id },
      data: {
        roundId: data.roundId,
        text: data.text,
        optionA: data.optionA,
        optionB: data.optionB,
        optionC: data.optionC,
        optionD: data.optionD,
        correctOption: data.correctOption,
        mediaUrl: data.mediaUrl || null
      },
      include: { round: true }
    });

    logger.info(`[Question Updated] ID: ${id}`);

    return res.json({
      success: true,
      question: updated
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: error.errors.map(e => e.message).join(', ')
      });
    }
    logger.error('Update question error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to update question'
    });
  }
};

exports.deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.question.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Question not found'
      });
    }

    await prisma.question.delete({
      where: { id }
    });

    logger.info(`[Question Deleted] ID: ${id}`);

    return res.json({
      success: true,
      message: 'Question deleted successfully'
    });
  } catch (error) {
    logger.error('Delete question error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete question'
    });
  }
};
