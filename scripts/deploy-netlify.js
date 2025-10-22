#!/usr/bin/env node

/**
 * Deploy to Netlify with function name validation
 * Temporarily renames functions with invalid names during deployment
 */

import { execSync } from 'child_process';
import { renameSync, existsSync } from 'fs';
import { join } from 'path';

const functionsDir = 'netlify/functions';

// Functions that need renaming for deployment
const functionRenames = [
  {
    original: 'process_image_advanced.ts',
    temp: 'processimageadvanced.ts'
  }
];

console.log('🚀 Preparing Netlify deployment...');

try {
  // Step 1: Rename functions to valid names
  console.log('📝 Renaming functions for deployment...');
  for (const { original, temp } of functionRenames) {
    const originalPath = join(functionsDir, original);
    const tempPath = join(functionsDir, temp);
    
    if (existsSync(originalPath)) {
      renameSync(originalPath, tempPath);
      console.log(`   ✅ Renamed ${original} → ${temp}`);
    }
  }

  // Step 2: Build the project
  console.log('🏗️  Building project...');
  execSync('npm run build', { stdio: 'inherit' });

  // Step 3: Deploy to Netlify
  console.log('🌐 Deploying to Netlify...');
  execSync('netlify deploy --prod', { stdio: 'inherit' });

  console.log('✅ Deployment successful!');

} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  process.exit(1);
} finally {
  // Step 4: Restore original function names
  console.log('🔄 Restoring original function names...');
  for (const { original, temp } of functionRenames) {
    const originalPath = join(functionsDir, original);
    const tempPath = join(functionsDir, temp);
    
    if (existsSync(tempPath)) {
      renameSync(tempPath, originalPath);
      console.log(`   ✅ Restored ${temp} → ${original}`);
    }
  }
}