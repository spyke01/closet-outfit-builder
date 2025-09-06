import { describe, it, expect } from 'vitest';
import { migrateWardrobeData, validateMigratedItem, validateMigratedData, standardizeItemName, formatItemName } from './migration';
import type { WardrobeItem } from '../types';

describe('migrateWardrobeData', () => {
  it('should add brand field to all items with undefined default', () => {
    const legacyData = {
      items: [
        {
          id: 'test-shirt',
          name: 'Test Shirt',
          category: 'Shirt' as const,
          formalityScore: 5
        }
      ]
    };

    const result = migrateWardrobeData(legacyData);
    
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toHaveProperty('brand', undefined);
  });

  it('should migrate T-shirt items from Shirt to Undershirt category', () => {
    const legacyData = {
      items: [
        {
          id: 'white-tee',
          name: 'White Tee',
          category: 'Shirt' as const,
          formalityScore: 2
        },
        {
          id: 'navy-tee',
          name: 'Navy Tee',
          category: 'Shirt' as const,
          formalityScore: 2
        },
        {
          id: 'blue-ocbd',
          name: 'Blue OCBD',
          category: 'Shirt' as const,
          formalityScore: 7
        }
      ]
    };

    const result = migrateWardrobeData(legacyData);
    
    expect(result.items).toHaveLength(3);
    
    // T-shirts should be migrated to Undershirt
    const whiteTee = result.items.find(item => item.id === 'white-tee');
    const navyTee = result.items.find(item => item.id === 'navy-tee');
    expect(whiteTee?.category).toBe('Undershirt');
    expect(navyTee?.category).toBe('Undershirt');
    
    // Regular shirts should remain in Shirt category
    const blueOcbd = result.items.find(item => item.id === 'blue-ocbd');
    expect(blueOcbd?.category).toBe('Shirt');
  });

  it('should handle various T-shirt name formats', () => {
    const legacyData = {
      items: [
        { id: '1', name: 'White Tee', category: 'Shirt' as const },
        { id: '2', name: 'Basic T-Shirt', category: 'Shirt' as const },
        { id: '3', name: 'Cotton Tshirt', category: 'Shirt' as const },
        { id: '4', name: 'Crew Neck Tee', category: 'Shirt' as const },
        { id: '5', name: 'V-Neck Tee', category: 'Shirt' as const },
        { id: '6', name: 'Polo Shirt', category: 'Shirt' as const }, // Should NOT migrate
        { id: '7', name: 'Button Down', category: 'Shirt' as const } // Should NOT migrate
      ]
    };

    const result = migrateWardrobeData(legacyData);
    
    // Items 1-5 should be migrated to Undershirt
    expect(result.items.find(item => item.id === '1')?.category).toBe('Undershirt');
    expect(result.items.find(item => item.id === '2')?.category).toBe('Undershirt');
    expect(result.items.find(item => item.id === '3')?.category).toBe('Undershirt');
    expect(result.items.find(item => item.id === '4')?.category).toBe('Undershirt');
    expect(result.items.find(item => item.id === '5')?.category).toBe('Undershirt');
    
    // Items 6-7 should remain as Shirt
    expect(result.items.find(item => item.id === '6')?.category).toBe('Shirt');
    expect(result.items.find(item => item.id === '7')?.category).toBe('Shirt');
  });

  it('should preserve all existing item properties', () => {
    const legacyData = {
      items: [
        {
          id: 'test-item',
          name: 'Test Item',
          category: 'Pants' as const,
          color: 'blue',
          material: 'cotton',
          capsuleTags: ['Refined'],
          season: ['Summer'],
          formality: 'Neutral',
          formalityScore: 6,
          image: 'test.jpg',
          active: true
        }
      ]
    };

    const result = migrateWardrobeData(legacyData);
    const item = result.items[0];
    
    expect(item.id).toBe('test-item');
    expect(item.name).toBe('Test Item');
    expect(item.category).toBe('Pants');
    expect(item.color).toBe('blue');
    expect(item.material).toBe('cotton');
    expect(item.capsuleTags).toEqual(['Refined']);
    expect(item.season).toEqual(['Summer']);
    expect(item.formality).toBe('Neutral');
    expect(item.formalityScore).toBe(6);
    expect(item.image).toBe('test.jpg');
    expect(item.active).toBe(true);
    expect(item.brand).toBeUndefined();
  });

  it('should throw error for invalid legacy data', () => {
    expect(() => migrateWardrobeData(null as any)).toThrow('Invalid legacy data');
    expect(() => migrateWardrobeData({} as any)).toThrow('Invalid legacy data');
    expect(() => migrateWardrobeData({ items: null } as any)).toThrow('Invalid legacy data');
  });

  it('should handle empty items array', () => {
    const legacyData = { items: [] };
    const result = migrateWardrobeData(legacyData);
    
    expect(result.items).toHaveLength(0);
  });
});

