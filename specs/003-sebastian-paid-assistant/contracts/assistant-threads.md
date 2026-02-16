# Contract: Assistant Threads API

## Endpoint: GET /api/assistant/threads/[id]

**New endpoint** — returns thread metadata and messages for owning user only.

### Path Params

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `uuid` | Yes | Assistant thread ID |

### Response

```json
{
  "thread": {
    "id": "uuid",
    "title": "Packing for NYC",
    "createdAt": "2026-02-16T10:00:00.000Z",
    "updatedAt": "2026-02-16T10:12:00.000Z"
  },
  "messages": [
    {
      "id": "uuid",
      "role": "user",
      "content": "What should I pack for 4 days?",
      "imageUrl": null,
      "createdAt": "2026-02-16T10:00:05.000Z"
    },
    {
      "id": "uuid",
      "role": "assistant",
      "content": "Based on your trip...",
      "imageUrl": null,
      "createdAt": "2026-02-16T10:00:07.000Z"
    }
  ]
}
```

### Authorization Contract

- Must be authenticated
- Must own `assistant_threads.user_id`
- Non-owner access returns 404 (`THREAD_NOT_FOUND`) to avoid enumeration
