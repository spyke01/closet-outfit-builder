# Implementation Plan: Today's Outfit Generator

## Overview

This implementation plan breaks down the Today's Outfit Generator feature into discrete, incremental coding tasks. The approach follows a bottom-up strategy: build pure generation functions first, then add UI components, and finally wire everything together. Each task builds on previous work, ensuring no orphaned code.

**Key Principles**:
- Pure functional core for all generation logic (testable, deterministic)
- Direct imports for tree-shaking (Lucide icons, Radix UI)
- Server components by default, client components only when needed
- Minimal mocking in tests, focus on behavior over implementation
- Property tests for critical business logic (numRuns: 3-5 for development)
- Fast test execution (<100ms per test target)

## Tasks

- [x] 1. Create type definitions and schemas for generation
  - Create `lib/types/generation.ts` with all TypeScript interfaces (WeatherContext, GeneratedOutfit, EnrichedItem, CompatibilityScore, GenerationOptions, SwapOptions)
  - Create `lib/schemas/generation.ts` with Zod validation schemas
  - Export all types and schemas from appropriate index files
  - _Requirements: 13.1, 13.2_

- [x] 2. Implement weather context normalization utilities
  - [x] 2.1 Create `lib/utils/weather-normalization.ts` with pure functions
    - Implement `normalizeWeatherContext(current, forecast): WeatherContext`
    - Implement temperature band classification (isCold, isMild, isWarm, isHot)
    - Implement precipitation classification (isRainLikely)
    - Implement daily swing calculation and large swing detection
    - Implement target weight mapping (temperature band → 0-3)
    - Handle missing/invalid weather data with neutral defaults
    - _Requirements: 2.5, 4.1, 4.2, 4.3, 4.4, 4.5, 12.2_
  
  - [ ]* 2.2 Write property tests for weather normalization
    - **Property 2: Temperature classification is exclusive** (exactly one band is true)
    - **Property 3: Daily swing equals high minus low**
    - **Property 4: Target weight mapping is correct**
    - **Property 5: Large swing detection at 20°F threshold**
    - Use numRuns: 3 for development, simple generators
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**
  
  - [ ]* 2.3 Write unit tests for weather normalization edge cases
    - Test extreme temperatures (-50°F, 150°F)
    - Test missing weather data (null/undefined inputs)
    - Test boundary conditions (exactly 55°F, 75°F, 90°F)
    - Test precipitation threshold (exactly 0.35)
    - _Requirements: 12.2_

- [x] 3. Implement color inference utilities
  - [x] 3.1 Create `lib/utils/color-inference.ts` with pure functions
    - Implement `inferColor(itemName: string): ColorCategory`
    - Support color keywords: black, white, grey/gray, navy, blue, cream, khaki, brown, tan, green, red, burgundy, olive, charcoal
    - Return 'unknown' for items without color keywords
    - Case-insensitive matching
    - _Requirements: 7.6_
  
  - [ ]* 3.2 Write property tests for color inference
    - **Property 17: Color inference from keywords**
    - Use numRuns: 3, simple string generators
    - **Validates: Requirements 7.6**
  
  - [ ]* 3.3 Write unit tests for color inference examples
    - Test "Blue Oxford Shirt" → 'blue'
    - Test "Black Leather Shoes" → 'black'
    - Test "Grey Wool Pants" → 'grey'
    - Test "Casual Shirt" → 'unknown'
    - Test case insensitivity

