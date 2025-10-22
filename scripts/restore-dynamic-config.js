#!/usr/bin/env node

/**
 * Restore Next.js to dynamic configuration by reverting static export changes
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const configPath = join(process.cwd(), 'next.config.ts');

try {
  let config = readFileSync(configPath, 'utf8');
  
  // Disable static export
  config = config.replace(
    /output: 'export',/g,
    "// output: 'export',"
  );
  
  // Enable image optimization for dynamic deployment
  config = config.replace(
    /unoptimized: true,/g,
    'unoptimized: false,'
  );
  
  writeFileSync(configPath, config);
  console.log('✅ Restored Next.js to dynamic configuration');
  
} catch (error) {
  console.error('❌ Failed to restore dynamic config:', error.message);
  process.exit(1);
}