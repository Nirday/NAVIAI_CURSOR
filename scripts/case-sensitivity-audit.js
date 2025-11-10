#!/usr/bin/env node
/**
 * Case-Sensitivity Audit for Vercel Deployment
 * Finds all import statements where the case doesn't match the actual file system
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const errors = [];
const warnings = [];

// Get all TypeScript/JavaScript files
const files = execSync(
  'find app libs -type f \\( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \\) 2>/dev/null',
  { encoding: 'utf-8', cwd: process.cwd() }
)
  .trim()
  .split('\n')
  .filter(Boolean);

console.log(`\n🔍 Scanning ${files.length} files for case-sensitivity issues...\n`);

files.forEach((file, index) => {
  if (index % 100 === 0) {
    process.stdout.write(`Progress: ${index}/${files.length}...\r`);
  }

  const content = fs.readFileSync(file, 'utf-8');
  const dir = path.dirname(file);

  // Match import statements
  const importRegex = /import\s+(?:[\w\s{},*]+\s+from\s+)?['"]([^'"]+)['"]/g;
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];

    // Skip node_modules and absolute imports
    if (importPath.startsWith('.')) {
      // Resolve the import path
      let resolvedPath = path.resolve(dir, importPath);

      // Try adding extensions if file doesn't exist
      let actualPath = null;
      const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'];

      for (const ext of extensions) {
        const testPath = resolvedPath + ext;
        if (fs.existsSync(testPath)) {
          actualPath = testPath;
          break;
        }
      }

      if (actualPath) {
        // Get the actual file path from the file system
        const actualBasename = path.basename(actualPath);
        const importedBasename = path.basename(resolvedPath);

        // Compare case
        if (actualBasename !== importedBasename && actualBasename.toLowerCase() === importedBasename.toLowerCase()) {
          errors.push({
            file,
            imported: importPath,
            actual: actualPath,
            issue: `Case mismatch: imported "${importedBasename}" but file is "${actualBasename}"`
          });
        }
      }
    }
  }
});

console.log(`\n✅ Scan complete!\n`);

if (errors.length === 0) {
  console.log('✅ **NO CASE-SENSITIVITY ISSUES FOUND**\n');
  console.log('All imports match the actual file system capitalization.\n');
} else {
  console.log(`❌ **FOUND ${errors.length} CASE-SENSITIVITY ISSUES**\n`);
  console.log('These will cause build failures on Linux/Vercel:\n');

  errors.forEach((err, i) => {
    console.log(`${i + 1}. ${err.file}`);
    console.log(`   ${err.issue}`);
    console.log(`   Imported: ${err.imported}`);
    console.log(`   Actual:   ${err.actual}\n`);
  });
}

process.exit(errors.length > 0 ? 1 : 0);

