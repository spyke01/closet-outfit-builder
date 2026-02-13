# Wardrobe Onboarding Wizard - Implementation Tasks

## MVP Phase (Get to Working Prototype)

- [x] 1. Create Data Layer and Types
- [x] 1.1 Create `lib/data/onboarding-categories.ts`
  **Requirements:** FR-3.2.1, FR-3.2.2, FR-3.2.3, CR-11.3.1
  **Description:** Define onboarding category structure with subcategories, formality scores, and season tags.
  - ONBOARDING_CATEGORIES array with 6 categories (Tops, Bottoms, Shoes, Layers, Dresses, Accessories)
  - Each category includes subcategories with formality scores (1-10) and default seasons
  - Gender-neutral descriptions and Lucide icon names for all categories
  - Essential categories marked (Tops, Bottoms, Shoes pre-selected in UI)

- [x] 1.2 Create `lib/types/onboarding.ts`
  **Requirements:** FR-3.4.1, FR-3.4.5
  **Description:** Define TypeScript interfaces for wizard state and data flow.
  - CategoryKey type union for type-safe category references
  - StyleBaseline interface (primaryUse, climate) for Step 1 data
  - SubcategoryColorSelection interface for Step 4 data
  - GeneratedWardrobeItem interface and QuantityLabel type with QUANTITY_MAP constant

- [x] 1.3 Create `lib/services/onboarding-generator.ts`
  **Requirements:** FR-3.4.1, FR-3.4.2, FR-3.4.3, FR-3.4.4, FR-3.4.5, FR-3.4.6
  **Description:** Implement item generation logic from user selections.
  - generateWardrobeItems function that applies quantity multipliers (None=0, 1=1, 2-3=3, 4-6=5, 7+=7)
  - Generate item names as "{color} {subcategory}" format
  - Set formality scores from subcategory definitions and season tags from climate selection
  - Apply item cap when enabled (default 50 items max)

- [x] 2. Build Wizard UI Components
- [x] 2.1 Create `components/onboarding/wizard-stepper.tsx`
  **Requirements:** NFR-4.2.3, NFR-4.3.2
  **Description:** Visual progress indicator showing current wizard step.
  - Step indicators with numbers and progress line
  - Highlight current step with visual distinction
  - Semantic HTML with ARIA labels for accessibility
  - Support light and dark modes with Tailwind classes

- [x] 2.2 Create `components/onboarding/step-style-baseline.tsx`
  **Requirements:** 2.2, FR-3.1.2
  **Description:** Collect primary clothing use and climate preferences.
  - 3 primary use options (Work, Casual, Mixed) with Lucide icons
  - 3 climate options (Hot, Cold, Mixed) with Lucide icons
  - Descriptions for each option to guide user selection
  - Validation that both selections are required before proceeding

- [x] 2.3 Create `components/onboarding/step-category-ownership.tsx`
  **Requirements:** 2.3, FR-3.1.3
  **Description:** Let users select which clothing categories they own.
  - Responsive grid of category cards with icons and descriptions
  - Pre-select essential categories (Tops, Bottoms, Shoes)
  - Visual distinction between essential and optional categories
  - Validate at least one category selected with checkbox pattern and ARIA

- [x] 2.4 Create `components/onboarding/step-subcategory-selection.tsx`
  **Requirements:** 2.4, FR-3.1.4
  **Description:** Choose specific item types within each selected category.
  - Group subcategories by parent category with collapsible sections
  - Checkbox grid for each category's subcategories
  - "Select All/None" buttons per category for convenience
  - Validate at least one subcategory selected with semantic HTML

- [x] 2.5 Create `components/onboarding/step-colors-quantity.tsx`
  **Requirements:** 2.5, FR-3.1.5, FR-3.3.1, FR-3.3.2
  **Description:** Collect color and quantity information for each subcategory.
  - List all selected subcategories with multi-select color picker using COLOR_OPTIONS
  - Color swatches with hex values for visual selection
  - Quantity dropdown per subcategory (None, 1, 2-3, 4-6, 7+)
  - Validate at least one subcategory has colors and quantity > None

- [x] 2.6 Create `components/onboarding/step-review.tsx`
  **Requirements:** 2.6, FR-3.1.6
  **Description:** Preview generated items before database creation.
  - Grid of item cards with images (or placeholders) using Next.js Image
  - Item count display and summary statistics
  - Item cap toggle (default 50) with ability to enable/disable
  - Allow removing individual items from preview before creation

- [x] 2.7 Create `components/onboarding/step-success.tsx`
  **Requirements:** 2.7, FR-3.1.7
  **Description:** Confirm successful wardrobe creation with next steps.
  - Success message with celebration icon (Lucide)
  - Display total number of items created
  - Action buttons (View Wardrobe, Generate Outfits) for next steps
  - Accessible button patterns with theme support

- [x] 3. Wire Up Wizard Logic and Persistence
- [x] 3.1 Create `components/onboarding/onboarding-wizard.tsx`
  **Requirements:** FR-3.1.1, FR-3.1.8, FR-3.1.9, FR-3.6.5
  **Description:** Orchestrate wizard flow with state management and navigation.
  - WizardState interface with useState for all wizard data
  - Render WizardStepper and current step component based on state
  - Implement canProceed validation per step and goNext/goBack navigation
  - Generate items before advancing to review step (Step 5)

