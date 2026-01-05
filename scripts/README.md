# Wardrobe Sync Script

A secure Node.js command-line tool for synchronizing local wardrobe data files to the Supabase database. This script allows developers to add new clothing items and outfits to their own account or distribute them to all users while maintaining security and data integrity.

## Overview

The Wardrobe Sync Script reads wardrobe and outfit data from the same source as the seed-user Edge Function and synchronizes them to the Supabase database. It provides controlled distribution of new content with comprehensive validation and error handling.

This script uses the same data source as the seed-user Edge Function to maintain consistency and avoid data duplication. The wardrobe items and outfits are defined directly in the script, following the same patterns established in the seed-user function.

### Key Features

- **Secure Authentication**: Uses Supabase service role key for administrative operations
- **User Targeting**: Support for admin-only or all-users distribution modes
- **Data Validation**: Comprehensive validation of wardrobe items and outfits
- **Image Asset Verification**: Validates that referenced image files exist
- **Duplicate Prevention**: Prevents duplicate items and outfits using original IDs from data arrays
- **ID-Based Tracking**: Uses external_id field to track original IDs for accurate duplicate detection
- **Progress Reporting**: Detailed logging and summary reports
- **Dry Run Mode**: Test operations without making database changes

## Prerequisites

### Environment Variables

The script requires the following environment variables to be set:

```bash
# Required: Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional: Admin User Identification (one of these)
ADMIN_USER_ID=uuid-of-admin-user
# OR
ADMIN_USER_EMAIL=admin@example.com
```

**Important Security Notes:**
- The `SUPABASE_SERVICE_ROLE_KEY` should never be committed to version control
- This key provides full database access and should only be used in secure environments
- Store the service role key in your local `.env.local` file or secure environment

### Data Source

The script uses hardcoded data arrays that match the structure and patterns from the seed-user Edge Function:

- `wardrobeData` - Array of new wardrobe items to be added
- `outfitData` - Array of new outfits using the wardrobe items
- Image files in `./public/images/wardrobe/` - Directory containing item images

This approach ensures consistency with the existing seed-user function and eliminates the need for separate JSON files.

## Installation

No additional installation is required. The script uses dependencies already installed in the project.

## Usage

### Basic Syntax

```bash
node scripts/sync-wardrobe.js [options]
```

### Command-Line Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--admin-only` | boolean | `true` | Sync items to admin user only |
| `--all-users` | boolean | `false` | Sync items to all existing users |
| `--dry-run` | boolean | `false` | Validate data without making database changes |
| `--verbose`, `-v` | boolean | `false` | Enable detailed logging |
| `--images-path` | string | `./public/images/wardrobe` | Path to wardrobe images directory |
| `--help`, `-h` | - | - | Show help information |
| `--version` | - | - | Show version number |

**Note:** `--admin-only` and `--all-users` are mutually exclusive options.

## Common Usage Examples

### 1. Default Sync (Admin Only)

Sync new items to the admin user account only (safest option):

```bash
node scripts/sync-wardrobe.js
```

### 2. Sync to All Users

Distribute new items to all existing user accounts:

```bash
node scripts/sync-wardrobe.js --all-users
```

### 3. Dry Run with Verbose Logging

Test the sync process without making database changes:

```bash
node scripts/sync-wardrobe.js --dry-run --verbose
```

### 4. Custom Images Path

Use a custom images directory location:

```bash
node scripts/sync-wardrobe.js --images-path ./custom/images/wardrobe
```

### 5. Verbose Logging for Debugging

Enable detailed logging to troubleshoot issues:

```bash
node scripts/sync-wardrobe.js --verbose
```

## Data Structure

The script uses hardcoded data arrays that follow the same structure as the seed-user Edge Function:

### Wardrobe Items

```javascript
const wardrobeData = [
  {
    "id": "unique-item-id",
    "name": "Item Name",
    "category": "Category Name",
    "brand": "Brand Name (optional)",
    "capsuleTags": ["tag1", "tag2"],
    "formalityScore": 7,
    "image": "/images/wardrobe/image-filename.png"
  }
];
```

### Outfits

```javascript
const outfitData = [
  {
    "id": "unique-outfit-id",
    "items": ["item-id-1", "item-id-2", "item-id-3"],
    "tuck": "Tucked",
    "weight": 8,
    "loved": true
  }
];
```

## Image Requirements

### Supported Formats

- `.png` (recommended)
- `.jpg` / `.jpeg`
- `.webp`

### File Organization

Images should be placed in the `public/images/wardrobe/` directory with filenames matching the `image` field in wardrobe items.

