/**
 * Tests for measurement guide data
 * Validates data structure and completeness
 */

import { describe, it, expect } from 'vitest';
import {
  MEASUREMENT_GUIDES,
  getMeasurementGuide,
  getMeasurementGuidesByGender,
  getMensMeasurementGuides,
  getWomensMeasurementGuides,
  hasMeasurementGuide,
  type MeasurementGuide,
  type MeasurementField
} from '../measurement-guides';

describe('Measurement Guides Data', () => {
  describe('Data Structure', () => {
    it('should have all 16 system categories', () => {
      const guides = Object.keys(MEASUREMENT_GUIDES);
      expect(guides).toHaveLength(16);
    });

    it('should have 8 men\'s categories', () => {
      const mensGuides = getMensMeasurementGuides();
      expect(mensGuides).toHaveLength(8);
    });

    it('should have 8 women\'s categories', () => {
      const womensGuides = getWomensMeasurementGuides();
      expect(womensGuides).toHaveLength(8);
    });

    it('should have valid structure for each guide', () => {
      Object.values(MEASUREMENT_GUIDES).forEach((guide: MeasurementGuide) => {
        expect(guide).toHaveProperty('category_name');
        expect(guide).toHaveProperty('icon');
        expect(guide).toHaveProperty('gender');
        expect(guide).toHaveProperty('supported_formats');
        expect(guide).toHaveProperty('measurement_fields');
        expect(guide).toHaveProperty('size_examples');
        
        expect(typeof guide.category_name).toBe('string');
        expect(typeof guide.icon).toBe('string');
        expect(['men', 'women', 'unisex']).toContain(guide.gender);
        expect(Array.isArray(guide.supported_formats)).toBe(true);
        expect(Array.isArray(guide.measurement_fields)).toBe(true);
        expect(Array.isArray(guide.size_examples)).toBe(true);
      });
    });

    it('should have valid measurement fields', () => {
      Object.values(MEASUREMENT_GUIDES).forEach((guide: MeasurementGuide) => {
        guide.measurement_fields.forEach((field: MeasurementField) => {
          expect(field).toHaveProperty('name');
          expect(field).toHaveProperty('label');
          expect(field).toHaveProperty('description');
          
          expect(typeof field.name).toBe('string');
          expect(typeof field.label).toBe('string');
          expect(typeof field.description).toBe('string');
          expect(field.name.length).toBeGreaterThan(0);
          expect(field.label.length).toBeGreaterThan(0);
          expect(field.description.length).toBeGreaterThan(0);
        });
      });
    });

    it('should have size examples for each category', () => {
      Object.values(MEASUREMENT_GUIDES).forEach((guide: MeasurementGuide) => {
        expect(guide.size_examples.length).toBeGreaterThan(0);
        guide.size_examples.forEach(example => {
          expect(typeof example).toBe('string');
          expect(example.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('Men\'s Categories', () => {
    const expectedMensCategories = [
      'Dress Shirt',
      'Casual Shirt',
      'Suit Jacket',
      'Pants',
      'Jeans',
      'Shoes',
      'Belt',
      'Coat/Jacket'
    ];

    it('should have all expected men\'s categories', () => {
      const mensGuides = getMensMeasurementGuides();
      const categoryNames = mensGuides.map(g => g.category_name);
      
      expectedMensCategories.forEach(category => {
        expect(categoryNames).toContain(category);
      });
    });

    it('should have Dress Shirt with collar and sleeve measurements', () => {
      const guide = getMeasurementGuide('Dress Shirt');
      expect(guide).toBeDefined();
      expect(guide?.gender).toBe('men');
      
      const fieldNames = guide?.measurement_fields.map(f => f.name);
      expect(fieldNames).toContain('collar');
      expect(fieldNames).toContain('sleeve');
    });

    it('should have Suit Jacket with chest and length measurements', () => {
      const guide = getMeasurementGuide('Suit Jacket');
      expect(guide).toBeDefined();
      expect(guide?.gender).toBe('men');
      
      const fieldNames = guide?.measurement_fields.map(f => f.name);
      expect(fieldNames).toContain('chest');
      expect(fieldNames).toContain('length');
    });

    it('should have Pants with waist and inseam measurements', () => {
      const guide = getMeasurementGuide('Pants');
      expect(guide).toBeDefined();
      expect(guide?.gender).toBe('men');
      
      const fieldNames = guide?.measurement_fields.map(f => f.name);
      expect(fieldNames).toContain('waist');
      expect(fieldNames).toContain('inseam');
    });
  });

  describe('Women\'s Categories', () => {
    const expectedWomensCategories = [
      'Dress',
      'Blouse/Top',
      'Women\'s Pants',
      'Women\'s Jeans',
      'Women\'s Shoes',
      'Jacket/Coat',
      'Women\'s Suit Jacket',
      'Women\'s Belt'
    ];

    it('should have all expected women\'s categories', () => {
      const womensGuides = getWomensMeasurementGuides();
      const categoryNames = womensGuides.map(g => g.category_name);
      
      expectedWomensCategories.forEach(category => {
        expect(categoryNames).toContain(category);
      });
    });

    it('should have Dress with bust, waist, and hip measurements', () => {
      const guide = getMeasurementGuide('Dress');
      expect(guide).toBeDefined();
      expect(guide?.gender).toBe('women');
      
      const fieldNames = guide?.measurement_fields.map(f => f.name);
      expect(fieldNames).toContain('bust');
      expect(fieldNames).toContain('waist');
      expect(fieldNames).toContain('hips');
    });

    it('should have Women\'s Suit Jacket with bust, waist, and shoulder measurements', () => {
      const guide = getMeasurementGuide('Women\'s Suit Jacket');
      expect(guide).toBeDefined();
      expect(guide?.gender).toBe('women');
      
      const fieldNames = guide?.measurement_fields.map(f => f.name);
      expect(fieldNames).toContain('bust');
      expect(fieldNames).toContain('waist');
      expect(fieldNames).toContain('shoulder');
    });
  });

  describe('Helper Functions', () => {
    it('getMeasurementGuide should return guide for valid category', () => {
      const guide = getMeasurementGuide('Dress Shirt');
      expect(guide).toBeDefined();
      expect(guide?.category_name).toBe('Dress Shirt');
    });

    it('getMeasurementGuide should return undefined for invalid category', () => {
      const guide = getMeasurementGuide('Invalid Category');
      expect(guide).toBeUndefined();
    });

    it('getMeasurementGuidesByGender should filter by gender', () => {
      const mensGuides = getMeasurementGuidesByGender('men');
      const womensGuides = getMeasurementGuidesByGender('women');
      
      expect(mensGuides.every(g => g.gender === 'men')).toBe(true);
      expect(womensGuides.every(g => g.gender === 'women')).toBe(true);
    });

    it('hasMeasurementGuide should return true for valid categories', () => {
      expect(hasMeasurementGuide('Dress Shirt')).toBe(true);
      expect(hasMeasurementGuide('Dress')).toBe(true);
    });

    it('hasMeasurementGuide should return false for invalid categories', () => {
      expect(hasMeasurementGuide('Invalid Category')).toBe(false);
      expect(hasMeasurementGuide('')).toBe(false);
    });
  });

  describe('Typical Ranges', () => {
    it('should have valid typical ranges where specified', () => {
      Object.values(MEASUREMENT_GUIDES).forEach((guide: MeasurementGuide) => {
        guide.measurement_fields.forEach((field: MeasurementField) => {
          if (field.typical_range) {
            expect(field.typical_range).toHaveLength(2);
            expect(field.typical_range[0]).toBeLessThan(field.typical_range[1]);
            expect(field.typical_range[0]).toBeGreaterThan(0);
          }
        });
      });
    });
  });

  describe('Supported Formats', () => {
    it('should have valid sizing formats', () => {
      const validFormats = ['letter', 'numeric', 'waist-inseam', 'measurements'];
      
      Object.values(MEASUREMENT_GUIDES).forEach((guide: MeasurementGuide) => {
        expect(guide.supported_formats.length).toBeGreaterThan(0);
        guide.supported_formats.forEach(format => {
          expect(validFormats).toContain(format);
        });
      });
    });

    it('should have waist-inseam format for pants and jeans', () => {
      const pantsGuide = getMeasurementGuide('Pants');
      const jeansGuide = getMeasurementGuide('Jeans');
      
      expect(pantsGuide?.supported_formats).toContain('waist-inseam');
      expect(jeansGuide?.supported_formats).toContain('waist-inseam');
    });
  });

  describe('Icons', () => {
    it('should have valid icon names', () => {
      Object.values(MEASUREMENT_GUIDES).forEach((guide: MeasurementGuide) => {
        expect(guide.icon).toBeTruthy();
        expect(typeof guide.icon).toBe('string');
        expect(guide.icon.length).toBeGreaterThan(0);
      });
    });

    it('should use appropriate icons for categories', () => {
      expect(getMeasurementGuide('Dress Shirt')?.icon).toBe('shirt');
      expect(getMeasurementGuide('Suit Jacket')?.icon).toBe('briefcase');
      expect(getMeasurementGuide('Shoes')?.icon).toBe('footprints');
      expect(getMeasurementGuide('Dress')?.icon).toBe('dress');
    });
  });

  describe('Tips', () => {
    it('should have helpful tips for most categories', () => {
      const guidesWithTips = Object.values(MEASUREMENT_GUIDES).filter(
        guide => guide.tips && guide.tips.length > 0
      );
      
      // Most categories should have tips
      expect(guidesWithTips.length).toBeGreaterThan(10);
    });

    it('should have valid tip strings', () => {
      Object.values(MEASUREMENT_GUIDES).forEach((guide: MeasurementGuide) => {
        if (guide.tips) {
          guide.tips.forEach(tip => {
            expect(typeof tip).toBe('string');
            expect(tip.length).toBeGreaterThan(0);
          });
        }
      });
    });
  });
});
