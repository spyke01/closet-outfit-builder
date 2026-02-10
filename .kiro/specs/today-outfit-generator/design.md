# Design Document: Today's Outfit Generator

## Overview

The Today's Outfit Generator feature transforms the authenticated user experience by providing a personalized daily outfit recommendation based on real-time weather conditions and the user's personal wardrobe inventory. The system uses a pure functional approach to generate outfits from wardrobe items (not saved outfits), applying weather-aware algorithms that consider temperature, precipitation, formality alignment, color harmony, and style cohesion.

### Key Design Principles

1. **Pure Functional Core**: All generation logic implemented as pure functions for testability and predictability
2. **Weather-Aware Intelligence**: Normalize weather data into actionable bands that drive layering and item selection
3. **Compatibility Scoring**: Multi-dimensional scoring system for cohesive outfit combinations
4. **User Control**: Allow regeneration and individual item swapping while maintaining outfit coherence
5. **Graceful Degradation**: Handle missing data, small wardrobes, and unavailable weather gracefully

### Technology Stack

- **Frontend**: Next.js 15 with React 19, TypeScript, Tailwind CSS
- **State Management**: React hooks with local state for generation session
- **Data Fetching**: Existing Supabase client for wardrobe items, existing weather hook
- **Validation**: Zod schemas for all data structures
- **Testing**: Vitest with property-based tests for generation algorithms

## Architecture

### High-Level Flow

```
User Authentication
    ↓
Route to Today Page
    ↓
Fetch Wardrobe Items (Supabase)
    ↓
Fetch Weather Data (Existing Hook)
    ↓
Normalize Weather Context
    ↓
Generate Initial Outfit
    ↓
Display Outfit + Weather
    ↓
User Actions:
  - Regenerate (full)
  - Swap Item (single category)
  - Save Outfit (persist to DB)
```

### Component Architecture

```
app/today/
├── page.tsx                    # Server component (auth check, data fetching)
└── today-page-client.tsx       # Client component (UI, interactions)

components/
├── today-outfit-display.tsx    # Outfit visualization with swap buttons
├── weather-snapshot.tsx        # Compact weather display
└── outfit-actions.tsx          # Regenerate and Save buttons

lib/
├── services/
│   └── outfit-generator.ts     # Pure generation functions
├── utils/
│   ├── weather-normalization.ts # Weather context utilities
│   ├── color-inference.ts       # Color extraction from names
│   └── compatibility-scoring.ts # Scoring algorithms
└── types/
    └── generation.ts            # Type definitions for generation
```

### Data Flow

1. **Server Component** (`app/today/page.tsx`):
   - Verify authentication
   - Fetch user's wardrobe items from Supabase
   - Pass data to client component

2. **Client Component** (`today-page-client.tsx`):
   - Use weather hook to fetch current conditions
   - Normalize weather into context
   - Call generator with wardrobe + weather context
   - Manage generation state (current outfit, recently used)
   - Handle user actions (regenerate, swap, save)

3. **Generator Service** (`outfit-generator.ts`):
   - Pure function: `generateOutfit(wardrobeItems, weatherContext, options)`
   - Returns outfit selection with compatibility scores
   - No side effects, fully testable

## Components and Interfaces

### Page Components

#### `app/today/page.tsx` (Server Component)

```typescript
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import TodayPageClient from './today-page-client';

export default async function TodayPage() {
  const supabase = await createClient();
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    redirect('/auth/login');
  }
  
  // Fetch wardrobe items with categories
  const { data: wardrobeItems, error: wardrobeError } = await supabase
    .from('wardrobe_items')
    .select('*, category:categories(*)')
    .eq('user_id', user.id)
    .eq('active', true);
  
  if (wardrobeError) {
    console.error('Failed to fetch wardrobe:', wardrobeError);
    return <div>Error loading wardrobe</div>;
  }
  
  return <TodayPageClient wardrobeItems={wardrobeItems || []} />;
}
```

#### `app/today/today-page-client.tsx` (Client Component)