- [x] 4. Implement compatibility scoring algorithms
  - [x] 4.1 Create `lib/utils/compatibility-scoring.ts` with pure functions
    - Implement `calculateWeatherFit(item, weatherContext): number` (0-1)
    - Implement `calculateFormalityAlignment(item1, item2): number` (0-1)
    - Implement `calculateColorHarmony(color1, color2): number` (0-1)
    - Implement `calculateCapsuleCohesion(item1, item2): number` (0-1)
    - Implement `calculateCompatibilityScore(item, context): CompatibilityScore`
    - All scores return values between 0 and 1
    - _Requirements: 6.7, 7.1, 7.2, 7.3, 7.4_
  
  - [ ]* 4.2 Write property tests for compatibility scoring
    - **Property 13: Compatibility score is between 0 and 1**
    - **Property 14: Weather fit scoring favors appropriate items**
    - **Property 15: Color harmony scoring favors neutrals**
    - **Property 16: Capsule cohesion scoring favors shared tags**
    - Use numRuns: 3, realistic item generators
    - **Validates: Requirements 6.7, 7.1, 7.3, 7.4**
  
  - [ ]* 4.3 Write unit tests for scoring examples
    - Test heavy jacket in cold weather (high weatherFit)
    - Test shorts in hot weather (high weatherFit)
    - Test formality alignment (dress shirt + dress pants vs t-shirt + dress pants)
    - Test color harmony (black + white vs red + green)
    - Test capsule cohesion (both Refined vs mixed tags)

- [x] 5. Implement item enrichment utilities
  - [x] 5.1 Create `lib/utils/item-enrichment.ts` with pure functions
    - Implement `enrichItem(item: WardrobeItem): EnrichedItem`
    - Infer color using color-inference utility
    - Classify formality band (casual: 1-3, smart-casual: 4-6, refined: 7-10)
    - Infer weather weight from category and season tags
    - Implement `enrichItems(items: WardrobeItem[]): EnrichedItem[]`
    - _Requirements: 6.2, 6.3, 6.4_
  
  - [ ]* 5.2 Write unit tests for item enrichment
    - Test color inference integration
    - Test formality band classification
    - Test weather weight inference
    - Test batch enrichment

- [x] 6. Checkpoint - Ensure all utility tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement core outfit generation service
  - [x] 7.1 Create `lib/services/outfit-generator.ts` with pure generation functions
    - Implement `generateOutfit(options: GenerationOptions): GeneratedOutfit`
    - Implement category inclusion logic (required: Shirt, Pants, Shoes; conditional: Jacket, Undershirt, Belt, Watch)
    - Implement item selection order: Pants → Shirt → Shoes → Outer Layer → Undershirt → Belt → Watch
    - Implement compatibility scoring for each selection
    - Implement constraint relaxation for no-match scenarios
    - Return GeneratedOutfit with items, scores, swappable flags
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 12.4_
  
  - [ ]* 7.2 Write property tests for outfit generation
    - **Property 1: Required categories invariant** (Shirt, Pants, Shoes always present)
    - **Property 6: Conditional outer layer inclusion** (jacket when targetWeight ≥ 2)
    - **Property 7: Conditional undershirt inclusion** (when not hot)
    - **Property 8: Conditional belt inclusion** (based on formality)
    - **Property 9: Conditional watch inclusion** (when watches exist)
    - **Property 10: Empty category exclusion**
    - **Property 11: Shorts preference in hot weather**
    - **Property 12: Formality alignment** (all items within 4 points of median)
    - **Property 25: Constraint relaxation robustness**
    - Use numRuns: 3-5, realistic wardrobe generators
    - **Validates: Requirements 3.3, 3.4, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 6.2, 6.3, 6.4, 12.4**
  
  - [ ]* 7.3 Write unit tests for generation edge cases
    - Test missing required categories (should throw error)
    - Test small wardrobe (1 item per category)
    - Test no matching items (constraint relaxation)
    - Test hot weather with shorts available
    - Test cold weather with jackets available
    - Test formal outfit (high formality scores)
    - Test casual outfit (low formality scores)

