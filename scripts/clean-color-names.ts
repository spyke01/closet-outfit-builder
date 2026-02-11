/**
 * Clean Color Names Script
 * 
 * This script removes color keywords from item names for items that already have explicit colors set.
 * This is useful for items that were manually assigned colors before the migration.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { inferColor } from '@/lib/utils/color-inference';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

interface CleanResult {
  itemId: string;
  originalName: string;
  cleanedName: string;
  color: string;
}

/**
 * Removes color keyword from item name
 */
function removeColorFromName(name: string, color: string): string {
  if (!name || !color) {
    return name;
  }

  // First, try to remove content in parentheses that contains the color
  const parenRegex = /\([^)]*\)/g;
  const parens = name.match(parenRegex);
  
  if (parens) {
    for (const paren of parens) {
      // Check if this parenthesis contains a color keyword
      const parenContent = paren.toLowerCase();
      if (parenContent.includes(color.toLowerCase())) {
        // Remove the entire parenthesis
        name = name.replace(paren, '').trim();
      }
    }
  }

  // Clean up any remaining standalone color keywords
  const regex = new RegExp(`\\b${color}\\b`, 'gi');
  name = name.replace(regex, '');

  // Clean up extra spaces and empty parentheses
  return name
    .replace(/\(\s*\)/g, '') // Remove empty parentheses
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
}

async function cleanColorNames(dryRun: boolean = false) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('🧹 Cleaning color keywords from item names...');
  console.log('');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made');
    console.log('');
  }

  // Get all items that have colors set
  const { data: items, error: fetchError } = await supabase
    .from('wardrobe_items')
    .select('id, name, color')
    .not('color', 'is', null)
    .neq('color', '')
    .eq('active', true);

  if (fetchError) {
    console.error('❌ Error fetching items:', fetchError.message);
    process.exit(1);
  }

  if (!items || items.length === 0) {
    console.log('✅ No items with colors found.');
    return;
  }

  console.log(`Found ${items.length} items with colors set.`);
  console.log('');

  const results: CleanResult[] = [];
  let updatedCount = 0;

  for (const item of items) {
    // Try to detect if the color is in the name
    const detectedColor = inferColor(item.name);
    
    if (detectedColor && detectedColor !== 'unknown') {
      const cleanedName = removeColorFromName(item.name, detectedColor);
      
      // Only update if the name actually changed
      if (cleanedName !== item.name && cleanedName.length > 0) {
        results.push({
          itemId: item.id,
          originalName: item.name,
          cleanedName: cleanedName,
          color: item.color
        });

        if (!dryRun) {
          const { error: updateError } = await supabase
            .from('wardrobe_items')
            .update({ name: cleanedName })
            .eq('id', item.id);

          if (updateError) {
            console.error(`❌ Error updating item ${item.id}:`, updateError.message);
          } else {
            updatedCount++;
          }
        }
      }
    }
  }

  console.log('═══════════════════════════════════════════════');
  console.log(`  ${dryRun ? 'Preview' : 'Results'}`);
  console.log('═══════════════════════════════════════════════');
  console.log('');

  if (results.length > 0) {
    console.log('📝 Name changes:');
    results.forEach(result => {
      console.log(`  "${result.originalName}" → "${result.cleanedName}"`);
      console.log(`     (color: ${result.color})`);
      console.log('');
    });

    console.log(`📊 Total items to update: ${results.length}`);
    
    if (!dryRun) {
      console.log(`✅ Successfully updated: ${updatedCount}`);
    } else {
      console.log('');
      console.log('ℹ️  Run without --dry-run to apply these changes.');
    }
  } else {
    console.log('✅ No items need name cleaning.');
    console.log('   All item names are already clean.');
  }

  console.log('');
  console.log('═══════════════════════════════════════════════');
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  await cleanColorNames(dryRun);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
