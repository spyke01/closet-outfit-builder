/**
 * Normalize All Colors Script
 * 
 * This script normalizes all color values in the database to lowercase.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

async function normalizeAllColors() {
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

  console.info('🔄 Normalizing all color values to lowercase...\n');

  // Get all items with non-null colors
  const { data: items, error: fetchError } = await supabase
    .from('wardrobe_items')
    .select('id, name, color')
    .not('color', 'is', null)
    .neq('color', '');

  if (fetchError) {
    console.error('❌ Error fetching items:', fetchError.message);
    process.exit(1);
  }

  if (!items || items.length === 0) {
    console.info('✅ No items with colors found.');
    return;
  }

  let updatedCount = 0;
  const updates: Array<{ id: string; oldColor: string; newColor: string }> = [];

  for (const item of items) {
    const normalizedColor = item.color.trim().toLowerCase();
    
    if (normalizedColor !== item.color) {
      updates.push({
        id: item.id,
        oldColor: item.color,
        newColor: normalizedColor
      });

      const { error: updateError } = await supabase
        .from('wardrobe_items')
        .update({ color: normalizedColor })
        .eq('id', item.id);

      if (updateError) {
        console.error(`❌ Error updating item ${item.id}:`, updateError.message);
      } else {
        updatedCount++;
      }
    }
  }

  console.info('═══════════════════════════════════════════════');
  console.info('  Results');
  console.info('═══════════════════════════════════════════════\n');

  if (updates.length > 0) {
    console.info('📝 Color normalizations:');
    updates.forEach(update => {
      console.info(`  "${update.oldColor}" → "${update.newColor}"`);
    });
    console.info('');
    console.info(`📊 Total items checked: ${items.length}`);
    console.info(`✅ Successfully normalized: ${updatedCount}`);
  } else {
    console.info('✅ All colors are already normalized.');
  }

  console.info('\n═══════════════════════════════════════════════');
}

normalizeAllColors().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
