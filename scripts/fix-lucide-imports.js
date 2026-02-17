#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Icon name mappings for special cases
const iconMappings = {
  'Grid3X3': 'grid-3x3',
  'InfoIcon': 'info',
  'Loader2': 'loader-2',
  'RefreshCw': 'refresh-cw',
  'AlertCircle': 'alert-circle',
  'CheckCircle': 'check-circle',
  'ChevronDown': 'chevron-down',
  'ChevronRight': 'chevron-right',
  'ArrowLeft': 'arrow-left',
  'ArrowRight': 'arrow-right',
  'ArrowUpRight': 'arrow-up-right',
  'CloudRain': 'cloud-rain',
  'EyeOff': 'eye-off',
  'CloudOff': 'cloud-off',
  'RotateCcw': 'rotate-ccw',
  'AlertTriangle': 'alert-triangle',
  'LogIn': 'log-in'
};

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

// Fix lucide import paths
function fixLucideImports(content) {
  let modified = false;
  
  // Fix individual import lines
  content = content.replace(
    /import (\w+) from 'lucide-react\/dist\/esm\/icons\/([^']+)';/g,
    (match, iconName, currentPath) => {
      const correctPath = iconMappings[iconName] || currentPath;
      if (correctPath !== currentPath) {
        modified = true;
        return `import ${iconName} from 'lucide-react/dist/esm/icons/${correctPath}';`;
      }
      return match;
    }
  );
  
  return { content, modified };
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
      const { content: newContent, modified } = fixLucideImports(content);
      
      if (modified) {
        fs.writeFileSync(filePath, newContent);
        console.info(`✓ Fixed: ${path.relative(projectRoot, filePath)}`);
        totalModified++;
      }
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error.message);
    }
  });
  
  console.info(`\nTotal files fixed: ${totalModified}`);
}

processFiles();