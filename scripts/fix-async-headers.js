#!/usr/bin/env node
/**
 * Fix async headers() calls for Next.js 15
 * Adds await and force-dynamic export where needed
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Find all files with headers() calls
const files = execSync(
  'grep -rl "const.*=.*headers()" --include="*.ts" --include="*.tsx" app 2>/dev/null',
  { encoding: 'utf-8', cwd: process.cwd() }
)
  .trim()
  .split('\n')
  .filter(Boolean);

console.log(`\n🔍 Found ${files.length} files with headers() calls...\n`);

let fixed = 0;

files.forEach((file) => {
  let content = fs.readFileSync(file, 'utf-8');
  let modified = false;

  // Check if already has await
  if (content.includes('await headers()')) {
    console.log(`⏭️  Skipping ${file} (already has await)`);
    return;
  }

  // Replace const hdrs = headers() with const hdrs = await headers()
  const before = content;
  content = content.replace(
    /const\s+(\w+)\s*=\s*headers\(\)/g,
    'const $1 = await headers()'
  );

  if (content !== before) {
    modified = true;
  }

  // Add force-dynamic export if not present and file is a route
  if (file.includes('/route.ts') || file.includes('/route.tsx')) {
    if (!content.includes("export const dynamic")) {
      // Find the first import statement and add after it
      const importMatch = content.match(/^(import\s+.*?from\s+['"].*?['"];?\s*\n)+/m);
      if (importMatch) {
        const afterImports = importMatch[0] + '\nexport const dynamic = \'force-dynamic\'\n';
        content = content.replace(importMatch[0], afterImports);
        modified = true;
      }
    }
  }

  if (modified) {
    fs.writeFileSync(file, content);
    console.log(`✅ Fixed: ${file}`);
    fixed++;
  } else {
    console.log(`⏭️  Skipping ${file} (no changes needed)`);
  }
});

console.log(`\n✅ Fixed ${fixed} files total.\n`);

