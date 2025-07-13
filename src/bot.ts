import { Telegraf, Context } from 'telegraf';
import { Database } from './database/database';
import { WeatherService } from './services/weatherService';
import { MagneticService } from './services/magneticService';
import * as cron from 'node-cron';

export class MoodTrackerBot {
  private bot: Telegraf;
  private db: Database;
  private weatherService: WeatherService;
  private magneticService: MagneticService;
  private awaitingRating: Set<number> = new Set(); // Пользователи, которым отправлено напоминание

  constructor(token: string, databasePath: string) {
    this.bot = new Telegraf(token);
    this.db = new Database(databasePath);
    this.weatherService = new WeatherService();
    this.magneticService = new MagneticService();
    
    this.setupCommands();
    this.setupScheduler();
  }

  private setupCommands(): void {
    // Команда /start
    this.bot.start(async (ctx: Context) => {
      const user = ctx.from;
      if (!user) return;

      try {
        await this.db.addUser(user.id, user.username, user.first_name);
        
        await ctx.reply(
          `Привет, ${user.first_name}! 👋\n\n` +
          `Это бот для ежедневного отслеживания вашего состояния и самочувствия.\n\n` +
          `Для начала введите команду /init\n\n` +
          `Каждый день в 23:00 я буду спрашивать у вас, как вы себя чувствуете по шкале от 1 до 10. ` +
          `Это поможет вам лучше понимать динамику своего состояния! 📈`
        );
      } catch (error) {
        console.error('Error in /start command:', error);
        await ctx.reply('Произошла ошибка при регистрации. Попробуйте позже.');
      }
    });

    // Команда /init - активация ежедневных напоминаний
    this.bot.command('init', async (ctx: Context) => {
      const user = ctx.from;
      if (!user) return;

      try {
        await this.db.addUser(user.id, user.username, user.first_name);
        
        await ctx.reply(
          `✅ Отлично! Теперь вы участвуете в трекинге состояния.\n\n` +
          `🕐 Каждый день в 23:00 я буду присылать вам напоминание оценить ваше состояние.\n\n` +
          `📊 Это поможет вам:\n` +
          `• Отслеживать свое самочувствие\n` +
          `• Замечать паттерны и изменения\n` +
          `• Лучше понимать себя\n\n` +
          `Шкала оценки:\n` +
          `1 - очень плохое самочувствие\n` +
          `10 - отличное самочувствие\n\n` +
          `🎯 Дождитесь напоминания в 23:00 для первой оценки!`
        );
      } catch (error) {
        console.error('Error in /init command:', error);
        await ctx.reply('Произошла ошибка при активации. Попробуйте позже.');
      }
    });


    // Команда /help - помощь
    this.bot.command('help', async (ctx: Context) => {
      const helpMessage = 
        `🤖 Доступные команды:\n\n` +
        `📋 Основные:\n` +
        `/start - Регистрация в системе\n` +
        `/init - Активация ежедневных напоминаний\n` +
        `/help - Эта справка\n\n` +
        `💡 Как пользоваться:\n` +
        `1. Напишите /start для регистрации\n` +
        `2. Напишите /init для активации напоминаний\n` +
        `3. Каждый день в 23:00 дождитесь напоминания\n` +
        `4. После напоминания оцените состояние от 1 до 10\n\n` +
        `📈 Регулярное отслеживание состояния поможет вам лучше понимать себя ` +
        `и замечать важные паттерны в вашем самочувствии!`;
      
      await ctx.reply(helpMessage);
    });

    // Обработка числовых оценок
    this.bot.on('text', async (ctx: Context) => {
      const user = ctx.from;
      const text = ctx.text;
      
      if (!user || !text) return;

      // Проверяем, является ли сообщение числом от 1 до 10
      const rating = parseInt(text);
      if (isNaN(rating) || rating < 1 || rating > 10) {
        return; // Игнорируем нечисловые сообщения
      }

      // Проверяем, ожидается ли от этого пользователя оценка
      if (!this.awaitingRating.has(user.id)) {
        await ctx.reply(
          '⏰ Оценки принимаются только после ежедневного напоминания в 23:00.\n\n' +
          'Дождитесь напоминания для записи своего состояния!'
        );
        return;
      }

      try {
        await ctx.reply('🔄 Сохраняю вашу оценку...');
        
        // Собираем все необходимые данные
        const [weatherHistory, magneticData] = await Promise.all([
          this.weatherService.getHistoricalWeather(4), // Сегодня + 3 дня назад
          this.magneticService.getMagneticStormData()
        ]);

        const weatherChanges = this.weatherService.calculateWeatherChanges(weatherHistory);
        const today = new Date().toISOString().split('T')[0];

        // Сохраняем в базу данных
        await this.db.saveDailyRecord(user.id, today, rating, {
          tempChange1d: weatherChanges.tempChange1d,
          tempChange2d: weatherChanges.tempChange2d,
          tempChange3d: weatherChanges.tempChange3d,
          pressureChange1d: weatherChanges.pressureChange1d,
          pressureChange2d: weatherChanges.pressureChange2d,
          pressureChange3d: weatherChanges.pressureChange3d,
          magneticStormIndex: magneticData.kIndex
        });

        const responseMessage = 
          `✅ Спасибо! Ваша оценка (${rating}/10) сохранена.\n\n` +
          `📈 Продолжайте отслеживать свое состояние каждый день - ` +
          `это поможет вам лучше понимать себя!`;

        await ctx.reply(responseMessage);
        
        // Убираем пользователя из списка ожидающих оценку
        this.awaitingRating.delete(user.id);
      } catch (error) {
        console.error('Error saving mood rating:', error);
        await ctx.reply('❌ Ошибка при сохранении данных. Попробуйте позже.');
      }
    });

    // Обработка ошибок
    this.bot.catch((err: any, ctx: Context) => {
      console.error('Bot error:', err);
      ctx.reply('Произошла ошибка. Попробуйте позже.').catch(console.error);
    });
  }

