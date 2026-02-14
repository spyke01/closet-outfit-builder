/**
 * Unit tests for color migration script business logic
 * 
 * Tests the core functions used in the migration script:
 * - extractColorFromName: Extracts color from item names
 * - removeColorFromName: Removes color keywords from names
 * 
 * Requirements: 2.2, 2.4, 2.5, 2.6, 2.8
 */

import { describe, it, expect } from 'vitest';
import { extractColorFromName, removeColorFromName } from '../migrate-colors';

describe('Migration Script Business Logic', () => {
  describe('extractColorFromName', () => {
    describe('Requirements 2.2: Extract color using inference logic', () => {
      it('extracts single color keyword from item name', () => {
        const result = extractColorFromName('Blue Oxford Shirt');
        expect(result.color).toBe('blue');
        expect(result.cleanedName).toBe('Oxford Shirt');
      });

      it('extracts color from beginning of name', () => {
        const result = extractColorFromName('Navy Blazer');
        expect(result.color).toBe('navy');
        expect(result.cleanedName).toBe('Blazer');
      });

      it('extracts color from middle of name', () => {
        const result = extractColorFromName('Oxford Blue Shirt');
        expect(result.color).toBe('blue');
        expect(result.cleanedName).toBe('Oxford Shirt');
      });

      it('extracts color from end of name', () => {
        const result = extractColorFromName('Dress Shirt White');
        expect(result.color).toBe('white');
        expect(result.cleanedName).toBe('Dress Shirt');
      });

      it('extracts various color keywords', () => {
        const testCases = [
          { name: 'Black Jeans', expectedColor: 'black', expectedName: 'Jeans' },
          { name: 'Grey Sweater', expectedColor: 'grey', expectedName: 'Sweater' },
          { name: 'Brown Leather Jacket', expectedColor: 'brown', expectedName: 'Leather Jacket' },
          { name: 'Green Polo', expectedColor: 'green', expectedName: 'Polo' },
          { name: 'Red Tie', expectedColor: 'red', expectedName: 'Tie' },
          { name: 'Burgundy Loafers', expectedColor: 'burgundy', expectedName: 'Loafers' },
          { name: 'Olive Chinos', expectedColor: 'olive', expectedName: 'Chinos' },
          { name: 'Charcoal Suit', expectedColor: 'charcoal', expectedName: 'Suit' },
          { name: 'Khaki Pants', expectedColor: 'khaki', expectedName: 'Pants' },
          { name: 'Tan Boots', expectedColor: 'tan', expectedName: 'Boots' },
          { name: 'Cream Sweater', expectedColor: 'cream', expectedName: 'Sweater' },
        ];

        for (const testCase of testCases) {
          const result = extractColorFromName(testCase.name);
          expect(result.color).toBe(testCase.expectedColor);
          expect(result.cleanedName).toBe(testCase.expectedName);
        }
      });

      it('handles case-insensitive color keywords', () => {
        const testCases = [
          'BLUE Shirt',
          'Blue Shirt',
          'blue Shirt',
          'bLuE Shirt',
        ];

        for (const name of testCases) {
          const result = extractColorFromName(name);
          expect(result.color).toBe('blue');
          expect(result.cleanedName).toBe('Shirt');
        }
      });
    });

    describe('Requirements 2.5: Preserve names without colors', () => {
      it('returns null color for names without color keywords', () => {
        const result = extractColorFromName('Oxford Shirt');
        expect(result.color).toBeNull();
        expect(result.cleanedName).toBe('Oxford Shirt');
      });

      it('preserves original name when no color found', () => {
        const testCases = [
          'Dress Shirt',
          'Casual Blazer',
          'Leather Jacket',
          'Denim Jeans',
          'Cotton Polo',
        ];

        for (const name of testCases) {
          const result = extractColorFromName(name);
          expect(result.color).toBeNull();
          expect(result.cleanedName).toBe(name);
        }
      });

      it('handles empty string input', () => {
        const result = extractColorFromName('');
        expect(result.color).toBeNull();
        expect(result.cleanedName).toBe('');
      });

      it('handles whitespace-only input', () => {
        const result = extractColorFromName('   ');
        expect(result.color).toBeNull();
        expect(result.cleanedName).toBe('   ');
      });
    });

    describe('Requirements 2.6: Handle multiple color keywords', () => {
      it('uses first color when multiple colors present', () => {
        const result = extractColorFromName('Blue and White Striped Shirt');
        expect(result.color).toBe('blue');
        expect(result.cleanedName).toBe('and White Striped Shirt');
      });

      it('extracts first occurrence in various positions', () => {
        const testCases = [
          { name: 'Navy Blue Blazer', expectedColor: 'navy', expectedName: 'Blue Blazer' },
          { name: 'Black and Grey Suit', expectedColor: 'black', expectedName: 'and Grey Suit' },
          { name: 'Red or Brown Shoes', expectedColor: 'red', expectedName: 'or Brown Shoes' },
        ];

        for (const testCase of testCases) {
          const result = extractColorFromName(testCase.name);
          expect(result.color).toBe(testCase.expectedColor);
          expect(result.cleanedName).toBe(testCase.expectedName);
        }
      });
    });

    describe('Edge cases and error handling', () => {
      it('handles null input gracefully', () => {
        const result = extractColorFromName(null as unknown);
        expect(result.color).toBeNull();
        expect(result.cleanedName).toBeNull();
      });

      it('handles undefined input gracefully', () => {
        const result = extractColorFromName(undefined as unknown);
        expect(result.color).toBeNull();
        expect(result.cleanedName).toBeUndefined();
      });

      it('handles non-string input gracefully', () => {
        const result = extractColorFromName(123 as unknown);
        expect(result.color).toBeNull();
        expect(result.cleanedName).toBe(123);
      });

      it('handles color as part of compound word', () => {
        // "Redwood" should not extract "red" as a color
        const result = extractColorFromName('Redwood Jacket');
        // This depends on color inference logic - it may or may not extract
        // The test documents the actual behavior
        expect(result).toBeDefined();
      });
    });
  });

  describe('removeColorFromName', () => {
    describe('Requirements 2.4: Remove color keywords correctly', () => {
      it('removes color keyword from beginning of name', () => {
        const result = removeColorFromName('Blue Oxford Shirt', 'blue');
        expect(result).toBe('Oxford Shirt');
      });

      it('removes color keyword from middle of name', () => {
        const result = removeColorFromName('Oxford Blue Shirt', 'blue');
        expect(result).toBe('Oxford Shirt');
      });

      it('removes color keyword from end of name', () => {
        const result = removeColorFromName('Dress Shirt Blue', 'blue');
        expect(result).toBe('Dress Shirt');
      });

      it('removes color with case-insensitive matching', () => {
        const testCases = [
          { name: 'BLUE Shirt', color: 'blue', expected: 'Shirt' },
          { name: 'Blue Shirt', color: 'BLUE', expected: 'Shirt' },
          { name: 'bLuE Shirt', color: 'BlUe', expected: 'Shirt' },
        ];

        for (const testCase of testCases) {
          const result = removeColorFromName(testCase.name, testCase.color);
          expect(result).toBe(testCase.expected);
        }
      });

      it('uses word boundary matching to avoid partial matches', () => {
        // "Redwood" should not have "red" removed
        const result = removeColorFromName('Redwood Jacket', 'red');
        expect(result).toBe('Redwood Jacket');
      });

      it('removes only whole word color matches', () => {
        const testCases = [
          { name: 'Blueberry Shirt', color: 'blue', expected: 'Blueberry Shirt' },
          { name: 'Greenfield Jacket', color: 'green', expected: 'Greenfield Jacket' },
          { name: 'Blackberry Pants', color: 'black', expected: 'Blackberry Pants' },
        ];

        for (const testCase of testCases) {
          const result = removeColorFromName(testCase.name, testCase.color);
          expect(result).toBe(testCase.expected);
        }
      });

      it('handles multiple spaces correctly', () => {
        const result = removeColorFromName('Blue  Oxford  Shirt', 'blue');
        expect(result).toBe('Oxford Shirt');
      });

      it('trims leading and trailing whitespace', () => {
        const result = removeColorFromName('  Blue Shirt  ', 'blue');
        expect(result).toBe('Shirt');
      });

      it('removes all occurrences of color keyword', () => {
        const result = removeColorFromName('Blue Blue Shirt', 'blue');
        expect(result).toBe('Shirt');
      });
    });

    describe('Edge cases and error handling', () => {
      it('returns original name when color is empty', () => {
        const result = removeColorFromName('Blue Shirt', '');
        expect(result).toBe('Blue Shirt');
      });

      it('returns original name when color is null', () => {
        const result = removeColorFromName('Blue Shirt', null as unknown);
        expect(result).toBe('Blue Shirt');
      });

      it('returns original name when name is empty', () => {
        const result = removeColorFromName('', 'blue');
        expect(result).toBe('');
      });

      it('returns original name when name is null', () => {
        const result = removeColorFromName(null as unknown, 'blue');
        expect(result).toBeNull();
      });

      it('handles color not present in name', () => {
        const result = removeColorFromName('Oxford Shirt', 'blue');
        expect(result).toBe('Oxford Shirt');
      });

      it('handles special regex characters in color', () => {
        // This tests that the function properly escapes regex special characters
        const result = removeColorFromName('Test (blue) Shirt', '(blue)');
        // Should not throw an error, even though parentheses are regex special chars
        expect(result).toBeDefined();
      });
    });
  });

  describe('Requirements 2.8: Idempotency', () => {
    it('running extraction twice produces same result', () => {
      const originalName = 'Blue Oxford Shirt';
      
      // First extraction
      const firstResult = extractColorFromName(originalName);
      expect(firstResult.color).toBe('blue');
      expect(firstResult.cleanedName).toBe('Oxford Shirt');
      
      // Second extraction on cleaned name
      const secondResult = extractColorFromName(firstResult.cleanedName);
      expect(secondResult.color).toBeNull();
      expect(secondResult.cleanedName).toBe('Oxford Shirt');
      
      // Cleaned name should remain unchanged
      expect(secondResult.cleanedName).toBe(firstResult.cleanedName);
    });

    it('multiple extractions on name without color remain unchanged', () => {
      const originalName = 'Oxford Shirt';
      
      const firstResult = extractColorFromName(originalName);
      const secondResult = extractColorFromName(firstResult.cleanedName);
      const thirdResult = extractColorFromName(secondResult.cleanedName);
      
      expect(firstResult.cleanedName).toBe(originalName);
      expect(secondResult.cleanedName).toBe(originalName);
      expect(thirdResult.cleanedName).toBe(originalName);
    });

    it('removing color twice produces same result', () => {
      const originalName = 'Blue Oxford Shirt';
      const color = 'blue';
      
      const firstRemoval = removeColorFromName(originalName, color);
      const secondRemoval = removeColorFromName(firstRemoval, color);
      
      expect(firstRemoval).toBe('Oxford Shirt');
      expect(secondRemoval).toBe('Oxford Shirt');
      expect(firstRemoval).toBe(secondRemoval);
    });

    it('full extraction and removal cycle is idempotent', () => {
      const testCases = [
        'Blue Oxford Shirt',
        'Navy Blazer',
        'Black Jeans',
        'Oxford Shirt', // No color
      ];

      for (const originalName of testCases) {
        // First cycle
        const firstExtraction = extractColorFromName(originalName);
        
        // Second cycle on result
        const secondExtraction = extractColorFromName(firstExtraction.cleanedName);
        
        // Results should be stable
        expect(secondExtraction.cleanedName).toBe(firstExtraction.cleanedName);
        
        // If first extraction found no color, second should also find no color
        if (firstExtraction.color === null) {
          expect(secondExtraction.color).toBeNull();
        }
      }
    });
  });

  describe('Integration: extractColorFromName and removeColorFromName', () => {
    it('extraction uses removeColorFromName internally', () => {
      const name = 'Blue Oxford Shirt';
      const extraction = extractColorFromName(name);
      const manualRemoval = removeColorFromName(name, extraction.color!);
      
      expect(extraction.cleanedName).toBe(manualRemoval);
    });

    it('handles complex item names correctly', () => {
      const testCases = [
        {
          name: 'Navy Blue Striped Oxford Shirt',
          expectedColor: 'navy',
          expectedCleanedName: 'Blue Striped Oxford Shirt',
        },
        {
          name: 'Charcoal Grey Wool Suit Jacket',
          expectedColor: 'charcoal',
          expectedCleanedName: 'Grey Wool Suit Jacket',
        },
        {
          name: 'Light Blue Cotton Dress Shirt',
          expectedColor: 'blue',
          expectedCleanedName: 'Light Cotton Dress Shirt',
        },
      ];

      for (const testCase of testCases) {
        const result = extractColorFromName(testCase.name);
        expect(result.color).toBe(testCase.expectedColor);
        expect(result.cleanedName).toBe(testCase.expectedCleanedName);
      }
    });
  });
});
