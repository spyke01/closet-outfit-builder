# Design Document

## Overview

This feature replaces the color inference system with explicit color selection via dropdown UI components. The design includes three main components:

1. **UI Enhancement**: Replace text inputs with dropdown selectors on add/edit forms
2. **Data Migration**: One-time script to extract colors from existing item names
3. **Code Simplification**: Remove color inference logic and use explicit color values

The design maintains backward compatibility with existing outfit scoring and generation while simplifying the codebase.

## Architecture

### Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     User Interface Layer                     │
├─────────────────────────────────────────────────────────────┤
│  AddItemPageClient          ItemDetailPageClient            │
│  └─ ColorDropdown           └─ ColorDropdown                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Data Layer                               │
├─────────────────────────────────────────────────────────────┤
│  WardrobeItem.color (explicit string field)                 │
│  - Stores predefined color values                           │
│  - Optional field (can be null/empty)                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Business Logic Layer                        │
├─────────────────────────────────────────────────────────────┤
│  Outfit Scoring & Generation                                │
│  - Reads color directly from WardrobeItem.color             │
│  - Treats null/empty as "unknown"                           │
│  - Uses isNeutralColor() with explicit values               │
└─────────────────────────────────────────────────────────────┘
```

### Migration Flow

```
┌─────────────────┐
│ Existing Items  │
│ with colors in  │
│ item names      │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Migration Script               │
│  1. Query all items             │
│  2. Extract color from name     │
│  3. Update color field          │
│  4. Remove color from name      │
│  5. Log changes                 │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────┐
│ Updated Items   │
│ with explicit   │
│ color field     │
└─────────────────┘
```

## Components and Interfaces

### Color Dropdown Component

The color dropdown will be implemented inline in both forms (not as a separate component to keep it simple).

**Props/Configuration:**
- `value`: Current color value (string | undefined)
- `onChange`: Callback when color changes
- `className`: Optional styling classes

**Color Options:**
```typescript
const COLOR_OPTIONS = [
  { value: '', label: 'Unspecified', hex: null },

  // Neutrals
  { value: 'black', label: 'Black', hex: '#000000' },
  { value: 'white', label: 'White', hex: '#FFFFFF' },
  { value: 'grey', label: 'Grey', hex: '#808080' },
  { value: 'gray', label: 'Gray', hex: '#808080' },
  { value: 'charcoal', label: 'Charcoal', hex: '#36454F' },
  { value: 'ivory', label: 'Ivory', hex: '#FFFFF0' },
  { value: 'cream', label: 'Cream', hex: '#FFFDD0' },
  { value: 'beige', label: 'Beige', hex: '#F5F5DC' },
  { value: 'taupe', label: 'Taupe', hex: '#8B8589' },
  { value: 'stone', label: 'Stone', hex: '#D6D2C4' },

  // Blues
  { value: 'navy', label: 'Navy', hex: '#0B1C2D' },
  { value: 'blue', label: 'Blue', hex: '#0033A0' },
  { value: 'light-blue', label: 'Light Blue', hex: '#ADD8E6' },
  { value: 'sky-blue', label: 'Sky Blue', hex: '#87CEEB' },
  { value: 'teal', label: 'Teal', hex: '#008080' },

  // Browns / Earth
  { value: 'brown', label: 'Brown', hex: '#6F4E37' },
  { value: 'tan', label: 'Tan', hex: '#D2B48C' },
  { value: 'khaki', label: 'Khaki', hex: '#C3B091' },
  { value: 'camel', label: 'Camel', hex: '#C19A6B' },
  { value: 'chocolate', label: 'Chocolate', hex: '#4E342E' },

  // Greens
  { value: 'green', label: 'Green', hex: '#2E7D32' },
  { value: 'olive', label: 'Olive', hex: '#556B2F' },
  { value: 'forest', label: 'Forest Green', hex: '#014421' },
  { value: 'sage', label: 'Sage', hex: '#9CAF88' },

  // Reds / Warm
  { value: 'red', label: 'Red', hex: '#C62828' },
  { value: 'burgundy', label: 'Burgundy', hex: '#800020' },
  { value: 'maroon', label: 'Maroon', hex: '#5C1A1B' },
  { value: 'rust', label: 'Rust', hex: '#B7410E' },

  // Yellows / Accents
  { value: 'yellow', label: 'Yellow', hex: '#FBC02D' },
  { value: 'mustard', label: 'Mustard', hex: '#D4A017' },

  // Pinks / Purples
  { value: 'pink', label: 'Pink', hex: '#F4A6B8' },
  { value: 'blush', label: 'Blush', hex: '#F2B6C6' },
  { value: 'purple', label: 'Purple', hex: '#6A1B9A' },
  { value: 'lavender', label: 'Lavender', hex: '#C7B7E2' },

  // Pattern / Special
  { value: 'denim', label: 'Denim', hex: '#3B5F8A' },
  { value: 'multicolor', label: 'Multicolor', hex: null },
];
```

### Migration Script Interface

**Location:** `scripts/migrate-colors.ts`

**Functions:**

```typescript
interface MigrationResult {
  totalItems: number;
  itemsUpdated: number;
  colorsExtracted: number;
  namesModified: number;
  errors: string[];
}

