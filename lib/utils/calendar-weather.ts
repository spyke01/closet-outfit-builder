import type { WeatherResponse } from '@/lib/hooks/use-weather';
import type { WeatherContext } from '@/lib/types/generation';
import { normalizeWeatherContext } from '@/lib/utils/weather-normalization';

export type CalendarWeatherSource = 'forecast' | 'seasonal-fallback' | 'neutral';

export interface CalendarWeatherResult {
  source: CalendarWeatherSource;
  weatherContext: WeatherContext;
  condition: string;
  highTemp: number;
  lowTemp: number;
  precipChance: number;
}

function toDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

function clampTemperature(value: number): number {
  return Math.max(-10, Math.min(115, value));
}

function normalizeMonthDelta(fromMonth: number, toMonth: number): number {
  let delta = toMonth - fromMonth;
  if (delta > 6) delta -= 12;
  if (delta < -6) delta += 12;
  return delta;
}

function getSeasonalEstimate(
  date: Date,
  currentTemp: number
): { high: number; low: number; condition: string; precip: number } {
  const selectedMonth = date.getMonth();
  const currentMonth = new Date().getMonth();
  const monthDelta = normalizeMonthDelta(currentMonth, selectedMonth);

  // Approximate seasonal movement from current local conditions.
  const projectedMidpoint = currentTemp + monthDelta * 4;
  const spread = projectedMidpoint >= 78 ? 10 : projectedMidpoint <= 45 ? 12 : 14;
  const high = clampTemperature(Math.round(projectedMidpoint + spread / 2));
  const low = clampTemperature(Math.round(projectedMidpoint - spread / 2));

  return { high, low, condition: 'seasonal estimate', precip: 0.22 };
}

function buildNeutralContext(): WeatherContext {
  return {
    isCold: false,
    isMild: true,
    isWarm: false,
    isHot: false,
    isRainLikely: false,
    dailySwing: 0,
    hasLargeSwing: false,
    targetWeight: 1,
    currentTemp: 65,
    highTemp: 70,
    lowTemp: 60,
    precipChance: 0,
  };
}

export function resolveCalendarWeather(
  selectedDate: Date,
  current: WeatherResponse['current'] | null,
  forecast: WeatherResponse['forecast']
): CalendarWeatherResult {
  const dateKey = toDateKey(selectedDate);
  const matchedForecast = forecast.find((day) => day.date === dateKey);

  if (current && matchedForecast) {
    const normalized = normalizeWeatherContext(current, [matchedForecast]);
    return {
      source: 'forecast',
      weatherContext: normalized,
      condition: matchedForecast.condition,
      highTemp: matchedForecast.temperature.high,
      lowTemp: matchedForecast.temperature.low,
      precipChance: matchedForecast.precipitationProbability ?? 0,
    };
  }

  if (current) {
    const seasonal = getSeasonalEstimate(selectedDate, current.temperature);
    const midpointTemp = Math.round((seasonal.high + seasonal.low) / 2);
    const normalized = normalizeWeatherContext(
      {
        temperature: midpointTemp,
        condition: seasonal.condition,
        icon: '02d',
      },
      [
        {
          date: dateKey,
          temperature: {
            high: seasonal.high,
            low: seasonal.low,
          },
          condition: seasonal.condition,
          icon: '02d',
          precipitationProbability: seasonal.precip,
        },
      ]
    );

    return {
      source: 'seasonal-fallback',
      weatherContext: normalized,
      condition: seasonal.condition,
      highTemp: seasonal.high,
      lowTemp: seasonal.low,
      precipChance: seasonal.precip,
    };
  }

  const neutral = buildNeutralContext();
  return {
    source: 'neutral',
    weatherContext: neutral,
    condition: 'mild',
    highTemp: neutral.highTemp,
    lowTemp: neutral.lowTemp,
    precipChance: neutral.precipChance,
  };
}
