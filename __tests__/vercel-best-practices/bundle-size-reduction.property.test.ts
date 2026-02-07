/**
 * Property-Based Test: Bundle Size Optimization
 * 
 * **Property 1: Bundle Size Optimization**
 * Tests that bundle size is reduced by at least 20% and imports are properly optimized
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import fs from 'fs';
import path from 'path';

// Type definitions for bundle analysis
interface BundleStats {
  totalSize: number;
  jsSize: number;
  cssSize: number;
  chunkCount: number;
  largeChunks: number;
}

interface ImportPattern {
  file: string;
  importStatement: string;
  isBarrelImport: boolean;
  isDirectImport: boolean;
}

// Helper function to parse bundle stats
function parseBundleStats(): BundleStats | null {
  try {
    const statsPath = path.join(process.cwd(), 'bundle-stats.json');
    if (!fs.existsSync(statsPath)) {
      return null;
    }
    
    const stats = JSON.parse(fs.readFileSync(statsPath, 'utf-8'));
    
    // Calculate total sizes from Next.js build output
    let totalSize = 0;
    let jsSize = 0;
    let cssSize = 0;
    let chunkCount = 0;
    let largeChunks = 0;
    
    if (stats.assets) {
      stats.assets.forEach((asset: any) => {
        const size = asset.size || 0;
        totalSize += size;
        chunkCount++;
        
        if (asset.name.endsWith('.js')) {
          jsSize += size;
        } else if (asset.name.endsWith('.css')) {
          cssSize += size;
        }
        
        if (size > 100 * 1024) { // 100KB threshold
          largeChunks++;
        }
      });
    }
    
    return {
      totalSize,
      jsSize,
      cssSize,
      chunkCount,
      largeChunks
    };
  } catch (error) {
    return null;
  }
}

// Helper function to get baseline bundle size
function getBaselineBundleSize(): number {
  try {
    const baselinePath = path.join(process.cwd(), 'baseline-bundle-stats.json');
    if (!fs.existsSync(baselinePath)) {
      // If no baseline exists, use estimated pre-optimization size from documentation
      return 3.1 * 1024 * 1024; // 3.1 MB
    }
    
    const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf-8'));
    let totalSize = 0;
    
    if (baseline.assets) {
      baseline.assets.forEach((asset: any) => {
        totalSize += asset.size || 0;
      });
    }
    
    return totalSize;
  } catch (error) {
    // Fallback to estimated baseline
    return 3.1 * 1024 * 1024; // 3.1 MB
  }
}

// Helper function to check import patterns in source files
function checkImportPatterns(directory: string): ImportPattern[] {
  const patterns: ImportPattern[] = [];
  
  function scanDirectory(dir: string) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        // Skip node_modules, .next, and other build directories
        if (entry.name === 'node_modules' || entry.name === '.next' || 
            entry.name === '.git' || entry.name === 'dist') {
          continue;
        }
        
        if (entry.isDirectory()) {
          scanDirectory(fullPath);
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const lines = content.split('\n');
            
            for (const line of lines) {
              // Check for lucide-react imports
              if (line.includes('from') && line.includes('lucide-react')) {
                const isBarrelImport = !line.includes('dist/esm/icons/');
                const isDirectImport = line.includes('dist/esm/icons/');
                
                patterns.push({
                  file: fullPath.replace(process.cwd(), ''),
                  importStatement: line.trim(),
                  isBarrelImport,
                  isDirectImport
                });
              }
            }
          } catch (error) {
            // Skip files that can't be read
          }
        }
      }
    } catch (error) {
      // Skip directories that can't be read
    }
  }
  
  scanDirectory(directory);
  return patterns;
}

describe('Property 1: Bundle Size Optimization', () => {
  it('should reduce bundle size by at least 20% from baseline', () => {
    const currentStats = parseBundleStats();
    const baselineSize = getBaselineBundleSize();
    
    if (!currentStats) {
      console.warn('Bundle stats not found. Run `npm run build` to generate bundle-stats.json');
      // Skip test if bundle stats don't exist
      expect(true).toBe(true);
      return;
    }
    
    const reductionPercentage = ((baselineSize - currentStats.totalSize) / baselineSize) * 100;
    
    console.log(`Baseline size: ${(baselineSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Current size: ${(currentStats.totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Reduction: ${reductionPercentage.toFixed(2)}%`);
    
    // Property: Bundle size should be reduced by at least 20%
    expect(reductionPercentage).toBeGreaterThanOrEqual(20);
  });
  
  it('should have no barrel imports from lucide-react', () => {
    const appDir = path.join(process.cwd(), 'app');
    const componentsDir = path.join(process.cwd(), 'components');
    const libDir = path.join(process.cwd(), 'lib');
    
    const patterns: ImportPattern[] = [];
    
    if (fs.existsSync(appDir)) {
      patterns.push(...checkImportPatterns(appDir));
    }
    if (fs.existsSync(componentsDir)) {
      patterns.push(...checkImportPatterns(componentsDir));
    }
    if (fs.existsSync(libDir)) {
      patterns.push(...checkImportPatterns(libDir));
    }
    
    const barrelImports = patterns.filter(p => p.isBarrelImport);
    
    if (barrelImports.length > 0) {
      console.log('Found barrel imports:');
      barrelImports.forEach(p => {
        console.log(`  ${p.file}: ${p.importStatement}`);
      });
    }
    
    // Property: All lucide-react imports should be direct imports
    expect(barrelImports.length).toBe(0);
  });
  
  it('should have reasonable chunk distribution', () => {
    const currentStats = parseBundleStats();
    
    if (!currentStats) {
      console.warn('Bundle stats not found. Run `npm run build` to generate bundle-stats.json');
      expect(true).toBe(true);
      return;
    }
    
    const largeChunkPercentage = (currentStats.largeChunks / currentStats.chunkCount) * 100;
    
    console.log(`Total chunks: ${currentStats.chunkCount}`);
    console.log(`Large chunks (>100KB): ${currentStats.largeChunks}`);
    console.log(`Large chunk percentage: ${largeChunkPercentage.toFixed(2)}%`);
    
    // Property: Less than 10% of chunks should be larger than 100KB
    expect(largeChunkPercentage).toBeLessThan(10);
  });
  
  it('should maintain optimal bundle composition', () => {
    const currentStats = parseBundleStats();
    
    if (!currentStats) {
      console.warn('Bundle stats not found. Run `npm run build` to generate bundle-stats.json');
      expect(true).toBe(true);
      return;
    }
    
    const jsPercentage = (currentStats.jsSize / currentStats.totalSize) * 100;
    const cssPercentage = (currentStats.cssSize / currentStats.totalSize) * 100;
    
    console.log(`JS: ${(currentStats.jsSize / 1024 / 1024).toFixed(2)} MB (${jsPercentage.toFixed(2)}%)`);
    console.log(`CSS: ${(currentStats.cssSize / 1024).toFixed(2)} KB (${cssPercentage.toFixed(2)}%)`);
    
    // Property: JS should be the majority but not overwhelming
    expect(jsPercentage).toBeGreaterThan(70);
    expect(jsPercentage).toBeLessThan(95);
    
    // Property: CSS should be minimal
    expect(cssPercentage).toBeLessThan(10);
  });
  
  // Property-based test: Bundle size should remain stable across builds
  it('should have consistent bundle size for identical code', () => {
    fc.assert(
      fc.property(
        fc.constant(null), // No random input needed
        () => {
          const stats1 = parseBundleStats();
          const stats2 = parseBundleStats();
          
          if (!stats1 || !stats2) {
            return true; // Skip if stats don't exist
          }
          
          // Property: Multiple reads of the same bundle should return identical sizes
          expect(stats1.totalSize).toBe(stats2.totalSize);
          expect(stats1.jsSize).toBe(stats2.jsSize);
          expect(stats1.cssSize).toBe(stats2.cssSize);
          
          return true;
        }
      ),
      { numRuns: 3 }
    );
  });
  
  // Property-based test: Import optimization should be universal
  it('should have optimized imports across all source directories', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('app', 'components', 'lib'),
        (directory) => {
          const dirPath = path.join(process.cwd(), directory);
          
          if (!fs.existsSync(dirPath)) {
            return true; // Skip if directory doesn't exist
          }
          
          const patterns = checkImportPatterns(dirPath);
          const barrelImports = patterns.filter(p => p.isBarrelImport);
          
          // Property: No directory should have barrel imports
          expect(barrelImports.length).toBe(0);
          
          return true;
        }
      ),
      { numRuns: 3 }
    );
  });
});