- [x] 8. Implement regeneration and swap functions
  - [x] 8.1 Add regeneration and swap functions to `lib/services/outfit-generator.ts`
    - Implement `regenerateOutfit(options: GenerationOptions): GeneratedOutfit`
    - Implement exclusion list handling (penalize recently used items)
    - Implement `swapItem(options: SwapOptions): GeneratedOutfit`
    - Implement single-category re-selection with fixed context
    - Implement swappable category detection (categories with >1 item)
    - _Requirements: 8.1, 8.2, 8.3, 9.1, 9.2, 9.3, 9.4, 9.5_
  
  - [ ]* 8.2 Write property tests for regeneration and swap
    - **Property 18: Regeneration validity** (regenerated outfits satisfy all constraints)
    - **Property 19: Variety through exclusion** (excluded items appear less frequently)
    - **Property 20: Swap category isolation** (only swapped category changes)
    - **Property 21: Swap compatibility scoring** (new item scored against context)
    - **Property 22: Swap current item exclusion** (current item not re-selected)
    - **Property 23: Swap button state** (disabled when only 1 item in category)
    - Use numRuns: 3-5, realistic generators
    - **Validates: Requirements 8.1, 8.2, 9.1, 9.2, 9.3, 9.4, 9.5**
  
  - [ ]* 8.3 Write unit tests for regeneration and swap
    - Test regeneration produces different outfit
    - Test exclusion list reduces repeats
    - Test swap changes only target category
    - Test swap with no alternatives (should return same item or handle gracefully)
    - Test swappable detection

- [ ] 9. Implement determinism and purity tests
  - [ ]* 9.1 Write property test for generator determinism
    - **Property 26: Generator determinism** (same inputs → same outputs with fixed seed)
    - **Validates: Requirements 13.2**

- [x] 10. Checkpoint - Ensure all generation service tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Create Today page server component
  - [x] 11.1 Create `app/today/page.tsx` as server component
    - Import `createClient` from `@/lib/supabase/server`
    - Check authentication using `supabase.auth.getUser()`
    - Redirect to `/auth/login` if not authenticated
    - Fetch wardrobe items with categories: `supabase.from('wardrobe_items').select('*, category:categories(*)').eq('user_id', user.id).eq('active', true)`
    - Handle fetch errors gracefully
    - Pass wardrobe items to client component
    - Add page metadata (title: "Today's Outfit")
    - _Requirements: 1.1, 1.2, 3.1_
  
  - [ ]* 11.2 Write integration tests for Today page
    - Test authenticated user can access page
    - Test unauthenticated user redirected to login
    - Test wardrobe items fetched correctly
    - Test error handling for fetch failures

- [x] 12. Create Today page client component
  - [x] 12.1 Create `app/today/today-page-client.tsx` as client component
    - Add `'use client'` directive
    - Accept `wardrobeItems` prop from server component
    - Use `useWeather(true)` hook to fetch weather data
    - Normalize weather context using `normalizeWeatherContext`
    - Check for required categories (Shirt, Pants, Shoes)
    - Display empty state if missing required categories
    - Manage state: `currentOutfit`, `recentlyUsed`, `generating`
    - Generate initial outfit on mount when weather and wardrobe ready
    - Implement `handleRegenerate` callback
    - Implement `handleSwap` callback
    - Implement `handleSave` callback (calls server action)
    - Render weather snapshot, outfit display, and action buttons
    - _Requirements: 1.3, 2.1, 2.3, 2.4, 3.1, 3.6, 8.1, 9.1, 10.1_
  
  - [ ]* 12.2 Write unit tests for client component logic
    - Test empty state display when missing required categories
    - Test initial outfit generation on mount
    - Test regenerate handler
    - Test swap handler
    - Test save handler

- [x] 13. Create weather snapshot component
  - [x] 13.1 Create `components/weather-snapshot.tsx`
    - Accept `current`, `forecast`, `loading`, `error` props
    - Display loading state
    - Display error state with neutral defaults message
    - Display current temperature, condition, high/low, precipitation
    - Use Tailwind CSS for styling (blue-50 background, rounded-lg)
    - Responsive layout (flex, items-center, justify-between)
    - _Requirements: 2.2, 2.3_
  
  - [ ]* 13.2 Write property test for weather display
    - **Property 27: Weather display completeness** (all required fields present)
    - **Validates: Requirements 2.2**
  
  - [ ]* 13.3 Write unit tests for weather snapshot
    - Test loading state
    - Test error state
    - Test successful weather display
    - Test missing forecast data

