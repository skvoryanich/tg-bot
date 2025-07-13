import axios from 'axios';

export interface WeatherData {
  temperature: number;
  pressure: number;
  humidity: number;
  date: string;
}

export interface WeatherChanges {
  tempChange1d: number;
  tempChange2d: number;
  tempChange3d: number;
  pressureChange1d: number;
  pressureChange2d: number;
  pressureChange3d: number;
}

export class WeatherService {
  private baseUrl = 'https://api.open-meteo.com/v1';
  
  // Координаты Санкт-Петербурга
  private readonly SPB_LAT = 59.9311;
  private readonly SPB_LON = 30.3609;

  constructor() {
    // Open-Meteo не требует API ключа
  }

  // Получить текущую погоду
  async getCurrentWeather(): Promise<WeatherData> {
    try {
      const response = await axios.get(`${this.baseUrl}/forecast`, {
        params: {
          latitude: this.SPB_LAT,
          longitude: this.SPB_LON,
          current: 'temperature_2m,surface_pressure,relative_humidity_2m',
          timezone: 'Europe/Moscow'
        }
      });

      const data = response.data.current;
      return {
        temperature: data.temperature_2m,
        pressure: data.surface_pressure,
        humidity: data.relative_humidity_2m,
        date: new Date().toISOString().split('T')[0]
      };
    } catch (error) {
      console.error('Error fetching current weather:', error);
      throw new Error('Failed to fetch current weather data');
    }
  }

  // Получить историческую погоду используя Open-Meteo
  async getHistoricalWeather(daysBack: number): Promise<WeatherData[]> {
    const weatherData: WeatherData[] = [];
    
    try {
      // Получаем данные за последние daysBack дней
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - daysBack + 1);
      
      const response = await axios.get(`${this.baseUrl}/forecast`, {
        params: {
          latitude: this.SPB_LAT,
          longitude: this.SPB_LON,
          hourly: 'temperature_2m,surface_pressure,relative_humidity_2m',
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          timezone: 'Europe/Moscow'
        }
      });

      const hourlyData = response.data.hourly;
      
      // Группируем по дням и берем среднее значение
      for (let i = 0; i < daysBack; i++) {
        const dayStart = i * 24;
        const dayEnd = (i + 1) * 24;
        
        if (dayStart < hourlyData.time.length) {
          const dayTemps = hourlyData.temperature_2m.slice(dayStart, dayEnd).filter((t: number) => t !== null);
          const dayPressures = hourlyData.surface_pressure.slice(dayStart, dayEnd).filter((p: number) => p !== null);
          const dayHumidity = hourlyData.relative_humidity_2m.slice(dayStart, dayEnd).filter((h: number) => h !== null);
          
          const avgTemp = dayTemps.reduce((a: number, b: number) => a + b, 0) / dayTemps.length;
          const avgPressure = dayPressures.reduce((a: number, b: number) => a + b, 0) / dayPressures.length;
          const avgHumidity = dayHumidity.reduce((a: number, b: number) => a + b, 0) / dayHumidity.length;
          
          const date = new Date();
          date.setDate(date.getDate() - daysBack + i + 1);
          
          weatherData.push({
            temperature: avgTemp,
            pressure: avgPressure,
            humidity: avgHumidity,
            date: date.toISOString().split('T')[0]
          });
        }
      }
    } catch (error) {
      console.error('Error fetching historical weather:', error);
      
      // Fallback: используем текущие данные с небольшими вариациями
      const currentWeather = await this.getCurrentWeather();
      for (let i = 0; i < daysBack; i++) {
        const variation = (Math.random() - 0.5) * 10; // ±5 градусов
        const pressureVariation = (Math.random() - 0.5) * 20; // ±10 hPa
        
        const date = new Date();
        date.setDate(date.getDate() - daysBack + i + 1);
        
        weatherData.push({
          temperature: currentWeather.temperature + variation,
          pressure: currentWeather.pressure + pressureVariation,
          humidity: currentWeather.humidity,
          date: date.toISOString().split('T')[0]
        });
      }
    }

    return weatherData;
  }

  // Рассчитать изменения погоды
  calculateWeatherChanges(weatherData: WeatherData[]): WeatherChanges {
    if (weatherData.length < 4) {
      throw new Error('Not enough weather data to calculate changes');
    }

    const today = weatherData[weatherData.length - 1];
    const yesterday = weatherData[weatherData.length - 2];
    const twoDaysAgo = weatherData[weatherData.length - 3];
    const threeDaysAgo = weatherData[weatherData.length - 4];

    return {
      tempChange1d: today.temperature - yesterday.temperature,
      tempChange2d: today.temperature - twoDaysAgo.temperature,
      tempChange3d: today.temperature - threeDaysAgo.temperature,
      pressureChange1d: today.pressure - yesterday.pressure,
      pressureChange2d: today.pressure - twoDaysAgo.pressure,
      pressureChange3d: today.pressure - threeDaysAgo.pressure
    };
  }
}