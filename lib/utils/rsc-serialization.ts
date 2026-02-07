/**
 * RSC Serialization Optimization Utilities
 * 
 * These utilities help minimize data serialization across RSC boundaries
 * by providing type-safe field selection and transformation helpers.
 * 
 * **Validates: Requirements 5.2**
 */

/**
 * Pick only specified fields from an object
 * Useful for passing minimal data across RSC boundaries
 */
export function pickFields<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  fields: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const field of fields) {
    if (field in obj) {
      result[field] = obj[field];
    }
  }
  return result;
}

/**
 * Pick fields from an array of objects
 * Useful for minimizing serialization of lists
 */
export function pickFieldsFromArray<T extends Record<string, any>, K extends keyof T>(
  arr: T[],
  fields: K[]
): Pick<T, K>[] {
  return arr.map(obj => pickFields(obj, fields));
}

/**
 * Transform data for client-side consumption
 * Moves heavy transformations to client side where appropriate
 */
export function prepareForClient<T>(data: T): T {
  // Remove any server-only fields
  if (typeof data === 'object' && data !== null) {
    const cleaned = { ...data };
    // Remove common server-only fields
    delete (cleaned as any).password;
    delete (cleaned as any).password_hash;
    delete (cleaned as any).internal_notes;
    return cleaned;
  }
  return data;
}

/**
 * Example usage patterns for RSC optimization
 */

// Example 1: Pass only required fields
// ❌ Bad: Serializes all 50 fields
// async function Page() {
//   const user = await fetchUser();  // 50 fields
//   return <Profile user={user} />
// }

// ✅ Good: Serializes only needed fields
// async function Page() {
//   const user = await fetchUser();
//   const minimalUser = pickFields(user, ['id', 'name', 'avatar']);
//   return <Profile user={minimalUser} />
// }

// Example 2: Pass IDs instead of full objects
// ❌ Bad: Serializes full wardrobe items
// async function Page() {
//   const items = await fetchWardrobeItems();
//   return <ItemList items={items} />
// }

// ✅ Good: Pass IDs, fetch on client
// async function Page() {
//   const items = await fetchWardrobeItems();
//   const itemIds = items.map(item => item.id);
//   return <ItemList itemIds={itemIds} />
// }

// Example 3: Move transformations to client
// ❌ Bad: Transform on server, serialize result
// async function Page() {
//   const items = await fetchWardrobeItems();
//   const enrichedItems = items.map(item => ({
//     ...item,
//     displayName: formatDisplayName(item),
//     categoryLabel: getCategoryLabel(item.category_id),
//   }));
//   return <ItemGrid items={enrichedItems} />
// }

// ✅ Good: Pass minimal data, transform on client
// async function Page() {
//   const items = await fetchWardrobeItems();
//   const minimalItems = pickFieldsFromArray(items, ['id', 'name', 'category_id', 'image_url']);
//   return <ItemGrid items={minimalItems} />
// }
