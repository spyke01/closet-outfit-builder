/**
 * Onboarding persister service
 * 
 * Persists generated wardrobe items to database with error handling.
 * Handles batch insertion and provides detailed success/failure statistics.
 */

import { createClient } from '@/lib/supabase/client';
import type { CategoryKey } from '@/lib/data/onboarding-categories';
import type { GeneratedWardrobeItem } from '@/lib/types/onboarding';
import type { CreateWardrobeItemInput } from '@/lib/types/database';

/**
 * Result of persisting wardrobe items
 */
export interface PersistResult {
  success: number;
  failed: number;
  errors: string[];
}

/**
 * Batch size for database inserts
 * Inserting in chunks improves performance and reduces timeout risk
 */
const BATCH_SIZE = 50;

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
  categoryMap: Map<CategoryKey, string>
): Promise<PersistResult> {
  const supabase = createClient();
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
    const itemsToInsert = items.map(item => 
      mapGeneratedItemToInput(item, userId, categoryMap)
    ).filter(item => item !== null) as CreateWardrobeItemInput[];

    // Track items that failed mapping
    const mappingFailures = items.length - itemsToInsert.length;
    if (mappingFailures > 0) {
      result.failed += mappingFailures;
      result.errors.push(`${mappingFailures} items failed category mapping`);
    }

    // Insert items in batches
    const batches = chunkArray(itemsToInsert, BATCH_SIZE);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      try {
        const { data, error } = await supabase
          .from('wardrobe_items')
          .insert(batch)
          .select('id');

        if (error) {
          result.failed += batch.length;
          result.errors.push(`Batch ${i + 1} failed: ${error.message}`);
          console.error(`Failed to insert batch ${i + 1}:`, error);
        } else {
          result.success += data?.length || 0;
        }
      } catch (error) {
        result.failed += batch.length;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Batch ${i + 1} exception: ${errorMessage}`);
        console.error(`Exception inserting batch ${i + 1}:`, error);
      }
    }

    return result;
  } catch (error) {
    console.error('Error persisting wardrobe items:', error);
    result.failed = items.length;
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
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
  categoryMap: Map<CategoryKey, string>
): CreateWardrobeItemInput | null {
  const categoryId = categoryMap.get(item.category);

  if (!categoryId) {
    console.error(`No category ID found for category: ${item.category}`);
    return null;
  }

  return {
    category_id: categoryId,
    name: item.name,
    color: item.color || undefined,
    formality_score: item.formality_score,
    season: item.season,
    image_url: item.image_url || undefined,
    // Set source to 'onboarding' to track item origin
    capsule_tags: ['onboarding'],
  };
}

/**
 * Split array into chunks of specified size
 * 
 * @param array - Array to chunk
 * @param size - Chunk size
 * @returns Array of chunks
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  
  return chunks;
}

/**
 * Validate wardrobe item input before insertion
 * 
 * @param input - Wardrobe item input
 * @returns True if valid, false otherwise
 */
function validateItemInput(input: CreateWardrobeItemInput): boolean {
  if (!input.category_id || !input.name) {
    return false;
  }

  if (input.formality_score !== undefined) {
    if (input.formality_score < 1 || input.formality_score > 10) {
      return false;
    }
  }

  return true;
}
