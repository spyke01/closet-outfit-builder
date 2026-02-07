# Design Document

## Overview

This design outlines the implementation for splitting the existing "Jacket/Overshirt" category into two separate categories: "Jacket" and "Overshirt". The split will improve wardrobe organization by providing more granular categorization of outerwear items, enabling better outfit recommendations and more precise filtering.

The implementation involves updating data structures, UI components, database schema, and ensuring backward compatibility with existing user data. The system will automatically classify existing items based on their characteristics and maintain all existing functionality while providing enhanced categorization.

## Architecture

### Current Category System

The application currently uses a category-based wardrobe organization with the following structure:

- **Categories Table**: Stores category definitions with `user_id`, `name`, `is_anchor_item`, and `display_order`
- **Wardrobe Items**: Reference categories via `category_id` foreign key
- **Default Categories**: Defined in both seed-user Edge Function and sync script
- **UI Components**: Category dropdowns, filters, and navigation components

### Category Split Architecture

The split will replace the existing "Jacket/Overshirt" category with two new categories through a clean migration:

1. **Data Layer**: Replace "Jacket/Overshirt" with "Jacket" and "Overshirt" in all data arrays
2. **Database Layer**: Create new categories and migrate existing items, then remove old category
3. **Classification Layer**: Implement logic to categorize existing items during migration
4. **UI Layer**: Update components to handle the new categories (no backward compatibility needed)
5. **Migration Layer**: Ensure clean transition with no legacy category references

## Components and Interfaces

### Data Structure Updates

#### Seed-User Edge Function (`supabase/functions/seed-user/index.ts`)

**Current Structure:**
```typescript
const defaultCategories: DefaultCategory[] = [
  { name: 'Jacket/Overshirt', is_anchor_item: true, display_order: 1 },
  // ... other categories
];
```

**Updated Structure:**
```typescript
const defaultCategories: DefaultCategory[] = [
  { name: 'Jacket', is_anchor_item: true, display_order: 1 },
  { name: 'Overshirt', is_anchor_item: true, display_order: 2 },
  { name: 'Shirt', is_anchor_item: true, display_order: 3 },
  // ... other categories with updated display_order
];
```

#### Sync Script (`scripts/sync-wardrobe.js`)

**Current Structure:**
```javascript
const defaultCategories = [
  { name: 'Jacket', is_anchor_item: true, display_order: 1 },
  // ... other categories
];
```

**Updated Structure:**
```javascript
const defaultCategories = [
  { name: 'Jacket', is_anchor_item: true, display_order: 1 },
  { name: 'Overshirt', is_anchor_item: true, display_order: 2 },
  { name: 'Shirt', is_anchor_item: false, display_order: 3 },
  // ... other categories with updated display_order
];
```

### Item Classification System

#### Classification Interface

```typescript
interface ItemClassifier {
  classifyItem(item: WardrobeItem): 'Jacket' | 'Overshirt';
  getClassificationReason(item: WardrobeItem): string;
}

interface ClassificationRule {
  name: string;
  priority: number;
  matches(item: WardrobeItem): boolean;
  category: 'Jacket' | 'Overshirt';
}
```

#### Classification Rules

**Jacket Classification Rules (Higher Priority):**
1. **Structured Outerwear**: Items with "coat", "blazer", "sportcoat", "pea coat", "trench", "mac coat"
2. **Heavy Outerwear**: Items with "moto jacket", "leather jacket", "bomber"
3. **Formal Outerwear**: Items with high formality scores (7+) and jacket-like names
4. **Gilet/Vest**: Items with "gilet", "vest" (sleeveless structured pieces)

**Overshirt Classification Rules (Lower Priority):**
1. **Knit Outerwear**: Items with "cardigan", "sweater", "knit", "pullover"
2. **Casual Layering**: Items with "shacket", "overshirt", "shirt jacket"
3. **Light Layers**: Items with lower formality scores (6 or below) and layering characteristics
4. **Default Fallback**: Any remaining items from the original category

#### Classification Implementation

