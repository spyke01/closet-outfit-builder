# My Sizes: System Categories & Measurement Guides

## Overview

Redesign the My Sizes feature to use pre-seeded system categories instead of user-created categories, and add measurement guides to help users understand how to measure for each category.

## Problem Statement

Currently, users must:
1. Manually create categories
2. Choose icons
3. Select sizing formats
4. Cannot edit or delete categories once created

This creates friction and inconsistency. Users want a simpler experience where categories are pre-populated and they just fill in their sizes.

## Goals

1. **Pre-seed categories** for all users (new and existing)
2. **Remove custom category creation** - users cannot add/delete categories
3. **Add measurement guides** with category-specific instructions and visuals
4. **Support gender-specific categories** (Men's and Women's)
5. **Maintain existing functionality** for standard sizes and brand sizes

## User Stories

### US-1: Pre-seeded Categories
**As a** new user  
**I want** categories to be automatically created for me  
**So that** I can immediately start entering my sizes without setup

**Acceptance Criteria:**
- New users get all system categories on first login
- Existing users get system categories added (without duplicates)
- Categories include appropriate icons and sizing formats

### US-2: Measurement Guides
**As a** user entering sizes  
**I want** to see how to measure for each category  
**So that** I can accurately determine my size

**Acceptance Criteria:**
- Each category shows measurement instructions
- Visual diagrams show where to measure
- Instructions are category-specific (e.g., dress shirt shows collar and sleeve)

### US-3: Simplified UI
**As a** user  
**I want** a cleaner interface without category management  
**So that** I can focus on entering my sizes

**Acceptance Criteria:**
- "Add Category" button removed
- "Customize" button removed (or repurposed for pinned cards only)
- Category list shows all system categories
- Users can still edit standard and brand sizes

## System Categories

### Men's Categories
1. **Dress Shirt** - Collar size (14-18) and sleeve length (32-36)
2. **Casual Shirt** - Letter sizes (XS-XXL) or numeric (S-XL)
3. **Suit Jacket** - Chest size (34-52) and length (Short/Regular/Long)
4. **Pants** - Waist (28-44) and inseam (28-36)
5. **Jeans** - Waist (28-44) and inseam (28-36)
6. **Shoes** - US sizes (6-15)
7. **Belt** - Waist size (28-44)
8. **Coat/Jacket** - Letter sizes (XS-XXL) or numeric

### Women's Categories
1. **Dress** - Numeric sizes (0-24) or letter (XS-XXL)
2. **Blouse/Top** - Letter sizes (XS-XXL) or numeric
3. **Pants** - Numeric sizes (0-24) or waist/inseam
4. **Jeans** - Numeric sizes (0-24) or waist/inseam
5. **Shoes** - US sizes (5-12)
6. **Jacket/Coat** - Letter sizes (XS-XXL) or numeric
7. **Suit Jacket** - Numeric sizes (0-24)
8. **Belt** - Waist size or S/M/L

## Measurement Guide Data Structure

Each category should have:
- **Name**: Category display name
- **Icon**: Lucide icon name
- **Gender**: 'men', 'women', or 'unisex'
- **Supported Formats**: Array of sizing formats
- **Measurement Fields**: Array of measurement points
  - Field name (e.g., "chest", "collar", "sleeve")
  - Description (e.g., "Measure around fullest part of chest")
  - Visual indicator (SVG or image reference)
- **Size Examples**: Common sizes for this category

### Example: Dress Shirt (Men's)
```typescript
{
  name: "Dress Shirt",
  icon: "shirt",
  gender: "men",
  supported_formats: ["numeric", "measurements"],
  measurement_fields: [
    {
      name: "collar",
      label: "Collar Size",
      description: "Measure around the base of your neck where the collar sits",
      unit: "inches",
      typical_range: [14, 18]
    },
    {
      name: "sleeve",
      label: "Sleeve Length",
      description: "Measure from center back of neck to wrist with arm slightly bent",
      unit: "inches",
      typical_range: [32, 36]
    }
  ],
  size_examples: ["15.5/33", "16/34", "16.5/35"]
}
```

### Example: Suit Jacket (Men's)
```typescript
{
  name: "Suit Jacket",
  icon: "briefcase",
  gender: "men",
  supported_formats: ["numeric", "letter"],
  measurement_fields: [
    {
      name: "chest",
      label: "Chest Size",
      description: "Measure around the fullest part of your chest under arms",
      unit: "inches",
      typical_range: [34, 52]
    },
    {
      name: "length",
      label: "Jacket Length",
      description: "Short, Regular, or Long based on your height",
      options: ["Short", "Regular", "Long"]
    }
  ],
  size_examples: ["40R", "42L", "44S"]
}
```

## Database Changes

### Migration: Add System Categories

```sql
-- Add gender column to size_categories
ALTER TABLE size_categories 
ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('men', 'women', 'unisex'));

-- Add measurement_guide JSONB column
ALTER TABLE size_categories 
ADD COLUMN IF NOT EXISTS measurement_guide JSONB DEFAULT '{}'::JSONB;

-- Update is_system_category to prevent deletion
ALTER TABLE size_categories 
ADD CONSTRAINT prevent_system_category_deletion 
CHECK (is_system_category = false OR id IS NOT NULL);
```

### Seed Function

Create a Supabase Edge Function or database function to seed categories for users:

```sql
CREATE OR REPLACE FUNCTION seed_system_categories(p_user_id UUID)
RETURNS void AS $$
BEGIN
  -- Insert system categories if they don't exist for this user
  INSERT INTO size_categories (user_id, name, icon, gender, supported_formats, is_system_category, measurement_guide)
  VALUES
    -- Men's categories
    (p_user_id, 'Dress Shirt', 'shirt', 'men', ARRAY['numeric', 'measurements'], true, '{"fields": [{"name": "collar", "label": "Collar Size"}, {"name": "sleeve", "label": "Sleeve Length"}]}'::JSONB),
    (p_user_id, 'Casual Shirt', 'shirt', 'men', ARRAY['letter', 'numeric'], true, '{}'::JSONB),
    (p_user_id, 'Suit Jacket', 'briefcase', 'men', ARRAY['numeric', 'letter'], true, '{"fields": [{"name": "chest", "label": "Chest Size"}, {"name": "length", "label": "Length"}]}'::JSONB),
    (p_user_id, 'Pants', 'ruler', 'men', ARRAY['waist-inseam'], true, '{}'::JSONB),
    (p_user_id, 'Jeans', 'ruler', 'men', ARRAY['waist-inseam'], true, '{}'::JSONB),
    (p_user_id, 'Shoes', 'footprints', 'men', ARRAY['numeric'], true, '{}'::JSONB),
    (p_user_id, 'Belt', 'minus', 'men', ARRAY['numeric'], true, '{}'::JSONB),
    (p_user_id, 'Coat/Jacket', 'coat', 'men', ARRAY['letter', 'numeric'], true, '{}'::JSONB),
    
    -- Women's categories
    (p_user_id, 'Dress', 'dress', 'women', ARRAY['numeric', 'letter'], true, '{}'::JSONB),
    (p_user_id, 'Blouse/Top', 'shirt', 'women', ARRAY['letter', 'numeric'], true, '{}'::JSONB),
    (p_user_id, 'Pants', 'ruler', 'women', ARRAY['numeric', 'waist-inseam'], true, '{}'::JSONB),
    (p_user_id, 'Jeans', 'ruler', 'women', ARRAY['numeric', 'waist-inseam'], true, '{}'::JSONB),
    (p_user_id, 'Shoes', 'footprints', 'women', ARRAY['numeric'], true, '{}'::JSONB),
    (p_user_id, 'Jacket/Coat', 'coat', 'women', ARRAY['letter', 'numeric'], true, '{}'::JSONB),
    (p_user_id, 'Suit Jacket', 'briefcase', 'women', ARRAY['numeric'], true, '{}'::JSONB),
    (p_user_id, 'Belt', 'minus', 'women', ARRAY['letter', 'numeric'], true, '{}'::JSONB)
  ON CONFLICT (user_id, name) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## UI Changes

### 1. Remove Category Management
- Remove "Add Category" button from `MySizesClient`
- Remove `AddCategoryModal` component (or keep for future use)
- Remove category deletion functionality
- Keep category editing for icon/name changes (optional)

### 2. Add Measurement Guide Component
Create `MeasurementGuide` component:
- Shows category-specific measurement instructions
- Displays visual diagrams
- Collapsible/expandable section
- Responsive design for mobile

### 3. Update Category Detail Page
- Add measurement guide section above standard size
- Show measurement fields relevant to category
- Link to measurement guide from size input fields

### 4. Seed Categories on First Access
- Check if user has categories on `/sizes` page load
- If no categories exist, call seed function
- Show loading state during seeding
- Redirect to category list after seeding

## Technical Implementation

### Phase 1: Database Migration
1. Create migration file for new columns
2. Create seed function
3. Test migration on development database

### Phase 2: Seed Logic
1. Create API route `/api/sizes/seed-categories`
2. Call seed function for current user
3. Return seeded categories
4. Add error handling

### Phase 3: UI Updates
1. Remove "Add Category" button
2. Add "Seed Categories" check on page load
3. Create `MeasurementGuide` component
4. Update category detail page
5. Add dark mode support

### Phase 4: Testing
1. Test seeding for new users
2. Test seeding for existing users (no duplicates)
3. Test measurement guide display
4. Test responsive design
5. Test dark mode

## Non-Goals

- Custom category creation (removed feature)
- Category deletion (system categories are permanent)
- Editing category names/icons (can be added later if needed)
- Advanced measurement calculators
- Size conversion tools (can be added later)

## Success Metrics

1. **Reduced onboarding time**: Users can start entering sizes immediately
2. **Increased completion rate**: More users fill in their sizes
3. **Reduced support requests**: Measurement guides answer common questions
4. **Consistent data**: All users have same category structure

## Open Questions

1. Should we allow users to hide categories they don't use?
2. Should we add size conversion tools (e.g., EU to US shoe sizes)?
3. Should measurement guides include video tutorials?
4. Should we support custom measurement fields for advanced users?

## Dependencies

- Supabase database access
- Lucide React icons
- Existing My Sizes infrastructure

## Timeline Estimate

- Phase 1 (Database): 2-3 hours
- Phase 2 (Seed Logic): 2-3 hours
- Phase 3 (UI Updates): 4-6 hours
- Phase 4 (Testing): 2-3 hours

**Total**: 10-15 hours