- [x] 14. Create outfit display component
  - [x] 14.1 Create `components/today-outfit-display.tsx`
    - Accept `outfit`, `onSwap`, `generating` props
    - Display all outfit items in grid layout (2 cols mobile, 4 cols desktop)
    - Show item image using Next.js Image component
    - Show item name and category
    - Show swap button for swappable categories
    - Disable swap button when generating or no alternatives
    - Use Lucide RefreshCw icon for swap button
    - Responsive grid with gap-4
    - _Requirements: 3.7, 9.5_
  
  - [ ]* 14.2 Write property test for outfit display
    - **Property 29: Outfit display completeness** (all items rendered)
    - **Validates: Requirements 3.7**
  
  - [ ]* 14.3 Write unit tests for outfit display
    - Test all items rendered
    - Test swap button enabled for swappable categories
    - Test swap button disabled for non-swappable categories
    - Test swap button disabled when generating

- [x] 15. Create outfit actions component
  - [x] 15.1 Create `components/outfit-actions.tsx`
    - Accept `onRegenerate`, `onSave`, `disabled` props
    - Display three buttons: Regenerate, Save Outfit, Save & Love
    - Use Lucide icons: RefreshCw, Save, Heart
    - Implement save with loved flag (false for Save, true for Save & Love)
    - Disable all buttons when generating or saving
    - Show loading state during save
    - Center buttons with flex gap-4
    - _Requirements: 8.1, 10.1, 10.3_
  
  - [ ]* 15.2 Write unit tests for outfit actions
    - Test regenerate button click
    - Test save button click (loved = false)
    - Test save & love button click (loved = true)
    - Test buttons disabled when generating
    - Test buttons disabled when saving

- [x] 16. Update navigation to include Today link
  - [x] 16.1 Update navigation component (likely `components/top-bar.tsx` or similar)
    - Add "Today" link that routes to `/today`
    - Position as first link in authenticated navigation
    - Maintain existing Wardrobe and Outfits links
    - Use consistent styling with other nav links
    - _Requirements: 1.4, 11.1_
  
  - [ ]* 16.2 Write unit tests for navigation
    - Test Today link present in navigation
    - Test Today link routes to /today
    - Test existing links still present

- [x] 17. Update authentication routing
  - [x] 17.1 Update post-login redirect logic
    - Modify authentication callback to redirect to `/today` instead of previous default
    - Ensure redirect works for both email/password and OAuth logins
    - Maintain existing redirect logic for other flows
    - _Requirements: 1.1_
  
  - [ ]* 17.2 Write integration tests for auth routing
    - Test successful login redirects to /today
    - Test OAuth callback redirects to /today

