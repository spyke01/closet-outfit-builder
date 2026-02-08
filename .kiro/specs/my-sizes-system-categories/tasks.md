# Implementation Tasks: System Categories & Measurement Guides

## Phase 1: Database Migration & Seed Function

### Task 1.1: Create Database Migration
**Requirements**: US-1  
**Estimated Time**: 1 hour

Create migration file `supabase/migrations/[timestamp]_add_system_categories.sql`:
- Add `gender` column to `size_categories` table
- Add `measurement_guide` JSONB column to `size_categories` table
- Add constraint to prevent system category deletion
- Update RLS policies if needed

**Acceptance Criteria**:
- Migration runs successfully on development database
- Existing data is preserved
- New columns have appropriate defaults

### Task 1.2: Create Seed Function
**Requirements**: US-1  
**Estimated Time**: 2 hours

Create SQL function `seed_system_categories(p_user_id UUID)`:
- Insert all men's categories with appropriate metadata
- Insert all women's categories with appropriate metadata
- Use `ON CONFLICT DO NOTHING` to prevent duplicates
- Include measurement guide data in JSONB format
- Set `is_system_category = true` for all seeded categories

**Acceptance Criteria**:
- Function creates all 16 categories (8 men's, 8 women's)
- Function is idempotent (can be called multiple times safely)
- Categories include correct icons, formats, and measurement guides
- Function has SECURITY DEFINER for proper permissions

## Phase 2: API & Seeding Logic

### Task 2.1: Create Seed API Route
**Requirements**: US-1  
**Estimated Time**: 1.5 hours

Create `app/api/sizes/seed-categories/route.ts`:
- Check if user is authenticated
- Call `seed_system_categories` function via Supabase
- Return seeded categories
- Handle errors gracefully
- Add rate limiting to prevent abuse

**Acceptance Criteria**:
- API route returns 200 with seeded categories
- API route returns 401 if not authenticated
- API route handles database errors
- API route is idempotent

### Task 2.2: Add Seeding Hook
**Requirements**: US-1  
**Estimated Time**: 1 hour

Create `useSeedCategories` hook in `lib/hooks/use-size-categories.ts`:
- Call seed API route
- Invalidate categories cache after seeding
- Return loading and error states
- Use TanStack Query mutation

**Acceptance Criteria**:
- Hook successfully seeds categories
- Hook updates cache after seeding
- Hook provides loading and error states
- Hook follows existing patterns in codebase

### Task 2.3: Auto-Seed on First Access
**Requirements**: US-1  
**Estimated Time**: 1 hour

Update `app/sizes/page.tsx`:
- Check if user has any categories
- If no categories, automatically call seed function
- Show loading state during seeding
- Handle seeding errors with user-friendly message

**Acceptance Criteria**:
- New users get categories automatically
- Existing users with categories are not affected
- Loading state is shown during seeding
- Errors are displayed to user

## Phase 3: Measurement Guide Component

### Task 3.1: Create Measurement Guide Data
**Requirements**: US-2  
**Estimated Time**: 2 hours

Create `lib/data/measurement-guides.ts`:
- Define measurement guide data structure
- Add guides for all 16 categories
- Include measurement fields with descriptions
- Add visual diagram references
- Include size examples

**Acceptance Criteria**:
- All categories have measurement guides
- Guides include field names, labels, and descriptions
- Guides specify typical ranges where applicable
- Data structure is type-safe with TypeScript

### Task 3.2: Create MeasurementGuide Component
**Requirements**: US-2  
**Estimated Time**: 2 hours

Create `components/sizes/measurement-guide.tsx`:
- Display measurement instructions for category
- Show collapsible/expandable sections
- Include visual diagrams (placeholder images initially)
- Support dark mode
- Mobile-responsive design

**Acceptance Criteria**:
- Component displays measurement fields
- Component is collapsible
- Component supports dark mode
- Component is mobile-friendly
- Component has proper ARIA labels

### Task 3.3: Add Measurement Guide to Category Detail
**Requirements**: US-2  
**Estimated Time**: 1 hour

Update `app/sizes/[categoryId]/page.tsx`:
- Add measurement guide section above standard size
- Pass category measurement guide data to component
- Show guide by default, allow collapse
- Link to guide from size input fields

**Acceptance Criteria**:
- Measurement guide appears on category detail page
- Guide is positioned above standard size section
- Guide can be collapsed/expanded
- Guide matches category being viewed

## Phase 4: UI Cleanup

### Task 4.1: Remove Add Category Button
**Requirements**: US-3  
**Estimated Time**: 0.5 hours

Update `components/sizes/my-sizes-client.tsx`:
- Remove "Add Category" button
- Remove `isAddCategoryOpen` state
- Remove `AddCategoryModal` import and usage
- Update layout to remove empty space

**Acceptance Criteria**:
- "Add Category" button is removed
- No console errors
- Layout looks clean without button
- Build succeeds

### Task 4.2: Update Customize Button
**Requirements**: US-3  
**Estimated Time**: 0.5 hours