```typescript
class WardrobeItemClassifier implements ItemClassifier {
  private rules: ClassificationRule[] = [
    // Jacket rules (higher priority)
    {
      name: 'structured_outerwear',
      priority: 10,
      matches: (item) => /\b(coat|blazer|sportcoat|pea coat|trench|mac coat)\b/i.test(item.name),
      category: 'Jacket'
    },
    {
      name: 'heavy_outerwear', 
      priority: 9,
      matches: (item) => /\b(moto jacket|leather jacket|bomber|gilet)\b/i.test(item.name),
      category: 'Jacket'
    },
    {
      name: 'formal_outerwear',
      priority: 8,
      matches: (item) => (item.formality_score || 0) >= 7 && /jacket/i.test(item.name),
      category: 'Jacket'
    },
    // Overshirt rules (lower priority)
    {
      name: 'knit_outerwear',
      priority: 5,
      matches: (item) => /\b(cardigan|sweater|knit|pullover)\b/i.test(item.name),
      category: 'Overshirt'
    },
    {
      name: 'casual_layering',
      priority: 4,
      matches: (item) => /\b(shacket|overshirt|shirt jacket)\b/i.test(item.name),
      category: 'Overshirt'
    },
    {
      name: 'light_layers',
      priority: 3,
      matches: (item) => (item.formality_score || 0) <= 6,
      category: 'Overshirt'
    }
  ];

  classifyItem(item: WardrobeItem): 'Jacket' | 'Overshirt' {
    // Sort rules by priority (highest first)
    const sortedRules = this.rules.sort((a, b) => b.priority - a.priority);
    
    // Find first matching rule
    for (const rule of sortedRules) {
      if (rule.matches(item)) {
        return rule.category;
      }
    }
    
    // Default fallback to Overshirt for unmatched items
    return 'Overshirt';
  }

  getClassificationReason(item: WardrobeItem): string {
    const sortedRules = this.rules.sort((a, b) => b.priority - a.priority);
    
    for (const rule of sortedRules) {
      if (rule.matches(item)) {
        return `Classified as ${rule.category} by rule: ${rule.name}`;
      }
    }
    
    return 'Classified as Overshirt by default fallback';
  }
}
```

### Database Migration Strategy

#### Migration Script Interface

```typescript
interface CategoryMigration {
  migrateCategories(): Promise<void>;
  migrateWardrobeItems(): Promise<void>;
  validateMigration(): Promise<boolean>;
  rollback(): Promise<void>;
}
```

#### Migration Implementation

```sql
-- Step 1: Add new categories for all users who have the old category
INSERT INTO categories (user_id, name, is_anchor_item, display_order)
SELECT DISTINCT 
  c.user_id,
  'Jacket' as name,
  true as is_anchor_item,
  1 as display_order
FROM categories c
WHERE c.name = 'Jacket/Overshirt';

INSERT INTO categories (user_id, name, is_anchor_item, display_order)
SELECT DISTINCT 
  c.user_id,
  'Overshirt' as name,
  true as is_anchor_item,
  2 as display_order
FROM categories c
WHERE c.name = 'Jacket/Overshirt';

-- Step 2: Migrate wardrobe items to new categories based on classification
-- (This will be done programmatically using the classification rules)

-- Step 3: Remove the old "Jacket/Overshirt" category
DELETE FROM categories WHERE name = 'Jacket/Overshirt';

-- Step 4: Update display_order for remaining categories
UPDATE categories SET display_order = 3 WHERE name = 'Shirt';
UPDATE categories SET display_order = 4 WHERE name = 'Pants';
UPDATE categories SET display_order = 5 WHERE name = 'Shoes';
UPDATE categories SET display_order = 6 WHERE name = 'Belt';
UPDATE categories SET display_order = 7 WHERE name = 'Watch';
UPDATE categories SET display_order = 8 WHERE name = 'Undershirt';
```

### UI Component Updates

#### Category Dropdown Component

**Current Interface:**
```typescript
interface CategoryDropdownProps {
  category: string;
  selectedItem: WardrobeItem | null;
  availableItems: WardrobeItem[];
  onSelect: (item: WardrobeItem | null) => void;
}
```

**Updated Implementation:**
- No interface changes required
- Component will automatically work with new categories
- Category names will be passed as props from parent components

#### Wardrobe Search Filters Component

**Current Interface:**
```typescript
interface WardrobeSearchFiltersProps {
  selectedCategory: string;
  categories: Array<{ id: string; name: string }>;
  onCategoryChange: (categoryId: string) => void;
}
```

**Updated Implementation:**
- No interface changes required
- Categories array will include new "Jacket" and "Overshirt" entries
- Existing filtering logic will work with new categories

#### Outfit Creation Components

**Updates Required:**
1. **Category Selection**: Update outfit creation to show separate Jacket/Overshirt options
2. **Item Filtering**: Ensure filtering works correctly with new categories
3. **Visual Layout**: Update outfit display to handle both categories appropriately

## Data Models

### Category Model

```typescript
interface Category {
  id: string;
  user_id: string;
  name: string;
  is_anchor_item: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}
```

**No changes required** - existing model supports the new categories.