```typescript
'use client';

import { useState, useCallback, useMemo } from 'react';
import { WardrobeItem } from '@/lib/types/database';
import { useWeather } from '@/lib/hooks/use-weather';
import { generateOutfit, regenerateOutfit, swapItem } from '@/lib/services/outfit-generator';
import { normalizeWeatherContext } from '@/lib/utils/weather-normalization';
import { GeneratedOutfit, WeatherContext } from '@/lib/types/generation';
import TodayOutfitDisplay from '@/components/today-outfit-display';
import WeatherSnapshot from '@/components/weather-snapshot';
import OutfitActions from '@/components/outfit-actions';

interface TodayPageClientProps {
  wardrobeItems: WardrobeItem[];
}

export default function TodayPageClient({ wardrobeItems }: TodayPageClientProps) {
  const { current, forecast, loading: weatherLoading, error: weatherError } = useWeather(true);
  
  const [currentOutfit, setCurrentOutfit] = useState<GeneratedOutfit | null>(null);
  const [recentlyUsed, setRecentlyUsed] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  
  // Normalize weather context
  const weatherContext = useMemo<WeatherContext | null>(() => {
    if (!current || !forecast.length) return null;
    return normalizeWeatherContext(current, forecast);
  }, [current, forecast]);
  
  // Check for required categories
  const hasRequiredCategories = useMemo(() => {
    const categories = new Set(wardrobeItems.map(item => item.category?.name));
    return categories.has('Shirt') && categories.has('Pants') && categories.has('Shoes');
  }, [wardrobeItems]);
  
  // Generate initial outfit
  useEffect(() => {
    if (!weatherContext || !hasRequiredCategories || currentOutfit) return;
    
    setGenerating(true);
    const outfit = generateOutfit({
      wardrobeItems,
      weatherContext,
      excludeItems: recentlyUsed,
    });
    setCurrentOutfit(outfit);
    setRecentlyUsed(prev => [...prev, ...outfit.itemIds].slice(-10));
    setGenerating(false);
  }, [weatherContext, hasRequiredCategories, wardrobeItems, recentlyUsed, currentOutfit]);
  
  // Handle regenerate
  const handleRegenerate = useCallback(() => {
    if (!weatherContext) return;
    
    setGenerating(true);
    const outfit = regenerateOutfit({
      wardrobeItems,
      weatherContext,
      excludeItems: recentlyUsed,
    });
    setCurrentOutfit(outfit);
    setRecentlyUsed(prev => [...prev, ...outfit.itemIds].slice(-10));
    setGenerating(false);
  }, [wardrobeItems, weatherContext, recentlyUsed]);
  
  // Handle swap item
  const handleSwap = useCallback((category: string) => {
    if (!weatherContext || !currentOutfit) return;
    
    const outfit = swapItem({
      currentOutfit,
      category,
      wardrobeItems,
      weatherContext,
    });
    setCurrentOutfit(outfit);
  }, [wardrobeItems, weatherContext, currentOutfit]);
  
  // Handle save outfit
  const handleSave = useCallback(async (loved: boolean = false) => {
    if (!currentOutfit) return;
    
    // Call server action to save outfit
    const result = await createOutfit({
      name: `Today's Outfit - ${new Date().toLocaleDateString()}`,
      source: 'generated',
      loved,
      items: currentOutfit.itemIds,
    });
    
    if (result.success) {
      // Show success message and navigate to outfits
    }
  }, [currentOutfit]);
  
  // Empty state
  if (!hasRequiredCategories) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Today's Outfit</h1>
        <div className="text-center py-12">
          <p className="text-lg mb-4">
            You need at least one Shirt, Pants, and Shoes to generate outfits.
          </p>
          <a href="/wardrobe" className="text-blue-600 hover:underline">
            Add items to your wardrobe →
          </a>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Today's Outfit</h1>
      
      <WeatherSnapshot 
        current={current} 
        forecast={forecast}
        loading={weatherLoading}
        error={weatherError}
      />
      
      {currentOutfit && (
        <>
          <TodayOutfitDisplay 
            outfit={currentOutfit}
            onSwap={handleSwap}
            generating={generating}
          />
          
          <OutfitActions
            onRegenerate={handleRegenerate}
            onSave={handleSave}
            disabled={generating}
          />
        </>
      )}
    </div>
  );
}
```

### Display Components

#### `components/today-outfit-display.tsx`

```typescript
'use client';

import { GeneratedOutfit } from '@/lib/types/generation';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import Image from 'next/image';

interface TodayOutfitDisplayProps {
  outfit: GeneratedOutfit;
  onSwap: (category: string) => void;
  generating: boolean;
}

