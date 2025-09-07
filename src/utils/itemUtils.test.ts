import { describe, it, expect } from 'vitest';
import { formatItemName } from './itemUtils';
import { WardrobeItem } from '../types';

describe('itemUtils', () => {
  describe('formatItemName', () => {
    it('should return item name when brand display is disabled', () => {
      const item: WardrobeItem = {
        id: 'test-1',
        name: 'OCBD (White)',
        category: 'Shirt',
        formalityScore: 7,
        brand: 'Brooks Brothers'
      };

      expect(formatItemName(item, false)).toBe('OCBD (White)');
    });

    it('should return brand + item name when brand display is enabled and brand exists', () => {
      const item: WardrobeItem = {
        id: 'test-1',
        name: 'Submariner (Black)',
        category: 'Watch',
        formalityScore: 8,
        brand: 'Rolex'
      };

      expect(formatItemName(item, true)).toBe('Rolex Submariner (Black)');
    });

    it('should return just item name when brand display is enabled but no brand exists', () => {
      const item: WardrobeItem = {
        id: 'test-1',
        name: 'OCBD (White)',
        category: 'Shirt',
        formalityScore: 7
      };

      expect(formatItemName(item, true)).toBe('OCBD (White)');
    });

    it('should return just item name when brand is empty string', () => {
      const item: WardrobeItem = {
        id: 'test-1',
        name: 'OCBD (White)',
        category: 'Shirt',
        formalityScore: 7,
        brand: ''
      };

      expect(formatItemName(item, true)).toBe('OCBD (White)');
    });

    it('should return just item name when brand is whitespace only', () => {
      const item: WardrobeItem = {
        id: 'test-1',
        name: 'OCBD (White)',
        category: 'Shirt',
        formalityScore: 7,
        brand: '   '
      };

      expect(formatItemName(item, true)).toBe('OCBD (White)');
    });

    it('should handle null or undefined item gracefully', () => {
      expect(formatItemName(null as any, true)).toBe('');
      expect(formatItemName(undefined as any, true)).toBe('');
    });

    it('should handle item with no name gracefully', () => {
      const item: WardrobeItem = {
        id: 'test-1',
        name: '',
        category: 'Shirt',
        formalityScore: 7,
        brand: 'Test Brand'
      };

      expect(formatItemName(item, true)).toBe('');
    });
  });
});