### Wardrobe Item Model

```typescript
interface WardrobeItem {
  id: string;
  user_id: string;
  category_id: string;
  name: string;
  brand?: string;
  color?: string;
  formality_score?: number;
  capsule_tags?: string[];
  season?: string[];
  image_url?: string;
  active: boolean;
  external_id?: string;
  created_at: string;
  updated_at: string;
}
```

**No changes required** - existing model supports the category split through `category_id` foreign key.

### Migration Data Model

```typescript
interface MigrationResult {
  totalItems: number;
  jacketItems: number;
  overshirtItems: number;
  errors: Array<{
    itemId: string;
    error: string;
  }>;
  classifications: Array<{
    itemId: string;
    originalCategory: string;
    newCategory: string;
    reason: string;
  }>;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

<function_calls>
<invoke name="prework">
<parameter name="featureName">category-split-jacket-overshirt

### Property Reflection

After analyzing the acceptance criteria, several properties can be consolidated to eliminate redundancy:

**Redundant Properties Identified:**
- Requirements 3.2 and 3.3 (category filtering) are essentially the same as 5.1 and 5.2 (search filtering)
- Requirements 4.2 and 4.5 (outfit component handling) can be combined into a single comprehensive property
- Requirements 6.4 and 6.5 (database querying and data preservation) can be combined
- Requirements 7.2 and 7.3 (anchor-based discovery) follow the same pattern and can be generalized

**Consolidated Properties:**
- Combine filtering properties into a single comprehensive filtering property
- Merge outfit handling properties into one property about outfit component management
- Consolidate database properties into data integrity and query correctness
- Generalize anchor properties into a single anchor-based discovery property

### Core Correctness Properties

**Property 1: Category Data Structure Consistency**
*For any* data structure update, all arrays and configurations should contain exactly the "Jacket" and "Overshirt" categories and no "Jacket/Overshirt" category
**Validates: Requirements 1.1, 1.3, 1.5**

**Property 2: Item Classification Correctness**
*For any* wardrobe item originally from the "Jacket/Overshirt" category, the classification system should assign it to either "Jacket" or "Overshirt" based on the defined rules, and the classification should be deterministic
**Validates: Requirements 1.2, 2.1, 2.2, 2.3, 2.4**

**Property 3: Complete Migration Without Data Loss**
*For any* migration operation, all wardrobe items originally in "Jacket/Overshirt" category should be migrated to either "Jacket" or "Overshirt", with no items remaining in the old category and no items lost
**Validates: Requirements 1.6, 6.5, 8.1**

**Property 4: Category Filtering Consistency**
*For any* category filter operation, selecting "Jacket" should return only items classified as Jacket, and selecting "Overshirt" should return only items classified as Overshirt, with no references to the old category
**Validates: Requirements 3.2, 3.3, 5.1, 5.2**

**Property 5: Outfit Component Independence**
*For any* outfit creation or modification, items from Jacket and Overshirt categories should be treated as independent components that can be selected separately or simultaneously
**Validates: Requirements 4.2, 4.5, 4.6**

**Property 6: Database Integrity After Migration**
*For any* database operation after migration, no references to "Jacket/Overshirt" category should exist, all category references should be valid, and queries by new categories should return correct results
**Validates: Requirements 6.1, 6.2, 6.3, 6.4**

**Property 7: Anchor-Based Discovery Functionality**
*For any* anchor item from either Jacket or Overshirt category, the recommendation system should find appropriate outfit combinations that include that anchor item
**Validates: Requirements 7.2, 7.3, 7.4, 7.6**

**Property 8: Clean Migration Without Legacy References**
*For any* existing user data after migration, all functionality should work with the new categories only, with no legacy "Jacket/Overshirt" references remaining in the system
**Validates: Requirements 8.1, 8.2, 8.4, 8.5**

**Property 9: Multi-Category Selection Support**
*For any* filtering interface, users should be able to select multiple categories including both Jacket and Overshirt simultaneously, and the results should include items from all selected categories
**Validates: Requirements 5.3**

**Property 10: Outfit Scoring Consistency**
*For any* outfit containing items from the new categories, the scoring algorithm should produce consistent and valid scores that account for the category distinction
**Validates: Requirements 4.3, 7.6**

## Error Handling

### Classification Errors

**Ambiguous Items:**
- Items that don't clearly fit either category will default to "Overshirt"
- Log classification decisions for manual review
- Provide admin interface to reclassify items if needed

**Missing Data:**
- Items without names or formality scores will use fallback classification
- Items with null/undefined properties will be handled gracefully
- Maintain data integrity even with incomplete item information

### Migration Errors

**Database Failures:**
- Implement transaction rollback for failed migrations
- Provide detailed error logging with item-specific failures
- Allow partial migration recovery and retry mechanisms

**Category Creation Failures:**
- Handle cases where categories already exist for some users
- Ensure idempotent migration operations
- Validate category creation before proceeding with item migration

### UI Error Handling

**Category Loading Failures:**
- Display fallback UI when categories fail to load
- Provide retry mechanisms for failed category requests
- Maintain functionality with cached category data

**Filter State Errors:**
- Handle invalid category selections gracefully
- Reset filters to safe defaults when errors occur
- Preserve user experience during temporary failures

## Testing Strategy

### Dual Testing Approach

The testing strategy employs both unit tests and property-based tests to ensure comprehensive coverage:

**Unit Tests:**
- Specific examples of item classification (e.g., "Pea Coat" → "Jacket")
- Edge cases like empty item names or missing formality scores
- UI component rendering with new categories
- Database migration success and failure scenarios

**Property-Based Tests:**
- Universal properties across all wardrobe items and categories
- Comprehensive input coverage through randomization
- Validation of system behavior across all possible inputs
- Minimum 100 iterations per property test

### Property-Based Testing Configuration

**Testing Framework:** Use fast-check for TypeScript/JavaScript property-based testing

**Test Configuration:**
- Minimum 100 iterations per property test
- Each property test references its design document property
- Tag format: **Feature: category-split-jacket-overshirt, Property {number}: {property_text}**

**Property Test Examples:**

```typescript
// Property 1: Category Data Structure Consistency
fc.assert(fc.property(
  fc.array(fc.record({
    name: fc.string(),
    is_anchor_item: fc.boolean(),
    display_order: fc.integer()
  })),
  (categories) => {
    const updatedCategories = applyCategorySplit(categories);
    const hasJacket = updatedCategories.some(c => c.name === 'Jacket');
    const hasOvershirt = updatedCategories.some(c => c.name === 'Overshirt');
    const hasOldCategory = updatedCategories.some(c => c.name === 'Jacket/Overshirt');
    
    return hasJacket && hasOvershirt && !hasOldCategory;
  }
), { numRuns: 100 });
// Feature: category-split-jacket-overshirt, Property 1: Category Data Structure Consistency