async function migrateColors(dryRun: boolean): Promise<MigrationResult>
async function extractColorFromName(name: string): { color: string | null; cleanedName: string }
async function updateItem(itemId: string, color: string, newName: string): Promise<void>
```

**Migration Logic:**

1. Query all wardrobe items from database
2. For each item:
   - Use `inferColor()` from color-inference.ts to extract color
   - If color found (not 'unknown'):
     - Remove color keyword from name using regex
     - Update database with new color and cleaned name
   - Log the change
3. Return summary statistics

### Updated Item Enrichment

**Modified Function:**

```typescript
// lib/utils/item-enrichment.ts
export function enrichItem(item: WardrobeItem): EnrichedItem {
  // Use explicit color field instead of inference
  const color: ColorCategory = item.color || 'unknown';
  
  const formalityBand: FormalityBand = classifyFormalityBand(item.formality_score);
  const categoryName = item.category?.name;
  const weatherWeight: number = inferWeatherWeight(categoryName, item.season);
  
  return {
    ...item,
    color, // Use explicit color instead of inferredColor
    formalityBand,
    weatherWeight,
  };
}
```

## Data Models

### WardrobeItem (No Changes)

The existing schema already supports the color field:

```typescript
interface WardrobeItem {
  id: string;
  user_id: string;
  category_id: string;
  name: string;
  brand?: string;
  color?: string; // Existing optional field
  material?: string;
  formality_score?: number;
  capsule_tags?: string[];
  season?: string[];
  image_url?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}
