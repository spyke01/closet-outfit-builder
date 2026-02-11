# Implementation Plan: Explicit Color Selection

## Overview

This implementation adds explicit color selection via dropdown UI components, migrates existing data to extract colors from item names, and removes color inference logic from the codebase. The implementation is structured to ensure data migration happens before code removal, maintaining system stability throughout.

## Tasks

- [x] 1. Create color constants and utilities
  - Create a shared constants file for COLOR_OPTIONS array
  - Include all colors from COLOR_KEYWORDS (black, white, grey, gray, navy, blue, cream, khaki, brown, tan, green, red, burgundy, olive, charcoal)
  - Add "Unspecified" option with empty string value
  - Export utility function to get color options
  - _Requirements: 1.3, 1.4_

- [x] 2. Update Add Item form with color dropdown
  - [x] 2.1 Replace color text input with select dropdown in add-item-client.tsx
    - Import COLOR_OPTIONS from constants
    - Replace input element with select element
    - Map COLOR_OPTIONS to option elements
    - Maintain existing onChange handler pattern
    - _Requirements: 1.1, 1.6_

- [x] 3. Update Edit Item form with color dropdown
  - [x] 3.1 Replace color text input with select dropdown in item-detail-client.tsx
    - Import COLOR_OPTIONS from constants
    - Replace input element with select element in edit mode
    - Map COLOR_OPTIONS to option elements
    - Maintain existing onChange handler pattern
    - Update display mode to show color name instead of color swatch
    - _Requirements: 1.2, 1.6_

- [x] 4. Add form validation for color field
  - [x] 4.1 Update form submission handlers to validate color
    - Trim whitespace from color value
    - Convert color to lowercase
    - Validate color is in COLOR_OPTIONS list or empty
    - _Requirements: 4.3, 4.4, 4.5_
  
  - [x] 4.2 Write unit tests for color validation logic
    - Test color normalization (trim and lowercase)
    - Test validation accepts valid colors from COLOR_OPTIONS
    - Test validation accepts empty/null color
    - Test validation rejects invalid color values
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 5. Checkpoint - Test form changes
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Create migration script
  - [x] 6.1 Create scripts/migrate-colors.ts
    - Import Supabase client and color inference utilities
    - Implement extractColorFromName function using inferColor()
    - Implement removeColorFromName function using regex
    - Implement main migration function with dry-run support
    - Add error handling for database operations
    - Add logging for all changes
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 6.3, 6.4_
  
  - [x] 6.2 Write unit tests for migration script business logic
    - Test extractColorFromName with various item names
    - Test removeColorFromName removes color keywords correctly
    - Test handling of items with no color keywords
    - Test handling of items with multiple color keywords (uses first)
    - Test idempotency (running extraction twice produces same result)
    - _Requirements: 2.2, 2.4, 2.5, 2.6, 2.8_

- [x] 7. Add npm script for migration
  - [x] 7.1 Add migration script to package.json
    - Add "migrate:colors" script that runs scripts/migrate-colors.ts
    - Add "migrate:colors:dry-run" script with --dry-run flag
    - _Requirements: 6.6_

- [x] 8. Update item enrichment to use explicit color
  - [x] 8.1 Modify enrichItem function in lib/utils/item-enrichment.ts
    - Change from using inferColor(item.name) to item.color || 'unknown'
    - Update return type to use 'color' instead of 'inferredColor'
    - Ensure null/empty colors are treated as 'unknown'
    - _Requirements: 3.3, 3.5, 3.6_
  
  - [x] 8.2 Write unit tests for enrichItem changes
    - Test enrichItem uses explicit color field from item
    - Test null color returns 'unknown'
    - Test empty string color returns 'unknown'
    - Test enrichItem preserves other item properties
    - _Requirements: 3.3, 3.6_

- [x] 9. Update outfit scoring to use explicit colors
  - [x] 9.1 Verify outfit scoring functions use enriched items
    - Check that scoring functions receive EnrichedItem with color field
    - Verify isNeutralColor works with explicit color values
    - Ensure no direct calls to inferColor in scoring logic
    - _Requirements: 5.1, 5.4_
  
  - [x] 9.2 Write unit tests for isNeutralColor with explicit colors
    - Test isNeutralColor returns true for neutral colors (black, white, grey, navy, etc.)
    - Test isNeutralColor returns false for non-neutral colors (red, green, burgundy)
    - Test isNeutralColor handles 'unknown' as neutral
    - _Requirements: 5.4_

- [x] 10. Checkpoint - Test migration and enrichment
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Remove color inference logic
  - [x] 11.1 Remove inferColor usage from item-enrichment.ts
    - Verify enrichItem no longer imports or calls inferColor
    - Update any comments referencing color inference
    - _Requirements: 3.1, 3.2_
  
  - [x] 11.2 Mark color-inference.ts as deprecated
    - Add deprecation comment to file header
    - Note that file is kept for migration script only
    - Document that new code should not use this file
    - _Requirements: 3.1_

- [x] 12. Update EnrichedItem type definition
  - [x] 12.1 Update type in lib/types/generation.ts
    - Change 'inferredColor' field to 'color' in EnrichedItem type
    - Update any type documentation
    - _Requirements: 3.3_

- [x] 13. Final checkpoint - Integration testing
  - [x] 13.1 Run full test suite
    - Ensure all unit tests pass
    - Ensure all property tests pass
    - Ensure no TypeScript errors
    - _Requirements: All_
  
  - [x] 13.2 Manual testing checklist
    - Test creating new item with color dropdown
    - Test editing existing item with color dropdown
    - Test form validation with valid/invalid colors
    - Test outfit scoring still works correctly
    - Verify color display in item details view
    - _Requirements: All_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Migration script should be run BEFORE removing color inference logic
- The color-inference.ts file is kept (not deleted) but marked as deprecated
- All color values are stored in lowercase for consistency
- Empty/null colors are treated as "unknown" throughout the system
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The migration script includes both dry-run and live modes for safety
