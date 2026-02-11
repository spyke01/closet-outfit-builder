import { describe, it, expect } from 'vitest';
import {
  enrichItem,
  enrichItems,
  classifyFormalityBand,
  inferWeatherWeight,
} from '../item-enrichment';
import { WardrobeItem } from '@/lib/types/database';

describe('classifyFormalityBand', () => {
  it('classifies score 1-3 as casual', () => {
    expect(classifyFormalityBand(1)).toBe('casual');
    expect(classifyFormalityBand(2)).toBe('casual');
    expect(classifyFormalityBand(3)).toBe('casual');
  });
  
  it('classifies score 4-6 as smart-casual', () => {
    expect(classifyFormalityBand(4)).toBe('smart-casual');
    expect(classifyFormalityBand(5)).toBe('smart-casual');
    expect(classifyFormalityBand(6)).toBe('smart-casual');
  });
  
  it('classifies score 7-10 as refined', () => {
    expect(classifyFormalityBand(7)).toBe('refined');
    expect(classifyFormalityBand(8)).toBe('refined');
    expect(classifyFormalityBand(9)).toBe('refined');
    expect(classifyFormalityBand(10)).toBe('refined');
  });
  
  it('defaults to smart-casual for undefined score', () => {
    expect(classifyFormalityBand(undefined)).toBe('smart-casual');
  });
  
  it('clamps out-of-range scores', () => {
    expect(classifyFormalityBand(0)).toBe('casual'); // Clamped to 1
    expect(classifyFormalityBand(-5)).toBe('casual'); // Clamped to 1
    expect(classifyFormalityBand(15)).toBe('refined'); // Clamped to 10
  });
});

describe('inferWeatherWeight', () => {
  it('assigns correct base weights for outerwear', () => {
    expect(inferWeatherWeight('Jacket', [])).toBe(3);
    expect(inferWeatherWeight('Coat', [])).toBe(3);
    expect(inferWeatherWeight('Blazer', [])).toBe(2);
    expect(inferWeatherWeight('Overshirt', [])).toBe(2);
  });
  
  it('assigns correct base weights for tops', () => {
    expect(inferWeatherWeight('Shirt', [])).toBe(2);
    expect(inferWeatherWeight('T-Shirt', [])).toBe(0);
    expect(inferWeatherWeight('Polo', [])).toBe(1);
    expect(inferWeatherWeight('Sweater', [])).toBe(2);
  });
  
  it('assigns correct base weights for bottoms', () => {
    expect(inferWeatherWeight('Pants', [])).toBe(2);
    expect(inferWeatherWeight('Jeans', [])).toBe(2);
    expect(inferWeatherWeight('Shorts', [])).toBe(0);
    expect(inferWeatherWeight('Chinos', [])).toBe(2);
  });
  
  it('assigns correct base weights for footwear', () => {
    expect(inferWeatherWeight('Shoes', [])).toBe(2);
    expect(inferWeatherWeight('Boots', [])).toBe(3);
    expect(inferWeatherWeight('Sneakers', [])).toBe(1);
    expect(inferWeatherWeight('Sandals', [])).toBe(0);
  });
  
  it('assigns correct base weights for accessories', () => {
    expect(inferWeatherWeight('Belt', [])).toBe(0);
    expect(inferWeatherWeight('Watch', [])).toBe(0);
  });
  
  it('applies Summer adjustment (lighter)', () => {
    expect(inferWeatherWeight('Shirt', ['Summer'])).toBe(1); // 2 - 1 = 1
    expect(inferWeatherWeight('Pants', ['Summer'])).toBe(1); // 2 - 1 = 1
  });
  
  it('applies Winter adjustment (heavier)', () => {
    expect(inferWeatherWeight('Shirt', ['Winter'])).toBe(3); // 2 + 1 = 3
    expect(inferWeatherWeight('Jacket', ['Winter'])).toBe(3); // 3 + 1 = 4, clamped to 3
  });
  
  it('applies no adjustment for Spring/Fall', () => {
    expect(inferWeatherWeight('Shirt', ['Spring'])).toBe(2);
    expect(inferWeatherWeight('Shirt', ['Fall'])).toBe(2);
  });
  
  it('averages multiple season adjustments', () => {
    // Summer (-1) + Winter (+1) = 0 average adjustment
    expect(inferWeatherWeight('Shirt', ['Summer', 'Winter'])).toBe(2);
    
    // Summer (-1) + Spring (0) = -0.5 average, rounds to 2
    expect(inferWeatherWeight('Shirt', ['Summer', 'Spring'])).toBe(2);
  });
  
  it('clamps weight to 0-3 range', () => {
    expect(inferWeatherWeight('T-Shirt', ['Summer'])).toBe(0); // 0 - 1 = -1, clamped to 0
    expect(inferWeatherWeight('Coat', ['Winter'])).toBe(3); // 3 + 1 = 4, clamped to 3
  });
  
  it('defaults to weight 2 for unknown categories', () => {
    expect(inferWeatherWeight('Unknown Category', [])).toBe(2);
    expect(inferWeatherWeight(undefined, [])).toBe(2);
  });
  
  it('handles undefined season tags', () => {
    expect(inferWeatherWeight('Shirt', undefined)).toBe(2);
  });
  
  it('handles empty season tags', () => {
    expect(inferWeatherWeight('Shirt', [])).toBe(2);
  });
});