export default function TodayOutfitDisplay({ outfit, onSwap, generating }: TodayOutfitDisplayProps) {
  const categories = ['jacket', 'overshirt', 'shirt', 'undershirt', 'pants', 'shoes', 'belt', 'watch'];
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-6">
      {categories.map(category => {
        const item = outfit.items[category];
        if (!item) return null;
        
        const hasAlternatives = outfit.swappable[category];
        
        return (
          <div key={category} className="border rounded-lg p-4">
            <div className="relative aspect-square mb-2">
              {item.image_url && (
                <Image
                  src={item.image_url}
                  alt={item.name}
                  fill
                  className="object-contain"
                />
              )}
            </div>
            
            <p className="text-sm font-medium">{item.name}</p>
            <p className="text-xs text-gray-500 capitalize">{category}</p>
            
            {hasAlternatives && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onSwap(category)}
                disabled={generating}
                className="mt-2 w-full"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Swap
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

#### `components/weather-snapshot.tsx`

```typescript
'use client';

import { WeatherResponse } from '@/lib/hooks/use-weather';

interface WeatherSnapshotProps {
  current: WeatherResponse['current'] | null;
  forecast: WeatherResponse['forecast'];
  loading: boolean;
  error: any;
}

export default function WeatherSnapshot({ current, forecast, loading, error }: WeatherSnapshotProps) {
  if (loading) {
    return <div className="bg-blue-50 rounded-lg p-4 mb-6">Loading weather...</div>;
  }
  
  if (error || !current) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <p className="text-sm text-gray-600">Weather unavailable - using neutral defaults</p>
      </div>
    );
  }
  
  const today = forecast[0];
  
  return (
    <div className="bg-blue-50 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-bold">{Math.round(current.temperature)}°F</p>
          <p className="text-sm text-gray-600">{current.condition}</p>
        </div>
        
        {today && (
          <div className="text-right">
            <p className="text-sm">
              High: {Math.round(today.temperature.high)}°F
            </p>
            <p className="text-sm">
              Low: {Math.round(today.temperature.low)}°F
            </p>
            {today.precipitationProbability && (
              <p className="text-sm">
                Rain: {Math.round(today.precipitationProbability * 100)}%
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

#### `components/outfit-actions.tsx`

```typescript
'use client';

import { Button } from '@/components/ui/button';
import { RefreshCw, Heart, Save } from 'lucide-react';
import { useState } from 'react';

interface OutfitActionsProps {
  onRegenerate: () => void;
  onSave: (loved: boolean) => Promise<void>;
  disabled: boolean;
}

export default function OutfitActions({ onRegenerate, onSave, disabled }: OutfitActionsProps) {
  const [saving, setSaving] = useState(false);
  
  const handleSave = async (loved: boolean) => {
    setSaving(true);
    await onSave(loved);
    setSaving(false);
  };
  
  return (
    <div className="flex gap-4 justify-center my-6">
      <Button
        onClick={onRegenerate}
        disabled={disabled}
        variant="outline"
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        Regenerate
      </Button>
      
      <Button
        onClick={() => handleSave(false)}
        disabled={disabled || saving}
      >
        <Save className="w-4 h-4 mr-2" />
        Save Outfit
      </Button>
      
      <Button
        onClick={() => handleSave(true)}
        disabled={disabled || saving}
        variant="default"
      >
        <Heart className="w-4 h-4 mr-2" />
        Save & Love
      </Button>
    </div>
  );
}
```

## Data Models

### Generation Types

```typescript
// lib/types/generation.ts

import { WardrobeItem } from './database';

/**
 * Normalized weather context for outfit generation
 */
export interface WeatherContext {
  // Temperature classification
  isCold: boolean;      // < 55°F
  isMild: boolean;      // 55-75°F
  isWarm: boolean;      // 75-90°F
  isHot: boolean;       // >= 90°F
  
  // Precipitation
  isRainLikely: boolean; // >= 35% chance
  
  // Temperature swing
  dailySwing: number;    // high - low
  hasLargeSwing: boolean; // >= 20°F
  
  // Target warmth level (0-3)
  targetWeight: number;
  
  // Raw values for reference
  currentTemp: number;
  highTemp: number;
  lowTemp: number;
  precipChance: number;
}

/**
 * Color classification inferred from item names
 */
export type ColorCategory = 
  | 'black' | 'white' | 'grey' | 'gray'
  | 'navy' | 'blue' | 'cream' | 'khaki'
  | 'brown' | 'tan' | 'green' | 'red'
  | 'burgundy' | 'olive' | 'charcoal'
  | 'unknown';

/**
 * Formality band classification
 */
export type FormalityBand = 'casual' | 'smart-casual' | 'refined';

/**
 * Item with inferred metadata for generation
 */
export interface EnrichedItem extends WardrobeItem {
  inferredColor: ColorCategory;
  formalityBand: FormalityBand;
  weatherWeight: number; // 0-3, inferred from category and season
}

/**
 * Compatibility score breakdown
 */
export interface CompatibilityScore {
  weatherFit: number;      // 0-1
  formalityAlignment: number; // 0-1
  colorHarmony: number;    // 0-1
  capsuleCohesion: number; // 0-1
  total: number;           // 0-1 (weighted average)
}

/**
 * Generated outfit with metadata
 */
export interface GeneratedOutfit {
  items: {
    jacket?: EnrichedItem;
    overshirt?: EnrichedItem;
    shirt: EnrichedItem;
    undershirt?: EnrichedItem;
    pants: EnrichedItem;
    shoes: EnrichedItem;
    belt?: EnrichedItem;
    watch?: EnrichedItem;
  };
  
  // Item IDs for saving
  itemIds: string[];
  
  // Compatibility scores
  scores: {
    overall: CompatibilityScore;
    pairwise: Record<string, CompatibilityScore>; // e.g., "shirt-pants"
  };
  
  // Swappable categories (have alternatives)
  swappable: Record<string, boolean>;
  
  // Generation metadata
  weatherContext: WeatherContext;
  generatedAt: Date;
}

/**
 * Options for outfit generation
 */
export interface GenerationOptions {
  wardrobeItems: WardrobeItem[];
  weatherContext: WeatherContext;
  excludeItems?: string[]; // Item IDs to exclude (recently used)
  preferredCapsules?: string[]; // Preferred capsule tags
}

/**
 * Options for item swapping
 */
export interface SwapOptions {
  currentOutfit: GeneratedOutfit;
  category: string;
  wardrobeItems: WardrobeItem[];
  weatherContext: WeatherContext;
}
```

### Zod Schemas

```typescript
// lib/schemas/generation.ts

import { z } from 'zod';

export const WeatherContextSchema = z.object({
  isCold: z.boolean(),
  isMild: z.boolean(),
  isWarm: z.boolean(),
  isHot: z.boolean(),
  isRainLikely: z.boolean(),
  dailySwing: z.number(),
  hasLargeSwing: z.boolean(),
  targetWeight: z.number().min(0).max(3),
  currentTemp: z.number(),
  highTemp: z.number(),
  lowTemp: z.number(),
  precipChance: z.number().min(0).max(1),
});

export const ColorCategorySchema = z.enum([
  'black', 'white', 'grey', 'gray', 'navy', 'blue',
  'cream', 'khaki', 'brown', 'tan', 'green', 'red',
  'burgundy', 'olive', 'charcoal', 'unknown'
]);

export const FormalityBandSchema = z.enum(['casual', 'smart-casual', 'refined']);

export const CompatibilityScoreSchema = z.object({
  weatherFit: z.number().min(0).max(1),
  formalityAlignment: z.number().min(0).max(1),
  colorHarmony: z.number().min(0).max(1),
  capsuleCohesion: z.number().min(0).max(1),
  total: z.number().min(0).max(1),
});
```

## Correctness Properties


*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Required Categories Invariant

*For any* generated outfit, the outfit must include exactly one item from each of the Shirt, Pants, and Shoes categories.

**Validates: Requirements 3.3, 5.1**

### Property 2: Weather Context Normalization

*For any* weather data with temperature and precipitation values, the normalization function must classify the temperature into exactly one band (isCold, isMild, isWarm, or isHot) and correctly set isRainLikely based on the 0.35 threshold.

**Validates: Requirements 4.1, 4.2, 2.5**

### Property 3: Temperature Swing Calculation

*For any* high and low temperature pair, the daily swing must equal the absolute difference between high and low temperatures.

**Validates: Requirements 4.3**

### Property 4: Target Weight Mapping

*For any* temperature band classification, the target weight must be correctly mapped: isCold → 3, isMild → 2, isWarm → 1, isHot → 0.

**Validates: Requirements 4.4**

### Property 5: Large Swing Layering Adjustment

*For any* weather context where daily swing is 20°F or greater, the hasLargeSwing flag must be true and the generator should allow an additional layer beyond the base target weight.

**Validates: Requirements 4.5**

### Property 6: Conditional Outer Layer Inclusion

*For any* wardrobe containing jacket or overshirt items, when target weight is 2 or greater, the generated outfit must include an item from either the Jacket or Overshirt category.

**Validates: Requirements 3.4, 5.2**

### Property 7: Conditional Undershirt Inclusion

*For any* wardrobe containing undershirt items, when weather is not hot (isHot = false), the generated outfit must include an undershirt.

**Validates: Requirements 5.3**

### Property 8: Conditional Belt Inclusion

*For any* wardrobe containing belt items, when the selected pants have formality_score ≥ 5 OR the selected shoes have formality_score ≥ 6, the generated outfit must include a belt.

**Validates: Requirements 5.4**

### Property 9: Conditional Watch Inclusion

*For any* wardrobe containing watch items, the generated outfit must include a watch.

**Validates: Requirements 5.5**

### Property 10: Empty Category Exclusion

*For any* wardrobe and generated outfit, the outfit must not include categories that have zero available items in the wardrobe.

**Validates: Requirements 5.6**

### Property 11: Shorts Preference in Hot Weather

*For any* wardrobe containing shorts (pants with "shorts" in name or capsule tags), when isHot is true, shorts should be selected more frequently than regular pants across multiple generations.

**Validates: Requirements 6.2**

### Property 12: Formality Alignment

*For any* generated outfit, the formality scores of all items should fall within a reasonable range (no item should differ by more than 4 points from the median formality of the outfit).

**Validates: Requirements 6.3, 6.4, 6.5, 6.6, 7.2**

### Property 13: Compatibility Score Calculation

*For any* item and outfit context, the compatibility score must be a value between 0 and 1, and must include all four components: weatherFit, formalityAlignment, colorHarmony, and capsuleCohesion.

**Validates: Requirements 6.7**

### Property 14: Weather Fit Scoring

*For any* item appropriate for the current weather conditions (e.g., heavy jacket in cold weather, shorts in hot weather), the weatherFit component of the compatibility score must be higher than for inappropriate items.

**Validates: Requirements 7.1**

### Property 15: Color Harmony Scoring

*For any* pair of items with neutral colors (black, white, grey, navy, cream, khaki, brown), the colorHarmony score must be higher than for pairs with potentially clashing colors (e.g., red and green).

**Validates: Requirements 7.3**

### Property 16: Capsule Cohesion Scoring

*For any* pair of items sharing one or more capsule tags, the capsuleCohesion score must be higher than for pairs with no shared tags.

**Validates: Requirements 7.4**

### Property 17: Color Inference

*For any* item name containing common color keywords (black, white, grey, navy, cream, khaki, brown, blue, green, red, burgundy, olive, charcoal), the color inference function must correctly identify and return the color category.

**Validates: Requirements 7.6**

### Property 18: Regeneration Validity

*For any* wardrobe and weather context, regenerating an outfit must produce a valid outfit that satisfies all the same constraints as the initial generation (required categories, conditional inclusions, etc.).

**Validates: Requirements 8.1**

### Property 19: Variety Through Exclusion

*For any* sequence of outfit generations with the same wardrobe and weather context, when items are added to the exclusion list, those items should appear less frequently in subsequent generations than items not on the list.

**Validates: Requirements 8.2, 8.3**

### Property 20: Swap Category Isolation

*For any* outfit and category swap operation, only the specified category's item should change, and all other categories must retain their original items.

**Validates: Requirements 9.1, 9.2**

### Property 21: Swap Compatibility Scoring

*For any* category swap operation, the new item must be scored for compatibility against the fixed context of all other items in the outfit.

**Validates: Requirements 9.3**

### Property 22: Swap Current Item Exclusion

*For any* category swap operation, the currently selected item in that category must not be re-selected as the swap result.

**Validates: Requirements 9.4**

### Property 23: Swap Button State

*For any* category in a generated outfit, if the wardrobe contains only one item in that category, the swap functionality must be disabled for that category.

**Validates: Requirements 9.5**

### Property 24: Save Operation Immutability

*For any* save operation on a generated outfit, the wardrobe items must remain unchanged (no mutations to item properties, no deletions, no additions).

**Validates: Requirements 10.2, 10.6**

### Property 25: Constraint Relaxation Robustness

*For any* wardrobe and weather context, even when no items perfectly match the ideal criteria, the generator must still produce a valid outfit by relaxing constraints and selecting the best available items.

**Validates: Requirements 12.4**

### Property 26: Generator Determinism

*For any* wardrobe, weather context, and fixed random seed, calling the generator multiple times must produce identical outputs (same items selected, same scores calculated).

**Validates: Requirements 13.2**

### Property 27: Weather Display Completeness

*For any* weather data object, the rendered weather display must include all required fields: location, current temperature, high temperature, low temperature, and either precipitation or wind information.

**Validates: Requirements 2.2**

### Property 28: Weather Context Flow

*For any* weather data that is successfully fetched and normalized, the resulting weather context must be passed to the outfit generator and influence the generation results.

**Validates: Requirements 2.4**

### Property 29: Outfit Display Completeness

*For any* generated outfit, the display must render all selected items with their images and names visible.

**Validates: Requirements 3.7**

## Error Handling

### Weather Service Failures

**Scenario**: Weather API is unavailable or returns errors

**Handling**:
1. Use existing `useWeather` hook error handling
2. Display neutral default message in UI
3. Use fallback weather context: `{ targetWeight: 1, isMild: true, all other flags: false }`
4. Continue with outfit generation using defaults
5. Show user-friendly message: "Weather unavailable - using neutral defaults"

**Implementation**:
```typescript
const weatherContext = useMemo<WeatherContext>(() => {
  if (!current || !forecast.length || weatherError) {
    // Fallback to neutral defaults
    return {
      isCold: false,
      isMild: true,
      isWarm: false,
      isHot: false,
      isRainLikely: false,
      dailySwing: 0,
      hasLargeSwing: false,
      targetWeight: 1,
      currentTemp: 65,
      highTemp: 70,
      lowTemp: 60,
      precipChance: 0,
    };
  }
  return normalizeWeatherContext(current, forecast);
}, [current, forecast, weatherError]);
```

### Missing Required Categories

**Scenario**: User's wardrobe lacks Shirt, Pants, or Shoes

**Handling**:
1. Check for required categories before generation
2. Display empty state component with clear message
3. Provide direct link to Wardrobe page
4. Do not attempt generation

**Implementation**:
```typescript
const hasRequiredCategories = useMemo(() => {
  const categories = new Set(wardrobeItems.map(item => item.category?.name));
  return categories.has('Shirt') && categories.has('Pants') && categories.has('Shoes');
}, [wardrobeItems]);

if (!hasRequiredCategories) {
  return <EmptyState message="Add Shirt, Pants, and Shoes to generate outfits" />;
}
```

### Small Wardrobe Inventory

**Scenario**: User has very few items (e.g., 1 shirt, 1 pants, 1 shoes)

**Handling**:
1. Generator still produces valid outfit with available items
2. Disable swap buttons for categories with only one item
3. Regenerate may produce same outfit (acceptable)
4. No error messages - system works as expected

**Implementation**:
```typescript
const swappable = useMemo(() => {
  const categoryCount: Record<string, number> = {};
  wardrobeItems.forEach(item => {
    const cat = item.category?.name;
    if (cat) categoryCount[cat] = (categoryCount[cat] || 0) + 1;
  });
  return categoryCount;
}, [wardrobeItems]);

// In outfit display
const canSwap = swappable[category] > 1;
```

### No Matching Items for Criteria

**Scenario**: Ideal criteria (formality, color, weather) have no matches

**Handling**:
1. Implement constraint relaxation in generator
2. Start with strict criteria, progressively relax
3. Always return best available item, even if not ideal
4. Never throw errors or return null

**Implementation**:
```typescript
function selectBestItem(
  items: EnrichedItem[],
  context: SelectionContext,
  strict: boolean = true
): EnrichedItem {
  let candidates = items;
  
  if (strict) {
    // Try strict criteria first
    candidates = items.filter(item => meetsStrictCriteria(item, context));
  }
  
  if (candidates.length === 0) {
    // Relax constraints
    candidates = items.filter(item => meetsRelaxedCriteria(item, context));
  }
  
  if (candidates.length === 0) {
    // Last resort: return any item
    candidates = items;
  }
  
  // Score and select best
  return selectHighestScoring(candidates, context);
}
```

### Generation Failures

**Scenario**: Unexpected errors during generation

**Handling**:
1. Wrap generator calls in try-catch
2. Log errors for debugging
3. Display user-friendly error message
4. Provide retry button
5. Fall back to showing wardrobe link

**Implementation**:
```typescript
try {
  const outfit = generateOutfit({ wardrobeItems, weatherContext });
  setCurrentOutfit(outfit);
} catch (error) {
  console.error('Generation failed:', error);
  setError('Unable to generate outfit. Please try again.');
  // Show retry button and wardrobe link
}
```

### Save Operation Failures

**Scenario**: Database save fails

**Handling**:
1. Use existing server action error handling
2. Display error message to user
3. Keep generated outfit in UI (don't clear)
4. Allow user to retry save
5. Log error details for debugging

**Implementation**:
```typescript
const handleSave = async (loved: boolean) => {
  setSaving(true);
  try {
    const result = await createOutfit({
      name: `Today's Outfit - ${new Date().toLocaleDateString()}`,
      source: 'generated',
      loved,
      items: currentOutfit.itemIds,
    });
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    // Show success message
    setShowSuccess(true);
  } catch (error) {
    console.error('Save failed:', error);
    setError('Failed to save outfit. Please try again.');
  } finally {
    setSaving(false);
  }
};
```

## Testing Strategy

### Dual Testing Approach

The testing strategy combines unit tests for specific examples and edge cases with property-based tests for universal properties across all inputs. Both approaches are complementary and necessary for comprehensive coverage.

### Unit Testing

**Focus Areas**:
- Specific examples demonstrating correct behavior
- Edge cases (empty wardrobe, missing categories, extreme weather)
- Error conditions (invalid inputs, missing data)
- Integration points (weather hook, database actions)

**Example Unit Tests**:
```typescript
describe('Weather Normalization', () => {
  it('classifies 50°F as cold', () => {
    const context = normalizeWeatherContext({ temperature: 50 }, []);
    expect(context.isCold).toBe(true);
    expect(context.targetWeight).toBe(3);
  });
  
  it('classifies 95°F as hot', () => {
    const context = normalizeWeatherContext({ temperature: 95 }, []);
    expect(context.isHot).toBe(true);
    expect(context.targetWeight).toBe(0);
  });
  
  it('handles missing weather data with defaults', () => {
    const context = normalizeWeatherContext(null, []);
    expect(context.isMild).toBe(true);
    expect(context.targetWeight).toBe(1);
  });
});

describe('Outfit Generation', () => {
  it('includes required categories', () => {
    const outfit = generateOutfit({ wardrobeItems: mockWardrobe, weatherContext: mockWeather });
    expect(outfit.items.shirt).toBeDefined();
    expect(outfit.items.pants).toBeDefined();
    expect(outfit.items.shoes).toBeDefined();
  });
  
  it('includes jacket in cold weather', () => {
    const coldWeather = { ...mockWeather, isCold: true, targetWeight: 3 };
    const outfit = generateOutfit({ wardrobeItems: mockWardrobe, weatherContext: coldWeather });
    expect(outfit.items.jacket || outfit.items.overshirt).toBeDefined();
  });
  
  it('handles empty wardrobe gracefully', () => {
    expect(() => {
      generateOutfit({ wardrobeItems: [], weatherContext: mockWeather });
    }).toThrow('Missing required categories');
  });
});
```

### Property-Based Testing

**Configuration**:
- Minimum 100 iterations per property test
- Use fast-check library for TypeScript
- Tag each test with feature name and property number
- Focus on pure business logic (not UI rendering)

**Property Test Examples**:
```typescript
import fc from 'fast-check';

describe('Property Tests: Weather Normalization', () => {
  it('Property 2: Temperature classification is exclusive', () => {
    fc.assert(
      fc.property(
        fc.float({ min: -50, max: 150 }),
        (temp) => {
          const context = normalizeWeatherContext({ temperature: temp }, []);
          const bands = [context.isCold, context.isMild, context.isWarm, context.isHot];
          const trueCount = bands.filter(b => b).length;
          expect(trueCount).toBe(1); // Exactly one band is true
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
  
  // Feature: today-outfit-generator, Property 3: Temperature swing calculation
  it('Property 3: Daily swing equals high minus low', () => {
    fc.assert(
      fc.property(
        fc.float({ min: -50, max: 150 }),
        fc.float({ min: -50, max: 150 }),
        (temp1, temp2) => {
          const high = Math.max(temp1, temp2);
          const low = Math.min(temp1, temp2);
          const context = normalizeWeatherContext(
            { temperature: (high + low) / 2 },
            [{ temperature: { high, low } }]
          );
          expect(context.dailySwing).toBeCloseTo(high - low, 1);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property Tests: Outfit Generation', () => {
  // Feature: today-outfit-generator, Property 1: Required categories invariant
  it('Property 1: Generated outfits always include Shirt, Pants, Shoes', () => {
    fc.assert(
      fc.property(
        wardrobeArbitrary,
        weatherContextArbitrary,
        (wardrobe, weather) => {
          // Filter to ensure required categories exist
          const hasRequired = ['Shirt', 'Pants', 'Shoes'].every(cat =>
            wardrobe.some(item => item.category?.name === cat)
          );
          
          if (!hasRequired) return true; // Skip if missing required
          
          const outfit = generateOutfit({ wardrobeItems: wardrobe, weatherContext: weather });
          expect(outfit.items.shirt).toBeDefined();
          expect(outfit.items.pants).toBeDefined();
          expect(outfit.items.shoes).toBeDefined();
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
  
  // Feature: today-outfit-generator, Property 12: Formality alignment
  it('Property 12: All items have aligned formality scores', () => {
    fc.assert(
      fc.property(
        wardrobeArbitrary,
        weatherContextArbitrary,
        (wardrobe, weather) => {
          const hasRequired = ['Shirt', 'Pants', 'Shoes'].every(cat =>
            wardrobe.some(item => item.category?.name === cat)
          );
          
          if (!hasRequired) return true;
          
          const outfit = generateOutfit({ wardrobeItems: wardrobe, weatherContext: weather });
          const scores = Object.values(outfit.items)
            .filter(item => item)
            .map(item => item.formality_score || 5);
          
          const median = scores.sort()[Math.floor(scores.length / 2)];
          const maxDiff = Math.max(...scores.map(s => Math.abs(s - median)));
          
          expect(maxDiff).toBeLessThanOrEqual(4);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
  
  // Feature: today-outfit-generator, Property 20: Swap category isolation
  it('Property 20: Swapping one category preserves all others', () => {
    fc.assert(
      fc.property(
        wardrobeArbitrary,
        weatherContextArbitrary,
        fc.constantFrom('shirt', 'pants', 'shoes'),
        (wardrobe, weather, categoryToSwap) => {
          const hasRequired = ['Shirt', 'Pants', 'Shoes'].every(cat =>
            wardrobe.some(item => item.category?.name === cat)
          );
          
          if (!hasRequired) return true;
          
          const original = generateOutfit({ wardrobeItems: wardrobe, weatherContext: weather });
          const swapped = swapItem({
            currentOutfit: original,
            category: categoryToSwap,
            wardrobeItems: wardrobe,
            weatherContext: weather,
          });
          
          // Check all other categories unchanged
          Object.keys(original.items).forEach(cat => {
            if (cat !== categoryToSwap && original.items[cat]) {
              expect(swapped.items[cat]?.id).toBe(original.items[cat]?.id);
            }
          });
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

**Generators (Arbitraries)**:
```typescript
// Simple, realistic generators for property tests
const wardrobeItemArbitrary = fc.record({
  id: fc.uuid(),
  user_id: fc.uuid(),
  category_id: fc.uuid(),
  name: fc.oneof(
    fc.constant('Blue Oxford Shirt'),
    fc.constant('Grey Chinos'),
    fc.constant('Brown Leather Shoes'),
    fc.constant('Navy Blazer'),
    fc.constant('White T-Shirt')
  ),
  formality_score: fc.integer({ min: 1, max: 10 }),
  capsule_tags: fc.array(
    fc.oneof(
      fc.constant('Refined'),
      fc.constant('Crossover'),
      fc.constant('Adventurer')
    ),
    { maxLength: 2 }
  ),
  season: fc.array(
    fc.oneof(
      fc.constant('Spring'),
      fc.constant('Summer'),
      fc.constant('Fall'),
      fc.constant('Winter')
    ),
    { minLength: 1, maxLength: 4 }
  ),
  active: fc.constant(true),
  category: fc.record({
    name: fc.oneof(
      fc.constant('Shirt'),
      fc.constant('Pants'),
      fc.constant('Shoes'),
      fc.constant('Jacket'),
      fc.constant('Belt')
    ),
  }),
});

const wardrobeArbitrary = fc.array(wardrobeItemArbitrary, { minLength: 3, maxLength: 20 });

const weatherContextArbitrary = fc.record({
  isCold: fc.boolean(),
  isMild: fc.boolean(),
  isWarm: fc.boolean(),
  isHot: fc.boolean(),
  isRainLikely: fc.boolean(),
  dailySwing: fc.float({ min: 0, max: 40 }),
  hasLargeSwing: fc.boolean(),
  targetWeight: fc.integer({ min: 0, max: 3 }),
  currentTemp: fc.float({ min: -20, max: 120 }),
  highTemp: fc.float({ min: -20, max: 120 }),
  lowTemp: fc.float({ min: -20, max: 120 }),
  precipChance: fc.float({ min: 0, max: 1 }),
});
```

### Test Coverage Goals

- **Unit Tests**: Cover all edge cases, error conditions, and specific examples
- **Property Tests**: Verify universal properties hold across all valid inputs
- **Integration Tests**: Test weather hook integration, database operations, navigation
- **Accessibility Tests**: Verify keyboard navigation, screen reader compatibility
- **Performance Tests**: Ensure generation completes in <100ms for typical wardrobes

### Testing Best Practices

1. **Keep property tests fast**: Target <100ms per test, use numRuns: 100
2. **Test pure functions**: Focus on business logic, not UI rendering
3. **Use realistic generators**: Produce data that matches actual usage patterns
4. **Tag all property tests**: Include feature name and property number in comments
5. **Balance unit and property tests**: Use both approaches for comprehensive coverage
6. **Test error handling**: Verify graceful degradation for all failure scenarios
7. **Avoid excessive mocking**: Test at appropriate abstraction levels

## Implementation Notes

### Pure Function Architecture

All generation logic must be implemented as pure functions with no side effects:

```typescript
// ✅ Pure function - deterministic, no side effects
export function generateOutfit(options: GenerationOptions): GeneratedOutfit {
  const { wardrobeItems, weatherContext, excludeItems = [] } = options;
  
  // All logic is pure - no database calls, no API calls, no mutations
  const enrichedItems = enrichItems(wardrobeItems);
  const availableItems = filterExcluded(enrichedItems, excludeItems);
  const selectedItems = selectItems(availableItems, weatherContext);
  
  return {
    items: selectedItems,
    itemIds: Object.values(selectedItems).map(item => item.id),
    scores: calculateScores(selectedItems, weatherContext),
    swappable: determineSwappable(availableItems, selectedItems),
    weatherContext,
    generatedAt: new Date(),
  };
}

// ❌ Impure function - has side effects
export async function generateOutfitImpure(userId: string): Promise<GeneratedOutfit> {
  // Side effect: database query
  const items = await supabase.from('wardrobe_items').select('*').eq('user_id', userId);
  
  // Side effect: API call
  const weather = await fetch('/api/weather');
  
  // This is harder to test and less predictable
  return generateOutfit({ wardrobeItems: items, weatherContext: weather });
}
```

### Performance Considerations

- **Generation Speed**: Target <100ms for typical wardrobes (20-50 items)
- **Memoization**: Use React.useMemo for expensive calculations
- **Lazy Loading**: Load images progressively, not all at once
- **Debouncing**: Debounce rapid regenerate clicks
- **Caching**: Cache enriched items and scores when possible

### Accessibility

- **Keyboard Navigation**: All buttons accessible via Tab, activated with Enter/Space
- **Screen Readers**: Proper ARIA labels on all interactive elements
- **Focus Management**: Clear focus indicators, logical tab order
- **Reduced Motion**: Respect prefers-reduced-motion for animations
- **Color Contrast**: Ensure sufficient contrast for all text and buttons

### Security

- **Authentication**: Server component verifies auth before data access
- **Authorization**: RLS policies ensure users only access their own data
- **Input Validation**: Zod schemas validate all inputs
- **XSS Prevention**: Sanitize all user-generated content
- **CSRF Protection**: Use Next.js built-in CSRF protection

### Database Schema

No new tables required. Uses existing tables:
- `wardrobe_items`: Source data for generation
- `outfits`: Destination for saved outfits
- `outfit_items`: Junction table for outfit-item relationships
- `categories`: Category definitions

### Migration Requirements

None. Feature uses existing database schema.

### Deployment Considerations

- **Feature Flag**: Consider feature flag for gradual rollout
- **Monitoring**: Track generation success rate, performance metrics
- **Error Logging**: Log generation failures for debugging
- **Analytics**: Track user engagement (regenerates, swaps, saves)
- **A/B Testing**: Consider testing different scoring algorithms

## Future Enhancements

### Phase 2 Possibilities

1. **User Preferences**: Allow users to set style preferences (formal vs casual bias)
2. **Occasion-Based Generation**: Generate outfits for specific occasions (work, date, casual)
3. **Color Palette Preferences**: Let users specify preferred color combinations
4. **Seasonal Adjustments**: More sophisticated seasonal item selection
5. **Outfit History**: Track and display previously generated outfits
6. **Favorite Items**: Allow marking items as favorites for more frequent selection
7. **Smart Notifications**: Daily outfit notification at user-specified time
8. **Outfit Ratings**: Let users rate generated outfits to improve algorithm
9. **Multi-Day Planning**: Generate outfits for multiple days ahead
10. **Laundry Tracking**: Exclude items marked as "in laundry"

### Technical Improvements

1. **Machine Learning**: Train model on user preferences and ratings
2. **Advanced Scoring**: More sophisticated compatibility algorithms
3. **Performance Optimization**: Further optimize generation speed
4. **Offline Support**: Cache generated outfits for offline access
5. **Image Analysis**: Use computer vision to infer colors and patterns
6. **Weather Forecasting**: Use multi-day forecast for better recommendations
7. **Social Features**: Share outfits with friends, get feedback
8. **Wardrobe Analytics**: Insights on most/least worn items
9. **Shopping Suggestions**: Recommend items to fill wardrobe gaps
10. **Style Guides**: Educational content on outfit building principles