  private setupScheduler(): void {
    // Запланировать отправку напоминаний каждый день в 23:00 (по московскому времени)
    cron.schedule('0 23 * * *', async () => {
      console.log('Sending daily mood reminders...');
      await this.sendDailyReminders();
    }, {
      timezone: 'Europe/Moscow'
    });

    console.log('Scheduler set up for daily reminders at 23:00 MSK');
  }

  private async sendDailyReminders(): Promise<void> {
    try {
      const activeUsers = await this.db.getActiveUsers();
      console.log(`Sending reminders to ${activeUsers.length} users`);

      for (const user of activeUsers) {
        try {
          await this.bot.telegram.sendMessage(
            user.telegram_id,
            `🌙 Время ежедневной оценки состояния!\n\n` +
            `Как вы себя чувствуете сегодня?\n` +
            `Оцените ваше состояние от 1 до 10:\n\n` +
            `1 - очень плохо 😞\n` +
            `5 - нормально 😐\n` +
            `10 - отлично 😊\n\n` +
            `Просто отправьте мне число!`
          );
          
          // Добавляем пользователя в список ожидающих оценку
          this.awaitingRating.add(user.telegram_id);
        } catch (error) {
          console.error(`Failed to send reminder to user ${user.telegram_id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error sending daily reminders:', error);
    }
  }

  start(): void {
    this.bot.launch().then(() => {
      console.log('Bot started successfully!');
    }).catch((error) => {
      console.error('Failed to start bot:', error);
    });

    // Graceful shutdown
    process.once('SIGINT', () => this.stop());
    process.once('SIGTERM', () => this.stop());
  }

  stop(): void {
    console.log('Stopping bot...');
    this.bot.stop();
    this.db.close();
  }
}