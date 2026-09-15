const crypto = require('crypto');
const { z } = require('zod');
const prisma = require('../config/db');
const logger = require('../utils/logger');
const gameService = require('../services/game.service');

const teamRegistrationSchema = z.object({
  name: z.string().trim().min(2, 'Team name must be at least 2 characters').max(40, 'Team name cannot exceed 40 characters'),
  leaderName: z.string().trim().min(2, 'Leader name must be at least 2 characters').max(40, 'Leader name cannot exceed 40 characters'),
  avatar: z.string().trim().min(1, 'Avatar selection is required')
});

exports.registerTeam = async (req, res) => {
  try {
    const { name, leaderName, avatar } = teamRegistrationSchema.parse(req.body);

    // Check if registration is open or closed based on GameState
    const state = await gameService.getOrCreateState();
    if (state.status === 'ENDED') {
      return res.status(400).json({
        success: false,
        error: 'Registration is currently closed: The quiz has ended.'
      });
    }

    // Check if team name already exists
    const existingTeam = await prisma.team.findFirst({
      where: {
        name: {
          equals: name
        }
      }
    });

    if (existingTeam) {
      return res.status(409).json({
        success: false,
        error: `A team with the name "${name}" has already registered. Please choose another name.`
      });
    }

    // Generate secure session token
    const sessionToken = crypto.randomBytes(32).toString('hex');

    const team = await prisma.team.create({
      data: {
        name,
        leaderName,
        avatar,
        sessionToken
      }
    });

    logger.info(`[Team Registered] ID: ${team.id}, Name: ${team.name}, Leader: ${team.leaderName}`);

    // Emit Socket.IO event
    if (req.app.get('io')) {
      req.app.get('io').emit('team_joined', {
        id: team.id,
        name: team.name,
        avatar: team.avatar,
        createdAt: team.createdAt
      });
    }

    return res.status(201).json({
      success: true,
      team: {
        id: team.id,
        name: team.name,
        leaderName: team.leaderName,
        avatar: team.avatar,
        sessionToken: team.sessionToken
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: error.errors.map(e => e.message).join(', ')
      });
    }
    logger.error('Team registration error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to register team. Please try again.'
    });
  }
};

exports.getTeams = async (req, res) => {
  try {
    const teams = await prisma.team.findMany({
      select: {
        id: true,
        name: true,
        avatar: true,
        leaderName: req.admin ? true : false, // Hide leader name from public listing
        createdAt: true
      },
      orderBy: { createdAt: 'asc' }
    });

    return res.json({
      success: true,
      teams,
      count: teams.length
    });
  } catch (error) {
    logger.error('Get teams error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch teams'
    });
  }
};

exports.getTeamById = async (req, res) => {
  try {
    const { id } = req.params;
    const team = await prisma.team.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        leaderName: true,
        avatar: true,
        createdAt: true
      }
    });

    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found'
      });
    }

    return res.json({
      success: true,
      team
    });
  } catch (error) {
    logger.error('Get team error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch team details'
    });
  }
};

exports.deleteTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const team = await prisma.team.findUnique({
      where: { id }
    });

    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found'
      });
    }

    await prisma.team.delete({
      where: { id }
    });

    logger.info(`[Team Deleted] Admin ${req.admin?.email} removed team ${team.name}`);

    // Emit socket event for smooth fade/removal in lobby
    if (req.app.get('io')) {
      req.app.get('io').emit('team_left', {
        teamId: id
      });
    }

    return res.json({
      success: true,
      message: `Team ${team.name} removed successfully`
    });
  } catch (error) {
    logger.error('Delete team error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to remove team'
    });
  }
};

exports.deleteAllTeams = async (req, res) => {
  try {
    await prisma.answer.deleteMany();
    await prisma.score.deleteMany();
    const count = await prisma.team.deleteMany();

    logger.info(`[Teams Cleared] Admin ${req.admin?.email} removed all ${count.count} teams`);

    if (req.app.get('io')) {
      req.app.get('io').emit('teams_cleared');
      req.app.get('io').emit('team_left', { all: true });
    }

    return res.json({
      success: true,
      message: `All ${count.count} teams and answers removed successfully`
    });
  } catch (error) {
    logger.error('Delete all teams error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to remove all teams'
    });
  }
};

