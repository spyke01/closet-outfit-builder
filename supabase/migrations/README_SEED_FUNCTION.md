# System Categories Seed Function

## Overview

The `seed_system_categories` function populates user accounts with 16 predefined clothing categories (8 men's, 8 women's), each with appropriate metadata and measurement guide data.

## Function Signature

```sql
seed_system_categories(p_user_id UUID) RETURNS void
```

## Features

- **Idempotent**: Safe to call multiple times - uses `ON CONFLICT DO NOTHING`
- **Security**: Uses `SECURITY DEFINER` for proper permissions
- **Complete**: Creates all 16 system categories with full metadata
- **Measurement Guides**: Includes JSONB measurement guide data for each category

## Categories Created

### Men's Categories (8)
1. **Dress Shirt** - Collar and sleeve measurements
2. **Casual Shirt** - Chest measurements
3. **Suit Jacket** - Chest size and length (Short/Regular/Long)
4. **Pants** - Waist and inseam
5. **Jeans** - Waist and inseam
6. **Shoes** - US sizes (6-15)
7. **Belt** - Waist size
8. **Coat/Jacket** - Chest measurements

### Women's Categories (8)
1. **Dress** - Bust, waist, and hips
2. **Blouse/Top** - Bust measurements
3. **Pants** - Waist and inseam
4. **Jeans** - Waist and inseam
5. **Shoes** - US sizes (5-12)
6. **Jacket/Coat** - Bust measurements
7. **Suit Jacket** - Bust measurements
8. **Belt** - Waist size

## Measurement Guide Structure

Each category includes a JSONB `measurement_guide` with:

```json
{
  "fields": [
    {
      "name": "field_name",
      "label": "Display Label",
      "description": "How to measure this field",
      "unit": "inches",
      "typical_range": [min, max]
    }
  ],
  "size_examples": ["example1", "example2"]
}
```

## Usage

### From SQL
```sql
-- Seed categories for a specific user
SELECT seed_system_categories('user-uuid-here');
```

### From Application (Next.js API Route)
```typescript
// app/api/sizes/seed-categories/route.ts
const { data, error } = await supabase.rpc('seed_system_categories', {
  p_user_id: userId
});
```

### From Supabase Edge Function
```typescript
const { data, error } = await supabaseClient.rpc('seed_system_categories', {
  p_user_id: userId
});
```

## Testing

Run the test script to verify the function works correctly:

```bash
# Using Supabase CLI (if available)
supabase db execute -f scripts/test-seed-function.sql

# Or using psql
psql -h your-db-host -U postgres -d postgres -f scripts/test-seed-function.sql
```

The test script verifies:
1. All 16 categories are created
2. Function is idempotent (no duplicates on second call)
3. All categories have required metadata
4. Measurement guides have valid structure
5. All expected category names exist

## Migration Files

1. **20260208_add_system_categories.sql** - Adds `gender` and `measurement_guide` columns
2. **20260208_create_seed_function.sql** - Creates the seed function (this file)

## Database Schema

The function inserts into the `size_categories` table with these fields:

- `user_id` - UUID of the user
- `name` - Category name (e.g., "Dress Shirt")
- `icon` - Lucide icon name (e.g., "shirt")
- `gender` - 'men', 'women', or 'unisex'
- `supported_formats` - Array of sizing formats
- `is_system_category` - Always `true` for seeded categories
- `measurement_guide` - JSONB with measurement instructions
- `created_at` - Timestamp
- `updated_at` - Timestamp

## Conflict Resolution

The function uses the unique constraint on `(user_id, name)` to prevent duplicates:

```sql
ON CONFLICT (user_id, name) DO NOTHING
```

This means:
- First call: Creates all 16 categories
- Subsequent calls: No-op (no errors, no duplicates)
- Partial seeding: If some categories exist, only missing ones are created

## Security

- **SECURITY DEFINER**: Function runs with creator's privileges
- **RLS Policies**: Categories are protected by Row Level Security
- **User Isolation**: Each user gets their own copy of categories
- **No Deletion**: System categories cannot be deleted (enforced by RLS policy)

## Performance

- **Single Transaction**: All 16 inserts in one transaction
- **Indexed**: Uses existing index on `(user_id, name)`
- **Fast**: Typically completes in <100ms

## Troubleshooting

### Error: "duplicate key value violates unique constraint"
This should not happen due to `ON CONFLICT DO NOTHING`, but if it does:
- Check that the unique constraint exists: `\d size_categories`
- Verify the constraint name matches: `unique_user_category_name`

### Error: "permission denied for function"
- Ensure `GRANT EXECUTE` was run: `GRANT EXECUTE ON FUNCTION seed_system_categories(UUID) TO authenticated;`
- Check user has authenticated role

### Categories not appearing
- Verify user_id is correct
- Check RLS policies allow SELECT for the user
- Query directly: `SELECT * FROM size_categories WHERE user_id = 'user-uuid';`

## Future Enhancements

Potential improvements for future iterations:
- Add visual diagram references to measurement guides
- Support for additional genders/categories
- Localization of measurement descriptions
- Size conversion tools (EU to US, etc.)
- Video tutorial links in measurement guides

## Related Files

- `supabase/migrations/20260207_create_my_sizes_tables.sql` - Initial table creation
- `supabase/migrations/20260208_add_system_categories.sql` - Schema updates
- `scripts/test-seed-function.sql` - Test suite
- `lib/types/sizes.ts` - TypeScript types
- `lib/schemas/sizes.ts` - Zod validation schemas