- [x] 3.2 Create `lib/services/onboarding-category-manager.ts`
  **Requirements:** FR-3.2.4, FR-3.2.5, FR-3.5.1, FR-3.5.2
  **Description:** Ensure categories exist in database before item creation.
  - ensureCategoriesExist function that fetches existing user categories
  - Create missing categories with proper name mapping (Tops→Shirt, Bottoms→Pants, etc.)
  - Return Map<CategoryKey, string> of category IDs for item creation
  - Handle category creation errors gracefully

- [x] 3.3 Create `lib/services/onboarding-persister.ts`
  **Requirements:** FR-3.5.1, FR-3.5.2, FR-3.5.3, FR-3.5.4, FR-3.5.5
  **Description:** Persist generated items to database with error handling.
  - persistWardrobeItems function that maps GeneratedWardrobeItem to CreateWardrobeItemInput
  - Batch insert items in chunks of 50 for performance
  - Handle errors gracefully with detailed logging and return success/failure statistics
  - Set source='onboarding' for all created items

- [x] 3.4 Wire up completion handler in wizard
  **Requirements:** FR-3.5.4, FR-3.5.5, FR-3.6.4
  **Description:** Connect all services for final item creation and redirect.
  - Call ensureCategoriesExist to get category ID map
  - Call persistWardrobeItems to save all generated items
  - Invalidate relevant TanStack Query caches (wardrobe items, categories)
  - Redirect to /wardrobe or /today after successful completion

- [x] 3.5 Create `app/onboarding/page.tsx`
  **Requirements:** FR-3.6.1, FR-3.6.2, FR-3.6.3
  **Description:** Create Next.js route for onboarding wizard.
  - Server component wrapper that renders OnboardingWizard client component
  - Use existing app layout with TopBar and theme toggle
  - Set page metadata (title: "Wardrobe Setup", description)
  - Maintain consistent navigation structure with rest of app

- [x] 4. Add Basic Error Handling and Loading States
- [x] 4.1 Add loading spinners during async operations
  **Requirements:** NFR-4.1.2, NFR-4.1.3
  **Description:** Show loading indicators for item generation and persistence.
  - Spinner during item generation when advancing to review step
  - Progress indicator during database persistence on completion
  - Skeleton loaders for preview images in review step
  - Loading state prevents user interaction during async operations

- [x] 4.2 Add error messages for failures
  **Requirements:** FR-3.5.4, NFR-4.5.4
  **Description:** Display user-friendly error messages for validation and database failures.
  - Inline validation errors for incomplete step requirements
  - User-friendly error messages for database operation failures
  - Highlight incomplete required fields with visual indicators
  - Provide helpful error text with recovery suggestions

- [x] 4.3 Disable navigation during async operations
  **Requirements:** NFR-4.1.2
  **Description:** Prevent navigation while operations are in progress.
  - Disable Back/Next buttons during item generation
  - Disable all navigation during database persistence
  - Show loading state on buttons to indicate progress
  - Re-enable navigation after operation completes or fails

---

## Feedback & Iteration Phase (After MVP Testing)

- [x] 5. Write Core Business Logic Tests
**Requrements:** NFR-4.5.5, NFR-4.5.6
**Description:** Test critical paths to catch regressions.

- [x] 5.1 Create `lib/services/__tests__/onboarding-generator.test.ts` (test quantity multipliers, item names, formality scores, item cap)
- [x] 5.2 Write 3-5 key property tests for critical invariants (item generation matches selections, item cap enforcement, color normalization)

- [x] 6. Polish UI and Accessibility
**Requrements:** NFR-4.2.1, NFR-4.2.2, NFR-4.3.1-NFR-4.3.5
**Description:** Improve mobile experience and accessibility.

- [x] 6.1 Test and fix mobile layouts (ensure 44px touch targets, responsive grids)
- [x] 6.2 Add ARIA labels to all interactive elements
- [x] 6.3 Test keyboard navigation through wizard
- [x] 6.4 Verify theme support (light/dark mode)

---

## Hardening Phase (Pre-Release)

- [x] 7. Comprehensive Testing
**Requrements:** NFR-4.5.5, NFR-4.5.6
**Description:** Full test coverage before production.

- [x] 7.1 Write remaining property tests for all 12 correctness properties (numRuns: 3-5)
- [x] 7.2 Create integration test for complete wizard flow
- [x] 7.3 Add component tests for each step

- [x] 8. Performance and Production Readiness
**Requrements:** NFR-4.1.1, NFR-4.1.4
**Description:** Optimize and prepare for deployment.

- [x] 8.1 Add performance optimizations (memoization, useCallback, lazy loading)
- [x] 8.2 Optimize image loading with Next.js Image
- [x] 8.3 Run final QA (test complete flow, verify database persistence, test error scenarios)
- [x] 8.4 Check bundle size impact and optimize if needed

---

## Notes

**MVP Focus:** Tasks 1-4 get you to a working prototype you can test and iterate on (estimated: 1-2 days)

**Iteration Focus:** Tasks 5-6 add confidence and polish based on feedback (estimated: 1 day)

**Hardening Focus:** Tasks 7-8 prepare for production release (estimated: 1 day)

**Key Principles:**
- Use existing hooks (useCategories, useCreateWardrobeItem) and data (COLOR_OPTIONS)
- Follow Vercel React best practices (direct imports, semantic HTML, accessibility)
- Keep property tests fast (numRuns: 3-5)
- Test files in `__tests__/` directories
- Support light/dark modes throughout
