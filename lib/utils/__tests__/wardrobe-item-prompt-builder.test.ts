import { describe, it, expect } from 'vitest';
import { buildWardrobeItemPrompt, type WardrobeItemPromptInput } from '../wardrobe-item-prompt-builder';

describe('buildWardrobeItemPrompt', () => {
  it('builds prompt with all fields provided', () => {
    const item: WardrobeItemPromptInput = {
      name: 'Blazer',
      category: 'Outerwear',
      color: 'navy',
      brand: 'J.Crew',
      material: 'wool blend',
    };

    const prompt = buildWardrobeItemPrompt(item);

    expect(prompt).toContain('navy wool blend Blazer');
    expect(prompt).toContain('Brand provided: **J.Crew**');
    expect(prompt).toContain('Garment Requirements');
    expect(prompt).toContain('Background Requirements');
    expect(prompt).toContain('Style Requirements');
    expect(prompt).toContain('Brand Handling');
    expect(prompt).toContain('Output Specifications');
  });

  it('builds prompt with only required fields (category + color)', () => {
    const item: WardrobeItemPromptInput = {
      name: 'T-Shirt',
      category: 'Tops',
      color: 'white',
    };

    const prompt = buildWardrobeItemPrompt(item);

    // Should use material from SUBCATEGORY_MATERIAL_MAP for T-Shirt
    expect(prompt).toContain('white cotton jersey T-Shirt');
    expect(prompt).toContain('Brand provided: **None**');
  });

  it('uses material map when no material provided', () => {
    const item: WardrobeItemPromptInput = {
      name: 'Jeans',
      category: 'Bottoms',
      color: 'blue',
    };

    const prompt = buildWardrobeItemPrompt(item);

    expect(prompt).toContain('blue denim Jeans');
  });

  it('uses provided material over default material map', () => {
    const item: WardrobeItemPromptInput = {
      name: 'Jeans',
      category: 'Bottoms',
      color: 'black',
      material: 'stretch denim',
    };

    const prompt = buildWardrobeItemPrompt(item);

    expect(prompt).toContain('black stretch denim Jeans');
  });

  it('falls back to "fabric" for unknown subcategories', () => {
    const item: WardrobeItemPromptInput = {
      name: 'Custom Item',
      category: 'Accessories',
      color: 'red',
    };

    const prompt = buildWardrobeItemPrompt(item);

    expect(prompt).toContain('red fabric Custom Item');
  });

  it('handles missing brand gracefully', () => {
    const item: WardrobeItemPromptInput = {
      name: 'Sneakers',
      category: 'Shoes',
      color: 'white',
      brand: '',
    };

    const prompt = buildWardrobeItemPrompt(item);

    expect(prompt).toContain('Brand provided: **None**');
  });

  it('handles different category types - tops', () => {
    const prompt = buildWardrobeItemPrompt({
      name: 'Polo',
      category: 'Tops',
      color: 'green',
    });

    expect(prompt).toContain('green cotton pique Polo');
  });

  it('handles different category types - shoes', () => {
    const prompt = buildWardrobeItemPrompt({
      name: 'Loafers',
      category: 'Shoes',
      color: 'brown',
    });

    expect(prompt).toContain('brown leather Loafers');
  });

  it('handles different category types - accessories', () => {
    const prompt = buildWardrobeItemPrompt({
      name: 'Watch',
      category: 'Accessories',
      color: 'silver',
    });

    expect(prompt).toContain('silver stainless steel Watch');
  });

  it('trims whitespace from inputs', () => {
    const item: WardrobeItemPromptInput = {
      name: ' Blazer ',
      category: 'Outerwear',
      color: ' navy ',
      brand: ' Brooks Brothers ',
      material: ' cashmere ',
    };

    const prompt = buildWardrobeItemPrompt(item);

    expect(prompt).toContain('navy cashmere Blazer');
    expect(prompt).toContain('Brand provided: **Brooks Brothers**');
  });
});
