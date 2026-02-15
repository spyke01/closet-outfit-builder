# Contract: Process Image Edge Function

## Function: supabase/functions/process-image

**Existing Edge Function** — modified to integrate Replicate API for background removal.

### Request

```
POST /functions/v1/process-image
Content-Type: multipart/form-data
Authorization: Bearer <user-jwt>
```

**FormData fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `image` | `File` | Yes | Image file |
| `removeBackground` | `string` | No | `"true"` to trigger bg removal |
| `quality` | `string` | No | Compression quality hint |
| `itemId` | `string` | No | Wardrobe item ID (for status updates) |

### Processing Pipeline

```
1. Validate auth (JWT) and file (type, size, magic bytes)
2. Upload original to wardrobe-images/original/{user_id}/{timestamp}.{ext}
3. Get public URL of original
4. IF removeBackground:
   a. Update wardrobe_items.bg_removal_status = 'processing'
   b. Call Replicate API (sync mode, 60s timeout):
      POST https://api.replicate.com/v1/predictions
      Headers: Authorization: Bearer <REPLICATE_API_TOKEN>, Prefer: wait
      Body: { version: "851-labs/background-remover", input: { image: "<original_url>" } }
   c. ON SUCCESS:
      - Fetch processed image from Replicate output URL
      - Compress/resize to max 1024px, optimize PNG
      - Upload to wardrobe-images/processed/{user_id}/{timestamp}.png
      - Delete original from wardrobe-images/original/
      - Update wardrobe_items: image_url = processed_url, bg_removal_status = 'completed'
   d. ON FAILURE/TIMEOUT:
      - Keep original in storage
      - Update wardrobe_items: bg_removal_status = 'failed'
5. Return result with imageUrl and bgRemovalStatus
```

### Response

```typescript
{
  success: boolean;
  imageUrl?: string;        // Final image URL (processed or original)
  fallbackUrl?: string;     // Original URL if processing failed
  bgRemovalStatus: 'completed' | 'failed';
  processingTime?: number;
  error?: string;
}
```

### External Dependencies

- **Replicate API**: `https://api.replicate.com/v1/predictions`
  - Auth: `REPLICATE_API_TOKEN` (Supabase secret)
  - Model: `851-labs/background-remover`
  - Timeout: 60 seconds
  - Expected latency: 2-3 seconds

### Error Handling

| Scenario | Behavior |
|----------|----------|
| Invalid file type | 400 error, no processing |
| File too large (>5MB) | 400 error, no processing |
| Auth failure | 401 error |
| Replicate API error | Fall back to original, status = `failed` |
| Replicate timeout (>60s) | Fall back to original, status = `failed` |
| Storage upload failure | 500 error |
