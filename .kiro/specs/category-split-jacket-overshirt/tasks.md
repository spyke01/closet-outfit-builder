# Implementation Plan: Category Split Jacket/Overshirt

## Overview

This implementation plan converts the combined "Jacket/Overshirt" category into separate "Jacket" and "Overshirt" categories through a clean migration approach. The plan includes updating data structures, implementing classification logic, creating migration scripts, and updating UI components to handle the new category structure.

## Tasks

- [x] 1. Update data structure definitions
- [x] 1.1 Update seed-user Edge Function category definitions
  - Replace "Jacket/Overshirt" with separate "Jacket" and "Overshirt" entries
  - Update display_order for all categories
  - _Requirements: 1.1, 1.3, 1.5_

- [x] 1.2 Update sync script category definitions
  - Replace "Jacket/Overshirt" with separate "Jacket" and "Overshirt" entries in defaultCategories array
  - Update display_order for all categories to match seed-user
  - _Requirements: 1.1, 1.3, 1.5_

- [x] 1.3 Write property test for data structure consistency
  - **Property 1: Category Data Structure Consistency**
  - **Validates: Requirements 1.1, 1.3, 1.5**

- [x] 2. Implement item classification system
- [x] 2.1 Create WardrobeItemClassifier class
  - Implement classification rules for Jacket vs Overshirt
  - Add priority-based rule matching system
  - Include classification reason logging
  - _Requirements: 1.2, 2.1, 2.2, 2.3, 2.4_

- [x] 2.2 Define classification rules
  - Implement structured outerwear rules (coats, blazers, sportcoats)
  - Implement heavy outerwear rules (moto jackets, leather jackets)
  - Implement knit outerwear rules (cardigans, sweaters)
  - Implement casual layering rules (shackets, overshirts)
  - Add formality score-based classification
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 2.3 Write property test for item classification
  - **Property 2: Item Classification Correctness**
  - **Validates: Requirements 1.2, 2.1, 2.2, 2.3, 2.4**

- [x] 3. Create database migration system
- [x] 3.1 Create migration script for category split
  - Add new "Jacket" and "Overshirt" categories for all users
  - Implement item classification and migration logic
  - Remove old "Jacket/Overshirt" category after migration
  - Update display_order for remaining categories
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 3.2 Implement migration validation and rollback
  - Add validation to ensure migration completeness
  - Implement rollback functionality for failed migrations
  - Add comprehensive error handling and logging
  - _Requirements: 6.3, 6.5, 8.4_

- [x] 3.3 Write property test for complete migration
  - **Property 3: Complete Migration Without Data Loss**
  - **Validates: Requirements 1.6, 6.5, 8.1**

- [x] 3.4 Write property test for database integrity
  - **Property 6: Database Integrity After Migration**
  - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**

- [x] 4. Checkpoint - Ensure core migration logic works
- Ensure all tests pass, ask the user if questions arise.

- [x] 5. Update UI components for new categories
- [x] 5.1 Verify category dropdown component compatibility
  - Test CategoryDropdown component with new categories
  - Ensure proper rendering of Jacket and Overshirt options
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 5.2 Verify wardrobe search filters compatibility
  - Test WardrobeSearchFilters component with new categories
  - Ensure category filtering works correctly
  - _Requirements: 3.2, 3.3, 5.1, 5.2_

- [x] 5.3 Write property test for category filtering
  - **Property 4: Category Filtering Consistency**
  - **Validates: Requirements 3.2, 3.3, 5.1, 5.2**

- [x] 6. Update outfit creation and management
- [x] 6.1 Update outfit creation components
  - Ensure outfit creation works with separate Jacket/Overshirt categories
  - Test category selection and item filtering
  - _Requirements: 4.1, 4.2, 4.5_

- [x] 6.2 Update outfit scoring for new categories
  - Ensure scoring algorithms work correctly with new categories
  - Test outfit compatibility scoring across category split
  - _Requirements: 4.3, 7.6_

- [x] 6.3 Write property test for outfit component independence
  - **Property 5: Outfit Component Independence**
  - **Validates: Requirements 4.2, 4.5, 4.6**

- [x] 6.4 Write property test for outfit scoring consistency
  - **Property 10: Outfit Scoring Consistency**
  - **Validates: Requirements 4.3, 7.6**

- [x] 7. Update anchor-based navigation
- [x] 7.1 Update anchor category navigation
  - Ensure anchor navigation works with Jacket and Overshirt categories
  - Test anchor item selection and outfit discovery
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 7.2 Update anchor-based outfit recommendations
  - Ensure recommendation algorithms work with new categories
  - Test outfit discovery for both Jacket and Overshirt anchors
  - _Requirements: 7.2, 7.3, 7.4, 7.6_

- [x] 7.3 Write property test for anchor-based discovery
  - **Property 7: Anchor-Based Discovery Functionality**
  - **Validates: Requirements 7.2, 7.3, 7.4, 7.6**

- [x] 8. Implement multi-category selection support
- [x] 8.1 Add multi-category filtering support
  - Enable selection of multiple categories including Jacket and Overshirt
  - Implement combined filtering logic for multiple categories
  - _Requirements: 5.3_

- [x] 8.2 Write property test for multi-category selection
  - **Property 9: Multi-Category Selection Support**
  - **Validates: Requirements 5.3**

- [x] 9. Create and run migration script
- [x] 9.1 Execute database migration
  - Run migration script on development database
  - Validate migration results and data integrity
  - Test all functionality with migrated data
  - _Requirements: 6.1, 6.2, 6.3, 8.1, 8.2_

- [x] 9.2 Validate clean migration completion
  - Ensure no "Jacket/Overshirt" references remain in system
  - Test all UI components with migrated data
  - Verify outfit functionality with new categories
  - _Requirements: 8.1, 8.2, 8.4, 8.5_

- [x] 9.3 Write property test for clean migration
  - **Property 8: Clean Migration Without Legacy References**
  - **Validates: Requirements 8.1, 8.2, 8.4, 8.5**

- [x] 10. Integration testing and validation
- [x] 10.1 Test complete user workflows
  - Test wardrobe browsing with new categories
  - Test outfit creation with Jacket and Overshirt items
  - Test anchor-based navigation with new categories
  - _Requirements: 3.1, 4.1, 7.1_

- [x] 10.2 Validate data consistency across application
  - Ensure all category references are valid
  - Test search and filtering across all components
  - Validate outfit scoring and recommendations
  - _Requirements: 6.4, 4.3, 7.4_

- [x] 10.3 Write integration tests for category workflows
  - Test end-to-end category filtering workflows
  - Test outfit creation with new category structure
  - Update existing tests that reference "Jacket/Overshirt" category
  - _Requirements: 3.2, 3.3, 4.2, 4.5_

- [-] 11. Final checkpoint - Ensure all functionality works
- Ensure all tests pass, ask the user if questions arise.

## Notes

- All tests are required to ensure confidence in the category split functionality
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties and catch edge cases
- Integration tests validate complete workflows and update existing test suites
- Tests should be minimal but effective - focused on providing real confidence in the code
- The migration approach completely removes the old "Jacket/Overshirt" category for a clean transition
- Existing tests that reference "Jacket/Overshirt" will need to be updated to use the new categories