// Property 2: Item Classification Correctness  
fc.assert(fc.property(
  fc.record({
    name: fc.string(),
    formality_score: fc.option(fc.integer(1, 10)),
    category: fc.constant('Jacket/Overshirt')
  }),
  (item) => {
    const classifier = new WardrobeItemClassifier();
    const result = classifier.classifyItem(item);
    
    return result === 'Jacket' || result === 'Overshirt';
  }
), { numRuns: 100 });
// Feature: category-split-jacket-overshirt, Property 2: Item Classification Correctness

// Property 3: Complete Migration Without Data Loss
fc.assert(fc.property(
  fc.array(fc.record({
    id: fc.string(),
    name: fc.string(),
    category: fc.constant('Jacket/Overshirt'),
    formality_score: fc.option(fc.integer(1, 10))
  })),
  (items) => {
    const migratedItems = migrateItems(items);
    const allMigrated = migratedItems.every(item => 
      item.category === 'Jacket' || item.category === 'Overshirt'
    );
    const noDataLoss = migratedItems.length === items.length;
    const noOldCategory = !migratedItems.some(item => item.category === 'Jacket/Overshirt');
    
    return allMigrated && noDataLoss && noOldCategory;
  }
), { numRuns: 100 });
// Feature: category-split-jacket-overshirt, Property 3: Complete Migration Without Data Loss
```

### Integration Testing

**Database Integration:**
- Test complete migration workflows with real database connections
- Validate data integrity across migration operations
- Test rollback scenarios and recovery procedures

**UI Integration:**
- Test category filtering across all UI components
- Validate outfit creation with new categories
- Test anchor-based navigation with split categories

**API Integration:**
- Test category-related API endpoints with new data structure
- Validate outfit scoring with new categories
- Test search and filtering APIs with updated categories

### Performance Testing

**Migration Performance:**
- Test migration speed with large datasets (1000+ items per user)
- Validate memory usage during classification operations
- Ensure migration completes within acceptable timeframes

**UI Performance:**
- Test category filtering response times with new structure
- Validate outfit creation performance with additional categories
- Ensure no performance regression in existing functionality

**Database Performance:**
- Test query performance with additional category entries
- Validate index effectiveness with new category structure
- Monitor database load during migration operations