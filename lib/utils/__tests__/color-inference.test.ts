import { describe, it, expect } from 'vitest';
import { inferColor, isNeutralColor, getSupportedColorKeywords } from '../color-inference';

describe('inferColor', () => {
  describe('basic color keyword matching', () => {
    it('infers blue from "Blue Oxford Shirt"', () => {
      expect(inferColor('Blue Oxford Shirt')).toBe('blue');
    });

    it('infers black from "Black Leather Shoes"', () => {
      expect(inferColor('Black Leather Shoes')).toBe('black');
    });

    it('infers grey from "Grey Wool Pants"', () => {
      expect(inferColor('Grey Wool Pants')).toBe('grey');
    });

    it('infers gray from "Gray Chinos"', () => {
      expect(inferColor('Gray Chinos')).toBe('grey'); // Consolidated to 'grey'
    });

    it('infers navy from "Navy Blazer"', () => {
      expect(inferColor('Navy Blazer')).toBe('navy');
    });

    it('infers white from "White Dress Shirt"', () => {
      expect(inferColor('White Dress Shirt')).toBe('white');
    });

    it('infers cream from "Cream Linen Shirt"', () => {
      expect(inferColor('Cream Linen Shirt')).toBe('cream');
    });

    it('infers khaki from "Khaki Chinos"', () => {
      expect(inferColor('Khaki Chinos')).toBe('khaki');
    });

    it('infers brown from "Brown Leather Belt"', () => {
      expect(inferColor('Brown Leather Belt')).toBe('brown');
    });

    it('infers tan from "Tan Suede Loafers"', () => {
      expect(inferColor('Tan Suede Loafers')).toBe('tan');
    });

    it('infers green from "Green Polo Shirt"', () => {
      expect(inferColor('Green Polo Shirt')).toBe('green');
    });

    it('infers red from "Red Sweater"', () => {
      expect(inferColor('Red Sweater')).toBe('red');
    });

    it('infers burgundy from "Burgundy Tie"', () => {
      expect(inferColor('Burgundy Tie')).toBe('burgundy');
    });

    it('infers olive from "Olive Chinos"', () => {
      expect(inferColor('Olive Chinos')).toBe('olive');
    });

    it('infers charcoal from "Charcoal Suit"', () => {
      expect(inferColor('Charcoal Suit')).toBe('charcoal');
    });
  });

  describe('case insensitivity', () => {
    it('handles uppercase color names', () => {
      expect(inferColor('NAVY Blazer')).toBe('navy');
      expect(inferColor('BLACK Shoes')).toBe('black');
      expect(inferColor('WHITE Shirt')).toBe('white');
    });

    it('handles mixed case color names', () => {
      expect(inferColor('Blue Oxford Shirt')).toBe('blue');
      expect(inferColor('bLuE Oxford Shirt')).toBe('blue');
      expect(inferColor('BLUE Oxford Shirt')).toBe('blue');
    });

    it('handles lowercase color names', () => {
      expect(inferColor('navy blazer')).toBe('navy');
      expect(inferColor('black shoes')).toBe('black');
      expect(inferColor('white shirt')).toBe('white');
    });
  });

  describe('word boundary matching', () => {
    it('matches color at the beginning of the name', () => {
      expect(inferColor('Blue Shirt')).toBe('blue');
    });

    it('matches color in the middle of the name', () => {
      expect(inferColor('Oxford Blue Shirt')).toBe('blue');
    });

    it('matches color at the end of the name', () => {
      expect(inferColor('Shirt Blue')).toBe('blue');
    });

    it('does not match partial words', () => {
      // "greenish" should not match "green"
      expect(inferColor('Greenish Shirt')).toBe('unknown');
      
      // "reddish" should not match "red"
      expect(inferColor('Reddish Pants')).toBe('unknown');
    });
  });

  describe('no color keyword found', () => {
    it('returns unknown for "Casual Shirt"', () => {
      expect(inferColor('Casual Shirt')).toBe('unknown');
    });

    it('returns unknown for "Dress Pants"', () => {
      expect(inferColor('Dress Pants')).toBe('unknown');
    });

    it('returns unknown for "Leather Shoes"', () => {
      expect(inferColor('Leather Shoes')).toBe('unknown');
    });

    it('returns unknown for "Wool Blazer"', () => {
      expect(inferColor('Wool Blazer')).toBe('unknown');
    });
  });

  describe('edge cases', () => {
    it('handles empty string', () => {
      expect(inferColor('')).toBe('unknown');
    });

    it('handles null input', () => {
      expect(inferColor(null as any)).toBe('unknown');
    });

    it('handles undefined input', () => {
      expect(inferColor(undefined as any)).toBe('unknown');
    });

    it('handles non-string input', () => {
      expect(inferColor(123 as any)).toBe('unknown');
      expect(inferColor({} as any)).toBe('unknown');
      expect(inferColor([] as any)).toBe('unknown');
    });

    it('handles string with only whitespace', () => {
      expect(inferColor('   ')).toBe('unknown');
    });

    it('handles string with special characters', () => {
      expect(inferColor('Blue-Grey Shirt')).toBe('blue');
      expect(inferColor('Navy/White Striped Shirt')).toBe('navy');
    });
  });

  describe('multiple color keywords', () => {
    it('returns the first matching color', () => {
      // "Blue and White Striped Shirt" should return 'blue' (first match)
      expect(inferColor('Blue and White Striped Shirt')).toBe('blue');
      
      // "Black and Brown Belt" should return 'black' (first match)
      expect(inferColor('Black and Brown Belt')).toBe('black');
    });
  });

  describe('grey vs gray spelling', () => {
    it('handles both grey and gray spellings', () => {
      expect(inferColor('Grey Pants')).toBe('grey');
      expect(inferColor('Gray Pants')).toBe('grey'); // Consolidated to 'grey'
    });

    it('treats grey and gray as the same color', () => {
      // Both spellings now map to 'grey'
      expect(inferColor('Grey Shirt')).toBe(inferColor('Gray Shirt'));
    });
  });
});

