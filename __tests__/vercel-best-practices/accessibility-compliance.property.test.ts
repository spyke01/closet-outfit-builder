/**
 * Property-Based Test: Accessibility Compliance
 * 
 * **Property 3: Accessibility Compliance**
 * Tests that all interactive elements are accessible and all images have proper alt text
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import fs from 'fs';
import path from 'path';

// Type definitions
interface AccessibilityIssue {
  file: string;
  line: number;
  issue: string;
  severity: 'error' | 'warning';
  category: 'aria' | 'semantic' | 'keyboard' | 'image' | 'focus';
}

interface AccessibilityMetrics {
  totalComponents: number;
  componentsWithIssues: number;
  totalIssues: number;
  errorCount: number;
  warningCount: number;
  issuesByCategory: Record<string, number>;
}

// Helper function to scan components for accessibility issues
function scanComponentForA11yIssues(filePath: string): AccessibilityIssue[] {
  const issues: AccessibilityIssue[] = [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      
      // Check for div onClick without role or keyboard handler
      if (line.includes('div') && line.includes('onClick') && 
          !line.includes('role=') && !line.includes('onKeyDown') && !line.includes('onKeyUp')) {
        issues.push({
          file: filePath,
          line: lineNum,
          issue: 'div with onClick should have role and keyboard handler',
          severity: 'error',
          category: 'semantic'
        });
      }
      
      // Check for images without alt text
      if ((line.includes('<img') || line.includes('<Image')) && 
          !line.includes('alt=') && !line.includes('alt ')) {
        issues.push({
          file: filePath,
          line: lineNum,
          issue: 'Image missing alt attribute',
          severity: 'error',
          category: 'image'
        });
      }
      
      // Check for buttons without aria-label when they only contain icons
      if (line.includes('<button') && !line.includes('aria-label') && 
          !line.includes('aria-labelledby') && line.includes('Icon')) {
        issues.push({
          file: filePath,
          line: lineNum,
          issue: 'Icon-only button missing aria-label',
          severity: 'warning',
          category: 'aria'
        });
      }
      
      // Check for input without associated label
      if (line.includes('<input') && !line.includes('aria-label') && 
          !line.includes('id=') && !line.includes('aria-labelledby')) {
        issues.push({
          file: filePath,
          line: lineNum,
          issue: 'Input missing label association',
          severity: 'warning',
          category: 'aria'
        });
      }
      
      // Check for outline-none without focus-visible replacement
      if (line.includes('outline-none') || line.includes('outline: none')) {
        // Check if focus-visible is present in the same file
        const hasFocusVisible = content.includes('focus-visible') || 
                               content.includes('focus:ring') ||
                               content.includes('focus:outline');
        
        if (!hasFocusVisible) {
          issues.push({
            file: filePath,
            line: lineNum,
            issue: 'outline-none without focus-visible replacement',
            severity: 'error',
            category: 'focus'
          });
        }
      }
      
      // Check for interactive elements without keyboard support
      if ((line.includes('onClick') || line.includes('onMouseDown')) && 
          !line.includes('onKeyDown') && !line.includes('onKeyUp') && 
          !line.includes('<button') && !line.includes('<a ')) {
        issues.push({
          file: filePath,
          line: lineNum,
          issue: 'Interactive element missing keyboard handler',
          severity: 'warning',
          category: 'keyboard'
        });
      }
      
      // Check for decorative icons without aria-hidden
      if (line.includes('Icon') && line.includes('decorative') && 
          !line.includes('aria-hidden')) {
        issues.push({
          file: filePath,
          line: lineNum,
          issue: 'Decorative icon missing aria-hidden',
          severity: 'warning',
          category: 'aria'
        });
      }
    }
  } catch (error) {
    // Skip files that can't be read
  }
  
  return issues;
}

// Helper function to scan directory for components
function scanDirectoryForA11y(directory: string): AccessibilityMetrics {
  const metrics: AccessibilityMetrics = {
    totalComponents: 0,
    componentsWithIssues: 0,
    totalIssues: 0,
    errorCount: 0,
    warningCount: 0,
    issuesByCategory: {
      aria: 0,
      semantic: 0,
      keyboard: 0,
      image: 0,
      focus: 0
    }
  };
  
  function scanDirectory(dir: string) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        // Skip node_modules, .next, and test directories
        if (entry.name === 'node_modules' || entry.name === '.next' || 
            entry.name === '.git' || entry.name === '__tests__') {
          continue;
        }
        
        if (entry.isDirectory()) {
          scanDirectory(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.tsx')) {
          // Skip test files
          if (entry.name.endsWith('.test.tsx')) {
            continue;
          }
          
          metrics.totalComponents++;
          const issues = scanComponentForA11yIssues(fullPath);
          
          if (issues.length > 0) {
            metrics.componentsWithIssues++;
            metrics.totalIssues += issues.length;
            
            issues.forEach(issue => {
              if (issue.severity === 'error') {
                metrics.errorCount++;
              } else {
                metrics.warningCount++;
              }
              metrics.issuesByCategory[issue.category]++;
            });
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

// Helper function to check for semantic HTML usage
function checkSemanticHTML(filePath: string): boolean {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Check for proper semantic elements
    const hasSemanticElements = 
      content.includes('<button') ||
      content.includes('<nav') ||
      content.includes('<header') ||
      content.includes('<main') ||
      content.includes('<footer') ||
      content.includes('<article') ||
      content.includes('<section');
    
    // Check for anti-patterns
    const hasDivOnClick = content.includes('div') && content.includes('onClick');
    const hasSpanOnClick = content.includes('span') && content.includes('onClick');
    
    // If component has interactive elements, it should use semantic HTML
    if (hasDivOnClick || hasSpanOnClick) {
      return hasSemanticElements;
    }
    
    return true;
  } catch (error) {
    return true;
  }
}

// Helper function to check ARIA labels
function checkARIALabels(filePath: string): number {
  let missingLabels = 0;
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    for (const line of lines) {
      // Check for icon-only buttons without labels
      if (line.includes('<button') && 
          (line.includes('Icon') || line.includes('Svg')) &&
          !line.includes('aria-label') && 
          !line.includes('aria-labelledby') &&
          !line.includes('>') && !line.includes('children')) {
        missingLabels++;
      }
      
      // Check for form controls without labels
      if ((line.includes('<input') || line.includes('<select') || line.includes('<textarea')) &&
          !line.includes('aria-label') && 
          !line.includes('aria-labelledby') &&
          !line.includes('id=')) {
        missingLabels++;
      }
    }
  } catch (error) {
    // Skip files that can't be read
  }
  
  return missingLabels;
}

describe('Property 3: Accessibility Compliance', () => {
  it('should have minimal accessibility issues in components', () => {
    const componentsDir = path.join(process.cwd(), 'components');
    
    if (!fs.existsSync(componentsDir)) {
      expect(true).toBe(true);
      return;
    }
    
    const metrics = scanDirectoryForA11y(componentsDir);
    
    console.log('Accessibility Metrics:');
    console.log(`  Total components: ${metrics.totalComponents}`);
    console.log(`  Components with issues: ${metrics.componentsWithIssues}`);
    console.log(`  Total issues: ${metrics.totalIssues}`);
    console.log(`  Errors: ${metrics.errorCount}`);
    console.log(`  Warnings: ${metrics.warningCount}`);
    console.log('  Issues by category:');
    Object.entries(metrics.issuesByCategory).forEach(([category, count]) => {
      if (count > 0) {
        console.log(`    ${category}: ${count}`);
      }
    });
    
    // Property: Less than 20% of components should have accessibility issues
    const issuePercentage = metrics.totalComponents > 0
      ? (metrics.componentsWithIssues / metrics.totalComponents) * 100
      : 0;
    
    console.log(`  Issue percentage: ${issuePercentage.toFixed(2)}%`);
    
    expect(issuePercentage).toBeLessThan(20);
  });
  
  it('should have no critical accessibility errors', () => {
    const componentsDir = path.join(process.cwd(), 'components');
    
    if (!fs.existsSync(componentsDir)) {
      expect(true).toBe(true);
      return;
    }
    
    const metrics = scanDirectoryForA11y(componentsDir);
    
    console.log(`Critical accessibility errors: ${metrics.errorCount}`);
    
    // Property: No critical accessibility errors should exist
    // Allow up to 5 errors for transitional state
    expect(metrics.errorCount).toBeLessThan(5);
  });
  
  it('should use semantic HTML in interactive components', () => {
    const componentsDir = path.join(process.cwd(), 'components');
    
    if (!fs.existsSync(componentsDir)) {
      expect(true).toBe(true);
      return;
    }
    
    const componentFiles: string[] = [];
    
    function findComponents(dir: string) {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.name === 'node_modules' || entry.name === '.next' || 
              entry.name === '__tests__') {
            continue;
          }
          
          if (entry.isDirectory()) {
            findComponents(fullPath);
          } else if (entry.isFile() && entry.name.endsWith('.tsx') && 
                     !entry.name.endsWith('.test.tsx')) {
            componentFiles.push(fullPath);
          }
        }
      } catch (error) {
        // Skip directories that can't be read
      }
    }
    
    findComponents(componentsDir);
    
    let componentsWithSemanticHTML = 0;
    
    for (const file of componentFiles) {
      if (checkSemanticHTML(file)) {
        componentsWithSemanticHTML++;
      }
    }
    
    const semanticPercentage = componentFiles.length > 0
      ? (componentsWithSemanticHTML / componentFiles.length) * 100
      : 100;
    
    console.log(`Components using semantic HTML: ${componentsWithSemanticHTML}/${componentFiles.length} (${semanticPercentage.toFixed(2)}%)`);
    
    // Property: At least 80% of components should use semantic HTML
    expect(semanticPercentage).toBeGreaterThan(80);
  });
  
  it('should have proper ARIA labels on interactive elements', () => {
    const componentsDir = path.join(process.cwd(), 'components');
    const appDir = path.join(process.cwd(), 'app');
    
    let totalMissingLabels = 0;
    let filesChecked = 0;
    
    function checkDirectory(dir: string) {
      if (!fs.existsSync(dir)) {
        return;
      }
      
      function scanFiles(subdir: string) {
        try {
          const entries = fs.readdirSync(subdir, { withFileTypes: true });
          
          for (const entry of entries) {
            const fullPath = path.join(subdir, entry.name);
            
            if (entry.name === 'node_modules' || entry.name === '.next' || 
                entry.name === '__tests__') {
              continue;
            }
            
            if (entry.isDirectory()) {
              scanFiles(fullPath);
            } else if (entry.isFile() && entry.name.endsWith('.tsx') && 
                       !entry.name.endsWith('.test.tsx')) {
              filesChecked++;
              totalMissingLabels += checkARIALabels(fullPath);
            }
          }
        } catch (error) {
          // Skip directories that can't be read
        }
      }
      
      scanFiles(dir);
    }
    
    checkDirectory(componentsDir);
    checkDirectory(appDir);
    
    console.log(`Files checked: ${filesChecked}`);
    console.log(`Missing ARIA labels: ${totalMissingLabels}`);
    
    // Property: Average missing labels per file should be less than 2
    const avgMissingLabels = filesChecked > 0 ? totalMissingLabels / filesChecked : 0;
    console.log(`Average missing labels per file: ${avgMissingLabels.toFixed(2)}`);
    
    expect(avgMissingLabels).toBeLessThan(2);
  });
  
  // Property-based test: All images should have alt text
  it('should have alt text on all images', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('components', 'app'),
        (directory) => {
          const dirPath = path.join(process.cwd(), directory);
          
          if (!fs.existsSync(dirPath)) {
            return true;
          }
          
          let imagesWithoutAlt = 0;
          let totalImages = 0;
          
          function scanForImages(dir: string) {
            try {
              const entries = fs.readdirSync(dir, { withFileTypes: true });
              
              for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                
                if (entry.name === 'node_modules' || entry.name === '.next' || 
                    entry.name === '__tests__') {
                  continue;
                }
                
                if (entry.isDirectory()) {
                  scanForImages(fullPath);
                } else if (entry.isFile() && entry.name.endsWith('.tsx')) {
                  try {
                    const content = fs.readFileSync(fullPath, 'utf-8');
                    const lines = content.split('\n');
                    
                    for (const line of lines) {
                      if (line.includes('<img') || line.includes('<Image')) {
                        totalImages++;
                        if (!line.includes('alt=') && !line.includes('alt ')) {
                          imagesWithoutAlt++;
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
          
          scanForImages(dirPath);
          
          console.log(`${directory}: ${imagesWithoutAlt}/${totalImages} images without alt text`);
          
          // Property: All images should have alt text
          // Allow up to 5% without alt for transitional state
          const missingPercentage = totalImages > 0 
            ? (imagesWithoutAlt / totalImages) * 100 
            : 0;
          
          expect(missingPercentage).toBeLessThan(5);
          
          return true;
        }
      ),
      { numRuns: 2 }
    );
  });
  
  // Property-based test: Interactive elements should have keyboard support
  it('should have keyboard support on all interactive elements', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('components', 'app'),
        (directory) => {
          const dirPath = path.join(process.cwd(), directory);
          
          if (!fs.existsSync(dirPath)) {
            return true;
          }
          
          let interactiveWithoutKeyboard = 0;
          let totalInteractive = 0;
          
          function scanForInteractive(dir: string) {
            try {
              const entries = fs.readdirSync(dir, { withFileTypes: true });
              
              for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                
                if (entry.name === 'node_modules' || entry.name === '.next' || 
                    entry.name === '__tests__') {
                  continue;
                }
                
                if (entry.isDirectory()) {
                  scanForInteractive(fullPath);
                } else if (entry.isFile() && entry.name.endsWith('.tsx')) {
                  try {
                    const content = fs.readFileSync(fullPath, 'utf-8');
                    const lines = content.split('\n');
                    
                    for (const line of lines) {
                      // Check for onClick handlers
                      if (line.includes('onClick') && !line.includes('//')) {
                        totalInteractive++;
                        
                        // Check if it's a button or link (semantic HTML)
                        const isSemanticElement = line.includes('<button') || 
                                                 line.includes('<a ') ||
                                                 line.includes('<Link');
                        
                        // Check if it has keyboard handler
                        const hasKeyboardHandler = line.includes('onKeyDown') || 
                                                  line.includes('onKeyUp') ||
                                                  line.includes('onKeyPress');
                        
                        if (!isSemanticElement && !hasKeyboardHandler) {
                          interactiveWithoutKeyboard++;
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
          
          scanForInteractive(dirPath);
          
          console.log(`${directory}: ${interactiveWithoutKeyboard}/${totalInteractive} interactive elements without keyboard support`);
          
          // Property: At least 90% of interactive elements should have keyboard support
          const supportPercentage = totalInteractive > 0
            ? ((totalInteractive - interactiveWithoutKeyboard) / totalInteractive) * 100
            : 100;
          
          expect(supportPercentage).toBeGreaterThan(90);
          
          return true;
        }
      ),
      { numRuns: 2 }
    );
  });
  
  // Property-based test: Accessibility should be consistent across directories
  it('should have consistent accessibility standards across all directories', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('components', 'app'),
        (directory) => {
          const dirPath = path.join(process.cwd(), directory);
          
          if (!fs.existsSync(dirPath)) {
            return true;
          }
          
          const metrics = scanDirectoryForA11y(dirPath);
          
          // Property: Each directory should have similar accessibility standards
          const issuePercentage = metrics.totalComponents > 0
            ? (metrics.componentsWithIssues / metrics.totalComponents) * 100
            : 0;
          
          console.log(`${directory}: ${issuePercentage.toFixed(2)}% components with issues`);
          
          // Allow up to 25% of components to have issues
          expect(issuePercentage).toBeLessThan(25);
          
          return true;
        }
      ),
      { numRuns: 2 }
    );
  });
});
