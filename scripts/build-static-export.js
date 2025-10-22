#!/usr/bin/env node

/**
 * Create a true static export with 'out' directory
 * This removes API routes and creates a fully static site
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

const configPath = join(process.cwd(), 'next.config.ts');
const originalConfig = readFileSync(configPath, 'utf8');

console.log('🔧 Configuring Next.js for static export...');

try {
  // Configure for static export
  let config = originalConfig;
  
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
  console.log('✅ Next.js configured for static export');

  // Clean previous builds
  if (existsSync('.next')) {
    rmSync('.next', { recursive: true, force: true });
    console.log('🧹 Cleaned previous build');
  }
  
  if (existsSync('out')) {
    rmSync('out', { recursive: true, force: true });
    console.log('🧹 Cleaned previous static export');
  }

  console.log('🏗️  Building static export...');
  
  // Build the static export
  execSync('next build', { stdio: 'inherit' });
  
  console.log('✅ Static export created in "out" directory');
  console.log('📁 You can now deploy the "out" directory to any static hosting service');
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  
  // Restore original config on error
  writeFileSync(configPath, originalConfig);
  console.log('🔄 Restored original configuration');
  
  process.exit(1);
} finally {
  // Always restore original config
  writeFileSync(configPath, originalConfig);
  console.log('🔄 Restored original configuration');
}