```

### Migration Log Entry

```typescript
interface MigrationLogEntry {
  itemId: string;
  originalName: string;
  newName: string;
  extractedColor: string;
  timestamp: string;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Color Dropdown Contains All Supported Colors

*For any* color from COLOR_KEYWORDS, the color dropdown should include that color as an option.

**Validates: Requirements 1.3**

### Property 2: Color Selection Updates Form State

*For any* color selected from the dropdown, the form state should be updated with that color value.

**Validates: Requirements 1.5**

### Property 3: Migration Extracts Colors Correctly

*For any* wardrobe item name containing a color keyword, the migration script should extract the correct color using the inference logic.

**Validates: Requirements 2.2**

### Property 4: Migration Removes Color from Name

*For any* item name where a color is extracted, the migration should remove the color keyword from the name.

**Validates: Requirements 2.4**

### Property 5: Migration Preserves Names Without Colors

*For any* item name without color keywords, the migration should leave the name unchanged.

**Validates: Requirements 2.5**

### Property 6: Migration is Idempotent

*For any* set of wardrobe items, running the migration twice should produce the same result as running it once.

**Validates: Requirements 2.8**

### Property 7: Enrichment Uses Explicit Color Field

*For any* wardrobe item, the enrichment function should use the explicit color field value instead of inferring color from the name.

**Validates: Requirements 3.3, 3.5**

### Property 8: Null Colors Treated as Unknown

*For any* wardrobe item with a null or empty color field, the system should treat it as "unknown" for scoring purposes.

**Validates: Requirements 3.6, 5.3**

### Property 9: Color Validation Accepts Valid Colors

*For any* color from the predefined COLOR_OPTIONS list, form validation should accept the submission.

**Validates: Requirements 4.3**

### Property 10: Color Values Trimmed and Lowercased

*For any* color value submitted through the form, the system should trim whitespace and convert to lowercase before saving.

**Validates: Requirements 4.4, 4.5**

### Property 11: isNeutralColor Works With Explicit Values

*For any* explicit color value, the isNeutralColor function should return the correct result based on whether the color is neutral.

**Validates: Requirements 5.4**

### Property 12: Color Harmony Scoring Preserved

*For any* outfit with the same items, the color harmony score should be the same before and after migration.

**Validates: Requirements 5.5**

## Error Handling

### Form Validation Errors

**Scenario:** User submits form with invalid color value
- **Detection:** Validate color against COLOR_OPTIONS list
- **Response:** Display error message "Invalid color selected"
- **Recovery:** Allow user to select a valid color

**Scenario:** User submits form with empty required fields
- **Detection:** Check for required fields (name, category_id)
- **Response:** Display error message for missing fields
- **Recovery:** Highlight missing fields and prevent submission

### Migration Script Errors

**Scenario:** Database connection failure
- **Detection:** Catch database connection errors
- **Response:** Log error message with connection details
- **Recovery:** Exit script with error code, allow retry

**Scenario:** Invalid item data during migration
- **Detection:** Catch errors during item processing
- **Response:** Log error with item ID and continue processing other items
- **Recovery:** Include failed items in error summary

**Scenario:** Color extraction fails for item
- **Detection:** inferColor() returns 'unknown'
- **Response:** Skip color update for that item, log as "no color found"
- **Recovery:** Continue processing remaining items

### Runtime Errors

**Scenario:** Item has null color field during outfit scoring
- **Detection:** Check for null/undefined color value
- **Response:** Treat as "unknown" color
- **Recovery:** Continue scoring with neutral color assumption

**Scenario:** Color field contains unexpected value
- **Detection:** Color not in predefined list
- **Response:** Treat as "unknown" color
- **Recovery:** Continue processing, log warning

## Testing Strategy

### Unit Tests

**Form Components:**
- Test color dropdown renders all color options
- Test color dropdown updates form state on selection
- Test form submission with selected color
- Test form submission with empty color
- Test color value is trimmed and lowercased

**Migration Script:**
- Test color extraction from various item names
- Test name cleaning removes color keywords correctly
- Test handling of items with no color keywords
- Test handling of items with multiple color keywords
- Test dry-run mode makes no database changes
- Test idempotency (running twice produces same result)

**Item Enrichment:**
- Test enrichItem uses explicit color field
- Test enrichItem handles null color as "unknown"
- Test enrichItem handles empty string color as "unknown"
- Test backward compatibility with outfit scoring

### Property-Based Tests

**Property Tests:**
- Property 1: Color dropdown contains all supported colors
- Property 2: Form submission stores lowercase color
- Property 3: Migration preserves item count
- Property 4: Migration extracts valid colors only
- Property 5: Color removal from name is idempotent
- Property 6: Null color treated as unknown
- Property 7: Color validation rejects invalid values
- Property 8: Migration dry run makes no changes

**Configuration:**
- Minimum 100 iterations per property test
- Tag format: **Feature: explicit-color-selection, Property {number}: {property_text}**

### Integration Tests

**End-to-End Flows:**
- Create new item with color selection
- Edit existing item and change color
- Run migration script on test database
- Verify outfit scoring works with explicit colors
- Verify outfit generation filters by color correctly

### Manual Testing

**User Acceptance:**
- Verify color dropdown is user-friendly
- Verify migration script output is clear
- Verify no visual regressions in forms
- Verify color display in item details view
