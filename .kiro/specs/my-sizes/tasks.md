# Implementation Plan: My Sizes Feature

## Overview

This implementation plan breaks down the My Sizes feature into discrete coding tasks that build incrementally. The approach follows mobile-first design principles, implements data persistence with Supabase, uses TanStack Query for state management, and ensures accessibility compliance throughout. Each task references specific requirements and includes property-based tests for correctness validation.

## Tasks

- [x] 1. Set up database schema and migrations
  - Create Supabase migration file for all five tables (size_categories, standard_sizes, brand_sizes, category_measurements, pinned_preferences)
  - Implement Row Level Security (RLS) policies for user data isolation
  - Add database indexes for performance optimization
  - Add unique constraints and foreign key relationships
  - _Requirements: 10.1, 10.2_

- [x] 1.5 Implement bundle size optimization (CRITICAL)
  - Configure Next.js optimizePackageImports for lucide-react and @radix-ui packages
  - Replace all lucide-react barrel imports with direct imports throughout codebase
  - Add bundle size monitoring script to track impact
  - Set bundle size budget (< 500KB total, < 25KB for My Sizes feature)
  - Document bundle optimization patterns in component guidelines
  - _Requirements: 1.2_
  - _Priority: CRITICAL - Must complete before component development_

- [ ] 2. Create TypeScript types and Zod schemas
  - [ ] 2.1 Define database row interfaces matching Supabase schema
    - Create types for all five tables
    - Export type definitions from `lib/types/sizes.ts`
    - _Requirements: 4.1, 5.1-5.4, 6.1-6.4_
  
  - [ ] 2.2 Create Zod validation schemas
    - Implement schemas for all data models
    - Add format validation for size inputs (letter, numeric, waist/inseam)
    - Add length constraints for text fields
    - Export schemas from `lib/schemas/sizes.ts`
    - Integrate with react-hook-form using zodResolver
    - Add examples of form validation with Zod
    - Add examples of mutation validation with Zod in TanStack Query hooks
    - _Requirements: 5.1-5.4, 6.1-6.4, 12.3_
  
  - [ ]* 2.3 Write property test for sizing format validation
    - **Property 6: Sizing format support**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**

- [ ] 3. Implement TanStack Query hooks for data fetching
  - [ ] 3.1 Create `useSizeCategories` hook
    - Fetch all categories for current user
    - Implement query key structure
    - Add error handling and loading states
    - _Requirements: 1.1, 3.1, 7.4_
  
  - [ ] 3.2 Create `useSizeCategory` hook
    - Fetch single category by ID
    - Include standard size data
    - _Requirements: 2.1, 4.1_
  
  - [ ] 3.3 Create `useBrandSizes` hook
    - Fetch brand sizes filtered by category ID
    - _Requirements: 4.3, 6.5_
  
  - [ ] 3.4 Create `useMeasurements` hook
    - Fetch measurements for a category
    - _Requirements: 13.1, 13.2_
  
  - [ ] 3.5 Create `usePinnedPreferences` hook
    - Fetch pinned preferences ordered by display_order
    - _Requirements: 2.1, 8.5_
  
  - [ ]* 3.6 Write property test for data persistence
    - **Property 14: Data persistence on save**
    - **Validates: Requirements 10.1**

- [ ] 3.7 Integrate intelligent preloading (HIGH)
  - Add sizeManagement feature flag to lib/utils/feature-flags.ts
  - Configure route preloading in lib/hooks/use-intelligent-preloading.ts
  - Add preload configuration for category detail view, brand size form, measurement guide
  - Add preload props to navigation links in CategoryGrid and PinnedCard
  - Test preloading on hover/focus/touch interactions
  - _Requirements: 1.2, 9.2_
  - _Priority: HIGH - Improves perceived performance by 2-3×_

- [ ] 3.8 Implement React.cache() for request deduplication (HIGH)
  - Create lib/supabase/cached-queries.ts
  - Implement getCurrentUser with React.cache()
  - Implement getUserCategories with React.cache()
  - Implement getCategoryWithSizes with React.cache()
  - Update server components to use cached queries
  - _Requirements: 10.1_
  - _Priority: HIGH - Eliminates duplicate auth/user queries_

