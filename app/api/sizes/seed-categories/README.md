# Seed Categories API Route

## Overview

This API endpoint seeds pre-defined system categories for authenticated users. It creates 16 categories (8 men's, 8 women's) with measurement guides by calling the `seed_system_categories` database function.

## Endpoint

```
POST /api/sizes/seed-categories
```

## Authentication

**Required**: Yes - User must be authenticated via Supabase Auth

## Rate Limiting

- **Limit**: 10 requests per 15 minutes
- **Purpose**: Prevent abuse and excessive database calls

## Request

### Headers
```
Content-Type: application/json
Authorization: Bearer <supabase-auth-token>
```

### Body
No request body required.

## Response

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Categories seeded successfully",
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "name": "Dress Shirt",
      "icon": "shirt",
      "gender": "men",
      "supported_formats": ["numeric", "measurements"],
      "is_system_category": true,
      "measurement_guide": {
        "fields": [
          {
            "name": "collar",
            "label": "Collar Size",
            "description": "Measure around the base of your neck where the collar sits",
            "unit": "inches",
            "typical_range": [14, 18]
          }
        ],
        "size_examples": ["15.5/33", "16/34", "16.5/35"]
      },
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
    // ... 15 more categories
  ],
  "count": 16
}
```

### Error Responses

#### 401 Unauthorized
```json
{
  "error": "Authentication required"
}
```

#### 500 Internal Server Error
```json
{
  "error": "Failed to seed categories",
  "details": "Database error message"
}
```

#### 500 Internal Server Error (Unexpected)
```json
{
  "error": "Internal server error",
  "errorId": "error-tracking-id"
}
```

## Behavior

### Idempotency

The endpoint is **idempotent** - it can be called multiple times safely without creating duplicate categories. The underlying database function uses `ON CONFLICT DO NOTHING` to prevent duplicates.

### Categories Created

The endpoint creates the following categories:

**Men's Categories (8):**
1. Dress Shirt - Collar and sleeve measurements
2. Casual Shirt - Letter or numeric sizes
3. Suit Jacket - Chest size and length
4. Pants - Waist and inseam
5. Jeans - Waist and inseam
6. Shoes - US numeric sizes
7. Belt - Waist size
8. Coat/Jacket - Letter or numeric sizes

**Women's Categories (8):**
1. Dress - Numeric or letter sizes with bust/waist/hips
2. Blouse/Top - Letter or numeric sizes
3. Pants - Numeric or waist/inseam
4. Jeans - Numeric or waist/inseam
5. Shoes - US numeric sizes
6. Jacket/Coat - Letter or numeric sizes
7. Suit Jacket - Numeric sizes
8. Belt - Letter or numeric sizes

## Usage Examples

### JavaScript/TypeScript

```typescript
async function seedCategories() {
  const response = await fetch('/api/sizes/seed-categories', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  const result = await response.json();
  console.log(`Seeded ${result.count} categories`);
  return result.data;
}
```

### cURL

```bash
curl -X POST https://your-domain.com/api/sizes/seed-categories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_TOKEN"
```

## Error Handling

The endpoint implements comprehensive error handling:

1. **Authentication Errors**: Returns 401 if user is not authenticated
2. **Database Errors**: Logs error and returns 500 with details
3. **Fetch Errors**: If seeding succeeds but fetching categories fails, still returns success
4. **Unexpected Errors**: Catches all errors, logs them, and returns 500 with error ID

## Security

- **Authentication**: Required via Supabase Auth
- **Rate Limiting**: 10 requests per 15 minutes per user
- **SECURITY DEFINER**: Database function runs with elevated privileges
- **RLS Policies**: Categories are automatically associated with the authenticated user

## Testing

### Unit Tests

Run unit tests:
```bash
npm run test -- app/api/sizes/seed-categories/__tests__/route.test.ts
```

### Integration Tests

Integration tests are skipped by default. To run with a real database:
1. Remove `.skip` from the test file
2. Add valid authentication token
3. Ensure Supabase is running
4. Run: `npm run test -- app/api/sizes/seed-categories/__tests__/integration.test.ts`

## Related

- **Database Function**: `supabase/migrations/20260208_create_seed_function.sql`
- **Requirements**: `.kiro/specs/my-sizes-system-categories/requirements.md`
- **Task**: Task 2.1 in `.kiro/specs/my-sizes-system-categories/tasks.md`

## Notes

- The endpoint is designed to be called automatically when a user first accesses the My Sizes feature
- Categories include measurement guides to help users understand how to measure for each category
- All categories are marked as `is_system_category = true` to distinguish them from user-created categories
- The function uses `SECURITY DEFINER` to ensure proper permissions for category creation
