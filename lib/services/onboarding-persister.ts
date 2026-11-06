import { createLogger } from "@/lib/utils/logger";

const logger = createLogger({ component: "lib-services-onboarding-persister" });

/**
 * Onboarding persister service
 *
 * Persists generated wardrobe items to database with error handling.
 * Handles batch insertion and provides detailed success/failure statistics.
 */

import type { OnboardingCategoryMap } from "@/lib/services/onboarding-category-manager";
import type { GeneratedWardrobeItem } from "@/lib/types/onboarding";
import type { CreateWardrobeItemInput } from "@/lib/types/database";

/**
 * Result of persisting wardrobe items
 */
export interface PersistResult {
  success: number;
  failed: number;
  errors: string[];
}

type OnboardingWardrobeInsert = CreateWardrobeItemInput & {
  user_id: string;
  active: boolean;
};

/**
 * Persist generated wardrobe items to database
 *
 * Maps GeneratedWardrobeItem to CreateWardrobeItemInput and batch inserts.
 * Handles errors gracefully and returns success/failure statistics.
 *
 * @param userId - User ID
 * @param items - Generated wardrobe items to persist
 * @param categoryMap - Map of CategoryKey to database category ID
 * @returns Persist result with success/failure counts and errors
 */
export async function persistWardrobeItems(
  userId: string,
  items: GeneratedWardrobeItem[],
  categoryMap: OnboardingCategoryMap,
): Promise<PersistResult> {
  const result: PersistResult = {
    success: 0,
    failed: 0,
    errors: [],
  };

  if (items.length === 0) {
    return result;
  }

  try {
    // Map generated items to database input format
    const itemsToInsert = items
      .map((item) => mapGeneratedItemToInput(item, userId, categoryMap))
      .filter((item) => item !== null) as OnboardingWardrobeInsert[];

    // Track items that failed mapping
    const mappingFailures = items.length - itemsToInsert.length;
    if (mappingFailures > 0) {
      throw new Error(
        "Some categories could not be found. No pieces were added.",
      );
    }

    // Retain the same key after a lost response. The database writes the entire
    // batch once or rolls it back; a retry cannot duplicate a partial wardrobe.
    const snapshot = JSON.stringify(itemsToInsert);
    const bytes = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(snapshot),
    );
    const hash = Array.from(new Uint8Array(bytes))
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("");
    const storageKey = `onboarding-save:${userId}:${hash}`;
    let requestKey = sessionStorage.getItem(storageKey);
    if (!requestKey) {
      requestKey = crypto.randomUUID();
      sessionStorage.setItem(storageKey, requestKey);
    }
    const response = await fetch("/api/onboarding/wardrobe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestKey, items: itemsToInsert }),
    });
    const payload = await response.json();
    if (!response.ok)
      throw new Error(payload.error || "Could not save this wardrobe.");
    result.success = Number(payload.success || 0);
    // Leave the key available through navigation/reload; an explicit new setup
    // changes the selection snapshot or starts a new browser session.

    return result;
  } catch (error) {
    logger.error("Error persisting wardrobe items:", error);
    result.failed = items.length;
    result.errors.push(
      error instanceof Error ? error.message : "Unknown error",
    );
    return result;
  }
}

/**
 * Map GeneratedWardrobeItem to CreateWardrobeItemInput
 *
 * @param item - Generated wardrobe item
 * @param userId - User ID
 * @param categoryMap - Map of CategoryKey to database category ID
 * @returns CreateWardrobeItemInput or null if mapping fails
 */
function mapGeneratedItemToInput(
  item: GeneratedWardrobeItem,
  userId: string,
  categoryMap: OnboardingCategoryMap,
): OnboardingWardrobeInsert | null {
  const categoryId =
    (item.category === "Accessories"
      ? categoryMap.byName?.get(item.subcategory)
      : undefined) || categoryMap.get(item.category);

  if (!categoryId) {
    logger.error(`No category ID found for category: ${item.category}`);
    return null;
  }

  return {
    user_id: userId,
    category_id: categoryId,
    name: item.name,
    color: item.color || undefined,
    formality_score: item.formality_score,
    season: item.season,
    image_url: item.image_url || undefined,
    active: true,
    // Set source to 'onboarding' to track item origin
    capsule_tags: ["onboarding"],
  };
}
