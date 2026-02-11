/**
 * Color Migration Script
 * 
 * This script migrates existing wardrobe items to extract colors from their names
 * and populate the explicit color field. It also removes color keywords from item names.
 * 
 * Usage:
 *   npm run migrate:colors           # Run migration
 *   npm run migrate:colors:dry-run   # Preview changes without applying them
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 6.3, 6.4
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { inferColor } from '@/lib/utils/color-inference';
import { normalizeColor } from '@/lib/data/color-options';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

/**
 * Result of the migration operation
 */
export interface MigrationResult {
  totalItems: number;
  itemsUpdated: number;
  colorsExtracted: number;
  namesModified: number;
  errors: string[];
  changes: MigrationChange[];
}

/**
 * Details of a single item change
 */
export interface MigrationChange {
  itemId: string;
  originalName: string;
  newName: string;
  extractedColor: string;
  timestamp: string;
}

/**
 * Extracts color from item name using color inference logic
 * 
 * @param name - The item name to extract color from
 * @returns Object with extracted color and cleaned name
 * 
 * @example
 * extractColorFromName("Blue Oxford Shirt")
 * // returns { color: "blue", cleanedName: "Oxford Shirt" }
 */
export function extractColorFromName(name: string): { color: string | null; cleanedName: string } {
  if (!name || typeof name !== 'string') {
    return { color: null, cleanedName: name };
  }

  // Use existing color inference logic
  const inferredColor = inferColor(name);
  
  // If no color found, return original name
  if (inferredColor === 'unknown') {
    return { color: null, cleanedName: name };
  }

  // Remove the color keyword from the name
  const cleanedName = removeColorFromName(name, inferredColor);
  
  return { color: inferredColor, cleanedName };
}

/**
 * Removes color keyword from item name
 * 
 * Uses word boundary matching to avoid partial matches.
 * Handles multiple spaces and trims the result.
 * 
 * @param name - The item name
 * @param color - The color keyword to remove
 * @returns Cleaned name with color removed
 * 
 * @example
 * removeColorFromName("Blue Oxford Shirt", "blue")
 * // returns "Oxford Shirt"
 */
export function removeColorFromName(name: string, color: string): string {
  if (!name || !color) {
    return name;
  }

  // Create regex with word boundaries to match whole words only
  // Case-insensitive to handle "Blue", "BLUE", "blue"
  const regex = new RegExp(`\\b${color}\\b`, 'gi');
  
  // Remove the color keyword and clean up extra spaces
  const cleaned = name
    .replace(regex, '')
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();
  
  return cleaned;
}

/**
 * Main migration function
 * 
 * Queries all wardrobe items, extracts colors from names, and updates the database.
 * Supports dry-run mode to preview changes without applying them.
 * 
 * @param dryRun - If true, preview changes without updating database
 * @returns Migration result with statistics and changes
 */
export async function migrateColors(dryRun: boolean = false): Promise<MigrationResult> {
  const result: MigrationResult = {
    totalItems: 0,
    itemsUpdated: 0,
    colorsExtracted: 0,
    namesModified: 0,
    errors: [],
    changes: []
  };

  // Get Supabase credentials from environment
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    result.errors.push('Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
    return result;
  }

  // Create Supabase client with service role key for admin access
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Query all active wardrobe items
    const { data: items, error: fetchError } = await supabase
      .from('wardrobe_items')
      .select('id, name, color, user_id')
      .eq('active', true);

    if (fetchError) {
      result.errors.push(`Failed to fetch wardrobe items: ${fetchError.message}`);
      return result;
    }

    if (!items || items.length === 0) {
      console.log('No wardrobe items found.');
      return result;
    }

    result.totalItems = items.length;
    console.log(`Found ${result.totalItems} wardrobe items to process.`);

    // Process each item
    for (const item of items) {
      try {
        // Skip items that already have an explicit color set
        if (item.color && item.color.trim() !== '') {
          continue;
        }

        // Extract color from name
        const { color, cleanedName } = extractColorFromName(item.name);

        // Skip if no color found
        if (!color) {
          continue;
        }

        // Normalize color value (trim and lowercase)
        const normalizedColor = normalizeColor(color);

        // Check if name actually changed
        const nameChanged = cleanedName !== item.name;

        // Log the change
        const change: MigrationChange = {
          itemId: item.id,
          originalName: item.name,
          newName: cleanedName,
          extractedColor: normalizedColor,
          timestamp: new Date().toISOString()
        };

        result.changes.push(change);
        result.colorsExtracted++;
        
        if (nameChanged) {
          result.namesModified++;
        }

        // Update database if not in dry-run mode
        if (!dryRun) {
          const updateData: { color: string; name?: string } = {
            color: normalizedColor
          };

          // Only update name if it changed
          if (nameChanged) {
            updateData.name = cleanedName;
          }

          const { error: updateError } = await supabase
            .from('wardrobe_items')
            .update(updateData)
            .eq('id', item.id);

          if (updateError) {
            result.errors.push(`Failed to update item ${item.id}: ${updateError.message}`);
            continue;
          }

          result.itemsUpdated++;
        }

        // Log the change
        console.log(`${dryRun ? '[DRY RUN] ' : ''}Item ${item.id}:`);
        console.log(`  Original: "${item.name}"`);
        console.log(`  New name: "${cleanedName}"`);
        console.log(`  Color: "${normalizedColor}"`);
        console.log('');

      } catch (itemError) {
        const errorMessage = itemError instanceof Error ? itemError.message : String(itemError);
        result.errors.push(`Error processing item ${item.id}: ${errorMessage}`);
      }
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    result.errors.push(`Migration failed: ${errorMessage}`);
  }

  return result;
}

/**
 * Formats migration result for console output
 */
export function formatMigrationResult(result: MigrationResult, dryRun: boolean): string {
  const lines = [
    '',
    '═══════════════════════════════════════════════',
    `  Color Migration ${dryRun ? 'Preview' : 'Complete'}`,
    '═══════════════════════════════════════════════',
    '',
    '📊 Statistics:',
    `  Total items processed: ${result.totalItems}`,
    `  Colors extracted: ${result.colorsExtracted}`,
    `  Names modified: ${result.namesModified}`,
    `  Items updated: ${result.itemsUpdated}`,
    ''
  ];

  if (result.errors.length > 0) {
    lines.push('❌ Errors:');
    for (const error of result.errors) {
      lines.push(`  - ${error}`);
    }
    lines.push('');
  }

  if (dryRun && result.colorsExtracted > 0) {
    lines.push('ℹ️  This was a dry run. No changes were made to the database.');
    lines.push('   Run without --dry-run flag to apply changes.');
    lines.push('');
  }

  if (!dryRun && result.itemsUpdated > 0) {
    lines.push('✅ Migration completed successfully!');
    lines.push('');
  }

  if (result.colorsExtracted === 0 && result.errors.length === 0) {
    lines.push('ℹ️  No items needed color extraction.');
    lines.push('   All items either have explicit colors or no color keywords in names.');
    lines.push('');
  }

  lines.push('═══════════════════════════════════════════════');

  return lines.join('\n');
}

/**
 * Main execution function
 * 
 * Parses command line arguments and runs the migration
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log('🎨 Color Migration Script');
  console.log('========================');
  console.log('');

  if (dryRun) {
    console.log('🔍 Running in DRY RUN mode - no changes will be made');
    console.log('');
  }

  const result = await migrateColors(dryRun);
  const output = formatMigrationResult(result, dryRun);
  
  console.log(output);

  // Exit with error code if there were errors
  if (result.errors.length > 0) {
    process.exit(1);
  }
}

// Run if executed directly (ES module check)
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
