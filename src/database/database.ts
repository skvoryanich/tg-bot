import sqlite3 from 'sqlite3';
import path from 'path';

export class Database {
  private db: sqlite3.Database;

  constructor(dbPath: string) {
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
      } else {
        console.log('Connected to SQLite database');
        this.initTables();
      }
    });
  }

  private initTables(): void {
    // Таблица пользователей
    this.db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        telegram_id INTEGER UNIQUE NOT NULL,
        username TEXT,
        first_name TEXT,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Таблица ежедневных записей
    this.db.run(`
      CREATE TABLE IF NOT EXISTS daily_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        date DATE NOT NULL,
        mood_rating INTEGER CHECK(mood_rating >= 1 AND mood_rating <= 10),
        temperature_change_1d REAL,
        temperature_change_2d REAL,
        temperature_change_3d REAL,
        pressure_change_1d REAL,
        pressure_change_2d REAL,
        pressure_change_3d REAL,
        magnetic_storm_index REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (telegram_id),
        UNIQUE(user_id, date)
      )
    `);

    // Таблица для хранения сырых погодных данных
    this.db.run(`
      CREATE TABLE IF NOT EXISTS weather_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date DATE NOT NULL,
        temperature REAL,
        pressure REAL,
        humidity REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(date)
      )
    `);

    console.log('Database tables initialized');
  }

  // Добавить пользователя
  addUser(telegramId: number, username?: string, firstName?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT OR IGNORE INTO users (telegram_id, username, first_name) VALUES (?, ?, ?)',
        [telegramId, username, firstName],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  // Получить активных пользователей
  getActiveUsers(): Promise<Array<{telegram_id: number, username?: string}>> {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT telegram_id, username FROM users WHERE is_active = 1',
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows as Array<{telegram_id: number, username?: string}>);
        }
      );
    });
  }

  // Сохранить оценку настроения с данными
  saveDailyRecord(
    userId: number, 
    date: string, 
    moodRating: number,
    weatherData: {
      tempChange1d: number,
      tempChange2d: number,
      tempChange3d: number,
      pressureChange1d: number,
      pressureChange2d: number,
      pressureChange3d: number,
      magneticStormIndex: number
    }
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(`
        INSERT OR REPLACE INTO daily_records 
        (user_id, date, mood_rating, temperature_change_1d, temperature_change_2d, temperature_change_3d,
         pressure_change_1d, pressure_change_2d, pressure_change_3d, magnetic_storm_index)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        userId, date, moodRating,
        weatherData.tempChange1d, weatherData.tempChange2d, weatherData.tempChange3d,
        weatherData.pressureChange1d, weatherData.pressureChange2d, weatherData.pressureChange3d,
        weatherData.magneticStormIndex
      ], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Сохранить погодные данные
  saveWeatherData(date: string, temperature: number, pressure: number, humidity: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT OR REPLACE INTO weather_data (date, temperature, pressure, humidity) VALUES (?, ?, ?, ?)',
        [date, temperature, pressure, humidity],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  // Получить погодные данные за последние N дней
  getWeatherData(days: number): Promise<Array<{date: string, temperature: number, pressure: number}>> {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT date, temperature, pressure 
        FROM weather_data 
        WHERE date >= date('now', '-${days} days')
        ORDER BY date DESC
      `, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows as Array<{date: string, temperature: number, pressure: number}>);
      });
    });
  }

  close(): void {
    this.db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('Database connection closed');
      }
    });
  }
}