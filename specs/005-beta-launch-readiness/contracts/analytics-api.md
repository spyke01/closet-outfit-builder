# API Contract: Analytics Dashboard

**Branch**: `005-beta-launch-readiness` | **Date**: 2026-03-09

---

## GET `/api/analytics/dashboard`

Returns wardrobe and outfit engagement stats for the authenticated user. Extends the existing `/api/wardrobe/dashboard` endpoint pattern.

**Auth**: Required (authenticated user). Entitlement check: Plus or Pro plan required for full data. Free tier receives a limited preview dataset.

**Response (Plus/Pro)**:
```typescript
{
  wardrobe: {
    totalItems: number;
    totalOutfits: number;
    recentlyAdded: Array<{
      id: string;
      name: string;
      imageUrl: string | null;
      createdAt: string;
    }>;                         // Last 5 items by created_at
    mostWorn: Array<{
      id: string;
      name: string;
      imageUrl: string | null;
      appearanceCount: number;  // Count of outfit_items rows linking to this item
    }>;                         // Top 5 items by outfit appearances
  };
  engagement: {
    savedOutfits: number;       // COUNT(outfits)
    lovedOutfits: number;       // COUNT(outfits WHERE loved = true)
    outfitHistory: Array<{
      id: string;
      name: string;
      createdAt: string;
      loved: boolean;
      score: number | null;
    }>;                         // Last 10 outfits by created_at
    todayStats: {
      totalRecommendations: number;  // COUNT(today_ai_outfits)
      accepted: number;              // COUNT WHERE user_saved = true
      acceptanceRate: number;        // accepted / totalRecommendations (0–1)
    };
  };
}
```

**Response (Free tier)**:
```typescript
{
  wardrobe: {
    totalItems: number;         // Real count shown (not gated)
    totalOutfits: number;       // Real count shown (not gated)
    recentlyAdded: null;        // Gated
    mostWorn: null;             // Gated
  };
  engagement: null;             // Fully gated
  tier: 'free';                 // Signal to UI to show upgrade prompt
}
```

**Data Sources**:
- `wardrobe.totalItems`: `COUNT(wardrobe_items) WHERE user_id = $uid AND active = true`
- `wardrobe.totalOutfits`: `COUNT(outfits) WHERE user_id = $uid`
- `wardrobe.recentlyAdded`: `wardrobe_items ORDER BY created_at DESC LIMIT 5`
- `wardrobe.mostWorn`: `outfit_items JOIN wardrobe_items GROUP BY item_id ORDER BY COUNT(*) DESC LIMIT 5`
- `engagement.savedOutfits`: `COUNT(outfits) WHERE user_id = $uid`
- `engagement.lovedOutfits`: `COUNT(outfits) WHERE user_id = $uid AND loved = true`
- `engagement.outfitHistory`: `outfits ORDER BY created_at DESC LIMIT 10`
- `engagement.todayStats`: `today_ai_outfits WHERE user_id = $uid` — aggregate `user_saved`

**Caching**: Results are not cached (TanStack Query handles stale-while-revalidate on the client with a 5-minute stale time). Server-side: no `unstable_cache` (data is user-specific and changes frequently).

---

## Analytics Page Route

**Path**: `app/(app)/analytics/page.tsx` (new route)

**Navigation**: Add "Analytics" link to `components/top-bar.tsx` for Plus/Pro users. For free users, show the link with a lock icon and redirect to the analytics page (which shows the preview/upgrade prompt).

**Page Structure**:
```
/analytics
├── WardrobeStatsSection      (total items, total outfits — visible to all)
├── RecentlyAddedSection      (last 5 items — Plus/Pro only)
├── MostWornSection           (top 5 items — Plus/Pro only)
├── OutfitEngagementSection   (saved, loved, history — Plus/Pro only)
├── TodayStatsSection         (acceptance rate — Plus/Pro only)
└── ComingSoonSection         (roadmap: style heatmap, seasonal trends, etc.)
```

For free users, sections 2–5 render a blurred placeholder card with an upgrade CTA.
