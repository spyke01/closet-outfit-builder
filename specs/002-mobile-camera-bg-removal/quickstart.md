# Quickstart: Mobile Camera Capture & Background Removal

## Prerequisites

1. Supabase project with Edge Functions enabled
2. Replicate API account and token
3. Node.js 18+ and npm

## Setup

### 1. Set Replicate API Token

```bash
# Add to Supabase secrets (for Edge Functions)
supabase secrets set REPLICATE_API_TOKEN=r8_your_token_here

# Add to .env.local (for local development with supabase functions serve)
echo "REPLICATE_API_TOKEN=r8_your_token_here" >> .env.local
```

### 2. Run Database Migration

```bash
# Apply the migration to add bg_removal_status columns and enable Realtime
supabase db push
```

Or manually run:
```sql
ALTER TABLE wardrobe_items
  ADD COLUMN bg_removal_status text NOT NULL DEFAULT 'pending'
    CHECK (bg_removal_status IN ('pending', 'processing', 'completed', 'failed')),
  ADD COLUMN bg_removal_started_at timestamptz,
  ADD COLUMN bg_removal_completed_at timestamptz;

ALTER PUBLICATION supabase_realtime ADD TABLE wardrobe_items;
ALTER TABLE wardrobe_items REPLICA IDENTITY FULL;
UPDATE wardrobe_items SET bg_removal_status = 'completed';
```

### 3. Deploy Edge Function

```bash
supabase functions deploy process-image
```

### 4. Start Development

```bash
npm run dev
```

## Testing the Feature

### Mobile Camera Capture
1. Open `http://localhost:3000/wardrobe/items/add` on a mobile device (or use Chrome DevTools mobile emulation)
2. Tap the upload area
3. On iOS: choose "Take Photo" or "Photo Library" from the native menu
4. On Android: camera opens directly or file picker shows
5. Capture/select an image
6. Image uploads and appears with a processing indicator
7. After 2-5 seconds, the image updates to a transparent-background version

### Background Removal Verification
1. Upload any image with a busy background
2. Check that `bg_removal_status` transitions: `pending` → `processing` → `completed`
3. Verify the final image has a transparent background (PNG with alpha)
4. Check Supabase Storage: original should be deleted, only processed remains

### Failure Handling
1. Temporarily set an invalid `REPLICATE_API_TOKEN`
2. Upload an image
3. Verify the original image is retained and `bg_removal_status` = `failed`
4. No error is shown to the user

## Key Files

| File | Purpose |
|------|---------|
| `components/image-upload.tsx` | Upload UI with mobile capture support |
| `lib/hooks/use-image-upload.ts` | Upload logic and status tracking |
| `lib/hooks/use-realtime-wardrobe.ts` | Supabase Realtime subscription |
| `supabase/functions/process-image/index.ts` | Edge Function with Replicate integration |
| `app/api/upload-image/route.ts` | API route (passes through to Edge Function) |
| `components/processing-indicator.tsx` | Visual status indicator component |