describe('enrichItem', () => {
  const createMockItem = (overrides: Partial<WardrobeItem> = {}): WardrobeItem => ({
    id: 'test-id',
    user_id: 'user-123',
    category_id: 'cat-123',
    name: 'Test Item',
    active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  });
  
  it('uses explicit color field when provided', () => {
    const item = createMockItem({ name: 'Oxford Shirt', color: 'blue' });
    const enriched = enrichItem(item);
    
    expect(enriched.color).toBe('blue');
  });
  
  it('treats null color as unknown', () => {
    const item = createMockItem({ name: 'Oxford Shirt', color: undefined });
    const enriched = enrichItem(item);
    
    expect(enriched.color).toBe('unknown');
  });
  
  it('treats empty string color as unknown', () => {
    const item = createMockItem({ name: 'Oxford Shirt', color: '' });
    const enriched = enrichItem(item);
    
    expect(enriched.color).toBe('unknown');
  });
  
  it('treats undefined color as unknown', () => {
    const item = createMockItem({ name: 'Oxford Shirt' });
    const enriched = enrichItem(item);
    
    expect(enriched.color).toBe('unknown');
  });
  
  it('enriches item with formality band', () => {
    const item = createMockItem({ formality_score: 8 });
    const enriched = enrichItem(item);
    
    expect(enriched.formalityBand).toBe('refined');
  });
  
  it('enriches item with weather weight', () => {
    const item = createMockItem({
      category: { name: 'Jacket', id: 'cat-1', user_id: 'user-1', is_anchor_item: false, display_order: 1, created_at: '', updated_at: '' },
      season: ['Winter'],
    });
    const enriched = enrichItem(item);
    
    expect(enriched.weatherWeight).toBe(3);
  });
  
  it('preserves all original item properties', () => {
    const item = createMockItem({
      name: 'Wool Pants',
      brand: 'Test Brand',
      color: 'grey',
      material: 'Wool',
      formality_score: 7,
      capsule_tags: ['Refined'],
      season: ['Fall', 'Winter'],
      image_url: 'https://example.com/image.jpg',
    });
    
    const enriched = enrichItem(item);
    
    expect(enriched.id).toBe(item.id);
    expect(enriched.user_id).toBe(item.user_id);
    expect(enriched.name).toBe(item.name);
    expect(enriched.brand).toBe(item.brand);
    expect(enriched.color).toBe(item.color);
    expect(enriched.material).toBe(item.material);
    expect(enriched.formality_score).toBe(item.formality_score);
    expect(enriched.capsule_tags).toEqual(item.capsule_tags);
    expect(enriched.season).toEqual(item.season);
    expect(enriched.image_url).toBe(item.image_url);
  });
  
  it('handles items with minimal data', () => {
    const item = createMockItem({
      name: 'Simple Shirt',
      // No formality_score, category, season, or color
    });
    
    const enriched = enrichItem(item);
    
    expect(enriched.color).toBe('unknown');
    expect(enriched.formalityBand).toBe('smart-casual'); // Default
    expect(enriched.weatherWeight).toBe(2); // Default
  });
  
  it('enriches complete example: Blue Oxford Shirt', () => {
    const item = createMockItem({
      name: 'Oxford Shirt',
      color: 'blue',
      category: { name: 'Shirt', id: 'cat-1', user_id: 'user-1', is_anchor_item: false, display_order: 1, created_at: '', updated_at: '' },
      formality_score: 6,
      season: ['Spring', 'Fall'],
    });
    
    const enriched = enrichItem(item);
    
    expect(enriched.color).toBe('blue');
    expect(enriched.formalityBand).toBe('smart-casual');
    expect(enriched.weatherWeight).toBe(2);
  });
  
  it('enriches complete example: Black Leather Jacket', () => {
    const item = createMockItem({
      name: 'Leather Jacket',
      color: 'black',
      category: { name: 'Jacket', id: 'cat-1', user_id: 'user-1', is_anchor_item: false, display_order: 1, created_at: '', updated_at: '' },
      formality_score: 5,
      season: ['Fall', 'Winter'],
    });
    
    const enriched = enrichItem(item);
    
    expect(enriched.color).toBe('black');
    expect(enriched.formalityBand).toBe('smart-casual');
    expect(enriched.weatherWeight).toBe(3);
  });
  
  it('enriches complete example: Khaki Shorts', () => {
    const item = createMockItem({
      name: 'Shorts',
      color: 'khaki',
      category: { name: 'Shorts', id: 'cat-1', user_id: 'user-1', is_anchor_item: false, display_order: 1, created_at: '', updated_at: '' },
      formality_score: 2,
      season: ['Summer'],
    });
    
    const enriched = enrichItem(item);
    
    expect(enriched.color).toBe('khaki');
    expect(enriched.formalityBand).toBe('casual');
    expect(enriched.weatherWeight).toBe(0);
  });
});

