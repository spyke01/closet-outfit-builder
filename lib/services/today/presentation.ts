import type { WeatherContext } from '@/lib/types/generation';

export type GreetingPeriod = 'morning' | 'afternoon' | 'evening';

export function getGreetingPeriod(date: Date): GreetingPeriod {
  const hour = date.getHours();

  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

export function getGreetingCopy(date: Date, userName?: string | null) {
  const period = getGreetingPeriod(date);
  const prefix = `Good ${period}`;
  const suffix = userName?.trim() ? `, ${userName.trim()}` : '';

  return {
    period,
    prefix,
    full: `${prefix}${suffix}`,
  };
}

export function getTodayStylingTip(
  weatherContext: WeatherContext | null,
  options?: { weatherUnavailable?: boolean }
): string {
  if (options?.weatherUnavailable || !weatherContext) {
    return 'Build around versatile staples today and adjust with light layers as needed.';
  }

  if (weatherContext.isRainLikely) {
    return 'Rain expected — reach for water-resistant outerwear and dependable footwear.';
  }

  if (weatherContext.hasLargeSwing) {
    return 'Light layers work best today — temperatures will shift noticeably through the day.';
  }

  if (weatherContext.isCold) {
    return 'A mid-weight knit with a light outer shell works well in the cooler air today.';
  }

  if (weatherContext.isHot) {
    return 'Keep the base breathable and skip heavy layering as the day stays warm.';
  }

  if (weatherContext.isWarm) {
    return 'A breathable base with one polished layer is enough for today’s warmth.';
  }

  return 'A mid-weight knit with a light outer shell works well today.';
}
