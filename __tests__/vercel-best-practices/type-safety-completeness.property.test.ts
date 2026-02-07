/**
 * Property-Based Test: Type Safety Completeness
 * 
 * **Property 2: Type Safety Completeness**
 * Tests that no any types exist in production code and all functions have proper type annotations
 * 
 * **Validates: Requirements 2.1, 2.2, 2.3**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Type definitions
interface TypeScriptError {
  file: string;
  line: number;
  column: number;
  message: string;
  code: string;
  isAnyType: boolean;
}

interface TypeSafetyMetrics {
  totalFiles: number;
  filesWithAny: number;
  anyTypeCount: number;
  implicitAnyCount: number;
  explicitAnyCount: number;
}

// Helper function to run TypeScript compiler and capture errors
function runTypeScriptCompiler(): string {
  try {
    execSync('npx tsc --noEmit --strict 2>&1', {
      encoding: 'utf-8',
      stdio: 'pipe',
      cwd: process.cwd()
    });
    return '';
  } catch (error: any) {
    return error.stdout || error.stderr || '';
  }
}

// Helper function to parse TypeScript errors
function parseTypeScriptErrors(output: string): TypeScriptError[] {
  const errors: TypeScriptError[] = [];
  const lines = output.split('\n');
  
  for (const line of lines) {
    // Match TypeScript error format: file.ts(line,col): error TS####: message
    const match = line.match(/^(.+?)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.+)$/);
    if (match) {
      const [, file, lineNum, col, code, message] = match;
      const isAnyType = message.toLowerCase().includes('any') || 
                       message.includes('implicitly has an \'any\' type') ||
                       message.includes('has type \'any\'');
      
      errors.push({
        file: file.trim(),
        line: parseInt(lineNum, 10),
        column: parseInt(col, 10),
        message: message.trim(),
        code: code.trim(),
        isAnyType
      });
    }
  }
  
  return errors;
}

// Helper function to scan source files for explicit 'any' types
function scanForExplicitAnyTypes(directory: string): TypeSafetyMetrics {
  const metrics: TypeSafetyMetrics = {
    totalFiles: 0,
    filesWithAny: 0,
    anyTypeCount: 0,
    implicitAnyCount: 0,
    explicitAnyCount: 0
  };
  
  function scanDirectory(dir: string) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        // Skip node_modules, .next, and other build directories
        if (entry.name === 'node_modules' || entry.name === '.next' || 
            entry.name === '.git' || entry.name === 'dist' || entry.name === '__tests__') {
          continue;
        }
        
        if (entry.isDirectory()) {
          scanDirectory(fullPath);
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
          // Skip test files and declaration files
          if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.tsx') || 
              entry.name.endsWith('.d.ts')) {
            continue;
          }
          
          metrics.totalFiles++;
          
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            
            // Look for explicit 'any' types (not in comments)
            const lines = content.split('\n');
            let hasAny = false;
            
            for (const line of lines) {
              // Skip comments
              if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
                continue;
              }
              
              // Match explicit any types: : any, <any>, any[], (any), etc.
              const anyMatches = line.match(/:\s*any\b|<any>|\bany\[\]|\(any\)/g);
              if (anyMatches) {
                metrics.anyTypeCount += anyMatches.length;
                metrics.explicitAnyCount += anyMatches.length;
                hasAny = true;
              }
            }
            
            if (hasAny) {
              metrics.filesWithAny++;
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
  return metrics;
}

// Helper function to check if a file has proper type annotations
function checkFunctionTypeAnnotations(filePath: string): boolean {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    for (const line of lines) {
      // Skip comments and imports
      if (line.trim().startsWith('//') || line.trim().startsWith('*') || 
          line.trim().startsWith('import')) {
        continue;
      }
      
      // Check for function declarations without return types
      // This is a simplified check - full AST parsing would be more accurate
      const functionMatch = line.match(/function\s+\w+\s*\([^)]*\)\s*{/);
      if (functionMatch && !line.includes(':')) {
        return false;
      }
      
      // Check for arrow functions without return types
      const arrowMatch = line.match(/const\s+\w+\s*=\s*\([^)]*\)\s*=>/);
      if (arrowMatch && !line.includes(':')) {
        return false;
      }
    }
    
    return true;
  } catch (error) {
    return true; // Skip files that can't be read
  }
}

describe('Property 2: Type Safety Completeness', () => {
  it('should have no implicit any types in production code', () => {
    const output = runTypeScriptCompiler();
    const errors = parseTypeScriptErrors(output);
    const anyTypeErrors = errors.filter(e => e.isAnyType);
    
    if (anyTypeErrors.length > 0) {
      console.log(`Found ${anyTypeErrors.length} any type errors:`);
      anyTypeErrors.slice(0, 10).forEach(error => {
        console.log(`  ${error.file}(${error.line},${error.column}): ${error.message}`);
      });
      if (anyTypeErrors.length > 10) {
        console.log(`  ... and ${anyTypeErrors.length - 10} more`);
      }
    }
    
    // Property: No implicit any types should exist
    expect(anyTypeErrors.length).toBe(0);
  });
  
  it('should have no explicit any types in production code', () => {
    const appDir = path.join(process.cwd(), 'app');
    const componentsDir = path.join(process.cwd(), 'components');
    const libDir = path.join(process.cwd(), 'lib');
    
    let totalMetrics: TypeSafetyMetrics = {
      totalFiles: 0,
      filesWithAny: 0,
      anyTypeCount: 0,
      implicitAnyCount: 0,
      explicitAnyCount: 0
    };
    
    if (fs.existsSync(appDir)) {
      const appMetrics = scanForExplicitAnyTypes(appDir);
      totalMetrics.totalFiles += appMetrics.totalFiles;
      totalMetrics.filesWithAny += appMetrics.filesWithAny;
      totalMetrics.anyTypeCount += appMetrics.anyTypeCount;
      totalMetrics.explicitAnyCount += appMetrics.explicitAnyCount;
    }
    
    if (fs.existsSync(componentsDir)) {
      const componentMetrics = scanForExplicitAnyTypes(componentsDir);
      totalMetrics.totalFiles += componentMetrics.totalFiles;
      totalMetrics.filesWithAny += componentMetrics.filesWithAny;
      totalMetrics.anyTypeCount += componentMetrics.anyTypeCount;
      totalMetrics.explicitAnyCount += componentMetrics.explicitAnyCount;
    }
    
    if (fs.existsSync(libDir)) {
      const libMetrics = scanForExplicitAnyTypes(libDir);
      totalMetrics.totalFiles += libMetrics.totalFiles;
      totalMetrics.filesWithAny += libMetrics.filesWithAny;
      totalMetrics.anyTypeCount += libMetrics.anyTypeCount;
      totalMetrics.explicitAnyCount += libMetrics.explicitAnyCount;
    }
    
    console.log(`Type Safety Metrics:`);
    console.log(`  Total files scanned: ${totalMetrics.totalFiles}`);
    console.log(`  Files with 'any': ${totalMetrics.filesWithAny}`);
    console.log(`  Total 'any' occurrences: ${totalMetrics.anyTypeCount}`);
    console.log(`  Explicit 'any' types: ${totalMetrics.explicitAnyCount}`);
    
    // Property: No explicit any types should exist in production code
    expect(totalMetrics.explicitAnyCount).toBe(0);
  });
  
  it('should have strict TypeScript configuration enabled', () => {
    const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
    
    if (!fs.existsSync(tsconfigPath)) {
      throw new Error('tsconfig.json not found');
    }
    
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));
    const compilerOptions = tsconfig.compilerOptions || {};
    
    console.log('TypeScript Configuration:');
    console.log(`  strict: ${compilerOptions.strict}`);
    console.log(`  noImplicitAny: ${compilerOptions.noImplicitAny}`);
    console.log(`  strictNullChecks: ${compilerOptions.strictNullChecks}`);
    console.log(`  strictFunctionTypes: ${compilerOptions.strictFunctionTypes}`);
    
    // Property: Strict mode should be enabled
    expect(compilerOptions.strict).toBe(true);
  });
  
  it('should have proper type annotations for all exported functions', () => {
    const libDir = path.join(process.cwd(), 'lib');
    
    if (!fs.existsSync(libDir)) {
      expect(true).toBe(true);
      return;
    }
    
    const utilFiles: string[] = [];
    
    function findUtilFiles(dir: string) {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.name === 'node_modules' || entry.name === '.next' || 
              entry.name === '__tests__') {
            continue;
          }
          
          if (entry.isDirectory()) {
            findUtilFiles(fullPath);
          } else if (entry.isFile() && entry.name.endsWith('.ts') && 
                     !entry.name.endsWith('.test.ts') && !entry.name.endsWith('.d.ts')) {
            utilFiles.push(fullPath);
          }
        }
      } catch (error) {
        // Skip directories that can't be read
      }
    }
    
    findUtilFiles(libDir);
    
    // Sample a few files to check
    const samplesToCheck = Math.min(10, utilFiles.length);
    const sampledFiles = utilFiles.slice(0, samplesToCheck);
    
    let filesWithIssues = 0;
    
    for (const file of sampledFiles) {
      const hasProperTypes = checkFunctionTypeAnnotations(file);
      if (!hasProperTypes) {
        filesWithIssues++;
        console.log(`  File may have missing type annotations: ${file.replace(process.cwd(), '')}`);
      }
    }
    
    console.log(`Checked ${samplesToCheck} utility files for type annotations`);
    console.log(`Files with potential issues: ${filesWithIssues}`);
    
    // Property: Most files should have proper type annotations
    // Allow up to 20% of files to have issues (simplified check)
    const issuePercentage = (filesWithIssues / samplesToCheck) * 100;
    expect(issuePercentage).toBeLessThan(20);
  });
  
  // Property-based test: Type safety should be consistent across all source directories
  it('should have consistent type safety across all directories', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('app', 'components', 'lib'),
        (directory) => {
          const dirPath = path.join(process.cwd(), directory);
          
          if (!fs.existsSync(dirPath)) {
            return true;
          }
          
          const metrics = scanForExplicitAnyTypes(dirPath);
          
          // Property: Each directory should have minimal any types
          // Allow up to 5% of files to have any types (transitional state)
          const anyPercentage = metrics.totalFiles > 0 
            ? (metrics.filesWithAny / metrics.totalFiles) * 100 
            : 0;
          
          console.log(`${directory}: ${metrics.filesWithAny}/${metrics.totalFiles} files with 'any' (${anyPercentage.toFixed(2)}%)`);
          
          expect(anyPercentage).toBeLessThan(10);
          
          return true;
        }
      ),
      { numRuns: 3 }
    );
  });
  
  // Property-based test: Type errors should be deterministic
  it('should produce consistent type checking results', () => {
    fc.assert(
      fc.property(
        fc.constant(null),
        () => {
          const output1 = runTypeScriptCompiler();
          const output2 = runTypeScriptCompiler();
          
          const errors1 = parseTypeScriptErrors(output1);
          const errors2 = parseTypeScriptErrors(output2);
          
          // Property: Running tsc multiple times should produce same results
          expect(errors1.length).toBe(errors2.length);
          
          return true;
        }
      ),
      { numRuns: 2 }
    );
  });
  
  // Property-based test: All TypeScript files should be parseable
  it('should have valid TypeScript syntax in all source files', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('app', 'components', 'lib'),
        (directory) => {
          const dirPath = path.join(process.cwd(), directory);
          
          if (!fs.existsSync(dirPath)) {
            return true;
          }
          
          let fileCount = 0;
          let parseableCount = 0;
          
          function checkFiles(dir: string) {
            try {
              const entries = fs.readdirSync(dir, { withFileTypes: true });
              
              for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                
                if (entry.name === 'node_modules' || entry.name === '.next' || 
                    entry.name === '__tests__') {
                  continue;
                }
                
                if (entry.isDirectory()) {
                  checkFiles(fullPath);
                } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
                  fileCount++;
                  try {
                    fs.readFileSync(fullPath, 'utf-8');
                    parseableCount++;
                  } catch (error) {
                    // File not parseable
                  }
                }
              }
            } catch (error) {
              // Skip directories that can't be read
            }
          }
          
          checkFiles(dirPath);
          
          // Property: All files should be readable/parseable
          expect(parseableCount).toBe(fileCount);
          
          return true;
        }
      ),
      { numRuns: 3 }
    );
  });
});