describe('enrichItems', () => {
  const createMockItem = (overrides: Partial<WardrobeItem> = {}): WardrobeItem => ({
    id: 'test-id',
    user_id: 'user-123',
    category_id: 'cat-123',
    name: 'Test Item',
    active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  });
  
  it('enriches empty array', () => {
    const enriched = enrichItems([]);
    expect(enriched).toEqual([]);
  });
  
  it('enriches single item', () => {
    const items = [
      createMockItem({
        id: '1',
        name: 'Shirt',
        color: 'blue',
        formality_score: 5,
      }),
    ];
    
    const enriched = enrichItems(items);
    
    expect(enriched).toHaveLength(1);
    expect(enriched[0].id).toBe('1');
    expect(enriched[0].color).toBe('blue');
    expect(enriched[0].formalityBand).toBe('smart-casual');
  });
  
  it('enriches multiple items', () => {
    const items = [
      createMockItem({
        id: '1',
        name: 'Shirt',
        color: 'blue',
        category: { name: 'Shirt', id: 'cat-1', user_id: 'user-1', is_anchor_item: false, display_order: 1, created_at: '', updated_at: '' },
        formality_score: 6,
      }),
      createMockItem({
        id: '2',
        name: 'Pants',
        color: 'grey',
        category: { name: 'Pants', id: 'cat-2', user_id: 'user-1', is_anchor_item: false, display_order: 2, created_at: '', updated_at: '' },
        formality_score: 5,
      }),
      createMockItem({
        id: '3',
        name: 'Leather Shoes',
        color: 'brown',
        category: { name: 'Shoes', id: 'cat-3', user_id: 'user-1', is_anchor_item: false, display_order: 3, created_at: '', updated_at: '' },
        formality_score: 7,
      }),
    ];
    
    const enriched = enrichItems(items);
    
    expect(enriched).toHaveLength(3);
    
    // Check first item
    expect(enriched[0].id).toBe('1');
    expect(enriched[0].color).toBe('blue');
    expect(enriched[0].formalityBand).toBe('smart-casual');
    expect(enriched[0].weatherWeight).toBe(2);
    
    // Check second item
    expect(enriched[1].id).toBe('2');
    expect(enriched[1].color).toBe('grey');
    expect(enriched[1].formalityBand).toBe('smart-casual');
    expect(enriched[1].weatherWeight).toBe(2);
    
    // Check third item
    expect(enriched[2].id).toBe('3');
    expect(enriched[2].color).toBe('brown');
    expect(enriched[2].formalityBand).toBe('refined');
    expect(enriched[2].weatherWeight).toBe(2);
  });
  
  it('preserves array order', () => {
    const items = [
      createMockItem({ id: 'a', name: 'Item A' }),
      createMockItem({ id: 'b', name: 'Item B' }),
      createMockItem({ id: 'c', name: 'Item C' }),
    ];
    
    const enriched = enrichItems(items);
    
    expect(enriched.map(i => i.id)).toEqual(['a', 'b', 'c']);
  });
  
  it('does not mutate original items', () => {
    const items = [
      createMockItem({ id: '1', name: 'Shirt', color: 'blue' }),
    ];
    
    const originalItem = { ...items[0] };
    enrichItems(items);
    
    // Original item should be unchanged
    expect(items[0]).toEqual(originalItem);
  });
});