Example structure:
```
public/images/wardrobe/
├── gilet-navy.png
├── loafers-black-penny.png
├── quarterzip-black.png
└── trench-coat-khaki.png
```

### Duplicate Detection

The script uses a sophisticated duplicate detection system:

**For Wardrobe Items:**
- Primary: Matches items by their original ID from the wardrobeData array
- Fallback: Matches by name + category for backward compatibility
- Stores original ID in `external_id` field for future duplicate checks

**For Outfits:**
- Primary: Matches outfits by their original ID from the outfitData array  
- Stores original ID in `external_id` field for future duplicate checks
- Maps outfit items using external_id of wardrobe items

This approach ensures accurate duplicate detection even when the same items are run multiple times.

### Database Schema Requirements

The script expects the following database schema additions for proper duplicate tracking:

**wardrobe_items table:**
- `external_id` (text, nullable) - Stores original ID from wardrobeData array

**outfits table:**  
- `external_id` (text, nullable) - Stores original ID from outfitData array

These fields enable accurate duplicate detection across multiple script runs.

## Error Handling

### Exit Codes

- `0`: Success - all operations completed successfully
- `1`: General error - check logs for details
- `2`: Configuration error - missing environment variables or invalid setup

### Common Error Scenarios

#### Missing Environment Variables

```
ERROR: Missing required environment variables
Details: { "missingVars": ["SUPABASE_SERVICE_ROLE_KEY"] }
```

**Solution:** Add the missing environment variable to your `.env.local` file.

#### Invalid Data Structure

```
ERROR: Validation failed for wardrobe item
Details: { "itemId": "item-001", "errors": ["Item must have a valid string name"] }
```

**Solution:** Check the hardcoded data arrays in the script and ensure all required fields are present and properly formatted.

#### Database Connection Issues

```
ERROR: Database connection failed
Details: { "error": "Invalid API key" }
```

**Solution:** Verify your Supabase URL and service role key are correct.

#### Missing Image Files

```
WARN: Image file not found for item
Details: { "itemId": "item-001", "imagePath": "./public/images/wardrobe/missing.png" }
```

**Solution:** Add the missing image file or update the item's image reference.

## Security Considerations

### Environment Variables

- Never commit the `SUPABASE_SERVICE_ROLE_KEY` to version control
- Use `.env.local` for local development
- Use secure environment variable management in production

### Data Validation

- All input data is validated before database operations
- Parameterized queries prevent SQL injection attacks
- Sensitive information is filtered from logs

### Access Control

- Script requires service role permissions (admin-level access)
- All database operations respect Row Level Security (RLS) policies
- User data remains isolated through proper user_id associations

## Troubleshooting

### Script Shows Help Instead of Running

This usually indicates a configuration issue with command-line arguments. Try:

```bash
node scripts/sync-wardrobe.js --dry-run
```

### Database Permission Errors

Ensure your service role key has the necessary permissions:
- Read access to `auth.users` table
- Full access to wardrobe-related tables
- Ability to bypass RLS policies

### Image Validation Failures

Check that:
- Image files exist in the specified directory
- File extensions are supported
- File paths in JSON match actual filenames

### Performance Issues

For large datasets:
- Use `--verbose` to monitor progress
- Consider running in smaller batches
- Monitor database connection limits

## Development and Testing

### Running Tests

The script includes comprehensive tests:

```bash
# Run all sync script tests
npm test scripts/__tests__/sync-wardrobe.test.js

# Run with coverage
npm run test:coverage
```

### Adding New Items

To add new wardrobe items and outfits:

1. Add image files to `public/images/wardrobe/`
2. Update the `wardrobeData` array in the script with new item definitions
3. Optionally update the `outfitData` array with new outfit combinations
4. Run with `--dry-run` first to validate
5. Execute the sync to add items to the database

**Important:** The script uses hardcoded data arrays that follow the same structure as the seed-user Edge Function. This ensures consistency and eliminates the need for separate JSON files.

### Debugging

Use the `--verbose` flag to see detailed operation logs:

```bash
node scripts/sync-wardrobe.js --dry-run --verbose
```

This will show:
- Environment validation steps
- Data loading and validation progress
- Image file verification results
- Database operation details (in non-dry-run mode)

## Related Documentation

- [Project README](../README.md) - Main project documentation
- [Supabase Setup Guide](../docs/supabase-setup.md) - Database configuration
- [Development Guide](../docs/development.md) - General development information

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the error logs with `--verbose` flag
3. Verify environment variable configuration
4. Check data file formats against the examples provided