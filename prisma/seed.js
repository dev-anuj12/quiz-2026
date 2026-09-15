const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const prisma = new PrismaClient();
const { seedCompetitionQuestions } = require('./seed-questions');

async function main() {
  console.log('[Seed] Starting database seed...');

  // 1. Seed exactly 3 quiz rounds
  const rounds = [
    { number: 1, name: 'Round 1: Bollywood & Movie Magic' },
    { number: 2, name: 'Round 2: Music, Pop Culture & Social Media Trends' },
    { number: 3, name: 'Round 3: Super-Easy Student Tech & Fun GK' }
  ];

  for (const r of rounds) {
    await prisma.round.upsert({
      where: { number: r.number },
      update: { name: r.name },
      create: {
        number: r.number,
        name: r.name
      }
    });
  }
  console.log('[Seed] Ensured the three quiz rounds exist.');

  // Clear all existing teams/users and associated answers/scores
  await prisma.answer.deleteMany();
  await prisma.score.deleteMany();
  await prisma.team.deleteMany();
  console.log('[Seed] Cleared all existing teams, answers, and scores.');

  // 2. Seed initial authoritative GameState record if not present
  const existingState = await prisma.gameState.findUnique({
    where: { id: 'global_game_state' }
  });

  if (!existingState) {
    await prisma.gameState.create({
      data: {
        id: 'global_game_state',
        currentRound: 1,
        currentQuestionId: null,
        status: 'LOBBY', // LOBBY, ACTIVE, PAUSED, ENDED
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
    console.log('[Seed] Initialized authoritative GameState in LOBBY status.');
  }

  // 3. Seed minimum initial admin user from secure environment variables
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@kdkce.edu';
  const adminPassword = process.env.ADMIN_PASSWORD || 'KdkQuiz@2026';

  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(adminPassword, saltRounds);

  const admin = await prisma.admin.upsert({
    where: { email: adminEmail },
    update: { passwordHash },
    create: {
      email: adminEmail,
      passwordHash
    }
  });

  console.log(`[Seed] Seeded default admin account: ${admin.email}`);
  await seedCompetitionQuestions(prisma);
}

main()
  .catch((e) => {
    console.error('[Seed Error]:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
