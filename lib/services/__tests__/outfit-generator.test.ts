import { describe, it, expect } from 'vitest';
import { generateOutfit, regenerateOutfit, swapItem } from '../outfit-generator';
import { WardrobeItem } from '@/lib/types/database';
import { WeatherContext } from '@/lib/types/generation';

/**
 * Test fixtures for outfit generation
 */

// Mock category objects
const mockCategories = {
  shirt: {
    id: 'cat-shirt',
    user_id: 'user-1',
    name: 'Shirt',
    is_anchor_item: false,
    display_order: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  pants: {
    id: 'cat-pants',
    user_id: 'user-1',
    name: 'Pants',
    is_anchor_item: false,
    display_order: 2,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  shoes: {
    id: 'cat-shoes',
    user_id: 'user-1',
    name: 'Shoes',
    is_anchor_item: false,
    display_order: 3,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  jacket: {
    id: 'cat-jacket',
    user_id: 'user-1',
    name: 'Jacket',
    is_anchor_item: false,
    display_order: 4,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  undershirt: {
    id: 'cat-undershirt',
    user_id: 'user-1',
    name: 'Undershirt',
    is_anchor_item: false,
    display_order: 5,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  belt: {
    id: 'cat-belt',
    user_id: 'user-1',
    name: 'Belt',
    is_anchor_item: false,
    display_order: 6,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  watch: {
    id: 'cat-watch',
    user_id: 'user-1',
    name: 'Watch',
    is_anchor_item: false,
    display_order: 7,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
};

// Helper to create mock wardrobe items
function createMockItem(overrides: Partial<WardrobeItem> = {}): WardrobeItem {
  return {
    id: `item-${Math.random().toString(36).substr(2, 9)}`,
    user_id: 'user-1',
    category_id: 'cat-1',
    name: 'Test Item',
    brand: null,
    color: null,
    material: null,
    formality_score: 5,
    capsule_tags: [],
    season: ['Spring', 'Fall'],
    image_url: null,
    active: true,
    external_id: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    category: mockCategories.shirt,
    ...overrides,
  };
}

// Mock weather contexts
const coldWeather: WeatherContext = {
  isCold: true,
  isMild: false,
  isWarm: false,
  isHot: false,
  isRainLikely: false,
  dailySwing: 15,
  hasLargeSwing: false,
  targetWeight: 3,
  currentTemp: 45,
  highTemp: 52,
  lowTemp: 37,
  precipChance: 0.1,
};

const mildWeather: WeatherContext = {
  isCold: false,
  isMild: true,
  isWarm: false,
  isHot: false,
  isRainLikely: false,
  dailySwing: 12,
  hasLargeSwing: false,
  targetWeight: 2,
  currentTemp: 65,
  highTemp: 70,
  lowTemp: 58,
  precipChance: 0.2,
};

const hotWeather: WeatherContext = {
  isCold: false,
  isMild: false,
  isWarm: false,
  isHot: true,
  isRainLikely: false,
  dailySwing: 10,
  hasLargeSwing: false,
  targetWeight: 0,
  currentTemp: 95,
  highTemp: 98,
  lowTemp: 88,
  precipChance: 0.05,
};

// Basic wardrobe with required categories
const basicWardrobe: WardrobeItem[] = [
  createMockItem({
    id: 'shirt-1',
    name: 'Blue Oxford Shirt',
    category_id: 'cat-shirt',
    category: mockCategories.shirt,
    formality_score: 6,
  }),
  createMockItem({
    id: 'pants-1',
    name: 'Grey Chinos',
    category_id: 'cat-pants',
    category: mockCategories.pants,
    formality_score: 5,
  }),
  createMockItem({
    id: 'shoes-1',
    name: 'Brown Leather Shoes',
    category_id: 'cat-shoes',
    category: mockCategories.shoes,
    formality_score: 7,
  }),
];

describe('generateOutfit', () => {
  describe('Required Categories', () => {
    it('should include shirt, pants, and shoes in every outfit', () => {
      const outfit = generateOutfit({
        wardrobeItems: basicWardrobe,
        weatherContext: mildWeather,
      });

      expect(outfit.items.shirt).toBeDefined();
      expect(outfit.items.pants).toBeDefined();
      expect(outfit.items.shoes).toBeDefined();
    });

    it('should throw error when missing required categories', () => {
      const incompleteWardrobe = [
        createMockItem({
          name: 'Blue Shirt',
          category: mockCategories.shirt,
        }),
        // Missing pants and shoes
      ];

      expect(() => {
        generateOutfit({
          wardrobeItems: incompleteWardrobe,
          weatherContext: mildWeather,
        });
      }).toThrow('Missing required categories');
    });

    it('should throw error when missing shirt', () => {
      const noPantsWardrobe = [
        createMockItem({ name: 'Grey Pants', category: mockCategories.pants }),
        createMockItem({ name: 'Brown Shoes', category: mockCategories.shoes }),
      ];

      expect(() => {
        generateOutfit({
          wardrobeItems: noPantsWardrobe,
          weatherContext: mildWeather,
        });
      }).toThrow('Missing required categories');
    });
  });

  describe('Conditional Category Inclusion', () => {
    it('should include jacket when targetWeight >= 2', () => {
      const wardrobeWithJacket = [
        ...basicWardrobe,
        createMockItem({
          id: 'jacket-1',
          name: 'Navy Blazer',
          category_id: 'cat-jacket',
          category: mockCategories.jacket,
          formality_score: 8,
        }),
      ];

      const outfit = generateOutfit({
        wardrobeItems: wardrobeWithJacket,
        weatherContext: coldWeather, // targetWeight = 3
      });

      expect(outfit.items.jacket).toBeDefined();
    });

    it('should not include jacket when targetWeight < 2', () => {
      const wardrobeWithJacket = [
        ...basicWardrobe,
        createMockItem({
          id: 'jacket-1',
          name: 'Navy Blazer',
          category: mockCategories.jacket,
        }),
      ];

      const outfit = generateOutfit({
        wardrobeItems: wardrobeWithJacket,
        weatherContext: hotWeather, // targetWeight = 0
      });

      expect(outfit.items.jacket).toBeUndefined();
    });

    it('should include undershirt unless isHot', () => {
      const wardrobeWithUndershirt = [
        ...basicWardrobe,
        createMockItem({
          id: 'undershirt-1',
          name: 'White Undershirt',
          category: mockCategories.undershirt,
        }),
      ];

      const mildOutfit = generateOutfit({
        wardrobeItems: wardrobeWithUndershirt,
        weatherContext: mildWeather,
      });

      expect(mildOutfit.items.undershirt).toBeDefined();

      const hotOutfit = generateOutfit({
        wardrobeItems: wardrobeWithUndershirt,
        weatherContext: hotWeather,
      });

      expect(hotOutfit.items.undershirt).toBeUndefined();
    });

    it('should include belt when pants formality >= 5', () => {
      const wardrobeWithBelt = [
        ...basicWardrobe,
        createMockItem({
          id: 'belt-1',
          name: 'Brown Leather Belt',
          category: mockCategories.belt,
        }),
      ];

      const outfit = generateOutfit({
        wardrobeItems: wardrobeWithBelt,
        weatherContext: mildWeather,
      });

      // basicWardrobe has pants with formality_score = 5
      expect(outfit.items.belt).toBeDefined();
    });

    it('should include belt when shoes formality >= 6', () => {
      const wardrobeWithBelt = [
        createMockItem({
          name: 'Casual Shirt',
          category: mockCategories.shirt,
          formality_score: 3,
        }),
        createMockItem({
          name: 'Jeans',
          category: mockCategories.pants,
          formality_score: 2,
        }),
        createMockItem({
          name: 'Dress Shoes',
          category: mockCategories.shoes,
          formality_score: 8,
        }),
        createMockItem({
          name: 'Black Belt',
          category: mockCategories.belt,
        }),
      ];

      const outfit = generateOutfit({
        wardrobeItems: wardrobeWithBelt,
        weatherContext: mildWeather,
      });

      expect(outfit.items.belt).toBeDefined();
    });

    it('should include watch when available', () => {
      const wardrobeWithWatch = [
        ...basicWardrobe,
        createMockItem({
          id: 'watch-1',
          name: 'Silver Watch',
          category: mockCategories.watch,
        }),
      ];

      const outfit = generateOutfit({
        wardrobeItems: wardrobeWithWatch,
        weatherContext: mildWeather,
      });

      expect(outfit.items.watch).toBeDefined();
    });
  });

  describe('Item Selection Strategy', () => {
    it('should prefer shorts in hot weather', () => {
      const wardrobeWithShorts = [
        createMockItem({
          name: 'Blue Shirt',
          category: mockCategories.shirt,
        }),
        createMockItem({
          id: 'pants-regular',
          name: 'Grey Chinos',
          category: mockCategories.pants,
          formality_score: 5,
        }),
        createMockItem({
          id: 'pants-shorts',
          name: 'Khaki Shorts',
          category: mockCategories.pants,
          formality_score: 3,
        }),
        createMockItem({
          name: 'Brown Shoes',
          category: mockCategories.shoes,
        }),
      ];

      const outfit = generateOutfit({
        wardrobeItems: wardrobeWithShorts,
        weatherContext: hotWeather,
      });

      expect(outfit.items.pants.name).toContain('Shorts');
    });

    it('should apply exclusion penalty to recently used items', () => {
      const wardrobeWithMultipleShirts = [
        createMockItem({
          id: 'shirt-1',
          name: 'Blue Oxford Shirt',
          category: mockCategories.shirt,
          formality_score: 6,
        }),
        createMockItem({
          id: 'shirt-2',
          name: 'White Dress Shirt',
          category: mockCategories.shirt,
          formality_score: 7,
        }),
        createMockItem({
          name: 'Grey Pants',
          category: mockCategories.pants,
        }),
        createMockItem({
          name: 'Brown Shoes',
          category: mockCategories.shoes,
        }),
      ];

      // Generate without exclusions
      const outfit1 = generateOutfit({
        wardrobeItems: wardrobeWithMultipleShirts,
        weatherContext: mildWeather,
      });

      // Generate with first shirt excluded
      const outfit2 = generateOutfit({
        wardrobeItems: wardrobeWithMultipleShirts,
        weatherContext: mildWeather,
        excludeItems: [outfit1.items.shirt.id],
      });

      // Should select different shirt
      expect(outfit2.items.shirt.id).not.toBe(outfit1.items.shirt.id);
    });
  });

  describe('Compatibility Scoring', () => {
    it('should calculate overall compatibility score', () => {
      const outfit = generateOutfit({
        wardrobeItems: basicWardrobe,
        weatherContext: mildWeather,
      });

      expect(outfit.scores.overall).toBeDefined();
      expect(outfit.scores.overall.weatherFit).toBeGreaterThanOrEqual(0);
      expect(outfit.scores.overall.weatherFit).toBeLessThanOrEqual(1);
      expect(outfit.scores.overall.formalityAlignment).toBeGreaterThanOrEqual(0);
      expect(outfit.scores.overall.formalityAlignment).toBeLessThanOrEqual(1);
      expect(outfit.scores.overall.colorHarmony).toBeGreaterThanOrEqual(0);
      expect(outfit.scores.overall.colorHarmony).toBeLessThanOrEqual(1);
      expect(outfit.scores.overall.capsuleCohesion).toBeGreaterThanOrEqual(0);
      expect(outfit.scores.overall.capsuleCohesion).toBeLessThanOrEqual(1);
      expect(outfit.scores.overall.total).toBeGreaterThanOrEqual(0);
      expect(outfit.scores.overall.total).toBeLessThanOrEqual(1);
    });

    it('should calculate pairwise compatibility scores', () => {
      const outfit = generateOutfit({
        wardrobeItems: basicWardrobe,
        weatherContext: mildWeather,
      });

      expect(outfit.scores.pairwise).toBeDefined();
      expect(Object.keys(outfit.scores.pairwise).length).toBeGreaterThan(0);

      // Check that pairwise scores are valid
      for (const score of Object.values(outfit.scores.pairwise)) {
        expect(score.total).toBeGreaterThanOrEqual(0);
        expect(score.total).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('Swappable Categories', () => {
    it('should mark categories as swappable when alternatives exist', () => {
      const wardrobeWithAlternatives = [
        createMockItem({
          id: 'shirt-1',
          name: 'Blue Shirt',
          category: mockCategories.shirt,
        }),
        createMockItem({
          id: 'shirt-2',
          name: 'White Shirt',
          category: mockCategories.shirt,
        }),
        createMockItem({
          id: 'pants-1',
          name: 'Grey Pants',
          category: mockCategories.pants,
        }),
        createMockItem({
          id: 'shoes-1',
          name: 'Brown Shoes',
          category: mockCategories.shoes,
        }),
      ];

      const outfit = generateOutfit({
        wardrobeItems: wardrobeWithAlternatives,
        weatherContext: mildWeather,
      });

      expect(outfit.swappable.shirt).toBe(true);
      expect(outfit.swappable.pants).toBe(false);
      expect(outfit.swappable.shoes).toBe(false);
    });
  });

  describe('Metadata', () => {
    it('should include item IDs', () => {
      const outfit = generateOutfit({
        wardrobeItems: basicWardrobe,
        weatherContext: mildWeather,
      });

      expect(outfit.itemIds).toBeDefined();
      expect(outfit.itemIds.length).toBeGreaterThanOrEqual(3);
      expect(outfit.itemIds).toContain(outfit.items.shirt.id);
      expect(outfit.itemIds).toContain(outfit.items.pants.id);
      expect(outfit.itemIds).toContain(outfit.items.shoes.id);
    });

    it('should include weather context', () => {
      const outfit = generateOutfit({
        wardrobeItems: basicWardrobe,
        weatherContext: mildWeather,
      });

      expect(outfit.weatherContext).toEqual(mildWeather);
    });

    it('should include generation timestamp', () => {
      const outfit = generateOutfit({
        wardrobeItems: basicWardrobe,
        weatherContext: mildWeather,
      });

      expect(outfit.generatedAt).toBeInstanceOf(Date);
    });
  });
});

describe('regenerateOutfit', () => {
  it('should generate a valid outfit', () => {
    const outfit = regenerateOutfit({
      wardrobeItems: basicWardrobe,
      weatherContext: mildWeather,
    });

    expect(outfit.items.shirt).toBeDefined();
    expect(outfit.items.pants).toBeDefined();
    expect(outfit.items.shoes).toBeDefined();
  });

  it('should respect exclusion list for variety', () => {
    const wardrobeWithMultipleItems = [
      createMockItem({
        id: 'shirt-1',
        name: 'Blue Shirt',
        category: mockCategories.shirt,
      }),
      createMockItem({
        id: 'shirt-2',
        name: 'White Shirt',
        category: mockCategories.shirt,
      }),
      createMockItem({
        name: 'Grey Pants',
        category: mockCategories.pants,
      }),
      createMockItem({
        name: 'Brown Shoes',
        category: mockCategories.shoes,
      }),
    ];

    const outfit1 = regenerateOutfit({
      wardrobeItems: wardrobeWithMultipleItems,
      weatherContext: mildWeather,
    });

    const outfit2 = regenerateOutfit({
      wardrobeItems: wardrobeWithMultipleItems,
      weatherContext: mildWeather,
      excludeItems: [outfit1.items.shirt.id],
    });

    expect(outfit2.items.shirt.id).not.toBe(outfit1.items.shirt.id);
  });
});

describe('swapItem', () => {
  it('should swap a single category while keeping others fixed', () => {
    const wardrobeWithAlternatives = [
      createMockItem({
        id: 'shirt-1',
        name: 'Blue Shirt',
        category: mockCategories.shirt,
      }),
      createMockItem({
        id: 'shirt-2',
        name: 'White Shirt',
        category: mockCategories.shirt,
      }),
      createMockItem({
        id: 'pants-1',
        name: 'Grey Pants',
        category: mockCategories.pants,
      }),
      createMockItem({
        id: 'shoes-1',
        name: 'Brown Shoes',
        category: mockCategories.shoes,
      }),
    ];

    const originalOutfit = generateOutfit({
      wardrobeItems: wardrobeWithAlternatives,
      weatherContext: mildWeather,
    });

    const swappedOutfit = swapItem({
      currentOutfit: originalOutfit,
      category: 'shirt',
      wardrobeItems: wardrobeWithAlternatives,
      weatherContext: mildWeather,
    });

    // Shirt should be different
    expect(swappedOutfit.items.shirt.id).not.toBe(originalOutfit.items.shirt.id);

    // Other items should be the same
    expect(swappedOutfit.items.pants.id).toBe(originalOutfit.items.pants.id);
    expect(swappedOutfit.items.shoes.id).toBe(originalOutfit.items.shoes.id);
  });

  it('should throw error when category not in outfit', () => {
    const outfit = generateOutfit({
      wardrobeItems: basicWardrobe,
      weatherContext: mildWeather,
    });

    expect(() => {
      swapItem({
        currentOutfit: outfit,
        category: 'jacket', // Not in outfit
        wardrobeItems: basicWardrobe,
        weatherContext: mildWeather,
      });
    }).toThrow('not present in the current outfit');
  });

  it('should throw error when no alternatives available', () => {
    const outfit = generateOutfit({
      wardrobeItems: basicWardrobe,
      weatherContext: mildWeather,
    });

    expect(() => {
      swapItem({
        currentOutfit: outfit,
        category: 'shirt', // Only one shirt in wardrobe
        wardrobeItems: basicWardrobe,
        weatherContext: mildWeather,
      });
    }).toThrow('No alternative items available');
  });

  it('should exclude current item from swap options', () => {
    const wardrobeWithTwoShirts = [
      createMockItem({
        id: 'shirt-1',
        name: 'Blue Shirt',
        category: mockCategories.shirt,
      }),
      createMockItem({
        id: 'shirt-2',
        name: 'White Shirt',
        category: mockCategories.shirt,
      }),
      createMockItem({
        name: 'Grey Pants',
        category: mockCategories.pants,
      }),
      createMockItem({
        name: 'Brown Shoes',
        category: mockCategories.shoes,
      }),
    ];

    const outfit = generateOutfit({
      wardrobeItems: wardrobeWithTwoShirts,
      weatherContext: mildWeather,
    });

    const originalShirtId = outfit.items.shirt.id;

    const swappedOutfit = swapItem({
      currentOutfit: outfit,
      category: 'shirt',
      wardrobeItems: wardrobeWithTwoShirts,
      weatherContext: mildWeather,
    });

    // Should select the other shirt
    expect(swappedOutfit.items.shirt.id).not.toBe(originalShirtId);
  });

  it('should recalculate scores after swap', () => {
    const wardrobeWithAlternatives = [
      createMockItem({
        id: 'shirt-1',
        name: 'Blue Shirt',
        category: mockCategories.shirt,
        formality_score: 6,
      }),
      createMockItem({
        id: 'shirt-2',
        name: 'White Shirt',
        category: mockCategories.shirt,
        formality_score: 8,
      }),
      createMockItem({
        name: 'Grey Pants',
        category: mockCategories.pants,
        formality_score: 7,
      }),
      createMockItem({
        name: 'Brown Shoes',
        category: mockCategories.shoes,
        formality_score: 7,
      }),
    ];

    const originalOutfit = generateOutfit({
      wardrobeItems: wardrobeWithAlternatives,
      weatherContext: mildWeather,
    });

    const swappedOutfit = swapItem({
      currentOutfit: originalOutfit,
      category: 'shirt',
      wardrobeItems: wardrobeWithAlternatives,
      weatherContext: mildWeather,
    });

    // Scores should be recalculated
    expect(swappedOutfit.scores.overall).toBeDefined();
    expect(swappedOutfit.scores.pairwise).toBeDefined();

    // Scores might be different due to different formality alignment
    // Just verify they're valid
    expect(swappedOutfit.scores.overall.total).toBeGreaterThanOrEqual(0);
    expect(swappedOutfit.scores.overall.total).toBeLessThanOrEqual(1);
  });
});

describe('Edge Cases', () => {
  it('should handle small wardrobe with minimal items', () => {
    const minimalWardrobe = [
      createMockItem({
        name: 'Only Shirt',
        category: mockCategories.shirt,
      }),
      createMockItem({
        name: 'Only Pants',
        category: mockCategories.pants,
      }),
      createMockItem({
        name: 'Only Shoes',
        category: mockCategories.shoes,
      }),
    ];

    const outfit = generateOutfit({
      wardrobeItems: minimalWardrobe,
      weatherContext: mildWeather,
    });

    expect(outfit.items.shirt).toBeDefined();
    expect(outfit.items.pants).toBeDefined();
    expect(outfit.items.shoes).toBeDefined();
    expect(outfit.swappable.shirt).toBe(false);
    expect(outfit.swappable.pants).toBe(false);
    expect(outfit.swappable.shoes).toBe(false);
  });

  it('should handle wardrobe with all optional categories', () => {
    const fullWardrobe = [
      ...basicWardrobe,
      createMockItem({
        name: 'Navy Blazer',
        category: mockCategories.jacket,
      }),
      createMockItem({
        name: 'White Undershirt',
        category: mockCategories.undershirt,
      }),
      createMockItem({
        name: 'Brown Belt',
        category: mockCategories.belt,
      }),
      createMockItem({
        name: 'Silver Watch',
        category: mockCategories.watch,
      }),
    ];

    const outfit = generateOutfit({
      wardrobeItems: fullWardrobe,
      weatherContext: coldWeather,
    });

    // Should include all appropriate categories for cold weather
    expect(outfit.items.shirt).toBeDefined();
    expect(outfit.items.pants).toBeDefined();
    expect(outfit.items.shoes).toBeDefined();
    expect(outfit.items.jacket).toBeDefined();
    expect(outfit.items.undershirt).toBeDefined();
    expect(outfit.items.belt).toBeDefined();
    expect(outfit.items.watch).toBeDefined();
  });
});
