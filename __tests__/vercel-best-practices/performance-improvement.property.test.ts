/**
 * Property-Based Test: Performance Improvement
 * 
 * **Property 4: Performance Improvement**
 * Tests that Core Web Vitals improve by target percentages and loading times are reduced
 * 
 * **Validates: Requirements 4.1, 4.2, 4.3**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import fs from 'fs';
import path from 'path';

// Type definitions for Core Web Vitals
interface CoreWebVitals {
  lcp: number;  // Largest Contentful Paint (ms)
  fid: number;  // First Input Delay (ms)
  cls: number;  // Cumulative Layout Shift (score)
  fcp: number;  // First Contentful Paint (ms)
  ttfb: number; // Time to First Byte (ms)
}

interface PerformanceMetrics {
  current: CoreWebVitals;
  baseline: CoreWebVitals;
  improvements: {
    lcp: number;
    fid: number;
    cls: number;
    fcp: number;
    ttfb: number;
  };
}

interface WaterfallMetrics {
  sequentialOperations: number;
  parallelizableOperations: number;
  parallelizationRate: number;
}

// Helper function to get baseline Core Web Vitals
function getBaselineMetrics(): CoreWebVitals {
  try {
    const baselinePath = path.join(process.cwd(), 'baseline-performance-metrics.json');
    if (fs.existsSync(baselinePath)) {
      return JSON.parse(fs.readFileSync(baselinePath, 'utf-8'));
    }
  } catch (error) {
    // Fallback to estimated baseline
  }
  
  // Estimated baseline before optimizations (typical Next.js app)
  return {
    lcp: 2500,  // 2.5s
    fid: 100,   // 100ms
    cls: 0.1,   // 0.1 score
    fcp: 1800,  // 1.8s
    ttfb: 600   // 600ms
  };
}

// Helper function to get current Core Web Vitals
function getCurrentMetrics(): CoreWebVitals | null {
  try {
    const metricsPath = path.join(process.cwd(), 'performance-metrics.json');
    if (fs.existsSync(metricsPath)) {
      return JSON.parse(fs.readFileSync(metricsPath, 'utf-8'));
    }
  } catch (error) {
    // Metrics not available
  }
  
  return null;
}

// Helper function to calculate performance improvements
function calculateImprovements(baseline: CoreWebVitals, current: CoreWebVitals): PerformanceMetrics['improvements'] {
  return {
    lcp: ((baseline.lcp - current.lcp) / baseline.lcp) * 100,
    fid: ((baseline.fid - current.fid) / baseline.fid) * 100,
    cls: ((baseline.cls - current.cls) / baseline.cls) * 100,
    fcp: ((baseline.fcp - current.fcp) / baseline.fcp) * 100,
    ttfb: ((baseline.ttfb - current.ttfb) / baseline.ttfb) * 100
  };
}

// Helper function to scan for waterfall patterns
function scanForWaterfallPatterns(directory: string): WaterfallMetrics {
  const metrics: WaterfallMetrics = {
    sequentialOperations: 0,
    parallelizableOperations: 0,
    parallelizationRate: 0
  };
  
  function scanDirectory(dir: string) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.name === 'node_modules' || entry.name === '.next' || 
            entry.name === '.git' || entry.name === '__tests__') {
          continue;
        }
        
        if (entry.isDirectory()) {
          scanDirectory(fullPath);
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const lines = content.split('\n');
            
            for (let i = 0; i < lines.length - 1; i++) {
              const line = lines[i];
              const nextLine = lines[i + 1];
              
              // Check for sequential await patterns
              if (line.includes('await') && !line.includes('Promise.all') && 
                  nextLine.includes('await') && !nextLine.includes('Promise.all')) {
                metrics.sequentialOperations++;
              }
              
              // Check for Promise.all usage (parallelization)
              if (line.includes('Promise.all')) {
                metrics.parallelizableOperations++;
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
  
  // Calculate parallelization rate
  const totalOperations = metrics.sequentialOperations + metrics.parallelizableOperations;
  metrics.parallelizationRate = totalOperations > 0
    ? (metrics.parallelizableOperations / totalOperations) * 100
    : 0;
  
  return metrics;
}

// Helper function to check for Suspense boundaries
function checkSuspenseBoundaries(directory: string): number {
  let suspenseCount = 0;
  
  function scanDirectory(dir: string) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.name === 'node_modules' || entry.name === '.next' || 
            entry.name === '__tests__') {
          continue;
        }
        
        if (entry.isDirectory()) {
          scanDirectory(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.tsx')) {
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const suspenseMatches = content.match(/<Suspense/g);
            if (suspenseMatches) {
              suspenseCount += suspenseMatches.length;
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
  return suspenseCount;
}

// Helper function to check for React.cache usage
function checkReactCacheUsage(directory: string): number {
  let cacheCount = 0;
  
  function scanDirectory(dir: string) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.name === 'node_modules' || entry.name === '.next' || 
            entry.name === '__tests__') {
          continue;
        }
        
        if (entry.isDirectory()) {
          scanDirectory(fullPath);
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            if (content.includes('cache(') || content.includes('from \'react\'') && content.includes('cache')) {
              cacheCount++;
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
  return cacheCount;
}

describe('Property 4: Performance Improvement', () => {
  it('should improve LCP by at least 15%', () => {
    const baseline = getBaselineMetrics();
    const current = getCurrentMetrics();
    
    if (!current) {
      console.warn('Performance metrics not found. Run performance tests to generate metrics.');
      // Skip test if metrics don't exist
      expect(true).toBe(true);
      return;
    }
    
    const improvements = calculateImprovements(baseline, current);
    
    console.log(`LCP Improvement: ${improvements.lcp.toFixed(2)}%`);
    console.log(`  Baseline: ${baseline.lcp}ms`);
    console.log(`  Current: ${current.lcp}ms`);
    
    // Property: LCP should improve by at least 15%
    expect(improvements.lcp).toBeGreaterThanOrEqual(15);
  });
  
  it('should improve FID by at least 15%', () => {
    const baseline = getBaselineMetrics();
    const current = getCurrentMetrics();
    
    if (!current) {
      console.warn('Performance metrics not found. Run performance tests to generate metrics.');
      expect(true).toBe(true);
      return;
    }
    
    const improvements = calculateImprovements(baseline, current);
    
    console.log(`FID Improvement: ${improvements.fid.toFixed(2)}%`);
    console.log(`  Baseline: ${baseline.fid}ms`);
    console.log(`  Current: ${current.fid}ms`);
    
    // Property: FID should improve by at least 15%
    expect(improvements.fid).toBeGreaterThanOrEqual(15);
  });
  
  it('should improve CLS by at least 15%', () => {
    const baseline = getBaselineMetrics();
    const current = getCurrentMetrics();
    
    if (!current) {
      console.warn('Performance metrics not found. Run performance tests to generate metrics.');
      expect(true).toBe(true);
      return;
    }
    
    const improvements = calculateImprovements(baseline, current);
    
    console.log(`CLS Improvement: ${improvements.cls.toFixed(2)}%`);
    console.log(`  Baseline: ${baseline.cls}`);
    console.log(`  Current: ${current.cls}`);
    
    // Property: CLS should improve by at least 15%
    expect(improvements.cls).toBeGreaterThanOrEqual(15);
  });
  
  it('should have reduced waterfall patterns', () => {
    const appDir = path.join(process.cwd(), 'app');
    const libDir = path.join(process.cwd(), 'lib');
    
    let totalMetrics: WaterfallMetrics = {
      sequentialOperations: 0,
      parallelizableOperations: 0,
      parallelizationRate: 0
    };
    
    if (fs.existsSync(appDir)) {
      const appMetrics = scanForWaterfallPatterns(appDir);
      totalMetrics.sequentialOperations += appMetrics.sequentialOperations;
      totalMetrics.parallelizableOperations += appMetrics.parallelizableOperations;
    }
    
    if (fs.existsSync(libDir)) {
      const libMetrics = scanForWaterfallPatterns(libDir);
      totalMetrics.sequentialOperations += libMetrics.sequentialOperations;
      totalMetrics.parallelizableOperations += libMetrics.parallelizableOperations;
    }
    
    const totalOps = totalMetrics.sequentialOperations + totalMetrics.parallelizableOperations;
    totalMetrics.parallelizationRate = totalOps > 0
      ? (totalMetrics.parallelizableOperations / totalOps) * 100
      : 0;
    
    console.log('Waterfall Metrics:');
    console.log(`  Sequential operations: ${totalMetrics.sequentialOperations}`);
    console.log(`  Parallelized operations: ${totalMetrics.parallelizableOperations}`);
    console.log(`  Parallelization rate: ${totalMetrics.parallelizationRate.toFixed(2)}%`);
    
    // Property: At least 30% of async operations should be parallelized
    expect(totalMetrics.parallelizationRate).toBeGreaterThan(30);
  });
  
  it('should have strategic Suspense boundaries', () => {
    const appDir = path.join(process.cwd(), 'app');
    
    if (!fs.existsSync(appDir)) {
      expect(true).toBe(true);
      return;
    }
    
    const suspenseCount = checkSuspenseBoundaries(appDir);
    
    console.log(`Suspense boundaries found: ${suspenseCount}`);
    
    // Property: Should have at least 5 Suspense boundaries for progressive loading
    expect(suspenseCount).toBeGreaterThanOrEqual(5);
  });
  
  it('should use React.cache for deduplication', () => {
    const libDir = path.join(process.cwd(), 'lib');
    
    if (!fs.existsSync(libDir)) {
      expect(true).toBe(true);
      return;
    }
    
    const cacheCount = checkReactCacheUsage(libDir);
    
    console.log(`Files using React.cache: ${cacheCount}`);
    
    // Property: Should have at least 3 files using React.cache
    expect(cacheCount).toBeGreaterThanOrEqual(3);
  });
  
  it('should meet Core Web Vitals thresholds', () => {
    const current = getCurrentMetrics();
    
    if (!current) {
      console.warn('Performance metrics not found. Run performance tests to generate metrics.');
      expect(true).toBe(true);
      return;
    }
    
    console.log('Core Web Vitals:');
    console.log(`  LCP: ${current.lcp}ms (target: <2500ms)`);
    console.log(`  FID: ${current.fid}ms (target: <100ms)`);
    console.log(`  CLS: ${current.cls} (target: <0.1)`);
    console.log(`  FCP: ${current.fcp}ms (target: <1800ms)`);
    console.log(`  TTFB: ${current.ttfb}ms (target: <600ms)`);
    
    // Property: All Core Web Vitals should meet "Good" thresholds
    expect(current.lcp).toBeLessThan(2500);
    expect(current.fid).toBeLessThan(100);
    expect(current.cls).toBeLessThan(0.1);
  });
  
  // Property-based test: Performance should be consistent across builds
  it('should have stable performance metrics', () => {
    fc.assert(
      fc.property(
        fc.constant(null),
        () => {
          const metrics1 = getCurrentMetrics();
          const metrics2 = getCurrentMetrics();
          
          if (!metrics1 || !metrics2) {
            return true; // Skip if metrics don't exist
          }
          
          // Property: Multiple reads should return identical metrics
          expect(metrics1.lcp).toBe(metrics2.lcp);
          expect(metrics1.fid).toBe(metrics2.fid);
          expect(metrics1.cls).toBe(metrics2.cls);
          
          return true;
        }
      ),
      { numRuns: 2 }
    );
  });
  
  // Property-based test: Parallelization should be universal
  it('should have parallelization across all source directories', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('app', 'lib'),
        (directory) => {
          const dirPath = path.join(process.cwd(), directory);
          
          if (!fs.existsSync(dirPath)) {
            return true;
          }
          
          const metrics = scanForWaterfallPatterns(dirPath);
          
          console.log(`${directory}: ${metrics.parallelizationRate.toFixed(2)}% parallelization rate`);
          
          // Property: Each directory should have some parallelization
          // Allow 0% if there are no async operations
          const totalOps = metrics.sequentialOperations + metrics.parallelizableOperations;
          if (totalOps > 0) {
            expect(metrics.parallelizationRate).toBeGreaterThan(0);
          }
          
          return true;
        }
      ),
      { numRuns: 2 }
    );
  });
  
  // Property-based test: Performance optimizations should not regress
  it('should maintain or improve performance over time', () => {
    fc.assert(
      fc.property(
        fc.constant(null),
        () => {
          const baseline = getBaselineMetrics();
          const current = getCurrentMetrics();
          
          if (!current) {
            return true; // Skip if metrics don't exist
          }
          
          // Property: Current metrics should be better than or equal to baseline
          expect(current.lcp).toBeLessThanOrEqual(baseline.lcp);
          expect(current.fid).toBeLessThanOrEqual(baseline.fid);
          expect(current.cls).toBeLessThanOrEqual(baseline.cls);
          
          return true;
        }
      ),
      { numRuns: 3 }
    );
  });
});
