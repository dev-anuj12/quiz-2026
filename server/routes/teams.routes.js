const express = require('express');
const router = express.Router();
const teamsController = require('../controllers/teams.controller');
const { requireAdmin, optionalAdmin } = require('../middleware/auth.middleware');
const { registrationLimiter } = require('../middleware/rateLimiter');

router.post('/', registrationLimiter, teamsController.registerTeam);
router.get('/', optionalAdmin, teamsController.getTeams);
router.delete('/', requireAdmin, teamsController.deleteAllTeams);
router.get('/:id', teamsController.getTeamById);
router.delete('/:id', requireAdmin, teamsController.deleteTeam);

module.exports = router;
