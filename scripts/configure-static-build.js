#!/usr/bin/env node

/**
 * Configure Next.js for static build by temporarily modifying next.config.ts
 * This enables static export and disables features incompatible with static sites
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const configPath = join(process.cwd(), 'next.config.ts');

try {
  let config = readFileSync(configPath, 'utf8');
  
  // Enable static export
  config = config.replace(
    /\/\/ output: 'export',/g,
    "output: 'export',"
  );
  
  // Disable image optimization for static export
  config = config.replace(
    /unoptimized: false,/g,
    'unoptimized: true,'
  );
  
  writeFileSync(configPath, config);
  console.log('✅ Configured Next.js for static export');
  
} catch (error) {
  console.error('❌ Failed to configure static build:', error.message);
  process.exit(1);
}