describe('validateMigratedItem', () => {
  it('should validate correct item structure', () => {
    const validItem: WardrobeItem = {
      id: 'test-id',
      name: 'Test Item',
      category: 'Shirt',
      brand: undefined
    };

    expect(validateMigratedItem(validItem)).toBe(true);
  });

  it('should validate item with all optional fields', () => {
    const validItem: WardrobeItem = {
      id: 'test-id',
      name: 'Test Item',
      category: 'Shirt',
      brand: 'Test Brand',
      color: 'blue',
      material: 'cotton',
      capsuleTags: ['Refined'],
      season: ['Summer'],
      formality: 'Neutral',
      formalityScore: 6,
      image: 'test.jpg',
      active: true
    };

    expect(validateMigratedItem(validItem)).toBe(true);
  });

  it('should reject items with missing required fields', () => {
    expect(validateMigratedItem({})).toBe(false);
    expect(validateMigratedItem({ id: 'test' })).toBe(false);
    expect(validateMigratedItem({ id: 'test', name: 'Test' })).toBe(false);
  });

  it('should reject items with invalid category', () => {
    const invalidItem = {
      id: 'test-id',
      name: 'Test Item',
      category: 'InvalidCategory'
    };

    expect(validateMigratedItem(invalidItem)).toBe(false);
  });

  it('should reject items with wrong field types', () => {
    const invalidItems = [
      { id: 123, name: 'Test', category: 'Shirt' }, // id should be string
      { id: 'test', name: 123, category: 'Shirt' }, // name should be string
      { id: 'test', name: 'Test', category: 'Shirt', brand: 123 }, // brand should be string
      { id: 'test', name: 'Test', category: 'Shirt', formalityScore: 'high' } // formalityScore should be number
    ];

    invalidItems.forEach(item => {
      expect(validateMigratedItem(item)).toBe(false);
    });
  });
});

