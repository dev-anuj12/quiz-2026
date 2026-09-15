const prisma = require('../config/db');
const logger = require('../utils/logger');

exports.getLeaderboard = async (req, res) => {
  try {
    const teams = await prisma.team.findMany({
      include: {
        scores: true
      }
    });

    if (!teams || teams.length === 0) {
      return res.json({
        success: true,
        hasScores: false,
        message: 'No scores available yet.',
        leaderboard: [],
        podium: null
      });
    }

    // Calculate aggregated stats for each team based strictly on real DB scores
    const teamStats = teams.map(team => {
      const totalPoints = team.scores.reduce((acc, s) => acc + (s.points || 0), 0);
      const totalResponseTime = team.scores.reduce((acc, s) => acc + (s.responseTime || 0), 0);
      const correctAnswers = team.scores.filter(s => s.points > 0).length;

      return {
        teamId: team.id,
        teamName: team.name,
        avatar: team.avatar,
        totalPoints,
        totalResponseTime: Math.round(totalResponseTime),
        correctAnswers
      };
    });

    // Check if there are any real recorded scores > 0
    const hasScores = teamStats.some(t => t.totalPoints > 0);

    // Sort: 1st by totalPoints descending, 2nd by totalResponseTime ascending (tie-breaker)
    teamStats.sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }
      return a.totalResponseTime - b.totalResponseTime;
    });

    // Assign rank
    const leaderboard = teamStats.map((entry, index) => ({
      rank: index + 1,
      ...entry
    }));

    // Form final podium from top 3 ranked teams ONLY if scores exist
    let podium = null;
    if (hasScores && leaderboard.length > 0) {
      podium = {
        first: leaderboard[0] || null,
        second: leaderboard[1] || null,
        third: leaderboard[2] || null
      };
    }

    return res.json({
      success: true,
      hasScores,
      message: hasScores ? 'Scores retrieved successfully' : 'No scores available yet.',
      leaderboard,
      podium
    });
  } catch (error) {
    logger.error('Get leaderboard error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate leaderboard'
    });
  }
};
