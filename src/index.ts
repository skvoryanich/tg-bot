import dotenv from 'dotenv';
import { MoodTrackerBot } from './bot';

// Загружаем переменные окружения
dotenv.config();

async function main() {
  const BOT_TOKEN = process.env.BOT_TOKEN;
  const DATABASE_PATH = process.env.DATABASE_PATH || './data/bot.db';

  if (!BOT_TOKEN) {
    console.error('BOT_TOKEN is required in .env file');
    process.exit(1);
  }

  console.log('🚀 Starting Mood Tracker Bot...');
  console.log(`📁 Database path: ${DATABASE_PATH}`);
  console.log(`🌤️ Weather API: Open-Meteo (free, no API key required)`);

  try {
    const bot = new MoodTrackerBot(BOT_TOKEN, DATABASE_PATH);
    bot.start();
  } catch (error) {
    console.error('❌ Failed to start bot:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});