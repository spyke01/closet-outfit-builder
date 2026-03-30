import { describe, expect, it } from 'vitest';

import { getGreetingCopy, getGreetingPeriod, getTodayStylingTip } from '../presentation';

describe('today presentation helpers', () => {
  it('resolves greeting periods by time of day', () => {
    expect(getGreetingPeriod(new Date('2026-03-30T08:00:00'))).toBe('morning');
    expect(getGreetingPeriod(new Date('2026-03-30T13:00:00'))).toBe('afternoon');
    expect(getGreetingPeriod(new Date('2026-03-30T18:00:00'))).toBe('evening');
  });

  it('builds greeting copy with optional user name', () => {
    expect(getGreetingCopy(new Date('2026-03-30T08:00:00'), 'Paden').full).toBe('Good morning, Paden');
    expect(getGreetingCopy(new Date('2026-03-30T18:00:00'), null).full).toBe('Good evening');
  });

  it('maps weather context to a deterministic styling tip', () => {
    expect(getTodayStylingTip(null, { weatherUnavailable: true })).toMatch(/versatile staples/i);
    expect(getTodayStylingTip({
      isCold: false,
      isMild: true,
      isWarm: false,
      isHot: false,
      isRainLikely: true,
      dailySwing: 5,
      hasLargeSwing: false,
      targetWeight: 1,
      currentTemp: 60,
      highTemp: 65,
      lowTemp: 55,
      precipChance: 0.6,
    })).toMatch(/Rain expected/i);
    expect(getTodayStylingTip({
      isCold: true,
      isMild: false,
      isWarm: false,
      isHot: false,
      isRainLikely: false,
      dailySwing: 12,
      hasLargeSwing: false,
      targetWeight: 3,
      currentTemp: 48,
      highTemp: 52,
      lowTemp: 39,
      precipChance: 0,
    })).toMatch(/mid-weight knit/i);
  });
});
