# Contract: Assistant Context Pack (Internal)

## Purpose

Defines the bounded request-scoped payload passed to provider adapter.

## Shape

```typescript
interface AssistantContextPack {
  userId: string;
  wardrobe: Array<{
    id: string;
    name: string;
    category: string;
    color?: string;
    season?: string[];
    formalityScore?: number;
  }>;
  recentOutfits: Array<{
    id: string;
    itemIds: string[];
    loved: boolean;
    createdAt: string;
  }>;
  calendarWindow: Array<{
    id: string;
    date: string;
    status: 'planned' | 'worn';
    notes?: string | null;
    outfitId?: string | null;
  }>;
  trips: Array<{
    id: string;
    name: string;
    destinationText: string;
    startDate: string;
    endDate: string;
  }>;
  hints?: {
    focusItemId?: string;
    eventDate?: string;
    tripId?: string;
  };
}
```

## Bounds

- `wardrobe`: max 50 items
- `recentOutfits`: max 20 outfits
- `calendarWindow`: max 30 rows in bounded date window
- `trips`: max 10 active/upcoming trips

## Security Rules

- All context rows must satisfy `user_id = auth.uid()` under RLS
- No cross-user joins
- No secrets or provider tokens included
- No raw uploaded image bytes included
