/**
 * Unit Tests for Compatibility Scoring
 * 
 * Tests all scoring functions with specific examples and edge cases.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateWeatherFit,
  calculateFormalityAlignment,
  calculateColorHarmony,
  calculateCapsuleCohesion,
  calculateCompatibilityScore,
} from '../compatibility-scoring';
import { EnrichedItem, WeatherContext, ColorCategory } from '@/lib/types/generation';

// Test fixtures
const createMockItem = (overrides: Partial<EnrichedItem> = {}): EnrichedItem => ({
  id: 'test-id',
  user_id: 'test-user',
  category_id: 'test-category',
  name: 'Test Item',
  formality_score: 5,
  capsule_tags: [],
  season: ['Spring', 'Summer', 'Fall', 'Winter'],
  image_url: undefined,
  active: true,
  bg_removal_status: 'completed',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  color: 'unknown',
  formalityBand: 'smart-casual',
  weatherWeight: 1,
  ...overrides,
});

const createMockWeather = (overrides: Partial<WeatherContext> = {}): WeatherContext => ({
  isCold: false,
  isMild: true,
  isWarm: false,
  isHot: false,
  isRainLikely: false,
  dailySwing: 10,
  hasLargeSwing: false,
  targetWeight: 1,
  currentTemp: 65,
  highTemp: 70,
  lowTemp: 60,
  precipChance: 0.1,
  ...overrides,
});

describe('calculateWeatherFit', () => {
  it('returns high score for perfect weather weight match', () => {
    const item = createMockItem({ weatherWeight: 3 });
    const weather = createMockWeather({ isCold: true, targetWeight: 3, currentTemp: 45 });
    
    const score = calculateWeatherFit(item, weather);
    
    expect(score).toBeGreaterThan(0.8);
    expect(score).toBeLessThanOrEqual(1.0);
  });
  
  it('returns moderate score for close weather weight match', () => {
    const item = createMockItem({ weatherWeight: 2 });
    const weather = createMockWeather({ isCold: true, targetWeight: 3, currentTemp: 50 });
    
    const score = calculateWeatherFit(item, weather);
    
    expect(score).toBeGreaterThan(0.6);
    expect(score).toBeLessThan(0.8);
  });
  
  it('returns low score for poor weather weight match', () => {
    const item = createMockItem({ weatherWeight: 0 });
    const weather = createMockWeather({ isCold: true, targetWeight: 3, currentTemp: 40 });
    
    const score = calculateWeatherFit(item, weather);
    
    expect(score).toBeLessThan(0.5);
  });
  
  it('adds bonus for matching season', () => {
    const winterItem = createMockItem({ weatherWeight: 3, season: ['Winter'] });
    const coldWeather = createMockWeather({ isCold: true, targetWeight: 3, currentTemp: 35 });
    
    const score = calculateWeatherFit(winterItem, coldWeather);
    
    expect(score).toBeGreaterThan(0.9);
  });
  
  it('handles items with no season tags', () => {
    const item = createMockItem({ weatherWeight: 1, season: [] });
    const weather = createMockWeather({ isMild: true, targetWeight: 1 });
    
    const score = calculateWeatherFit(item, weather);
    
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(1);
  });
  
  it('returns score between 0 and 1', () => {
    const item = createMockItem({ weatherWeight: 0 });
    const weather = createMockWeather({ targetWeight: 3 });
    
    const score = calculateWeatherFit(item, weather);
    
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});

describe('calculateFormalityAlignment', () => {
  it('returns 1.0 for identical formality scores', () => {
    const item1 = createMockItem({ formality_score: 7 });
    const item2 = createMockItem({ formality_score: 7 });
    
    const score = calculateFormalityAlignment(item1, item2);
    
    expect(score).toBe(1.0);
  });
  
  it('returns high score for 1-point difference', () => {
    const item1 = createMockItem({ formality_score: 7 });
    const item2 = createMockItem({ formality_score: 8 });
    
    const score = calculateFormalityAlignment(item1, item2);
    
    expect(score).toBe(0.9);
  });
  
  it('returns moderate score for 2-point difference', () => {
    const item1 = createMockItem({ formality_score: 5 });
    const item2 = createMockItem({ formality_score: 7 });
    
    const score = calculateFormalityAlignment(item1, item2);
    
    expect(score).toBe(0.75);
  });
  
  it('returns low score for large formality mismatch', () => {
    const casual = createMockItem({ formality_score: 2 });
    const formal = createMockItem({ formality_score: 9 });
    
    const score = calculateFormalityAlignment(casual, formal);
    
    expect(score).toBeLessThan(0.3);
  });
  
  it('handles null formality scores with default of 5', () => {
    const item1 = createMockItem({ formality_score: undefined });
    const item2 = createMockItem({ formality_score: 5 });
    
    const score = calculateFormalityAlignment(item1, item2);
    
    expect(score).toBe(1.0);
  });
  
  it('returns score between 0 and 1', () => {
    const item1 = createMockItem({ formality_score: 1 });
    const item2 = createMockItem({ formality_score: 10 });
    
    const score = calculateFormalityAlignment(item1, item2);
    
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});

describe('calculateColorHarmony', () => {
  it('returns 1.0 for neutral color combinations', () => {
    const score1 = calculateColorHarmony('navy', 'white');
    const score2 = calculateColorHarmony('black', 'grey');
    const score3 = calculateColorHarmony('khaki', 'brown');
    
    expect(score1).toBe(1.0);
    expect(score2).toBe(1.0);
    expect(score3).toBe(1.0);
  });
  
  it('returns high score for same color', () => {
    const score = calculateColorHarmony('navy', 'navy');
    
    expect(score).toBe(0.85);
  });
  
  it('returns high score for one neutral + one non-neutral', () => {
    const score1 = calculateColorHarmony('white', 'red');
    const score2 = calculateColorHarmony('navy', 'green');
    
    expect(score1).toBe(0.85);
    expect(score2).toBe(0.85);
  });
  
  it('returns low score for clashing colors', () => {
    const score1 = calculateColorHarmony('red', 'green');
    const score2 = calculateColorHarmony('brown', 'black');
    
    expect(score1).toBe(0.3);
    expect(score2).toBe(0.3);
  });
  
  it('handles clashing pairs bidirectionally', () => {
    const score1 = calculateColorHarmony('red', 'green');
    const score2 = calculateColorHarmony('green', 'red');
    
    expect(score1).toBe(score2);
  });
  
  it('returns neutral score for unknown colors', () => {
    const score1 = calculateColorHarmony('unknown', 'navy');
    const score2 = calculateColorHarmony('red', 'unknown');
    
    expect(score1).toBe(0.7);
    expect(score2).toBe(0.7);
  });
  
  it('returns moderate score for non-neutral, non-clashing colors', () => {
    const score = calculateColorHarmony('blue', 'burgundy');
    
    expect(score).toBe(0.6);
  });
  
  it('returns score between 0 and 1', () => {
    const colors: ColorCategory[] = ['black', 'white', 'red', 'green', 'navy', 'unknown'];
    
    colors.forEach(color1 => {
      colors.forEach(color2 => {
        const score = calculateColorHarmony(color1, color2);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      });
    });
  });
});

describe('calculateCapsuleCohesion', () => {
  it('returns high score for multiple shared tags', () => {
    const item1 = createMockItem({ capsule_tags: ['Refined', 'Crossover'] });
    const item2 = createMockItem({ capsule_tags: ['Refined', 'Crossover'] });
    
    const score = calculateCapsuleCohesion(item1, item2);
    
    expect(score).toBe(0.95);
  });
  
  it('returns good score for one shared tag', () => {
    const item1 = createMockItem({ capsule_tags: ['Refined', 'Crossover'] });
    const item2 = createMockItem({ capsule_tags: ['Refined'] });
    
    const score = calculateCapsuleCohesion(item1, item2);
    
    expect(score).toBe(0.8);
  });
  
  it('returns moderate score for no shared tags', () => {
    const item1 = createMockItem({ capsule_tags: ['Refined'] });
    const item2 = createMockItem({ capsule_tags: ['Adventurer'] });
    
    const score = calculateCapsuleCohesion(item1, item2);
    
    expect(score).toBe(0.5);
  });
  
  it('returns neutral score when one item has no tags', () => {
    const item1 = createMockItem({ capsule_tags: ['Refined'] });
    const item2 = createMockItem({ capsule_tags: [] });
    
    const score = calculateCapsuleCohesion(item1, item2);
    
    expect(score).toBe(0.7);
  });
  
  it('returns neutral score when both items have no tags', () => {
    const item1 = createMockItem({ capsule_tags: [] });
    const item2 = createMockItem({ capsule_tags: [] });
    
    const score = calculateCapsuleCohesion(item1, item2);
    
    expect(score).toBe(0.7);
  });
  
  it('handles null capsule tags', () => {
    const item1 = createMockItem({ capsule_tags: undefined });
    const item2 = createMockItem({ capsule_tags: ['Refined'] });
    
    const score = calculateCapsuleCohesion(item1, item2);
    
    expect(score).toBe(0.7);
  });
  
  it('returns score between 0 and 1', () => {
    const item1 = createMockItem({ capsule_tags: ['Refined'] });
    const item2 = createMockItem({ capsule_tags: ['Adventurer'] });
    
    const score = calculateCapsuleCohesion(item1, item2);
    
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});

describe('calculateCompatibilityScore', () => {
  it('returns complete score breakdown with all components', () => {
    const item = createMockItem({
      weatherWeight: 1,
      formality_score: 5,
      color: 'navy',
      capsule_tags: ['Refined'],
    });
    
    const context = {
      weatherContext: createMockWeather({ isMild: true, targetWeight: 1 }),
      selectedItems: {
        pants: createMockItem({
          formality_score: 6,
          color: 'khaki',
          capsule_tags: ['Refined'],
        }),
      },
    };
    
    const score = calculateCompatibilityScore(item, context);
    
    expect(score).toHaveProperty('weatherFit');
    expect(score).toHaveProperty('formalityAlignment');
    expect(score).toHaveProperty('colorHarmony');
    expect(score).toHaveProperty('capsuleCohesion');
    expect(score).toHaveProperty('total');
    
    expect(score.weatherFit).toBeGreaterThanOrEqual(0);
    expect(score.weatherFit).toBeLessThanOrEqual(1);
    expect(score.formalityAlignment).toBeGreaterThanOrEqual(0);
    expect(score.formalityAlignment).toBeLessThanOrEqual(1);
    expect(score.colorHarmony).toBeGreaterThanOrEqual(0);
    expect(score.colorHarmony).toBeLessThanOrEqual(1);
    expect(score.capsuleCohesion).toBeGreaterThanOrEqual(0);
    expect(score.capsuleCohesion).toBeLessThanOrEqual(1);
    expect(score.total).toBeGreaterThanOrEqual(0);
    expect(score.total).toBeLessThanOrEqual(1);
  });
  
  it('calculates weighted total correctly', () => {
    const item = createMockItem({
      weatherWeight: 1,
      formality_score: 5,
      color: 'navy',
      capsule_tags: ['Refined'],
    });
    
    const context = {
      weatherContext: createMockWeather({ isMild: true, targetWeight: 1 }),
      selectedItems: {
        pants: createMockItem({
          formality_score: 5,
          color: 'navy',
          capsule_tags: ['Refined'],
        }),
      },
    };
    
    const score = calculateCompatibilityScore(item, context);
    
    // Verify weighted calculation: 40% weather + 30% formality + 20% color + 10% capsule
    const expectedTotal = 
      score.weatherFit * 0.4 +
      score.formalityAlignment * 0.3 +
      score.colorHarmony * 0.2 +
      score.capsuleCohesion * 0.1;
    
    expect(score.total).toBeCloseTo(expectedTotal, 5);
  });
  
  it('averages scores across multiple selected items', () => {
    const item = createMockItem({
      weatherWeight: 1,
      formality_score: 5,
      color: 'white',
      capsule_tags: ['Refined'],
    });
    
    const context = {
      weatherContext: createMockWeather({ isMild: true, targetWeight: 1 }),
      selectedItems: {
        pants: createMockItem({
          formality_score: 6,
          color: 'navy',
          capsule_tags: ['Refined'],
        }),
        shoes: createMockItem({
          formality_score: 7,
          color: 'brown',
          capsule_tags: ['Crossover'],
        }),
      },
    };
    
    const score = calculateCompatibilityScore(item, context);
    
    // Should average formality alignment across both items
    expect(score.formalityAlignment).toBeGreaterThan(0);
    expect(score.formalityAlignment).toBeLessThanOrEqual(1);
  });
  
  it('handles empty selected items with default scores', () => {
    const item = createMockItem({
      weatherWeight: 1,
      formality_score: 5,
      color: 'navy',
      capsule_tags: ['Refined'],
    });
    
    const context = {
      weatherContext: createMockWeather({ isMild: true, targetWeight: 1 }),
      selectedItems: {},
    };
    
    const score = calculateCompatibilityScore(item, context);
    
    // With no items to compare, formality/color/capsule should default to 1.0
    expect(score.formalityAlignment).toBe(1.0);
    expect(score.colorHarmony).toBe(1.0);
    expect(score.capsuleCohesion).toBe(1.0);
    expect(score.total).toBeGreaterThan(0);
  });
  
  it('returns higher scores for well-matched items', () => {
    const item = createMockItem({
      weatherWeight: 1,
      formality_score: 5,
      color: 'navy',
      capsule_tags: ['Refined'],
    });
    
    const wellMatchedContext = {
      weatherContext: createMockWeather({ isMild: true, targetWeight: 1 }),
      selectedItems: {
        pants: createMockItem({
          formality_score: 5,
          color: 'khaki',
          capsule_tags: ['Refined'],
        }),
      },
    };
    
    const poorlyMatchedContext = {
      weatherContext: createMockWeather({ isCold: true, targetWeight: 3 }),
      selectedItems: {
        pants: createMockItem({
          formality_score: 10,
          color: 'red',
          capsule_tags: ['Adventurer'],
        }),
      },
    };
    
    const goodScore = calculateCompatibilityScore(item, wellMatchedContext);
    const poorScore = calculateCompatibilityScore(item, poorlyMatchedContext);
    
    expect(goodScore.total).toBeGreaterThan(poorScore.total);
  });
  
  it('all component scores are between 0 and 1', () => {
    const item = createMockItem({
      weatherWeight: 0,
      formality_score: 1,
      color: 'red',
      capsule_tags: [],
    });
    
    const context = {
      weatherContext: createMockWeather({ isCold: true, targetWeight: 3 }),
      selectedItems: {
        pants: createMockItem({
          formality_score: 10,
          color: 'green',
          capsule_tags: ['Adventurer'],
        }),
      },
    };
    
    const score = calculateCompatibilityScore(item, context);
    
    expect(score.weatherFit).toBeGreaterThanOrEqual(0);
    expect(score.weatherFit).toBeLessThanOrEqual(1);
    expect(score.formalityAlignment).toBeGreaterThanOrEqual(0);
    expect(score.formalityAlignment).toBeLessThanOrEqual(1);
    expect(score.colorHarmony).toBeGreaterThanOrEqual(0);
    expect(score.colorHarmony).toBeLessThanOrEqual(1);
    expect(score.capsuleCohesion).toBeGreaterThanOrEqual(0);
    expect(score.capsuleCohesion).toBeLessThanOrEqual(1);
    expect(score.total).toBeGreaterThanOrEqual(0);
    expect(score.total).toBeLessThanOrEqual(1);
  });
});
