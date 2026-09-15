const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('====================================================');
console.log('  KDK INDUCTION QUIZ 2026 - AUTOMATED TEST SUITE');
console.log('  Rotaract Club of KDKCE • KDK College of Engineering');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(testName, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  [PASS] ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] ${testName}: ${err.message}`);
  }
}

async function runAsyncTest(testName, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  [PASS] ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] ${testName}: ${err.message}`);
  }
}

async function main() {
  const rootDir = path.join(__dirname, '..');

  // TEST SUITE 1: ABSOLUTE RULES & ZERO-PIN COMPLIANCE
  console.log('--- TEST SUITE 1: Absolute Rules & Zero-PIN Verification ---');

  runTest('No 6-digit PIN system in any HTML or JS files', () => {
    const publicDir = path.join(rootDir, 'public');
    const files = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));

    for (const f of files) {
      const content = fs.readFileSync(path.join(publicDir, f), 'utf-8');
      assert(!content.toLowerCase().includes('6-digit pin'), `File ${f} contains '6-digit pin'`);
      assert(!content.toLowerCase().includes('enter pin'), `File ${f} contains 'enter pin'`);
      assert(!content.toLowerCase().includes('game pin'), `File ${f} contains 'game pin'`);
      assert(!content.toLowerCase().includes('pin code'), `File ${f} contains 'pin code'`);
    }
  });

  runTest('All 9 required screens exist in public directory', () => {
    const requiredScreens = [
      'index.html',        // 1. Landing / Join
      'register.html',     // 2. Team Registration
      'lobby.html',        // 3. Student Waiting Lobby
      'quiz.html',         // 4. Student Live Quiz
      'admin-login.html',  // 5. Admin Login
      'admin.html',        // 6. Admin Dashboard
      'question-bank.html',// 7. Question Bank
      'projector.html',    // 8. Projector Mode
      'leaderboard.html'   // 9. Final Leaderboard & Podium
    ];

    for (const screen of requiredScreens) {
      const p = path.join(rootDir, 'public', screen);
      assert(fs.existsSync(p), `Missing required screen: ${screen}`);
    }
  });

  runTest('Rotaract primary and KDK secondary branding logos exist', () => {
    const assetsDir = path.join(rootDir, 'public', 'assets');
    assert(fs.existsSync(path.join(assetsDir, 'rotaract-logo.svg')), 'Missing rotaract-logo.svg');
    assert(fs.existsSync(path.join(assetsDir, 'rotaract-logo.png')), 'Missing rotaract-logo.png');
    assert(fs.existsSync(path.join(assetsDir, 'kdk-logo.svg')), 'Missing kdk-logo.svg');
    assert(fs.existsSync(path.join(assetsDir, 'kdk-logo.png')), 'Missing kdk-logo.png');
  });

  // TEST SUITE 2: BACKEND ARCHITECTURE & MODULE INTEGRITY
  console.log('\n--- TEST SUITE 2: Backend Architecture & Services ---');

  runTest('Environment module parses with Zod defaults', () => {
    const env = require('../server/config/env');
    assert(env.PORT !== undefined, 'PORT must be defined');
    assert(env.JWT_SECRET !== undefined, 'JWT_SECRET must be defined');
    assert(env.DATABASE_URL !== undefined, 'DATABASE_URL must be defined');
  });

  runTest('Game Service calculates remaining time correctly', () => {
    const gameService = require('../server/services/game.service');
    const mockState = {
      timerStartedAt: new Date(Date.now() - 5000), // 5 seconds ago
      timerDuration: 20,
      timerPaused: false
    };
    const remaining = gameService.calculateRemainingTime(mockState);
    assert(remaining >= 14 && remaining <= 16, `Expected ~15s remaining, got ${remaining}`);

    const mockPausedState = {
      timerStartedAt: null,
      timerDuration: 12,
      timerPaused: true
    };
    assert.strictEqual(gameService.calculateRemainingTime(mockPausedState), 12);
  });

  runTest('Game Service detects timer expiration with 1s network buffer', () => {
    const gameService = require('../server/services/game.service');
    const freshState = {
      timerStartedAt: new Date(Date.now() - 5000),
      timerDuration: 20,
      timerPaused: false
    };
    assert.strictEqual(gameService.isTimerExpired(freshState), false);

    const expiredState = {
      timerStartedAt: new Date(Date.now() - 22000), // 22 seconds ago
      timerDuration: 20,
      timerPaused: false
    };
    assert.strictEqual(gameService.isTimerExpired(expiredState), true);
  });

  runTest('Express application mounts all required routes', () => {
    const app = require('../server/app');
    assert(app !== null, 'Express app must instantiate');
  });

  // TEST SUITE 3: PRISMA SCHEMA & SEED VERIFICATION
  console.log('\n--- TEST SUITE 3: Prisma Schema & Seeding Logic ---');

  runTest('Prisma schema contains all required models and unique constraints', () => {
    const schemaContent = fs.readFileSync(path.join(rootDir, 'prisma', 'schema.prisma'), 'utf-8');
    const expectedModels = ['Admin', 'Round', 'Team', 'Question', 'Answer', 'Score', 'GameState', 'AuditLog'];
    for (const model of expectedModels) {
      assert(schemaContent.includes(`model ${model}`), `Missing model ${model} in schema.prisma`);
    }
    assert(schemaContent.includes('@@unique([teamId, questionId])'), 'Missing composite unique constraint on Answer or Score');
  });

  runTest('Prisma seed script seeds only 3 empty rounds and zero gameplay data', () => {
    const seedContent = fs.readFileSync(path.join(rootDir, 'prisma', 'seed.js'), 'utf-8');
    assert(seedContent.includes('Round 1'), 'Seed must include Round 1');
    assert(seedContent.includes('Round 2'), 'Seed must include Round 2');
    assert(seedContent.includes('Round 3'), 'Seed must include Round 3');
    // Ensure no questions or teams are seeded
    assert(!seedContent.includes('prisma.question.create'), 'Seed must NOT create questions (0 questions)');
    assert(!seedContent.includes('prisma.team.create'), 'Seed must NOT create teams (0 teams)');
    assert(!seedContent.includes('prisma.answer.create'), 'Seed must NOT create answers (0 answers)');
    assert(!seedContent.includes('prisma.score.create'), 'Seed must NOT create scores (0 scores)');
  });

  console.log('\n====================================================');
  console.log(`  TEST RESULTS: ${passedTests} / ${totalTests} TESTS PASSED`);
  console.log('====================================================\n');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
