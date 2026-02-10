# Requirements Document

## Introduction

A secure, script-based system for adding new wardrobe items and outfits to the My AI Outfit application. This system uses the same data source as the seed-user Edge Function to maintain consistency and allows the developer to easily add new clothing items with images to their own account and optionally seed them to all users, while maintaining security and preventing unauthorized access.

## Glossary

- **Wardrobe_Sync_Script**: The main Node.js script that uses seed-user data source and syncs items to the database
- **Seed_User_Data_Source**: The wardrobeData and outfitData arrays defined in the seed-user Edge Function
- **Image_Assets**: PNG files for wardrobe items stored in the public/images/wardrobe directory
- **Admin_User**: The developer with local access to the codebase and environment variables
- **Target_Users**: Users who will receive the new wardrobe items (admin only or all users)
- **Supabase_Client**: Database client with service role permissions for administrative operations

## Requirements

### Requirement 1: Seed-User Data Source Integration

**User Story:** As a developer, I want to use the same data source as the seed-user Edge Function, so that I maintain consistency and avoid data duplication.

#### Acceptance Criteria

1. THE Wardrobe_Sync_Script SHALL use the same wardrobeData and outfitData arrays as defined in the seed-user Edge Function
2. WHEN new wardrobe items are added to the script, THE Wardrobe_Sync_Script SHALL validate the item structure and required fields
3. WHEN image files are referenced in wardrobe items, THE Wardrobe_Sync_Script SHALL verify that the corresponding image files exist in the public/images/wardrobe directory
4. WHEN outfit data references wardrobe items, THE Wardrobe_Sync_Script SHALL validate that all referenced item IDs exist in the wardrobe data
5. THE Wardrobe_Sync_Script SHALL extract color information from item names using the existing color extraction logic
6. THE Wardrobe_Sync_Script SHALL map seasons based on capsule tags using the existing season mapping logic

### Requirement 2: Secure Database Operations

**User Story:** As a developer, I want to securely sync wardrobe data to the database, so that new items are added without compromising security.

#### Acceptance Criteria

1. THE Wardrobe_Sync_Script SHALL authenticate using Supabase service role key from environment variables
2. WHEN the service role key is missing or invalid, THE Wardrobe_Sync_Script SHALL terminate with a clear error message
3. THE Wardrobe_Sync_Script SHALL use Row Level Security (RLS) compliant operations to ensure data isolation between users
4. WHEN inserting wardrobe items, THE Wardrobe_Sync_Script SHALL associate them with the correct user_id and category_id
5. THE Wardrobe_Sync_Script SHALL handle database errors gracefully and provide meaningful error messages

### Requirement 3: User Targeting Options

**User Story:** As a developer, I want to choose whether new items go to my account only or to all users, so that I can control the distribution of new content.

#### Acceptance Criteria

1. THE Wardrobe_Sync_Script SHALL accept a command-line flag to specify target users (--admin-only or --all-users)
2. WHEN --admin-only is specified, THE Wardrobe_Sync_Script SHALL add items only to the admin user account
3. WHEN --all-users is specified, THE Wardrobe_Sync_Script SHALL add items to all existing user accounts
4. WHEN no flag is specified, THE Wardrobe_Sync_Script SHALL default to admin-only mode for safety
5. THE Wardrobe_Sync_Script SHALL identify the admin user through environment variable configuration

### Requirement 4: ID-Based Duplicate Prevention

**User Story:** As a developer, I want to avoid creating duplicate wardrobe items and outfits using original IDs, so that the database remains clean and consistent across multiple script runs.

#### Acceptance Criteria

1. WHEN checking for existing items, THE Wardrobe_Sync_Script SHALL compare items by their original ID from the wardrobeData array stored in external_id field
2. WHEN a duplicate item is detected by original ID, THE Wardrobe_Sync_Script SHALL skip the insertion and log the duplicate
3. WHEN checking for existing outfits, THE Wardrobe_Sync_Script SHALL compare outfits by their original ID from the outfitData array stored in external_id field
4. WHEN outfit items reference wardrobe items, THE Wardrobe_Sync_Script SHALL map them using the external_id field for accurate matching
5. THE Wardrobe_Sync_Script SHALL provide a summary report of items added, skipped, and any errors encountered
6. WHEN no external_id exists (backward compatibility), THE Wardrobe_Sync_Script SHALL fall back to name+category matching for items

### Requirement 5: Image Asset Management

**User Story:** As a developer, I want to ensure wardrobe item images are properly handled, so that items display correctly in the application.

#### Acceptance Criteria

1. WHEN processing wardrobe items, THE Wardrobe_Sync_Script SHALL verify that image_url paths point to existing files
2. WHEN an image file is missing, THE Wardrobe_Sync_Script SHALL log a warning but continue processing the item
3. THE Wardrobe_Sync_Script SHALL use relative paths for image_url values (e.g., "/images/wardrobe/item.png")
4. THE Wardrobe_Sync_Script SHALL validate that image files have supported extensions (.png, .jpg, .jpeg, .webp)
5. WHEN image validation fails, THE Wardrobe_Sync_Script SHALL set image_url to null and log the issue

### Requirement 6: Security and Access Control

**User Story:** As a developer, I want to ensure the sync script cannot be exploited, so that the application remains secure.

#### Acceptance Criteria

1. THE Wardrobe_Sync_Script SHALL only run in a local development environment with proper environment variables
2. WHEN executed without required environment variables, THE Wardrobe_Sync_Script SHALL terminate immediately with an error
3. THE Wardrobe_Sync_Script SHALL not expose sensitive information in logs or error messages
4. THE Wardrobe_Sync_Script SHALL validate all input data before database operations
5. THE Wardrobe_Sync_Script SHALL use parameterized queries to prevent SQL injection attacks

### Requirement 7: Operational Reporting

**User Story:** As a developer, I want clear feedback on sync operations, so that I can verify the results and troubleshoot issues.

#### Acceptance Criteria

1. THE Wardrobe_Sync_Script SHALL log the start and completion of sync operations with timestamps
2. WHEN processing items, THE Wardrobe_Sync_Script SHALL display progress indicators for long-running operations
3. THE Wardrobe_Sync_Script SHALL provide a summary report showing items added, skipped, and errors for each user
4. WHEN errors occur, THE Wardrobe_Sync_Script SHALL log detailed error information without exposing sensitive data
5. THE Wardrobe_Sync_Script SHALL exit with appropriate status codes (0 for success, non-zero for errors)