- [ ] 4. Implement mutation hooks for data updates
  - [ ] 4.1 Create `useCreateCategory` mutation
    - Add new category to database
    - Invalidate categories query cache
    - Implement optimistic updates
    - _Requirements: 7.1, 7.4_
  
  - [ ] 4.2 Create `useUpdateStandardSize` mutation
    - Update standard size for a category
    - Update timestamp automatically
    - Invalidate category and pinned preferences caches
    - _Requirements: 5.5, 10.3_
  
  - [ ] 4.3 Create `useCreateBrandSize` mutation
    - Add brand size to category
    - Validate required fields
    - _Requirements: 6.1, 6.5_
  
  - [ ] 4.4 Create `useUpdateMeasurements` mutation
    - Save measurements with units
    - _Requirements: 13.2, 13.5_
  
  - [ ] 4.5 Create `useUpdatePinnedPreferences` mutation
    - Update pinned card order and display modes
    - _Requirements: 8.5, 15.5_
  
  - [ ] 4.6 Create `useDeleteCategory` mutation
    - Remove category and associated pin references
    - Preserve size data for recovery
    - _Requirements: 7.5, 10.5_
  
  - [ ]* 4.7 Write property test for timestamp updates
    - **Property 7: Timestamp updates on save**
    - **Validates: Requirements 5.5**
  
  - [ ]* 4.8 Write property test for category deletion
    - **Property 11: Category deletion removes from all locations**
    - **Validates: Requirements 7.5**

- [ ] 5. Create utility functions
  - [ ] 5.1 Implement unit conversion functions
    - `convertUnit(value, fromUnit, toUnit)` for imperial/metric conversion
    - `formatMeasurement(value, unit)` for display
    - Add hydration mismatch prevention for localStorage access
    - Add synchronous script for initial unit preference if needed
    - _Requirements: 13.3_
  
  - [ ] 5.2 Implement size format validation
    - Validate letter sizes (XS, S, M, L, XL, etc.)
    - Validate numeric sizes
    - Validate waist/inseam pattern (e.g., "32x34")
    - _Requirements: 5.1-5.4_
  
  - [ ] 5.3 Implement text truncation utility
    - Truncate long text with ellipsis
    - Preserve full text for tooltips
    - _Requirements: 12.3_
  
  - [ ]* 5.4 Write property test for unit conversion round-trip
    - **Property 21: Unit conversion round-trip**
    - **Validates: Requirements 13.3**
  
  - [ ]* 5.5 Write unit tests for size format validation
    - Test each format type with valid and invalid inputs
    - _Requirements: 5.1-5.4_

- [ ] 6. Build PinnedCard component
  - [ ] 6.1 Create PinnedCard component with props interface
    - Accept categoryId, displayMode, preferredBrandId
    - Fetch category data via `useSizeCategory` hook
    - Implement touch target minimum 44x44px
    - Use direct lucide-react imports (not barrel imports)
    - Add preload props for navigation to category detail
    - Implement passive event listeners for touch interactions
    - _Requirements: 2.1, 9.1_
  
  - [ ] 6.2 Implement display mode rendering logic
    - Standard mode: show primary size only
    - Dual mode: show primary and secondary sizes
    - Preferred brand mode: show brand-specific size
    - _Requirements: 15.2, 15.3, 15.4_
  
  - [ ] 6.3 Add tap and long-press gesture handlers
    - Tap: navigate to category detail view
    - Long-press: show context menu (500ms threshold)
    - _Requirements: 2.2, 2.3, 9.4_
  
  - [ ] 6.4 Style for mobile-first responsive design
    - Mobile: card width 85vw with horizontal scroll
    - Tablet+: grid layout
    - _Requirements: 1.4, 1.5_
  
  - [ ]* 6.5 Write property test for pinned card data integrity
    - **Property 1: Pinned card data integrity**
    - **Validates: Requirements 2.4, 10.2, 10.3**
  
  - [ ]* 6.6 Write property test for display mode rendering
    - **Property 27: Display mode rendering - standard**
    - **Property 28: Display mode rendering - dual**
    - **Property 29: Display mode rendering - preferred brand**
    - **Validates: Requirements 15.2, 15.3, 15.4**
  
  - [ ]* 6.7 Write unit tests for PinnedCard component
    - Test rendering with all required fields
    - Test tap and long-press interactions
    - Test responsive layout at different breakpoints
    - _Requirements: 2.1, 2.2, 2.3_

