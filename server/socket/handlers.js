const gameService = require('../services/game.service');
const prisma = require('../config/db');
const logger = require('../utils/logger');

// Maps teamId -> { socketId, disconnectTimeout }
const activeTeams = new Map();

function registerSocketHandlers(io, socket) {
  logger.info(`[Socket Connected] Socket ID: ${socket.id}`);

  // Team registers connection in lobby
  socket.on('register_team', async (data) => {
    try {
      const { teamId } = data || {};
      if (!teamId) return;

      const team = await prisma.team.findUnique({
        where: { id: teamId },
        select: { id: true, name: true, avatar: true }
      });

      if (!team) return;

      // Clear any pending disconnect timeout for this team (reconnection)
      if (activeTeams.has(teamId)) {
        const existing = activeTeams.get(teamId);
        if (existing.disconnectTimeout) {
          clearTimeout(existing.disconnectTimeout);
        }
      }

      activeTeams.set(teamId, {
        socketId: socket.id,
        teamId: team.id,
        name: team.name,
        avatar: team.avatar,
        disconnectTimeout: null
      });

      socket.teamId = teamId;
      socket.join('teams');

      logger.info(`[Socket] Team registered: ${team.name} (${team.id})`);

      // Notify others of team join (or reconnection)
      io.emit('team_joined', {
        id: team.id,
        name: team.name,
        avatar: team.avatar
      });
    } catch (err) {
      logger.error('Socket register_team error:', err.message);
    }
  });

  // Client requests latest game state
  socket.on('request_state', async () => {
    try {
      const state = await gameService.getHydratedState();
      socket.emit('game_state_updated', state);
    } catch (err) {
      logger.error('Socket request_state error:', err.message);
    }
  });

  // Join specific rooms
  socket.on('join_projector', () => {
    socket.join('projector');
    logger.info(`[Socket] Screen joined projector room: ${socket.id}`);
  });

  socket.on('join_admin', () => {
    socket.join('admin');
    logger.info(`[Socket] Screen joined admin room: ${socket.id}`);
  });

  // Handle client disconnect with 400ms grace period for smooth bubble fade
  socket.on('disconnect', (reason) => {
    logger.info(`[Socket Disconnected] Socket ID: ${socket.id}, Reason: ${reason}`);

    if (socket.teamId && activeTeams.has(socket.teamId)) {
      const teamData = activeTeams.get(socket.teamId);

      // Only set timeout if it was the currently active socket for this team
      if (teamData.socketId === socket.id) {
        teamData.disconnectTimeout = setTimeout(() => {
          activeTeams.delete(socket.teamId);
          logger.info(`[Socket] Team left lobby after grace period: ${socket.teamId}`);
          io.emit('team_left', { teamId: socket.teamId });
        }, 400); // 400ms grace window (within 300-500ms requirement)
      }
    }
  });
}

module.exports = {
  registerSocketHandlers,
  activeTeams
};