describe('standardizeItemName', () => {
  it('should convert "Color Item" format to "Item (Color)" format', () => {
    expect(standardizeItemName('White OCBD')).toBe('OCBD (White)');
    expect(standardizeItemName('Navy Tee')).toBe('Tee (Navy)');
    expect(standardizeItemName('Black Chinos')).toBe('Chinos (Black)');
    expect(standardizeItemName('Brown Belt')).toBe('Belt (Brown)');
  });

  it('should handle multi-word colors', () => {
    expect(standardizeItemName('Light Grey Chinos')).toBe('Chinos (Light Grey)');
    expect(standardizeItemName('Dark Brown Loafers')).toBe('Loafers (Dark Brown)');
    expect(standardizeItemName('Deep Navy Shirt')).toBe('Shirt (Deep Navy)');
    expect(standardizeItemName('Light Tan Shoes')).toBe('Shoes (Light Tan)');
  });

  it('should handle colors at the end of item names', () => {
    expect(standardizeItemName('Suede Loafers Dark Brown')).toBe('Suede Loafers (Dark Brown)');
    expect(standardizeItemName('Leather Sneakers White')).toBe('Leather Sneakers (White)');
    expect(standardizeItemName('Wool Trousers Charcoal')).toBe('Wool Trousers (Charcoal)');
  });

  it('should preserve already correct format', () => {
    expect(standardizeItemName('OCBD (White)')).toBe('OCBD (White)');
    expect(standardizeItemName('Chinos (Navy)')).toBe('Chinos (Navy)');
    expect(standardizeItemName('Loafers (Dark Brown)')).toBe('Loafers (Dark Brown)');
  });

  it('should handle complex color combinations', () => {
    expect(standardizeItemName('White/Navy Striped Linen')).toBe('Striped Linen (White/Navy)');
    expect(standardizeItemName('Striped Linen (White/Navy)')).toBe('Striped Linen (White/Navy)');
  });

  it('should handle items without colors', () => {
    expect(standardizeItemName('Moto Jacket')).toBe('Moto Jacket');
    expect(standardizeItemName('Braided Belt')).toBe('Braided Belt');
    expect(standardizeItemName('Apache Boots')).toBe('Apache Boots');
  });

  it('should handle edge cases', () => {
    expect(standardizeItemName('')).toBe('');
    expect(standardizeItemName('   ')).toBe('');
    expect(standardizeItemName('SingleWord')).toBe('SingleWord');
  });

  it('should handle various color variations', () => {
    expect(standardizeItemName('Grey Henley')).toBe('Henley (Grey)');
    expect(standardizeItemName('Gray Henley')).toBe('Henley (Gray)');
    expect(standardizeItemName('Olive Shacket')).toBe('Shacket (Olive)');
    expect(standardizeItemName('Beige Shacket')).toBe('Shacket (Beige)');
    expect(standardizeItemName('Cream Tee')).toBe('Tee (Cream)');
  });

  it('should handle brand names that might contain colors', () => {
    // These should not be treated as colors since they're part of brand/item names
    expect(standardizeItemName('Ralph Lauren Featherweight Blue')).toBe('Ralph Lauren Featherweight (Blue)');
    expect(standardizeItemName('Panerai Luminor Brown Strap')).toBe('Panerai Luminor Brown Strap'); // No simple color pattern
  });

  it('should be case insensitive for color detection', () => {
    expect(standardizeItemName('WHITE ocbd')).toBe('ocbd (WHITE)');
    expect(standardizeItemName('NAVY tee')).toBe('tee (NAVY)');
    expect(standardizeItemName('Dark BROWN loafers')).toBe('loafers (Dark BROWN)');
  });
});

describe('migrateWardrobeData with name standardization', () => {
  it('should standardize names during migration', () => {
    const legacyData = {
      items: [
        {
          id: 'white-ocbd',
          name: 'White OCBD',
          category: 'Shirt' as const,
          formalityScore: 7
        },
        {
          id: 'navy-tee',
          name: 'Navy Tee',
          category: 'Shirt' as const,
          formalityScore: 2
        }
      ]
    };

    const result = migrateWardrobeData(legacyData);
    
    expect(result.items).toHaveLength(2);
    
    const whiteOcbd = result.items.find(item => item.id === 'white-ocbd');
    const navyTee = result.items.find(item => item.id === 'navy-tee');
    
    expect(whiteOcbd?.name).toBe('OCBD (White)');
    expect(navyTee?.name).toBe('Tee (Navy)');
    expect(navyTee?.category).toBe('Undershirt'); // Should also be migrated to undershirt
  });

  it('should not change names that are already in correct format', () => {
    const legacyData = {
      items: [
        {
          id: 'test-item',
          name: 'OCBD (White)',
          category: 'Shirt' as const,
          formalityScore: 7
        }
      ]
    };

    const result = migrateWardrobeData(legacyData);
    
    expect(result.items[0].name).toBe('OCBD (White)');
  });
});