- [ ] 7. Build PinnedCardsSection component
  - [ ] 7.1 Create PinnedCardsSection component
    - Accept pinnedIds prop
    - Query category data for each pinned ID
    - Render PinnedCard components
    - _Requirements: 2.1, 2.4_
  
  - [ ] 7.2 Implement responsive layout
    - Mobile: horizontal scroll with snap points
    - Tablet+: grid with drag-and-drop support
    - Add passive event listeners for touch/scroll events
    - Add content-visibility optimization for many cards (10+)
    - _Requirements: 1.4, 1.5_
  
  - [ ] 7.3 Add empty state for no pinned cards
    - Display message and "Customize" button
    - _Requirements: 12.1_
  
  - [ ]* 7.4 Write unit tests for PinnedCardsSection
    - Test rendering with multiple pinned cards
    - Test empty state display
    - Test responsive layout switching
    - _Requirements: 1.4, 1.5, 12.1_

- [ ] 8. Build CategoryGrid component
  - [ ] 8.1 Create CategoryGrid component
    - Accept categories prop
    - Render category tiles in responsive grid
    - Show category name, size count, "varies by brand" indicator
    - Use Map for O(1) category lookups when needed
    - Add content-visibility optimization for large grids (50+ categories)
    - _Requirements: 3.1_
  
  - [ ] 8.2 Implement responsive grid layout
    - Mobile: 2 columns
    - Tablet: 3 columns
    - Desktop: 4 columns
    - _Requirements: 3.2, 3.3, 3.4_
  
  - [ ] 8.3 Add "Add category" tile as final tile
    - Opens AddCategoryForm on tap
    - _Requirements: 3.5_
  
  - [ ] 8.4 Add empty state for no categories
    - Display guided next actions
    - Large "Add Category" button
    - _Requirements: 1.3, 12.1_
  
  - [ ]* 8.5 Write property test for category grid item completeness
    - **Property 4: Category grid item completeness**
    - **Validates: Requirements 3.1**
  
  - [ ]* 8.6 Write unit tests for CategoryGrid
    - Test grid rendering at different breakpoints
    - Test empty state display
    - Test "Add category" tile presence
    - _Requirements: 3.2-3.5, 1.3_

- [ ] 9. Build MySizesPage component
  - [ ] 9.1 Create MySizesPage server component
    - Fetch initial data server-side
    - Render PinnedCardsSection and CategoryGrid
    - _Requirements: 1.1_
  
  - [ ] 9.2 Implement page layout structure
    - Pinned cards at top
    - Category grid below
    - Proper spacing and padding
    - _Requirements: 1.1_
  
  - [ ] 9.3 Add page load performance optimization
    - Prefetch critical data
    - Implement loading states
    - _Requirements: 1.2_
  
  - [ ]* 9.4 Write unit tests for MySizesPage
    - Test page structure (pinned cards above grid)
    - Test data fetching and rendering
    - _Requirements: 1.1_

- [ ] 9.5 Separate server and client components (HIGH)
  - Create MySizesClient component for client-side logic
  - Update MySizesPage to be pure server component
  - Implement parallel data fetching with Promise.all()
  - Pass initial data to client component via props
  - Add authentication check in server component
  - _Requirements: 1.1, 1.2_
  - _Priority: HIGH - Improves initial load performance by 30-50%_

- [ ] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Build StandardSizeSection component
  - [ ] 11.1 Create StandardSizeSection component
    - Display primary size, secondary size, notes
    - Show last updated timestamp
    - Add edit button
    - _Requirements: 4.2, 5.5_
  
  - [ ] 11.2 Create StandardSizeForm component
    - Support all sizing formats (letter, numeric, waist/inseam, measurements)
    - Validate input based on category's supported formats
    - Integrate with react-hook-form and zodResolver
    - Add proper ARIA labels and error message associations
    - _Requirements: 5.1-5.4_
  
  - [ ] 11.3 Integrate form with mutation hook
    - Call `useUpdateStandardSize` on save
    - Show loading and error states
    - _Requirements: 5.5, 10.1_
  
  - [ ]* 11.4 Write unit tests for StandardSizeSection
    - Test display of all fields
    - Test edit button interaction
    - Test form validation
    - _Requirements: 4.2, 5.1-5.4_

