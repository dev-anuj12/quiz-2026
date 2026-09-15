const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const questionBank = [
  {
    number: 1,
    name: 'Round 1: Bollywood & Movie Magic',
    questions: [
      ['Which actor played the iconic character "Rancho" in the blockbuster movie 3 Idiots?', 'Shah Rukh Khan', 'Aamir Khan', 'Ranbir Kapoor', 'Hrithik Roshan', 'B'],
      ['In Yeh Jawaani Hai Deewani, what is the nickname of Ranbir Kapoor\'s character, Kabir?', 'Bunny', 'Avi', 'Sid', 'Rocky', 'A'],
      ['Which actress played the lead role of "Geet" in the movie Jab We Met?', 'Deepika Padukone', 'Katrina Kaif', 'Kareena Kapoor', 'Anushka Sharma', 'C'],
      ['Which 2023 movie made Shah Rukh Khan return to the big screen with massive box-office success?', 'Brahmastra', 'Pathaan', 'War', 'Raees', 'B'],
      ['"Param Sundari" is a popular song featuring which Bollywood actress?', 'Alia Bhatt', 'Kriti Sanon', 'Kiara Advani', 'Ananya Panday', 'B'],
      ['Which movie starred Alia Bhatt as a young woman from Delhi who gets kidnapped right before her wedding?', 'Raazi', 'Highway', 'Gangubai Kathiawadi', 'Dear Zindagi', 'B'],
      ['Who directed the blockbuster movie Jawan starring Shah Rukh Khan?', 'SS Rajamouli', 'Atlee', 'Rohit Shetty', 'Siddharth Anand', 'B'],
      ['In Shershaah, Sidharth Malhotra played the real-life hero Captain Vikram Batra. Who played Dimple Cheema?', 'Kiara Advani', 'Shraddha Kapoor', 'Janhvi Kapoor', 'Tara Sutaria', 'A'],
      ['Which classic comedy film has the famous line: "Mogambo Khush Hua"?', 'Hera Pheri', 'Mr. India', 'Sholay', 'Welcome', 'B'],
      ['Complete this dialogue from Om Shanti Om: "Agar kisi cheez ko dil se chaho, toh puri kainaat..."', '...use tumse door karti hai', '...use tumse milane ki koshish mein lag jaati hai', '...tumhe sab kuch de deti hai', '...tumhare saath khadi ho jaati hai', 'B']
    ]
  },
  {
    number: 2,
    name: 'Round 2: Music, Pop Culture & Social Media Trends',
    questions: [
      ['Who sang the massive hit song "Kesariya" from the movie Brahmastra?', 'Arijit Singh', 'Jubin Nautiyal', 'Atif Aslam', 'B Praak', 'A'],
      ['Which energetic song featuring Oscar-winning music became a global dance craze from the film RRR?', 'Chaleya', 'Naatu Naatu', 'Jhumme Jo Pathaan', 'Jai Ho', 'B'],
      ['What feature on Instagram lets users create and share short, engaging videos?', 'Shorts', 'Reels', 'Snaps', 'Stories', 'B'],
      ['Which Indian singer is known as the "King of Punjabi Pop" with hits like "Lover" and "GOAT"?', 'Yo Yo Honey Singh', 'Diljit Dosanjh', 'AP Dhillon', 'Badshah', 'B'],
      ['In internet meme culture, what does "FOMO" stand for?', 'Fear Of Missing Out', 'Free On Monday Only', 'Full Of Music Online', 'Future Of My Options', 'A'],
      ['Which popular OTT platform uses the iconic "Tudum" sound when you open the app?', 'Amazon Prime Video', 'Netflix', 'Disney+ Hotstar', 'Zee5', 'B'],
      ['Who composed the chart-buster music album for the film Kabir Singh?', 'Pritam', 'Mithoon, Sachet–Parampara, Vishal Mishra & Armaan Malik', 'A.R. Rahman', 'Amit Trivedi', 'B'],
      ['Which famous YouTube music channel is the most subscribed channel in India?', 'Sony Music India', 'T-Series', 'Zee Music Company', 'YRF', 'B'],
      ['What is the full form of "MEME"?', 'Media Entertainment Media Element', 'An idea, behavior, or style that spreads online', 'Modern Electronic Messaging Engine', 'Multiple Expressive Movie Excerpts', 'B'],
      ['Which popular singer gave the hit party anthem "Garmi" starring Nora Fatehi and Varun Dhawan?', 'Neha Kakkar & Badshah', 'Sunidhi Chauhan', 'Shreya Ghoshal', 'Dhvani Bhanushali', 'A']
    ]
  },
  {
    number: 3,
    name: 'Round 3: Super-Easy Student Tech & Fun GK',
    questions: [
      ['What does the "www" stand for in a website address?', 'World Whole Web', 'World Wide Web', 'Web World Wide', 'Wide World Web', 'B'],
      ['Which shortcut key on a computer keyboard is used to \'Copy\' selected text?', 'Ctrl + V', 'Ctrl + C', 'Ctrl + Z', 'Ctrl + X', 'B'],
      ['Which mobile operating system is developed by Google and used by millions of smartphones?', 'iOS', 'Android', 'Windows', 'Symbian', 'B'],
      ['What is the brain of a computer called?', 'RAM', 'CPU', 'Hard Disk', 'Monitor', 'B'],
      ['Which app owned by Meta is the most used messaging application in India?', 'Telegram', 'WhatsApp', 'Signal', 'Messenger', 'B'],
      ['What is the maximum length of a standard Instagram Story before it disappears?', '12 Hours', '24 Hours', '48 Hours', '7 Days', 'B'],
      ['In everyday engineering student life, what does "PDF" standard format stand for?', 'Printable Document File', 'Portable Document Format', 'Personal Data Folder', 'Program Display File', 'B'],
      ['Which search engine is the most popular in the world?', 'Yahoo', 'Google', 'Bing', 'DuckDuckGo', 'B'],
      ['What color is the \'Like\' thumb icon on Facebook?', 'Red', 'Blue', 'Green', 'Yellow', 'B'],
      ['What key combination is commonly known as the "Save" shortcut in computer software?', 'Ctrl + A', 'Ctrl + S', 'Ctrl + P', 'Ctrl + N', 'B']
    ]
  }
];

