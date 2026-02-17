/**
 * Normalize Gray to Grey Script
 * 
 * This script updates any wardrobe items with color "gray" to "grey"
 * to consolidate duplicate color options.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

async function normalizeGrayToGrey() {
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

  console.info('🎨 Normalizing "gray" to "grey"...\n');

  // Find all items with "gray" color
  const { data: items, error: fetchError } = await supabase
    .from('wardrobe_items')
    .select('id, name, color')
    .eq('color', 'gray');

  if (fetchError) {
    console.error('❌ Error fetching items:', fetchError.message);
    process.exit(1);
  }

  if (!items || items.length === 0) {
    console.info('✅ No items with "gray" color found. Nothing to update.');
    return;
  }

  console.info(`Found ${items.length} item(s) with "gray" color:`);
  items.forEach(item => {
    console.info(`  - ${item.name}`);
  });
  console.info('');

  // Update all items to use "grey"
  const { error: updateError } = await supabase
    .from('wardrobe_items')
    .update({ color: 'grey' })
    .eq('color', 'gray');

  if (updateError) {
    console.error('❌ Error updating items:', updateError.message);
    process.exit(1);
  }

  console.info(`✅ Successfully updated ${items.length} item(s) from "gray" to "grey"`);
}

normalizeGrayToGrey().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