- [ ] 12. Build BrandSizesSection component
  - [ ] 12.1 Create BrandSizesSection component
    - Display list of brand size entries
    - Show brand name, item type, size, fit scale, notes
    - Add "Add brand size" button
    - _Requirements: 4.3, 4.5_
  
  - [ ] 12.2 Implement scrolling/pagination for large lists
    - Handle > 10 brand sizes gracefully
    - _Requirements: 12.4_
  
  - [ ] 12.3 Add empty state for no brand sizes
    - Display message and "Add brand size" button
    - _Requirements: 12.2_
  
  - [ ]* 12.4 Write property test for brand size entry completeness
    - **Property 5: Brand size entry completeness**
    - **Validates: Requirements 4.3**
  
  - [ ]* 12.5 Write unit tests for BrandSizesSection
    - Test list rendering
    - Test empty state
    - Test pagination for large lists
    - _Requirements: 4.3, 12.2, 12.4_

- [ ] 13. Build BrandSizeForm component
  - [ ] 13.1 Create BrandSizeForm component
    - Searchable brand name dropdown with free text fallback
    - Optional item type field
    - Size input field
    - 5-point fit scale selector
    - Optional notes textarea
    - Integrate with react-hook-form and zodResolver
    - Add proper ARIA labels and autocomplete attributes
    - Use functional setState for stable callbacks
    - _Requirements: 6.1-6.4, 14.1-14.3_
  
  - [ ] 13.2 Implement brand name dropdown with search
    - Fetch previously entered brand names
    - Filter in real-time as user types
    - Allow free text entry for new brands
    - _Requirements: 14.1, 14.2, 14.3_
  
  - [ ] 13.3 Implement form validation
    - Require brand name and size
    - Allow optional item type and notes
    - Validate size format based on category
    - _Requirements: 6.1, 6.2, 6.4_
  
  - [ ] 13.4 Integrate with mutation hooks
    - Call `useCreateBrandSize` on save
    - Update brand name dropdown after saving new brand
    - _Requirements: 14.4, 14.5_
  
  - [ ]* 13.5 Write property test for brand size validation
    - **Property 8: Brand size validation**
    - **Validates: Requirements 6.1, 6.2, 6.4**
  
  - [ ]* 13.6 Write property test for brand name persistence
    - **Property 25: New brand name persistence**
    - **Validates: Requirements 14.4**
  
  - [ ]* 13.7 Write unit tests for BrandSizeForm
    - Test form rendering
    - Test validation errors
    - Test brand dropdown search
    - Test fit scale selector
    - _Requirements: 6.1-6.4, 14.1-14.3_

- [ ] 14. Build MeasurementGuideSection component
  - [ ] 14.1 Create MeasurementGuideSection component
    - Display category-specific measurement fields
    - Show unit toggle (imperial/metric)
    - Numeric input fields with validation
    - _Requirements: 13.1, 13.4_
  
  - [ ] 14.2 Implement category-specific field mapping
    - Tops: chest, waist, hip
    - Bottoms: waist, inseam
    - Footwear: foot length, foot width
    - _Requirements: 13.1, 13.4_
  
  - [ ] 14.3 Implement unit conversion on toggle
    - Convert all measurements when unit changes
    - Display in selected unit system
    - _Requirements: 13.3_
  
  - [ ] 14.4 Integrate with mutation hook
    - Call `useUpdateMeasurements` on save
    - Store numeric values with units
    - _Requirements: 13.2, 13.5_
  
  - [ ]* 14.5 Write property test for category-specific measurement fields
    - **Property 19: Category-specific measurement fields**
    - **Validates: Requirements 13.1, 13.4**
  
  - [ ]* 14.6 Write property test for measurement storage
    - **Property 20: Measurement storage with units**
    - **Validates: Requirements 13.2**
  
  - [ ]* 14.7 Write unit tests for MeasurementGuideSection
    - Test field rendering for different categories
    - Test unit toggle and conversion
    - Test numeric validation
    - _Requirements: 13.1-13.4_