async function seedCompetitionQuestions(prisma = new PrismaClient()) {
  let added = 0;
  // Clear previous questions, answers, and scores when replacing quiz cleanly
  await prisma.answer.deleteMany();
  await prisma.score.deleteMany();
  await prisma.question.deleteMany();

  for (const roundData of questionBank) {
    const round = await prisma.round.upsert({
      where: { number: roundData.number },
      update: { name: roundData.name },
      create: { number: roundData.number, name: roundData.name }
    });

    for (const [text, optionA, optionB, optionC, optionD, correctOption] of roundData.questions) {
      await prisma.question.create({
        data: {
          roundId: round.id,
          text,
          optionA,
          optionB,
          optionC,
          optionD,
          correctOption
        }
      });
      added++;
    }
  }

  // Update GameState to point to the first question in Round 1
  const firstQ = await prisma.question.findFirst({
    where: { round: { number: 1 } },
    orderBy: { createdAt: 'asc' }
  });

  await prisma.gameState.upsert({
    where: { id: 'global_game_state' },
    update: {
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
    },
    create: {
      id: 'global_game_state',
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
    }
  });

  console.log(`[Competition Seed] Imported ${added} fresh official questions into 3 rounds.`);
}

module.exports = { seedCompetitionQuestions, questionBank };

if (require.main === module) {
  const prisma = new PrismaClient();
  seedCompetitionQuestions(prisma)
    .catch(error => { console.error('Question seed error:', error); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
}