describe('Integration: Requirements Validation', () => {
  const createMockItem = (overrides: Partial<WardrobeItem> = {}): WardrobeItem => ({
    id: 'test-id',
    user_id: 'user-123',
    category_id: 'cat-123',
    name: 'Test Item',
    active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  });
  
  it('validates Requirement 3.3: Uses explicit color field', () => {
    const items = [
      createMockItem({ name: 'Leather Jacket', color: 'black' }),
      createMockItem({ name: 'Oxford Shirt', color: 'white' }),
      createMockItem({ name: 'Chinos', color: 'navy' }),
      createMockItem({ name: 'Leather Shoes', color: 'brown' }),
    ];
    
    const enriched = enrichItems(items);
    
    expect(enriched[0].color).toBe('black');
    expect(enriched[1].color).toBe('white');
    expect(enriched[2].color).toBe('navy');
    expect(enriched[3].color).toBe('brown');
  });
  
  it('validates Requirement 3.6: Null colors treated as unknown', () => {
    const items = [
      createMockItem({ name: 'Item 1', color: undefined }),
      createMockItem({ name: 'Item 2', color: '' }),
      createMockItem({ name: 'Item 3' }), // undefined
    ];
    
    const enriched = enrichItems(items);
    
    expect(enriched[0].color).toBe('unknown');
    expect(enriched[1].color).toBe('unknown');
    expect(enriched[2].color).toBe('unknown');
  });
  
  it('validates Requirement 6.3: Formality band classification', () => {
    const items = [
      createMockItem({ name: 'T-Shirt', formality_score: 2 }),
      createMockItem({ name: 'Button-Down Shirt', formality_score: 5 }),
      createMockItem({ name: 'Dress Shirt', formality_score: 8 }),
    ];
    
    const enriched = enrichItems(items);
    
    expect(enriched[0].formalityBand).toBe('casual');
    expect(enriched[1].formalityBand).toBe('smart-casual');
    expect(enriched[2].formalityBand).toBe('refined');
  });
  
  it('validates Requirement 6.4: Weather weight inference', () => {
    const items = [
      createMockItem({
        name: 'Heavy Wool Coat',
        category: { name: 'Coat', id: 'cat-1', user_id: 'user-1', is_anchor_item: false, display_order: 1, created_at: '', updated_at: '' },
        season: ['Winter'],
      }),
      createMockItem({
        name: 'Light Cotton Shirt',
        category: { name: 'Shirt', id: 'cat-2', user_id: 'user-1', is_anchor_item: false, display_order: 2, created_at: '', updated_at: '' },
        season: ['Summer'],
      }),
      createMockItem({
        name: 'Shorts',
        category: { name: 'Shorts', id: 'cat-3', user_id: 'user-1', is_anchor_item: false, display_order: 3, created_at: '', updated_at: '' },
        season: ['Summer'],
      }),
    ];
    
    const enriched = enrichItems(items);
    
    expect(enriched[0].weatherWeight).toBe(3); // Heavy coat in winter
    expect(enriched[1].weatherWeight).toBe(1); // Light shirt in summer
    expect(enriched[2].weatherWeight).toBe(0); // Shorts in summer
  });
});
