# Contract: Upload Image API

## Endpoint: POST /api/upload-image

**Existing endpoint** — modified to support mobile capture and return bg removal status.

### Request

```
Content-Type: multipart/form-data
Authorization: (Supabase session cookie)
```

**FormData fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `image` | `File` | Yes | Image file (JPEG, PNG, WebP; max 5MB) |
| `removeBackground` | `string` | No | `"true"` to trigger bg removal (default: `"true"`) |
| `quality` | `string` | No | Compression quality hint |

### Response

```typescript
// Success (200)
{
  success: true;
  imageUrl: string;         // Public URL of processed image (or original if bg removal pending)
  fallbackUrl?: string;     // Original image URL if processing failed immediately
  bgRemovalStatus: 'pending' | 'processing' | 'completed' | 'failed';
  message?: string;
  processingTime?: number;  // Milliseconds
}

// Error (400 | 401 | 500)
{
  success: false;
  error: string;
}
```

### Behavior Changes

1. After uploading to Supabase Storage, the API route invokes the `process-image` Edge Function
2. The Edge Function now calls Replicate API synchronously (`Prefer: wait`)
3. On Replicate success: processed image stored, `bg_removal_status` set to `completed`
4. On Replicate failure/timeout: original image retained, `bg_removal_status` set to `failed`
5. Response includes `bgRemovalStatus` for the client to show appropriate UI

### Zod Schema

```typescript
const ImageProcessingResponseSchema = z.object({
  success: z.boolean(),
  imageUrl: z.string().url().optional(),
  fallbackUrl: z.string().url().optional(),
  bgRemovalStatus: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
  error: z.string().optional(),
  message: z.string().optional(),
  processingTime: z.number().optional(),
});
```
