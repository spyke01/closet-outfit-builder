# Research: Mobile Camera Capture & Background Removal

## Decision 1: Replicate API Integration (851-labs/background-remover)

**Decision**: Use Replicate HTTP API with `Prefer: wait` sync mode from the existing `process-image` Supabase Edge Function.

**Rationale**: The 851-labs/background-remover model completes in 2-3 seconds, making sync mode (`Prefer: wait` header) practical — no polling or webhook infrastructure needed. The Edge Function already handles the upload pipeline; we add a single fetch call to Replicate before storing the processed image.

**Alternatives considered**:
- Async polling mode: Unnecessary complexity for a 2-3s operation
- Webhook mode: Requires a separate Edge Function endpoint, adds architectural overhead for no latency benefit
- Replicate Node/Deno SDK: Not needed — raw fetch with 3 headers covers the full API

**Key details**:
- Endpoint: `POST https://api.replicate.com/v1/predictions` with `Prefer: wait`
- Auth: `Authorization: Bearer <REPLICATE_API_TOKEN>` (stored as Supabase secret)
- Input: `{ version: "851-labs/background-remover", input: { image: "<url>" } }`
- Output: URL to processed PNG with transparent background
- Cost: ~$0.0006/image (~1,700 runs per $1)
- Rate limit: 600 requests/minute (far above our needs)

## Decision 2: Mobile Camera Capture Approach

**Decision**: Use a single `<input type="file" accept="image/*">` without the `capture` attribute for the default mobile experience. Optionally show a separate camera-specific input with `capture="environment"` on Android.

**Rationale**: iOS Safari ignores the `capture` attribute entirely and always shows both "Take Photo" and "Photo Library" options natively. On Android, adding `capture` forces camera-only (removes gallery option). A single input without `capture` provides the best cross-platform behavior — both iOS and Android show camera + gallery options.

**Alternatives considered**:
- Dual inputs (camera + gallery): iOS ignores `capture` so both inputs behave identically on iOS. On Android, it works but adds UI complexity for minimal gain
- `getUserMedia` API: Much more complex, requires managing a video stream, not needed for simple photo capture
- Feature detection for mobile: `window.matchMedia('(pointer: coarse)')` is reliable for touch detection

**Key gotchas**:
- iOS may send HEIC format: Our existing `accept` types include JPEG/PNG/WebP. HEIC needs conversion or the Edge Function should handle it
- EXIF orientation: Modern browsers handle this, but server-side processing should normalize
- Desktop browsers ignore `capture` gracefully — file picker opens as usual

## Decision 3: Supabase Realtime for Live Image Updates

**Decision**: Use Supabase Realtime `postgres_changes` subscription filtered by `user_id`, with TanStack Query cache invalidation on change events.

**Rationale**: Cache invalidation (vs direct cache update) is simpler, ensures consistency with server state, and aligns with the project's existing TanStack Query patterns. The slight refetch delay (< 100ms) is imperceptible compared to the 2-3s processing time.

**Alternatives considered**:
- Direct cache update (`setQueryData`): More complex, risk of cache desync, requires handling all event types
- Polling: Wasteful for a real-time push use case; Supabase Realtime is already available
- Server-Sent Events: Would require custom infrastructure when Supabase Realtime is built-in

**Requirements**:
- `ALTER TABLE wardrobe_items REPLICA IDENTITY FULL` — needed so Realtime can see non-PK column values in UPDATE events
- `ALTER PUBLICATION supabase_realtime ADD TABLE wardrobe_items` — enable Realtime on the table
- Cleanup: `supabase.removeChannel(channel)` in useEffect cleanup

## Decision 4: Processing Pipeline Architecture

**Decision**: Extend the existing `process-image` Edge Function to call Replicate in sync mode. The Edge Function already handles upload, validation, and storage — we insert the Replicate call between upload and storage.

**Rationale**: The existing flow is: validate → (placeholder bg removal) → store in `processed/` or `original/`. We replace the placeholder with the actual Replicate call. After Replicate returns the processed image URL, we fetch it, compress, and store as PNG. On failure, we store the original as before.

**Pipeline**:
1. Client uploads image → API route → Edge Function
2. Edge Function validates and uploads original to temp storage
3. Edge Function calls Replicate sync API with the temp image URL
4. On success: fetch processed image, compress, store as final PNG, delete temp original
5. On failure: keep original as the permanent image
6. Edge Function updates `wardrobe_items.bg_removal_status` column
7. Supabase Realtime pushes the status change to connected clients

**New DB column**: `bg_removal_status` enum (`pending`, `processing`, `completed`, `failed`) on `wardrobe_items` table. Updated by the Edge Function after processing.

## Decision 5: Image Compression Strategy

**Decision**: Use server-side PNG optimization in the Edge Function after background removal, targeting reasonable file sizes for web display.

**Rationale**: The Replicate output is an uncompressed PNG. We need to compress it before final storage to minimize storage costs and load times. The Edge Function can use Deno-native image processing or fetch the image and re-encode it.

**Approach**: Resize to max 1024px on longest side (sufficient for wardrobe display), convert to optimized PNG with alpha channel. This keeps files under ~500KB typically.
