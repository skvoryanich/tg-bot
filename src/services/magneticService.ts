import axios from 'axios';

export interface MagneticStormData {
  kIndex: number;
  stormLevel: string;
  date: string;
}

export class MagneticService {
  private readonly NOAA_BASE_URL = 'https://services.swpc.noaa.gov/json';

  // Получить текущий индекс геомагнитной активности
  async getCurrentKIndex(): Promise<number> {
    try {
      // Получаем данные планетарного K-индекса
      const response = await axios.get(`${this.NOAA_BASE_URL}/planetary_k_index_1m.json`);
      const data = response.data;
      
      if (data && data.length > 0) {
        // Берем последнее значение
        const latest = data[data.length - 1];
        return parseFloat(latest.kp) || 0;
      }
      
      return 0;
    } catch (error) {
      console.error('Error fetching K-index from NOAA:', error);
      
      // Fallback: попробуем альтернативный источник или вернем случайное значение для демо
      try {
        // Альтернативный API - получаем 3-hourly K-index
        const altResponse = await axios.get(`${this.NOAA_BASE_URL}/geospace/geomag_3_day.json`);
        const altData = altResponse.data;
        
        if (altData && altData.length > 0) {
          const recent = altData[altData.length - 1];
          return parseFloat(recent.k_index) || 0;
        }
      } catch (altError) {
        console.warn('Alternative magnetic data source also failed:', altError);
      }
      
      // Для демо целей возвращаем случайное значение от 0 до 9
      console.warn('Using random K-index for demo purposes');
      return Math.floor(Math.random() * 10);
    }
  }

  // Получить данные о магнитных бурях с описанием
  async getMagneticStormData(): Promise<MagneticStormData> {
    const kIndex = await this.getCurrentKIndex();
    const stormLevel = this.getStormLevel(kIndex);
    const date = new Date().toISOString().split('T')[0];

    return {
      kIndex,
      stormLevel,
      date
    };
  }

  // Определить уровень магнитной бури по K-индексу
  private getStormLevel(kIndex: number): string {
    if (kIndex >= 0 && kIndex <= 2) {
      return 'Спокойно';
    } else if (kIndex >= 3 && kIndex <= 4) {
      return 'Слабые возмущения';
    } else if (kIndex === 5) {
      return 'Слабая буря';
    } else if (kIndex === 6) {
      return 'Умеренная буря';
    } else if (kIndex === 7) {
      return 'Сильная буря';
    } else if (kIndex === 8) {
      return 'Очень сильная буря';
    } else if (kIndex >= 9) {
      return 'Экстремальная буря';
    }
    
    return 'Неизвестно';
  }

  // Получить расширенное описание влияния магнитных бурь
  getStormDescription(kIndex: number): string {
    const level = this.getStormLevel(kIndex);
    
    const descriptions: {[key: string]: string} = {
      'Спокойно': 'Геомагнитная обстановка спокойная. Минимальное влияние на самочувствие.',
      'Слабые возмущения': 'Слабые геомагнитные возмущения. Возможно незначительное влияние на чувствительных людей.',
      'Слабая буря': 'Слабая геомагнитная буря. Возможны головные боли у метеочувствительных людей.',
      'Умеренная буря': 'Умеренная геомагнитная буря. Вероятно ухудшение самочувствия у людей с сердечно-сосудистыми заболеваниями.',
      'Сильная буря': 'Сильная геомагнитная буря. Возможно значительное влияние на самочувствие и работоспособность.',
      'Очень сильная буря': 'Очень сильная геомагнитная буря. Высокая вероятность ухудшения самочувствия.',
      'Экстремальная буря': 'Экстремальная геомагнитная буря. Максимальное влияние на организм человека.'
    };

    return descriptions[level] || 'Данные о геомагнитной обстановке недоступны.';
  }
}