describe('isNeutralColor', () => {
  describe('neutral colors', () => {
    it('identifies black as neutral', () => {
      expect(isNeutralColor('black')).toBe(true);
    });

    it('identifies white as neutral', () => {
      expect(isNeutralColor('white')).toBe(true);
    });

    it('identifies grey as neutral', () => {
      expect(isNeutralColor('grey')).toBe(true);
    });

    it('identifies gray as neutral', () => {
      expect(isNeutralColor('grey')).toBe(true); // 'gray' consolidated to 'grey'
    });

    it('identifies navy as neutral', () => {
      expect(isNeutralColor('navy')).toBe(true);
    });

    it('identifies cream as neutral', () => {
      expect(isNeutralColor('cream')).toBe(true);
    });

    it('identifies khaki as neutral', () => {
      expect(isNeutralColor('khaki')).toBe(true);
    });

    it('identifies brown as neutral', () => {
      expect(isNeutralColor('brown')).toBe(true);
    });

    it('identifies tan as neutral', () => {
      expect(isNeutralColor('tan')).toBe(true);
    });

    it('identifies charcoal as neutral', () => {
      expect(isNeutralColor('charcoal')).toBe(true);
    });

    it('identifies unknown as neutral', () => {
      expect(isNeutralColor('unknown')).toBe(true);
    });
  });

  describe('non-neutral colors', () => {
    it('identifies blue as non-neutral', () => {
      expect(isNeutralColor('blue')).toBe(false);
    });

    it('identifies green as non-neutral', () => {
      expect(isNeutralColor('green')).toBe(false);
    });

    it('identifies red as non-neutral', () => {
      expect(isNeutralColor('red')).toBe(false);
    });

    it('identifies burgundy as non-neutral', () => {
      expect(isNeutralColor('burgundy')).toBe(false);
    });

    it('identifies olive as non-neutral', () => {
      expect(isNeutralColor('olive')).toBe(false);
    });
  });
});

describe('getSupportedColorKeywords', () => {
  it('returns an array of color keywords', () => {
    const keywords = getSupportedColorKeywords();
    expect(Array.isArray(keywords)).toBe(true);
    expect(keywords.length).toBeGreaterThan(0);
  });

  it('includes all expected color keywords', () => {
    const keywords = getSupportedColorKeywords();
    const expectedKeywords = [
      'black', 'white', 'grey', 'gray', 'navy', 'blue',
      'cream', 'khaki', 'brown', 'tan', 'green', 'red',
      'burgundy', 'olive', 'charcoal'
    ];
    
    expectedKeywords.forEach(keyword => {
      expect(keywords).toContain(keyword);
    });
  });

  it('returns exactly 15 keywords', () => {
    const keywords = getSupportedColorKeywords();
    expect(keywords.length).toBe(15);
  });
});
