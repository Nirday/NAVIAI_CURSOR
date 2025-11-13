#!/usr/bin/env node
/**
 * Comprehensive Build Fix Script
 * Fixes all known Next.js 15 build errors proactively
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n🔍 COMPREHENSIVE BUILD FIX - Scanning for all known errors...\n');

let totalFixed = 0;
const fixes = [];

function safeGrep(pattern, include = '*.ts', dirs = 'app libs') {
  try {
    const result = execSync(
      `grep -rl "${pattern}" --include="${include}" ${dirs} 2>/dev/null || true`,
      { encoding: 'utf-8', cwd: process.cwd(), maxBuffer: 10 * 1024 * 1024 }
    );
    return result.trim().split('\n').filter(Boolean);
  } catch (e) {
    return [];
  }
}

// 1. Fix all getAuthenticatedUserId functions that use await headers() but aren't async
console.log('1️⃣  Fixing getAuthenticatedUserId functions...');
const userIdFiles = safeGrep('getAuthenticatedUserId', '*.ts');
userIdFiles.forEach((file) => {
  let content = fs.readFileSync(file, 'utf-8');
  let modified = false;

  // Find function getAuthenticatedUserId(): string | null that uses await headers()
  if (content.includes('function getAuthenticatedUserId(): string | null') && 
      content.includes('await headers()')) {
    // Make it async
    content = content.replace(
      /function getAuthenticatedUserId\(\): string \| null/g,
      'async function getAuthenticatedUserId(): Promise<string | null>'
    );
    
    // Update all call sites to await
    content = content.replace(
      /(\s+)(const\s+\w+\s*=\s*)getAuthenticatedUserId\(\)/g,
      '$1$2await getAuthenticatedUserId()'
    );
    
    modified = true;
    fixes.push(`✅ Made getAuthenticatedUserId async in ${file}`);
  }

  if (modified) {
    fs.writeFileSync(file, content);
    totalFixed++;
  }
});

// 2. Fix email type errors in admin broadcasts
console.log('2️⃣  Fixing email type errors...');
const broadcastFiles = safeGrep('userData.user.email', '*.ts');
broadcastFiles.forEach((file) => {
  let content = fs.readFileSync(file, 'utf-8');
  let modified = false;

  // Find patterns like: recipients.push({ id: userId, email: userData.user.email })
  if (content.includes('userData.user.email') && content.includes('recipients.push')) {
    // Replace direct usage with type guard
    const pattern = /(\s+)(if\s+\(userData\?\.\s*user\?\.\s*email\)\s*\{[\s\S]*?recipients\.push\(\{\s*id:\s*\w+,\s*email:\s*)userData\.user\.email(\s*\}\)[\s\S]*?\})/g;
    
    content = content.replace(pattern, (match, indent, before, after) => {
      return `${indent}const email = userData?.user?.email\n${indent}if (email && typeof email === 'string') {\n${indent}  recipients.push({ id: userId, email${after})\n${indent}}`;
    });

    // Also handle simpler patterns
    content = content.replace(
      /(\s+)if\s+\(userData\?\.\s*user\?\.\s*email\)\s*\{[\s\S]{0,200}?recipients\.push\(\{\s*id:\s*(\w+),\s*email:\s*userData\.user\.email\s*\}\)/g,
      (match, indent, userIdVar) => {
        return `${indent}const email = userData?.user?.email\n${indent}if (email && typeof email === 'string') {\n${indent}  recipients.push({ id: ${userIdVar}, email })`;
      }
    );

    if (content !== fs.readFileSync(file, 'utf-8')) {
      modified = true;
      fixes.push(`✅ Fixed email type error in ${file}`);
    }
  }

  if (modified) {
    fs.writeFileSync(file, content);
    totalFixed++;
  }
});

// 3. Check for any remaining un-awaited headers() in non-async contexts
console.log('3️⃣  Checking for remaining headers() issues...');
const headersFiles = safeGrep('headers\\(\\)', '*.ts');
headersFiles.forEach((file) => {
  let content = fs.readFileSync(file, 'utf-8');
  let modified = false;

  // Check for const hdrs = headers() without await (but only if not already fixed)
  if (content.includes('const') && content.includes('headers()')) {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Match: const something = headers() without await
      if (line.match(/const\s+\w+\s*=\s*headers\(\)/) && !line.includes('await')) {
        // Check if we're in an async function
        let isInAsync = false;
        for (let j = i - 1; j >= 0 && j >= i - 20; j--) {
          if (lines[j].includes('async function') || lines[j].includes('export async')) {
            isInAsync = true;
            break;
          }
        }
        
        if (isInAsync) {
          lines[i] = line.replace(/const\s+(\w+)\s*=\s*headers\(\)/, 'const $1 = await headers()');
          modified = true;
        }
      }
    }
    
    if (modified) {
      content = lines.join('\n');
      fixes.push(`✅ Fixed un-awaited headers() in ${file}`);
    }
  }

  // Add force-dynamic if missing in route files
  if ((file.includes('/route.ts') || file.includes('/route.tsx')) && 
      content.includes('headers()') && 
      !content.includes("export const dynamic")) {
    const importMatch = content.match(/^(import\s+.*?from\s+['"].*?['"];?\s*\n)+/m);
    if (importMatch) {
      const afterImports = importMatch[0] + '\nexport const dynamic = \'force-dynamic\'\n';
      content = content.replace(importMatch[0], afterImports);
      modified = true;
      fixes.push(`✅ Added force-dynamic to ${file}`);
    }
  }

  if (modified) {
    fs.writeFileSync(file, content);
    totalFixed++;
  }
});

// 4. Check for reserved variable names (const default)
console.log('4️⃣  Checking for reserved variable names...');
const allTsFiles = safeGrep('.', '*.ts', 'app');
allTsFiles.forEach((file) => {
  let content = fs.readFileSync(file, 'utf-8');
  let modified = false;

  // Find const default = (but not const default = in function parameters)
  if (content.includes('const default = ') && !content.includes('function') && !content.includes('=>')) {
    // This is tricky - let's be more specific
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].match(/^\s*const\s+default\s*=\s/)) {
        // Replace with defaultSchedule
        lines[i] = lines[i].replace(/const default = /, 'const defaultSchedule = ');
        // Update references on next few lines
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          lines[j] = lines[j].replace(/default\.date/g, 'defaultSchedule.date');
          lines[j] = lines[j].replace(/default\.time/g, 'defaultSchedule.time');
        }
        modified = true;
        fixes.push(`✅ Fixed reserved variable 'default' in ${file}:${i + 1}`);
        break;
      }
    }
  }

  if (modified) {
    content = lines.join('\n');
    fs.writeFileSync(file, content);
    totalFixed++;
  }
});

console.log('\n✅ COMPREHENSIVE FIX COMPLETE!\n');
console.log(`📊 Total files modified: ${totalFixed}`);
if (fixes.length > 0) {
  console.log(`\n📝 Fixes applied:\n`);
  fixes.forEach(fix => console.log(`  ${fix}`));
} else {
  console.log('\n✨ No issues found - codebase is clean!');
}
console.log('\n');