Update `components/sizes/my-sizes-client.tsx`:
- Keep "Customize" button for pinned cards only
- Update button label to "Customize Pinned Cards"
- Ensure functionality still works

**Acceptance Criteria**:
- Button label is clear
- Pinned cards customization still works
- Button styling is consistent

### Task 4.3: Remove Category Deletion
**Requirements**: US-3  
**Estimated Time**: 0.5 hours

Update category-related components:
- Remove delete functionality from UI
- Keep `useDeleteCategory` hook for potential future use
- Update category detail page to remove delete button
- Add note that system categories cannot be deleted

**Acceptance Criteria**:
- No delete buttons visible for system categories
- Hook remains in codebase but unused
- User cannot delete system categories

## Phase 5: Type Updates

### Task 5.1: Update Size Category Types
**Requirements**: US-1, US-2  
**Estimated Time**: 0.5 hours

Update `lib/types/sizes.ts`:
- Add `gender` field to `SizeCategoryRow`
- Add `measurement_guide` field to `SizeCategoryRow`
- Create `MeasurementGuide` type
- Create `MeasurementField` type

**Acceptance Criteria**:
- Types match database schema
- Types are exported correctly
- No TypeScript errors

### Task 5.2: Update Schemas
**Requirements**: US-1, US-2  
**Estimated Time**: 0.5 hours

Update `lib/schemas/sizes.ts`:
- Add `gender` validation to `sizeCategorySchema`
- Add `measurement_guide` validation to `sizeCategorySchema`
- Update input schemas if needed

**Acceptance Criteria**:
- Schemas validate new fields
- Schemas match database constraints
- No validation errors

## Phase 6: Testing

### Task 6.1: Test New User Flow
**Requirements**: US-1  
**Estimated Time**: 1 hour

Test complete flow for new users:
- Create new test user account
- Navigate to /sizes page
- Verify categories are auto-seeded
- Verify all 16 categories appear
- Verify categories have correct metadata

**Acceptance Criteria**:
- New users get all categories automatically
- Seeding completes without errors
- Categories display correctly
- Icons and names are correct

### Task 6.2: Test Existing User Flow
**Requirements**: US-1  
**Estimated Time**: 1 hour

Test flow for existing users:
- Use existing test account with categories
- Navigate to /sizes page
- Verify no duplicate categories created
- Verify existing data is preserved
- Verify new system categories are added

**Acceptance Criteria**:
- No duplicate categories
- Existing sizes are preserved
- New categories are added if missing
- No data loss

### Task 6.3: Test Measurement Guides
**Requirements**: US-2  
**Estimated Time**: 1 hour

Test measurement guide functionality:
- View measurement guide for each category
- Verify correct instructions display
- Test collapse/expand functionality
- Test on mobile devices
- Test in dark mode

**Acceptance Criteria**:
- Guides display correct information
- Guides are collapsible
- Guides work on mobile
- Guides support dark mode

### Task 6.4: Test UI Changes
**Requirements**: US-3  
**Estimated Time**: 0.5 hours

Test UI cleanup:
- Verify "Add Category" button is removed
- Verify "Customize" button still works
- Verify no delete buttons for system categories
- Test responsive design
- Test dark mode

**Acceptance Criteria**:
- UI is clean and functional
- No broken functionality
- Responsive design works
- Dark mode works

## Phase 7: Documentation

### Task 7.1: Update README
**Requirements**: All  
**Estimated Time**: 0.5 hours

Update project README:
- Document system categories feature
- Explain measurement guides
- Update screenshots if needed

**Acceptance Criteria**:
- README accurately describes feature
- Documentation is clear
- Examples are provided

### Task 7.2: Update Steering Guides
**Requirements**: All  
**Estimated Time**: 0.5 hours

Update `.kiro/steering/structure.md` and `.kiro/steering/product.md`:
- Document new database schema
- Document measurement guide data structure
- Update feature list

**Acceptance Criteria**:
- Steering guides are up to date
- Architecture is documented
- Feature list is accurate

## Completion Checklist

- [ ] Database migration created and tested
- [ ] Seed function created and tested
- [ ] API route created and tested
- [ ] Seeding hook created and tested
- [ ] Auto-seed on first access implemented
- [ ] Measurement guide data created
- [ ] MeasurementGuide component created
- [ ] Measurement guide added to category detail
- [ ] "Add Category" button removed
- [ ] "Customize" button updated
- [ ] Category deletion removed
- [ ] Types updated
- [ ] Schemas updated
- [ ] New user flow tested
- [ ] Existing user flow tested
- [ ] Measurement guides tested
- [ ] UI changes tested
- [ ] README updated
- [ ] Steering guides updated
- [ ] Build succeeds with no errors
- [ ] All tests pass

## Notes

- Keep `AddCategoryModal` component in codebase but unused (may be useful for admin features later)
- Keep `useDeleteCategory` hook in codebase but unused (may be useful for admin features later)
- Measurement guide images/diagrams can be added in a future iteration
- Size conversion tools can be added in a future iteration