- [ ] 15. Build CategoryDetailView component
  - [ ] 15.1 Create CategoryDetailView component
    - Compose StandardSizeSection, BrandSizesSection, MeasurementGuideSection
    - Fetch category data via hooks
    - _Requirements: 4.1_
  
  - [ ] 15.2 Implement responsive presentation
    - Mobile: full-screen view
    - Tablet+: modal or side panel
    - _Requirements: 7.2, 7.3_
  
  - [ ] 15.3 Add navigation and close actions
    - Back button for mobile
    - Close button for modal/panel
    - _Requirements: 2.2_
  
  - [ ]* 15.4 Write unit tests for CategoryDetailView
    - Test three-section layout
    - Test responsive presentation
    - Test navigation actions
    - _Requirements: 4.1, 7.2, 7.3_

- [ ] 15.5 Implement CategoryDetailClient component (HIGH)
  - Create CategoryDetailClient for client-side logic
  - Update CategoryDetailPage to be pure server component
  - Implement parallel data fetching for category, brand sizes, measurements with Promise.all()
  - Pass initial data to client component via props
  - Add authentication check in server component
  - _Requirements: 4.1_
  - _Priority: HIGH - Eliminates waterfalls, reduces load time by 3×_

- [ ] 16. Build AddCategoryForm component
  - [ ] 16.1 Create AddCategoryForm component
    - Category name input with validation
    - Optional icon selection
    - Multi-select for supported sizing formats
    - "Pin to top" toggle
    - _Requirements: 7.1_
  
  - [ ] 16.2 Implement responsive presentation
    - Mobile: full-screen modal
    - Tablet+: dialog
    - _Requirements: 7.2, 7.3_
  
  - [ ] 16.3 Integrate with mutation hook
    - Call `useCreateCategory` on save
    - Optionally create pinned preference if "Pin to top" checked
    - _Requirements: 7.4_
  
  - [ ]* 16.4 Write property test for category creation
    - **Property 10: Category creation adds to grid**
    - **Validates: Requirements 7.4**
  
  - [ ]* 16.5 Write unit tests for AddCategoryForm
    - Test form rendering
    - Test validation
    - Test responsive presentation
    - _Requirements: 7.1-7.3_

- [ ] 17. Build CustomizePinnedCardsView component
  - [ ] 17.1 Create CustomizePinnedCardsView component
    - List all categories with pin/unpin toggles
    - Drag handles for reordering
    - Display mode dropdown per pinned card
    - _Requirements: 8.4_
  
  - [ ] 17.2 Implement drag-and-drop reordering
    - Specify implementation: native HTML5 drag-and-drop API (preferred) or external library
    - If using external library (e.g., react-beautiful-dnd), use dynamic import with ssr: false
    - Update display_order on drop
    - Use functional setState for stable callbacks
    - _Requirements: 8.4, 8.5_
  
  - [ ] 17.3 Implement responsive presentation
    - Mobile: full-screen view via bottom sheet
    - Tablet+: side drawer
    - _Requirements: 8.2, 8.3_
  
  - [ ] 17.4 Integrate with mutation hook
    - Call `useUpdatePinnedPreferences` on save
    - Persist new order and display modes
    - _Requirements: 8.5, 15.5_
  
  - [ ]* 17.5 Write property test for pinned card reordering
    - **Property 12: Pinned card reordering persistence**
    - **Validates: Requirements 8.5**
  
  - [ ]* 17.6 Write property test for display mode updates
    - **Property 30: Display mode update immediacy**
    - **Validates: Requirements 15.5**
  
  - [ ]* 17.7 Write unit tests for CustomizePinnedCardsView
    - Test pin/unpin toggles
    - Test drag-and-drop reordering
    - Test display mode selection
    - Test responsive presentation
    - _Requirements: 8.2-8.4_

