# Data Model: Mobile Camera Capture & Background Removal

## Modified Entity: wardrobe_items

### New Columns

| Column | Type | Default | Nullable | Description |
|--------|------|---------|----------|-------------|
| `bg_removal_status` | `text` | `'pending'` | NOT NULL | Processing state: `pending`, `processing`, `completed`, `failed` |
| `bg_removal_started_at` | `timestamptz` | `NULL` | YES | When background removal processing began |
| `bg_removal_completed_at` | `timestamptz` | `NULL` | YES | When background removal finished (success or failure) |

### State Transitions

```
pending → processing → completed
                    → failed
```

- **pending**: Image uploaded, background removal not yet started (Edge Function hasn't been invoked yet, or is about to start)
- **processing**: Edge Function is actively calling Replicate API
- **completed**: Background removed successfully, `image_url` updated to processed PNG
- **failed**: Background removal failed or timed out, `image_url` retains original

### Constraints

- `bg_removal_status` CHECK: value must be one of `('pending', 'processing', 'completed', 'failed')`
- `bg_removal_started_at` should only be set when transitioning to `processing`
- `bg_removal_completed_at` should only be set when transitioning to `completed` or `failed`

### Indexes

- No new indexes needed — queries filter by `user_id` (already indexed via RLS) and `bg_removal_status` is only used for display, not filtering

## Migration SQL

```sql
-- Add background removal tracking columns to wardrobe_items
ALTER TABLE wardrobe_items
  ADD COLUMN bg_removal_status text NOT NULL DEFAULT 'pending'
    CHECK (bg_removal_status IN ('pending', 'processing', 'completed', 'failed')),
  ADD COLUMN bg_removal_started_at timestamptz,
  ADD COLUMN bg_removal_completed_at timestamptz;

-- Enable Realtime on wardrobe_items for live status updates
ALTER PUBLICATION supabase_realtime ADD TABLE wardrobe_items;

-- Set REPLICA IDENTITY FULL so Realtime can see all column values in UPDATE events
ALTER TABLE wardrobe_items REPLICA IDENTITY FULL;

-- Update existing items to 'completed' status (they already have processed images or originals)
UPDATE wardrobe_items SET bg_removal_status = 'completed';
```

## Storage Structure (unchanged)

The existing `wardrobe-images` bucket structure remains:

```
wardrobe-images/
├── processed/{user_id}/{timestamp}.png    # Final image (bg removed + compressed)
└── original/{user_id}/{timestamp}.{ext}   # Temporary during processing, deleted after success
```

After successful background removal:
- `original/` file is deleted
- `processed/` file becomes the permanent image
- `image_url` column points to the `processed/` public URL

After failed background removal:
- `original/` file becomes the permanent image
- `image_url` column points to the `original/` public URL
- No `processed/` file is created

## Existing RLS Policies

The existing RLS policies on `wardrobe_items` already restrict access by `user_id = auth.uid()`. The new columns inherit these policies — no new RLS configuration needed.

## TypeScript Type Updates

```typescript
// Add to lib/types/database.ts
type BgRemovalStatus = 'pending' | 'processing' | 'completed' | 'failed';

// Update WardrobeItem interface
interface WardrobeItem {
  // ... existing fields ...
  bg_removal_status: BgRemovalStatus;
  bg_removal_started_at: string | null;
  bg_removal_completed_at: string | null;
}
```
