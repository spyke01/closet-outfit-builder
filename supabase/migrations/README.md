# Database Migrations

This directory contains SQL migration files for the My AI Outfit application.

## Migration Files

- `20260105_add_external_id_columns.sql` - Adds external_id columns for wardrobe items
- `20260207_create_my_sizes_tables.sql` - Creates My Sizes feature tables
- `20260208_add_system_categories.sql` - Adds system categories support (gender, measurement_guide)
- `20260208000001_create_seed_function.sql` - Creates seed function for system categories

## Running Migrations

### Using Supabase CLI (Recommended)

If you have Supabase CLI installed:

```bash
# Link to your project (first time only)
supabase link --project-ref your-project-ref

# Apply all pending migrations
supabase db push

# Or apply a specific migration
supabase db push --include-all
```

### Manual Application via Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of the migration file
4. Paste and execute the SQL

### Verification

After running a migration, verify it was successful:

```sql
-- Check if new columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'size_categories'
ORDER BY ordinal_position;

-- Check if policies were updated
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'size_categories';

-- Check if indexes were created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'size_categories';
```

## Migration Best Practices

1. **Always use IF EXISTS/IF NOT EXISTS** - Makes migrations idempotent
2. **Add comments** - Document what each section does
3. **Test locally first** - Verify on development database before production
4. **Preserve data** - Use ALTER TABLE ADD COLUMN with defaults, not DROP/CREATE
5. **Update RLS policies carefully** - Ensure security is maintained
6. **Add indexes for performance** - Consider query patterns

## Rollback Strategy

If a migration needs to be rolled back:

1. Create a new migration file with the rollback SQL
2. Test the rollback on a development database
3. Apply to production if needed

Example rollback for `20260208_add_system_categories.sql`:

```sql
-- Rollback: Remove system categories columns
ALTER TABLE size_categories DROP COLUMN IF EXISTS gender;
ALTER TABLE size_categories DROP COLUMN IF EXISTS measurement_guide;
DROP INDEX IF EXISTS idx_size_categories_gender;

-- Restore original delete policy
DROP POLICY IF EXISTS "Users can delete their own non-system categories" ON size_categories;
CREATE POLICY "Users can delete their own categories"
  ON size_categories FOR DELETE
  USING (auth.uid() = user_id);
```

## Testing Migrations

Before applying to production:

1. **Syntax check** - Ensure SQL is valid
2. **Development test** - Apply to dev database
3. **Data verification** - Check existing data is preserved
4. **Policy verification** - Test RLS policies still work
5. **Application test** - Verify app functionality