- [ ] 18. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 19. Implement accessibility features
  - [ ] 19.1 Add ARIA labels and roles to all interactive elements
    - Buttons, links, form inputs, cards
    - Add specific examples for icon-only buttons with descriptive labels
    - Add live regions for dynamic updates (save success, errors)
    - Add proper form field associations (label, describedby, invalid)
    - _Requirements: 11.3_
  
  - [ ] 19.2 Ensure keyboard navigation support
    - Tab order follows logical flow
    - Enter/Space activate buttons
    - Escape closes modals
    - Arrow keys for drag-and-drop reordering
    - Add onKeyDown handlers for all interactive elements
    - Add focus-visible styles (not just focus) with sufficient contrast
    - _Requirements: 11.4_
  
  - [ ] 19.3 Add visible focus indicators
    - Custom focus styles with sufficient contrast
    - _Requirements: 11.2_
  
  - [ ] 19.4 Verify color contrast compliance
    - Run automated checks with axe-core
    - Fix any contrast issues
    - _Requirements: 11.1_
  
  - [ ]* 19.5 Write property test for touch target sizes
    - **Property 13: Touch target minimum size**
    - **Validates: Requirements 9.1, 11.5**
  
  - [ ]* 19.6 Write property test for ARIA attributes
    - **Property 17: ARIA attributes presence**
    - **Validates: Requirements 11.3**
  
  - [ ]* 19.7 Write accessibility tests
    - Test keyboard navigation flows
    - Test screen reader compatibility
    - Test color contrast with axe-core
    - _Requirements: 11.1-11.4_

- [ ] 20. Implement offline support
  - [ ] 20.1 Configure TanStack Query for offline mode
    - Set networkMode to 'offlineFirst'
    - Configure cache persistence
    - _Requirements: 10.4_
  
  - [ ] 20.2 Implement mutation queueing for offline edits
    - Queue mutations when offline
    - Sync when connection restored
    - _Requirements: 10.1_
  
  - [ ] 20.3 Implement sync conflict resolution UI
    - Detect conflicts via timestamp comparison
    - Show conflict resolution dialog
    - Provide "Keep my changes", "Use server version", "View both" options
    - _Requirements: 12.5_
  
  - [ ]* 20.4 Write unit tests for offline functionality
    - Test cached data access when offline
    - Test mutation queueing
    - Test conflict resolution UI
    - _Requirements: 10.4, 12.5_

- [ ] 21. Add error handling and empty states
  - [ ] 21.1 Implement validation error displays
    - Show field-level errors in forms
    - Display error messages from Zod validation
    - _Requirements: 6.1, 12.3_
  
  - [ ] 21.2 Implement database error handling
    - Connection failures: show retry option
    - Constraint violations: show user-friendly messages
    - _Requirements: 10.1_
  
  - [ ] 21.3 Add all empty states
    - No categories: guided next actions
    - No brand sizes: "Add brand size" prompt
    - No pinned cards: "Customize" prompt
    - _Requirements: 1.3, 12.1, 12.2_
  
  - [ ]* 21.4 Write unit tests for error handling
    - Test validation error display
    - Test database error messages
    - Test empty state rendering
    - _Requirements: 1.3, 12.1, 12.2_

- [ ] 22. Implement text truncation with tooltips
  - [ ] 22.1 Create TextTruncate component
    - Truncate text exceeding container width
    - Add ellipsis
    - Show full text in tooltip on hover/tap
    - _Requirements: 12.3_
  
  - [ ] 22.2 Apply to category and brand names
    - Use in CategoryGrid tiles
    - Use in BrandSizesSection entries
    - Use in PinnedCard displays
    - _Requirements: 12.3_
  
  - [ ]* 22.3 Write property test for text truncation
    - **Property 18: Text truncation with full text access**
    - **Validates: Requirements 12.3**
  
  - [ ]* 22.4 Write unit tests for TextTruncate
    - Test truncation with long strings
    - Test tooltip display
    - _Requirements: 12.3_

- [ ] 23. Add page routing and navigation
  - [ ] 23.1 Create app/sizes/page.tsx route
    - Main My Sizes page
    - _Requirements: 1.1_
  
  - [ ] 23.2 Create app/sizes/[categoryId]/page.tsx route
    - Category detail view page
    - _Requirements: 2.2, 4.1_
  
  - [ ] 23.3 Implement navigation between pages
    - Tap pinned card → navigate to detail view
    - Tap category tile → navigate to detail view
    - Back button → return to main page
    - _Requirements: 2.2_
  
  - [ ]* 23.4 Write integration tests for navigation
    - Test navigation from main page to detail view
    - Test back navigation
    - _Requirements: 2.2_

