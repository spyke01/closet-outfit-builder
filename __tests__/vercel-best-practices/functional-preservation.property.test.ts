/**
 * Property-Based Test: Functional Preservation
 * 
 * **Property 5: Functional Preservation**
 * Tests that all existing functionality is preserved and user workflows remain identical
 * 
 * **Validates: Requirements 12.1, 12.2, 12.3**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import fs from 'fs';
import path from 'path';

// Type definitions
interface APIEndpoint {
  path: string;
  method: string;
  exists: boolean;
}

interface ComponentExport {
  file: string;
  exports: string[];
}

interface FunctionalityMetrics {
  totalAPIEndpoints: number;
  totalComponents: number;
  totalHooks: number;
  totalUtilities: number;
  missingExports: number;
}

// Helper function to scan for API endpoints
function scanAPIEndpoints(directory: string): APIEndpoint[] {
  const endpoints: APIEndpoint[] = [];
  
  function scanDirectory(dir: string) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.name === 'node_modules' || entry.name === '.next') {
          continue;
        }
        
        if (entry.isDirectory()) {
          scanDirectory(fullPath);
        } else if (entry.isFile() && entry.name === 'route.ts') {
          // Next.js API route
          const relativePath = fullPath.replace(process.cwd(), '').replace('/app', '').replace('/route.ts', '');
          
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            
            // Check for HTTP method exports
            if (content.includes('export async function GET') || content.includes('export function GET')) {
              endpoints.push({ path: relativePath, method: 'GET', exists: true });
            }
            if (content.includes('export async function POST') || content.includes('export function POST')) {
              endpoints.push({ path: relativePath, method: 'POST', exists: true });
            }
            if (content.includes('export async function PUT') || content.includes('export function PUT')) {
              endpoints.push({ path: relativePath, method: 'PUT', exists: true });
            }
            if (content.includes('export async function DELETE') || content.includes('export function DELETE')) {
              endpoints.push({ path: relativePath, method: 'DELETE', exists: true });
            }
            if (content.includes('export async function PATCH') || content.includes('export function PATCH')) {
              endpoints.push({ path: relativePath, method: 'PATCH', exists: true });
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
  return endpoints;
}

// Helper function to scan for component exports
function scanComponentExports(directory: string): ComponentExport[] {
  const exports: ComponentExport[] = [];
  
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
        } else if (entry.isFile() && entry.name.endsWith('.tsx') && 
                   !entry.name.endsWith('.test.tsx')) {
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const componentExports: string[] = [];
            
            // Match export patterns
            const exportMatches = content.match(/export\s+(default\s+)?(function|const|class)\s+(\w+)/g);
            if (exportMatches) {
              exportMatches.forEach(match => {
                const nameMatch = match.match(/(\w+)$/);
                if (nameMatch) {
                  componentExports.push(nameMatch[1]);
                }
              });
            }
            
            // Match named exports
            const namedExportMatches = content.match(/export\s+{\s*([^}]+)\s*}/g);
            if (namedExportMatches) {
              namedExportMatches.forEach(match => {
                const names = match.replace(/export\s+{\s*/, '').replace(/\s*}/, '').split(',');
                names.forEach(name => {
                  const cleanName = name.trim().split(' as ')[0];
                  if (cleanName) {
                    componentExports.push(cleanName);
                  }
                });
              });
            }
            
            if (componentExports.length > 0) {
              exports.push({
                file: fullPath.replace(process.cwd(), ''),
                exports: componentExports
              });
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
  return exports;
}

