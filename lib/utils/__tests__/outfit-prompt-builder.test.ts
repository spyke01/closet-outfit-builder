import { describe, it, expect } from 'vitest';
import { buildOutfitPrompt, validateOutfitItems } from '@/lib/utils/outfit-prompt-builder';

const makeItem = (overrides: Partial<import('@/lib/utils/outfit-prompt-builder').OutfitPromptItem> = {}): import('@/lib/utils/outfit-prompt-builder').OutfitPromptItem => ({
  name: 'White Oxford Shirt',
  category: 'Tops',
  color: 'White',
  ...overrides,
});

describe('buildOutfitPrompt', () => {
  it('generates a prompt containing single item details', () => {
    const prompt = buildOutfitPrompt({
      items: [makeItem({ name: 'Blue Polo', category: 'Tops', color: 'Blue' })],
    });

    expect(prompt).toContain('Blue Polo');
    expect(prompt).toContain('Tops');
    expect(prompt).toContain('Blue');
  });

  it('includes all items across multiple categories', () => {
    const items = [
      makeItem({ name: 'Navy Blazer', category: 'Tops', color: 'Navy' }),
      makeItem({ name: 'Khaki Chinos', category: 'Bottoms', color: 'Khaki' }),
      makeItem({ name: 'Brown Loafers', category: 'Shoes', color: 'Brown' }),
    ];

    const prompt = buildOutfitPrompt({ items });

    expect(prompt).toContain('Navy Blazer');
    expect(prompt).toContain('Khaki Chinos');
    expect(prompt).toContain('Brown Loafers');
    expect(prompt).toContain('Tops');
    expect(prompt).toContain('Bottoms');
    expect(prompt).toContain('Shoes');
  });

  it('works when optional fields (brand, material) are omitted', () => {
    const items = [makeItem({ name: 'Basic Tee', brand: undefined, material: undefined })];

    const prompt = buildOutfitPrompt({ items });

    expect(prompt).toContain('Basic Tee');
    expect(prompt).toContain('Tops');
    expect(prompt).toContain('White');
  });

  it('includes tuck style in prompt when provided', () => {
    const prompt = buildOutfitPrompt({
      items: [makeItem()],
      tuck_style: 'Tucked',
    });

    expect(prompt).toContain('Tucked');
  });

  it('throws when items array is empty', () => {
    expect(() => buildOutfitPrompt({ items: [] })).toThrow();
  });

  it('includes brand info when brand is present', () => {
    const prompt = buildOutfitPrompt({
      items: [makeItem({ name: 'Polo Shirt', brand: 'Ralph Lauren' })],
    });

    expect(prompt).toContain('Ralph Lauren');
  });

  it('does not include brand placeholder when brand is absent', () => {
    const prompt = buildOutfitPrompt({
      items: [makeItem({ brand: undefined })],
    });

    // Should not contain a brand label with empty or undefined value
    expect(prompt).not.toMatch(/brand:\s*(undefined|null)/i);
  });
});

describe('validateOutfitItems', () => {
  it('returns valid: true for items with all required fields', () => {
    const items = [
      makeItem({ name: 'Blue Shirt', category: 'Tops', color: 'Blue' }),
      makeItem({ name: 'Black Jeans', category: 'Bottoms', color: 'Black' }),
    ];

    const result = validateOutfitItems(items);

    expect(result.valid).toBe(true);
    expect(result).toHaveProperty('items');
    if (result.valid) {
      expect(result.items).toHaveLength(2);
    }
  });

  it('returns valid: false with invalidItems when required fields are missing', () => {
    const items = [
      makeItem({ name: 'Good Item', category: 'Tops', color: 'Red' }),
      { name: 'No Category', category: '', color: 'Blue' } as import('@/lib/utils/outfit-prompt-builder').OutfitPromptItem,
      { name: 'No Color', category: 'Bottoms', color: '' } as import('@/lib/utils/outfit-prompt-builder').OutfitPromptItem,
    ];

    const result = validateOutfitItems(items);

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.invalidItems).toContain('No Category');
      expect(result.invalidItems).toContain('No Color');
      expect(result.invalidItems).not.toContain('Good Item');
    }
  });
});