- [ ] 24. Optimize performance
  - [ ] 24.1 Implement code splitting
    - Dynamic imports for heavy components
    - Lazy load CategoryDetailView
    - _Requirements: 1.2_
  
  - [ ] 24.2 Optimize database queries
    - Add indexes for common queries
    - Batch fetch pinned card data
    - _Requirements: 1.2_
  
  - [ ] 24.3 Implement image optimization
    - Use Next.js Image component for category icons
    - _Requirements: 1.2_
  
  - [ ]* 24.4 Write performance tests
    - Test page load time < 2 seconds
    - Test category detail view opens < 500ms
    - _Requirements: 1.2_

- [ ] 25. Final integration and testing
  - [ ] 25.1 Run full test suite
    - All unit tests
    - All property-based tests
    - All integration tests
    - All accessibility tests
  
  - [ ] 25.2 Test on multiple devices
    - iOS Safari (iPhone, iPad)
    - Android Chrome
    - Desktop browsers (Chrome, Firefox, Safari, Edge)
    - _Requirements: 1.4, 1.5, 3.2-3.4_
  
  - [ ] 25.3 Test all user flows end-to-end
    - Create category → Add size → Pin → Verify display
    - Add brand size → Set as preferred → Verify pinned card
    - Enter measurements → Toggle units → Save → Reload
    - Reorder pinned cards → Verify persistence
    - Delete category → Verify removal and data preservation
  
  - [ ] 25.4 Verify accessibility compliance
    - Run axe-core automated checks
    - Manual keyboard navigation testing
    - Manual screen reader testing
    - _Requirements: 11.1-11.4_

- [ ] 26. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional property-based and unit tests that can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties using fast-check
- Unit tests validate specific examples, edge cases, and component rendering
- Integration tests verify end-to-end user flows
- Accessibility tests ensure WCAG 2.1 AA compliance
- All components follow mobile-first responsive design principles
- Database operations use Supabase with Row Level Security for user isolation
- State management uses TanStack Query for server state with optimistic updates

## Critical Updates from Vercel Best Practices Review

### New Tasks Added (5 tasks)
1. **Task 1.5**: Bundle size optimization (CRITICAL) - Direct lucide-react imports, Next.js config
2. **Task 3.7**: Intelligent preloading integration (HIGH) - Route preloading, feature flags
3. **Task 3.8**: React.cache() for request deduplication (HIGH) - Cached queries
4. **Task 9.5**: Server/client component separation (HIGH) - MySizesClient component
5. **Task 15.5**: CategoryDetailClient component (HIGH) - Parallel fetching, waterfall elimination

### Enhanced Existing Tasks (9 tasks)
1. **Task 2.2**: Added react-hook-form integration with zodResolver
2. **Task 5.1**: Added hydration mismatch prevention for localStorage
3. **Task 6.1**: Added direct lucide-react imports, preload props, passive listeners
4. **Task 7.2**: Added passive event listeners and content-visibility
5. **Task 8.1**: Added Map for O(1) lookups and content-visibility
6. **Task 11.2**: Added react-hook-form integration and ARIA labels
7. **Task 13.1**: Added react-hook-form, functional setState, ARIA attributes
8. **Task 17.2**: Specified drag-and-drop implementation (native HTML5 preferred)
9. **Task 19.1-19.2**: Added specific ARIA implementation examples and focus-visible styles

### Performance Impact
- **Bundle size**: Net -23KB improvement (through optimizations)
- **Initial load**: 30-50% faster (server/client separation)
- **Data fetching**: 3× faster (parallel fetching, waterfall elimination)
- **Perceived performance**: 2-3× improvement (intelligent preloading)

### Implementation Priority
1. **CRITICAL**: Task 1.5 (bundle optimization) - Must complete before component development
2. **HIGH**: Tasks 3.7, 3.8, 9.5, 15.5 - Core performance improvements
3. **MEDIUM**: Enhanced tasks - Better patterns and practices
4. **LOW**: Optional property tests - Can be added incrementally
