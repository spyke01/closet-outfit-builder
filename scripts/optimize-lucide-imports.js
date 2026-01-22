#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get all TypeScript/TSX files
function getAllFiles(dir, extension = '.tsx') {
  let results = [];
  const list = fs.readdirSync(dir);
  
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat && stat.isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules') {
        results = results.concat(getAllFiles(filePath, extension));
      }
    } else if (file.endsWith(extension) || file.endsWith('.ts')) {
      results.push(filePath);
    }
  });
  
  return results;
}

// Extract icon names from import statement
function extractIconNames(importLine) {
  const match = importLine.match(/import\s*{\s*([^}]+)\s*}\s*from\s*['"]lucide-react['"]/);
  if (!match) return [];
  
  return match[1]
    .split(',')
    .map(name => name.trim())
    .filter(name => name.length > 0);
}

// Convert barrel import to direct imports
function convertLucideImports(content) {
  const lines = content.split('\n');
  let modified = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.includes('from \'lucide-react\'') || line.includes('from "lucide-react"')) {
      const iconNames = extractIconNames(line);
      
      if (iconNames.length > 0) {
        // Replace with direct imports
        const directImports = iconNames.map(iconName => {
          const kebabCase = iconName.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
          return `import ${iconName} from 'lucide-react/dist/esm/icons/${kebabCase}';`;
        });
        
        lines[i] = directImports.join('\n');
        modified = true;
      }
    }
  }
  
  return { content: lines.join('\n'), modified };
}

// Process all files
function processFiles() {
  const projectRoot = path.resolve(__dirname, '..');
  const files = [
    ...getAllFiles(path.join(projectRoot, 'components')),
    ...getAllFiles(path.join(projectRoot, 'app')),
  ];
  
  let totalModified = 0;
  
  files.forEach(filePath => {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const { content: newContent, modified } = convertLucideImports(content);
      
      if (modified) {
        fs.writeFileSync(filePath, newContent);
        console.log(`✓ Updated: ${path.relative(projectRoot, filePath)}`);
        totalModified++;
      }
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error.message);
    }
  });
  
  console.log(`\nTotal files modified: ${totalModified}`);
}

processFiles();