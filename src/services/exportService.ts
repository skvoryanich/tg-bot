import { Database } from '../database/database';

export interface ExportData {
  date: string;
  user_id: number;
  mood_rating: number;
  temperature_change_1d: number;
  temperature_change_2d: number;
  temperature_change_3d: number;
  pressure_change_1d: number;
  pressure_change_2d: number;
  pressure_change_3d: number;
  magnetic_storm_index: number;
}

export class ExportService {
  private db: Database;

  constructor(database: Database) {
    this.db = database;
  }

  // Получить все данные для экспорта
  async getAllData(): Promise<ExportData[]> {
    return new Promise((resolve, reject) => {
      this.db['db'].all(`
        SELECT 
          date,
          user_id,
          mood_rating,
          temperature_change_1d,
          temperature_change_2d,
          temperature_change_3d,
          pressure_change_1d,
          pressure_change_2d,
          pressure_change_3d,
          magnetic_storm_index
        FROM daily_records
        ORDER BY date DESC, user_id
      `, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows as ExportData[]);
      });
    });
  }

  // Получить данные конкретного пользователя
  async getUserData(userId: number): Promise<ExportData[]> {
    return new Promise((resolve, reject) => {
      this.db['db'].all(`
        SELECT 
          date,
          user_id,
          mood_rating,
          temperature_change_1d,
          temperature_change_2d,
          temperature_change_3d,
          pressure_change_1d,
          pressure_change_2d,
          pressure_change_3d,
          magnetic_storm_index
        FROM daily_records
        WHERE user_id = ?
        ORDER BY date DESC
      `, [userId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows as ExportData[]);
      });
    });
  }

  // Конвертировать данные в CSV формат
  convertToCSV(data: ExportData[]): string {
    const headers = [
      'date',
      'user_id',
      'mood_rating',
      'temperature_change_1d',
      'temperature_change_2d', 
      'temperature_change_3d',
      'pressure_change_1d',
      'pressure_change_2d',
      'pressure_change_3d',
      'magnetic_storm_index'
    ];

    const csvRows = [headers.join(',')];
    
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header as keyof ExportData];
        return value !== null && value !== undefined ? value.toString() : '';
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }

  // Базовый анализ корреляций
  async calculateCorrelations(userId?: number): Promise<{
    tempCorrelations: {[key: string]: number},
    pressureCorrelations: {[key: string]: number},
    magneticCorrelation: number,
    totalRecords: number
  }> {
    const data = userId ? await this.getUserData(userId) : await this.getAllData();
    
    if (data.length < 2) {
      return {
        tempCorrelations: {},
        pressureCorrelations: {},
        magneticCorrelation: 0,
        totalRecords: data.length
      };
    }

    const moods = data.map(d => d.mood_rating);
    
    return {
      tempCorrelations: {
        '1d': this.calculateCorrelation(moods, data.map(d => d.temperature_change_1d)),
        '2d': this.calculateCorrelation(moods, data.map(d => d.temperature_change_2d)),
        '3d': this.calculateCorrelation(moods, data.map(d => d.temperature_change_3d))
      },
      pressureCorrelations: {
        '1d': this.calculateCorrelation(moods, data.map(d => d.pressure_change_1d)),
        '2d': this.calculateCorrelation(moods, data.map(d => d.pressure_change_2d)),
        '3d': this.calculateCorrelation(moods, data.map(d => d.pressure_change_3d))
      },
      magneticCorrelation: this.calculateCorrelation(moods, data.map(d => d.magnetic_storm_index)),
      totalRecords: data.length
    };
  }

  // Вычисление коэффициента корреляции Пирсона
  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;

    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
    const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
    const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  // Форматированный отчет для пользователя
  formatCorrelationReport(correlations: any): string {
    const { tempCorrelations, pressureCorrelations, magneticCorrelation, totalRecords } = correlations;
    
    let report = `📊 Анализ корреляций (${totalRecords} записей):\n\n`;
    
    report += `🌡️ Температура и настроение:\n`;
    report += `  • За 1 день: ${this.formatCorrelation(tempCorrelations['1d'])}\n`;
    report += `  • За 2 дня: ${this.formatCorrelation(tempCorrelations['2d'])}\n`;
    report += `  • За 3 дня: ${this.formatCorrelation(tempCorrelations['3d'])}\n\n`;
    
    report += `🏔️ Давление и настроение:\n`;
    report += `  • За 1 день: ${this.formatCorrelation(pressureCorrelations['1d'])}\n`;
    report += `  • За 2 дня: ${this.formatCorrelation(pressureCorrelations['2d'])}\n`;
    report += `  • За 3 дня: ${this.formatCorrelation(pressureCorrelations['3d'])}\n\n`;
    
    report += `🧲 Магнитные бури и настроение:\n`;
    report += `  • Корреляция: ${this.formatCorrelation(magneticCorrelation)}\n\n`;
    
    report += `📝 Интерпретация:\n`;
    report += `• Значения близкие к +1: сильная положительная связь\n`;
    report += `• Значения близкие к -1: сильная отрицательная связь\n`;
    report += `• Значения близкие к 0: связь отсутствует\n`;
    report += `• |r| > 0.3 считается значимой корреляцией`;
    
    return report;
  }

  private formatCorrelation(r: number): string {
    if (isNaN(r)) return 'недостаточно данных';
    
    const strength = Math.abs(r) > 0.7 ? 'сильная' : 
                    Math.abs(r) > 0.3 ? 'умеренная' : 'слабая';
    const direction = r > 0 ? 'положительная' : 'отрицательная';
    
    return `${r.toFixed(3)} (${strength} ${direction})`;
  }
}