# Requirements Document

## Introduction

This feature adds explicit color selection to wardrobe item creation and editing, replacing the current color inference system with a user-friendly dropdown selector. The feature includes a one-time migration to extract colors from existing item names and simplifies the codebase by removing color inference logic.

## Glossary

- **Wardrobe_Item**: A clothing item stored in the user's wardrobe with properties including name, category, color, brand, and formality score
- **Color_Field**: The optional string field on WardrobeItem that stores the item's color
- **Color_Inference**: The current system that extracts color keywords from item names (e.g., "Blue Oxford Shirt" → "blue")
- **Color_Dropdown**: A select/dropdown UI component that presents predefined color options
- **Migration_Script**: A one-time script that extracts colors from existing item names and updates the database
- **Add_Item_Form**: The form at app/wardrobe/items/add-item-client.tsx for creating new wardrobe items
- **Edit_Item_Form**: The form at app/wardrobe/items/[id]/item-detail-client.tsx for editing existing items
- **COLOR_KEYWORDS**: The predefined list of supported colors (black, white, grey, gray, navy, blue, cream, khaki, brown, tan, green, red, burgundy, olive, charcoal)

## Requirements

### Requirement 1: Color Dropdown UI

**User Story:** As a user, I want to select a color from a dropdown when adding or editing wardrobe items, so that I can explicitly specify the color without typing it into the item name.

#### Acceptance Criteria

1. WHEN a user views the Add Item form, THE Add_Item_Form SHALL display a color dropdown with predefined color options
2. WHEN a user views the Edit Item form, THE Edit_Item_Form SHALL display a color dropdown with predefined color options
3. THE Color_Dropdown SHALL include all colors from COLOR_KEYWORDS (black, white, grey, gray, navy, blue, cream, khaki, brown, tan, green, red, burgundy, olive, charcoal)
4. THE Color_Dropdown SHALL include an "Unspecified" or empty option for items without a specific color
5. WHEN a user selects a color from the dropdown, THE form SHALL update the color field value
6. THE Color_Dropdown SHALL replace the current text input for color on both forms

### Requirement 2: Data Migration

**User Story:** As a system administrator, I want to migrate existing wardrobe items to extract colors from their names, so that all items have explicit color values without requiring manual user updates.

#### Acceptance Criteria

1. WHEN the migration script runs, THE Migration_Script SHALL query all existing Wardrobe_Items from the database
2. FOR ALL Wardrobe_Items with names containing color keywords, THE Migration_Script SHALL extract the color using the existing Color_Inference logic
3. WHEN a color is extracted from an item name, THE Migration_Script SHALL update the Color_Field in the database with the extracted color
4. WHEN a color is extracted from an item name, THE Migration_Script SHALL remove the color keyword from the item name
5. THE Migration_Script SHALL preserve the original item name if no color keyword is found
6. THE Migration_Script SHALL handle edge cases where multiple color keywords appear in the name (use the first occurrence)
7. THE Migration_Script SHALL log all changes made for audit purposes
8. THE Migration_Script SHALL be idempotent (safe to run multiple times without duplicating changes)

### Requirement 3: Color Inference Removal

**User Story:** As a developer, I want to remove the color inference logic from the codebase, so that the system is simpler and relies on explicit color values.

#### Acceptance Criteria

1. WHEN the color inference removal is complete, THE system SHALL NOT use lib/utils/color-inference.ts for new items
2. WHEN the color inference removal is complete, THE system SHALL NOT use Color_Inference in lib/utils/item-enrichment.ts
3. THE system SHALL use the explicit Color_Field value from the database instead of inferring color
4. THE system SHALL preserve the Color_Field in the database schema (do not remove the column)
5. WHEN outfit scoring or generation uses color, THE system SHALL read the Color_Field directly from Wardrobe_Item
6. THE system SHALL handle items with null or empty Color_Field values gracefully (treat as "unknown" or neutral)

### Requirement 4: Form Validation

**User Story:** As a user, I want the form to validate my color selection, so that I can ensure my wardrobe items have valid color values.

#### Acceptance Criteria

1. THE Add_Item_Form SHALL allow submission with an empty color selection (color is optional)
2. THE Edit_Item_Form SHALL allow submission with an empty color selection (color is optional)
3. WHEN a user submits a form with a color selected, THE system SHALL validate that the color is from the predefined list
4. WHEN a user submits a form, THE system SHALL trim whitespace from the color value before saving
5. THE system SHALL store color values in lowercase for consistency

### Requirement 5: Backward Compatibility

**User Story:** As a developer, I want to ensure backward compatibility with existing outfit scoring and generation, so that the system continues to work correctly after removing color inference.

#### Acceptance Criteria

1. WHEN outfit scoring uses color for harmony calculations, THE system SHALL read the Color_Field directly from Wardrobe_Item
2. WHEN outfit generation filters by color, THE system SHALL use the explicit Color_Field value
3. THE system SHALL treat null or empty Color_Field values as "unknown" for scoring purposes
4. WHEN the isNeutralColor function is called, THE system SHALL continue to work with explicit color values
5. THE system SHALL maintain the same color harmony scoring behavior after migration

### Requirement 6: Migration Script Execution

**User Story:** As a system administrator, I want clear instructions for running the migration script, so that I can safely migrate existing data.

#### Acceptance Criteria

1. THE Migration_Script SHALL include a dry-run mode that shows changes without applying them
2. THE Migration_Script SHALL provide a summary of changes (items updated, colors extracted, names modified)
3. THE Migration_Script SHALL include error handling for database connection failures
4. THE Migration_Script SHALL include error handling for invalid data
5. WHEN the migration completes, THE Migration_Script SHALL output a success message with statistics
6. THE Migration_Script SHALL be executable via npm script (e.g., npm run migrate:colors)
