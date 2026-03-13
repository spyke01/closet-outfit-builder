# API Contract: Export & Share

**Branch**: `005-beta-launch-readiness` | **Date**: 2026-03-09

---

## Export & Share Page Route

**Path**: `app/(app)/export/page.tsx` (new route)

**Auth**: Required. Entitlement check: Pro plan for full export/share. Free and Plus users see a preview with upgrade prompt.

**Navigation**: Add "Export" link to settings or a secondary nav location. Not a primary nav item (calendar, wardrobe, outfits, today are primary).

---

## Export Outfit (client-side, no API endpoint)

The export action runs entirely client-side using the browser's canvas API or `html-to-image` (evaluate bundle impact; if > 50KB gzipped, use dynamic import with `next/dynamic`).

**Flow**:
1. User selects an outfit from their saved outfits list
2. A styled outfit card is rendered into a hidden `div` (item images in a grid, outfit name, score badge)
3. Client captures the rendered `div` as PNG via canvas
4. Browser triggers file download: `outfit-name.png`

**Entitlement gate**: The "Export as image" button is disabled for free/Plus users with a tooltip explaining Pro is required. The page itself is accessible to all (preview visible).

---

## Share Outfit

**Flow**:
1. User clicks Share → check `navigator.canShare()` (Web Share API support)
2. If supported: `navigator.share({ title: outfitName, text: '...', url: shareUrl })`
3. If not supported: copy `shareUrl` to clipboard + show success alert

**Share URL**: `/outfits/[id]` — currently auth-gated. For beta, the shared link leads to the login page with `?redirect=/outfits/[id]` so recipients can sign up and view the outfit.

**Entitlement gate**: Same as export — Pro only for the share action.

---

## In-Feature Roadmap Section

Rendered below the current capability on the Export & Share page, visible to all users:

```
Coming soon:
• Share to Instagram Stories
• Export full lookbook as PDF
• Generate a packing list PDF from a trip
• Collaborate with a stylist
```
