/** Keep smaller categories represented when a wardrobe is larger than the prompt. */
export function balancedWardrobeShortlist<T>(
  items: readonly T[],
  limit: number,
  categoryOf: (item: T) => string,
): T[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const category = categoryOf(item);
    const group = groups.get(category) || [];
    group.push(item);
    groups.set(category, group);
  }
  const selected: T[] = [];
  for (let index = 0; selected.length < limit; index += 1) {
    let added = false;
    for (const group of groups.values()) {
      if (group[index] !== undefined && selected.length < limit) {
        selected.push(group[index]);
        added = true;
      }
    }
    if (!added) break;
  }
  return selected;
}