- [x] 18. Implement save outfit functionality
  - [x] 18.1 Integrate with existing `createOutfit` server action
    - Import `createOutfit` from `@/lib/actions/outfits`
    - Call with outfit data: name, source='generated', loved flag, items array
    - Handle success: show confirmation message, provide link to /outfits
    - Handle errors: display error message, allow retry
    - Keep generated outfit in UI after save (don't clear)
    - _Requirements: 10.1, 10.2, 10.4, 10.5, 10.6_
  
  - [ ]* 18.2 Write property test for save immutability
    - **Property 24: Save operation immutability** (wardrobe items unchanged)
    - **Validates: Requirements 10.2, 10.6**
  
  - [ ]* 18.3 Write integration tests for save functionality
    - Test successful save creates outfit record
    - Test save includes all outfit items
    - Test save with loved flag
    - Test save error handling
    - Test wardrobe items unchanged after save

- [x] 19. Add error boundaries and error handling
  - [x] 19.1 Add error handling to all components
    - Wrap generation calls in try-catch
    - Display user-friendly error messages
    - Provide retry buttons for recoverable errors
    - Log errors for debugging
    - Handle weather service failures gracefully
    - Handle generation failures gracefully
    - Handle save failures gracefully
    - _Requirements: 12.1, 12.2, 12.3, 12.5_
  
  - [ ]* 19.2 Write unit tests for error handling
    - Test weather service failure (use neutral defaults)
    - Test generation failure (show error message)
    - Test save failure (show error, allow retry)
    - Test missing required categories (show empty state)

- [x] 20. Add loading states and optimistic UI
  - [x] 20.1 Implement loading states throughout
    - Show loading spinner during initial generation
    - Show loading state during regeneration
    - Show loading state during swap
    - Show loading state during save
    - Disable buttons during operations
    - Use skeleton loaders for weather data
    - _Requirements: 8.4, 9.6_
  
  - [ ]* 20.2 Write unit tests for loading states
    - Test loading spinner shown during generation
    - Test buttons disabled during operations
    - Test skeleton loaders for weather

- [x] 21. Add accessibility features
  - [x] 21.1 Ensure full keyboard navigation
    - All buttons accessible via Tab key
    - Buttons activated with Enter or Space
    - Logical tab order (weather → outfit → actions)
    - Clear focus indicators (ring-2 ring-blue-500)
    - ARIA labels on all interactive elements
    - ARIA live regions for dynamic content updates
    - _Requirements: All UI requirements_
  
  - [ ]* 21.2 Write accessibility tests
    - Test keyboard navigation through all interactive elements
    - Test ARIA labels present
    - Test focus indicators visible
    - Test screen reader announcements

- [x] 22. Add responsive design and mobile optimization
  - [x] 22.1 Ensure responsive layouts
    - Mobile-first approach (base styles for mobile)
    - Grid adjusts: 2 cols mobile, 4 cols desktop
    - Weather snapshot responsive (stacked on mobile, side-by-side on desktop)
    - Buttons stack on mobile, inline on desktop
    - Touch-friendly button sizes (min 44px)
    - Proper spacing and padding for all screen sizes
    - _Requirements: All UI requirements_
  
  - [ ]* 22.2 Write responsive design tests
    - Test mobile layout (viewport 375px)
    - Test tablet layout (viewport 768px)
    - Test desktop layout (viewport 1024px)
    - Test touch target sizes

- [x] 23. Add performance optimizations
  - [x] 23.1 Optimize generation performance
    - Memoize enriched items with useMemo
    - Memoize weather context with useMemo
    - Memoize required categories check with useMemo
    - Debounce rapid regenerate clicks
    - Use React.useCallback for event handlers
    - Lazy load images with Next.js Image component
    - _Requirements: 13.1, 13.2_
  
  - [ ]* 23.2 Write performance tests
    - Test generation completes in <100ms for typical wardrobe (20 items)
    - Test memoization prevents unnecessary recalculations
    - Test debouncing prevents rapid regenerations

- [x] 24. Add analytics and monitoring
  - [x] 24.1 Add analytics tracking
    - Track page views on /today
    - Track outfit generation events
    - Track regeneration events
    - Track swap events
    - Track save events (with loved flag)
    - Track error events
    - Use existing monitoring infrastructure
    - _Requirements: All requirements (for monitoring)_

- [x] 25. Final integration testing
  - [ ]* 25.1 Write end-to-end integration tests
    - Test complete flow: login → today page → generate → swap → save
    - Test weather integration
    - Test wardrobe integration
    - Test outfit save integration
    - Test navigation integration
    - Test error scenarios
    - Test edge cases (small wardrobe, missing weather)

- [x] 26. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional test-related sub-tasks that can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties (minimum 100 iterations each)
- Unit tests validate specific examples and edge cases
- Integration tests validate component interactions and data flow
- All generation logic is implemented as pure functions for testability
- UI components are built on top of tested business logic
- Error handling and edge cases are addressed throughout
- Accessibility and responsive design are built in from the start
- Performance optimizations are applied where needed
- The implementation follows Next.js 15 and React 19 best practices
- TypeScript strict mode is used throughout
- Zod validation is used for all data structures
- Existing infrastructure (Supabase, weather hook, server actions) is reused