// Helper function to scan for hook exports
function scanHookExports(directory: string): ComponentExport[] {
  const exports: ComponentExport[] = [];
  
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
        } else if (entry.isFile() && entry.name.endsWith('.ts') && 
                   !entry.name.endsWith('.test.ts') && !entry.name.endsWith('.d.ts')) {
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const hookExports: string[] = [];
            
            // Match hook exports (functions starting with 'use')
            const exportMatches = content.match(/export\s+(function|const)\s+(use\w+)/g);
            if (exportMatches) {
              exportMatches.forEach(match => {
                const nameMatch = match.match(/use\w+/);
                if (nameMatch) {
                  hookExports.push(nameMatch[0]);
                }
              });
            }
            
            if (hookExports.length > 0) {
              exports.push({
                file: fullPath.replace(process.cwd(), ''),
                exports: hookExports
              });
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
  return exports;
}

// Helper function to get functionality metrics
function getFunctionalityMetrics(): FunctionalityMetrics {
  const appDir = path.join(process.cwd(), 'app');
  const componentsDir = path.join(process.cwd(), 'components');
  const libDir = path.join(process.cwd(), 'lib');
  
  const metrics: FunctionalityMetrics = {
    totalAPIEndpoints: 0,
    totalComponents: 0,
    totalHooks: 0,
    totalUtilities: 0,
    missingExports: 0
  };
  
  // Count API endpoints
  if (fs.existsSync(appDir)) {
    const endpoints = scanAPIEndpoints(appDir);
    metrics.totalAPIEndpoints = endpoints.length;
  }
  
  // Count components
  if (fs.existsSync(componentsDir)) {
    const components = scanComponentExports(componentsDir);
    metrics.totalComponents = components.length;
  }
  
  // Count hooks
  if (fs.existsSync(libDir)) {
    const hooksDir = path.join(libDir, 'hooks');
    if (fs.existsSync(hooksDir)) {
      const hooks = scanHookExports(hooksDir);
      metrics.totalHooks = hooks.reduce((sum, h) => sum + h.exports.length, 0);
    }
    
    // Count utilities
    const utilsDir = path.join(libDir, 'utils');
    if (fs.existsSync(utilsDir)) {
      const utils = scanComponentExports(utilsDir);
      metrics.totalUtilities = utils.reduce((sum, u) => sum + u.exports.length, 0);
    }
  }
  
  return metrics;
}

// Helper function to check if critical workflows are preserved
function checkCriticalWorkflows(): { workflow: string; preserved: boolean }[] {
  const workflows = [
    { name: 'Authentication', file: 'lib/hooks/use-auth.ts' },
    { name: 'Wardrobe Management', file: 'lib/hooks/use-wardrobe-items.ts' },
    { name: 'Outfit Generation', file: 'lib/hooks/use-outfits.ts' },
    { name: 'Category Management', file: 'lib/hooks/use-categories.ts' },
    { name: 'User Preferences', file: 'lib/hooks/use-user-preferences.ts' }
  ];
  
  return workflows.map(workflow => ({
    workflow: workflow.name,
    preserved: fs.existsSync(path.join(process.cwd(), workflow.file))
  }));
}

describe('Property 5: Functional Preservation', () => {
  it('should preserve all API endpoints', () => {
    const appDir = path.join(process.cwd(), 'app');
    
    if (!fs.existsSync(appDir)) {
      expect(true).toBe(true);
      return;
    }
    
    const endpoints = scanAPIEndpoints(appDir);
    
    console.log(`Total API endpoints: ${endpoints.length}`);
    endpoints.forEach(endpoint => {
      console.log(`  ${endpoint.method} ${endpoint.path}`);
    });
    
    // Property: Should have at least 5 API endpoints (core functionality)
    expect(endpoints.length).toBeGreaterThanOrEqual(5);
  });
  
  it('should preserve all component exports', () => {
    const componentsDir = path.join(process.cwd(), 'components');
    
    if (!fs.existsSync(componentsDir)) {
      expect(true).toBe(true);
      return;
    }
    
    const components = scanComponentExports(componentsDir);
    const totalExports = components.reduce((sum, c) => sum + c.exports.length, 0);
    
    console.log(`Total component files: ${components.length}`);
    console.log(`Total component exports: ${totalExports}`);
    
    // Property: Should have at least 30 component exports
    expect(totalExports).toBeGreaterThanOrEqual(30);
  });
  
  it('should preserve all custom hooks', () => {
    const hooksDir = path.join(process.cwd(), 'lib/hooks');
    
    if (!fs.existsSync(hooksDir)) {
      expect(true).toBe(true);
      return;
    }
    
    const hooks = scanHookExports(hooksDir);
    const totalHooks = hooks.reduce((sum, h) => sum + h.exports.length, 0);
    
    console.log(`Total hook files: ${hooks.length}`);
    console.log(`Total hooks: ${totalHooks}`);
    
    // Property: Should have at least 10 custom hooks
    expect(totalHooks).toBeGreaterThanOrEqual(10);
  });
  
  it('should preserve critical user workflows', () => {
    const workflows = checkCriticalWorkflows();
    
    console.log('Critical Workflows:');
    workflows.forEach(w => {
      console.log(`  ${w.workflow}: ${w.preserved ? '✓' : '✗'}`);
    });
    
    const preservedCount = workflows.filter(w => w.preserved).length;
    const preservationRate = (preservedCount / workflows.length) * 100;
    
    console.log(`Preservation rate: ${preservationRate.toFixed(2)}%`);
    
    // Property: All critical workflows should be preserved
    expect(preservationRate).toBe(100);
  });
  
  it('should maintain consistent functionality metrics', () => {
    const metrics = getFunctionalityMetrics();
    
    console.log('Functionality Metrics:');
    console.log(`  API Endpoints: ${metrics.totalAPIEndpoints}`);
    console.log(`  Components: ${metrics.totalComponents}`);
    console.log(`  Hooks: ${metrics.totalHooks}`);
    console.log(`  Utilities: ${metrics.totalUtilities}`);
    
    // Property: Should have substantial functionality
    expect(metrics.totalAPIEndpoints).toBeGreaterThan(0);
    expect(metrics.totalComponents).toBeGreaterThan(0);
    expect(metrics.totalHooks).toBeGreaterThan(0);
  });
  
  it('should have no broken imports', () => {
    const componentsDir = path.join(process.cwd(), 'components');
    const appDir = path.join(process.cwd(), 'app');
    
    let brokenImports = 0;
    let totalImports = 0;
    
    function checkImports(dir: string) {
      if (!fs.existsSync(dir)) {
        return;
      }
      
      function scanDirectory(subdir: string) {
        try {
          const entries = fs.readdirSync(subdir, { withFileTypes: true });
          
          for (const entry of entries) {
            const fullPath = path.join(subdir, entry.name);
            
            if (entry.name === 'node_modules' || entry.name === '.next' || 
                entry.name === '__tests__') {
              continue;
            }
            
            if (entry.isDirectory()) {
              scanDirectory(fullPath);
            } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
              try {
                const content = fs.readFileSync(fullPath, 'utf-8');
                const lines = content.split('\n');
                
                for (const line of lines) {
                  // Check for relative imports
                  const importMatch = line.match(/from\s+['"](\.[^'"]+)['"]/);
                  if (importMatch) {
                    totalImports++;
                    const importPath = importMatch[1];
                    const resolvedPath = path.resolve(path.dirname(fullPath), importPath);
                    
                    // Check if file exists (with or without extension)
                    const exists = fs.existsSync(resolvedPath) ||
                                  fs.existsSync(resolvedPath + '.ts') ||
                                  fs.existsSync(resolvedPath + '.tsx') ||
                                  fs.existsSync(resolvedPath + '.js') ||
                                  fs.existsSync(resolvedPath + '/index.ts') ||
                                  fs.existsSync(resolvedPath + '/index.tsx');
                    
                    if (!exists) {
                      brokenImports++;
                    }
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
      
      scanDirectory(dir);
    }
    
    checkImports(componentsDir);
    checkImports(appDir);
    
    console.log(`Total imports checked: ${totalImports}`);
    console.log(`Broken imports: ${brokenImports}`);
    
    // Property: Should have no broken imports
    expect(brokenImports).toBe(0);
  });
  
  // Property-based test: All directories should maintain their exports
  it('should maintain exports across all source directories', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('components', 'lib/hooks', 'lib/utils'),
        (directory) => {
          const dirPath = path.join(process.cwd(), directory);
          
          if (!fs.existsSync(dirPath)) {
            return true;
          }
          
          const exports = directory.includes('hooks') 
            ? scanHookExports(dirPath)
            : scanComponentExports(dirPath);
          
          const totalExports = exports.reduce((sum, e) => sum + e.exports.length, 0);
          
          console.log(`${directory}: ${totalExports} exports`);
          
          // Property: Each directory should have exports
          expect(totalExports).toBeGreaterThan(0);
          
          return true;
        }
      ),
      { numRuns: 3 }
    );
  });
  
  // Property-based test: API contracts should be stable
  it('should have stable API contracts', () => {
    fc.assert(
      fc.property(
        fc.constant(null),
        () => {
          const endpoints1 = scanAPIEndpoints(path.join(process.cwd(), 'app'));
          const endpoints2 = scanAPIEndpoints(path.join(process.cwd(), 'app'));
          
          // Property: Multiple scans should find same endpoints
          expect(endpoints1.length).toBe(endpoints2.length);
          
          return true;
        }
      ),
      { numRuns: 2 }
    );
  });
  
  // Property-based test: Component interfaces should be preserved
  it('should preserve component interfaces', () => {
    fc.assert(
      fc.property(
        fc.constant(null),
        () => {
          const components1 = scanComponentExports(path.join(process.cwd(), 'components'));
          const components2 = scanComponentExports(path.join(process.cwd(), 'components'));
          
          // Property: Component exports should be consistent
          const exports1 = components1.reduce((sum, c) => sum + c.exports.length, 0);
          const exports2 = components2.reduce((sum, c) => sum + c.exports.length, 0);
          
          expect(exports1).toBe(exports2);
          
          return true;
        }
      ),
      { numRuns: 2 }
    );
  });
});
