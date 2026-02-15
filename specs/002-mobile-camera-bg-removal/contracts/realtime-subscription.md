# Contract: Supabase Realtime Subscription

## Channel: wardrobe-changes:{userId}

### Subscription

```typescript
supabase
  .channel(`wardrobe-changes:${userId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'wardrobe_items',
    filter: `user_id=eq.${userId}`,
  }, handler)
  .subscribe()
```

### Payload (UPDATE event)

```typescript
{
  eventType: 'UPDATE';
  schema: 'public';
  table: 'wardrobe_items';
  new: {
    id: string;
    image_url: string;
    bg_removal_status: 'pending' | 'processing' | 'completed' | 'failed';
    // ... all other wardrobe_items columns
  };
  old: {
    id: string;
    image_url: string;
    bg_removal_status: 'pending' | 'processing' | 'completed' | 'failed';
    // ... all other columns (requires REPLICA IDENTITY FULL)
  };
}
```

### Client Behavior

On receiving an UPDATE where `bg_removal_status` changed:
1. Invalidate TanStack Query cache for wardrobe items list
2. Invalidate TanStack Query cache for the specific item
3. UI re-renders with updated image and status indicator

### Prerequisites

```sql
-- Required for Realtime to see non-PK columns in UPDATE events
ALTER TABLE wardrobe_items REPLICA IDENTITY FULL;

-- Required to enable Realtime on the table
ALTER PUBLICATION supabase_realtime ADD TABLE wardrobe_items;
```