describe('formatItemName', () => {
  it('should return standard name when showBrand is false', () => {
    const item: WardrobeItem = {
      id: 'test-id',
      name: 'OCBD (White)',
      category: 'Shirt',
      brand: 'Ralph Lauren'
    };

    expect(formatItemName(item, false)).toBe('OCBD (White)');
  });

  it('should return standard name when item has no brand', () => {
    const item: WardrobeItem = {
      id: 'test-id',
      name: 'OCBD (White)',
      category: 'Shirt',
      brand: undefined
    };

    expect(formatItemName(item, true)).toBe('OCBD (White)');
  });

  it('should return standard name when brand is empty string', () => {
    const item: WardrobeItem = {
      id: 'test-id',
      name: 'OCBD (White)',
      category: 'Shirt',
      brand: ''
    };

    expect(formatItemName(item, true)).toBe('OCBD (White)');
  });

  it('should return standard name when brand is whitespace only', () => {
    const item: WardrobeItem = {
      id: 'test-id',
      name: 'OCBD (White)',
      category: 'Shirt',
      brand: '   '
    };

    expect(formatItemName(item, true)).toBe('OCBD (White)');
  });

  it('should format with brand when showBrand is true and item has brand', () => {
    const item: WardrobeItem = {
      id: 'test-id',
      name: 'OCBD (White)',
      category: 'Shirt',
      brand: 'Ralph Lauren'
    };

    expect(formatItemName(item, true)).toBe('Ralph Lauren OCBD (White)');
  });

  it('should handle items with brand but no color in parentheses', () => {
    const item: WardrobeItem = {
      id: 'test-id',
      name: 'Moto Jacket',
      category: 'Jacket/Overshirt',
      brand: 'Schott'
    };

    expect(formatItemName(item, true)).toBe('Schott Moto Jacket');
  });

  it('should handle various item name formats with brand', () => {
    const items = [
      {
        id: '1',
        name: 'Tee (Navy)',
        category: 'Undershirt' as const,
        brand: 'Uniqlo'
      },
      {
        id: '2',
        name: 'Chinos (Khaki)',
        category: 'Pants' as const,
        brand: 'J.Crew'
      },
      {
        id: '3',
        name: 'Loafers (Dark Brown)',
        category: 'Shoes' as const,
        brand: 'Alden'
      }
    ];

    expect(formatItemName(items[0], true)).toBe('Uniqlo Tee (Navy)');
    expect(formatItemName(items[1], true)).toBe('J.Crew Chinos (Khaki)');
    expect(formatItemName(items[2], true)).toBe('Alden Loafers (Dark Brown)');
  });

  it('should handle edge cases', () => {
    // Empty item
    expect(formatItemName(null as any, true)).toBe('');
    expect(formatItemName(undefined as any, true)).toBe('');
    
    // Item with no name
    const itemNoName: WardrobeItem = {
      id: 'test-id',
      name: '',
      category: 'Shirt',
      brand: 'Test Brand'
    };
    expect(formatItemName(itemNoName, true)).toBe('');
  });

  it('should handle complex item names with brand', () => {
    const item: WardrobeItem = {
      id: 'test-id',
      name: 'Striped Linen (White/Navy)',
      category: 'Shirt',
      brand: 'Everlane'
    };

    expect(formatItemName(item, true)).toBe('Everlane Striped Linen (White/Navy)');
  });

  it('should preserve brand case and spacing', () => {
    const item: WardrobeItem = {
      id: 'test-id',
      name: 'OCBD (White)',
      category: 'Shirt',
      brand: 'Ralph Lauren'
    };

    expect(formatItemName(item, true)).toBe('Ralph Lauren OCBD (White)');
  });
});

describe('validateMigratedData', () => {
  it('should validate correct data structure', () => {
    const validData = {
      items: [
        {
          id: 'test-id',
          name: 'Test Item',
          category: 'Shirt',
          brand: undefined
        }
      ]
    };

    expect(validateMigratedData(validData)).toBe(true);
  });

  it('should reject invalid data structures', () => {
    expect(validateMigratedData(null)).toBe(false);
    expect(validateMigratedData({})).toBe(false);
    expect(validateMigratedData({ items: null })).toBe(false);
    expect(validateMigratedData({ items: [{ invalid: 'item' }] })).toBe(false);
  });
});