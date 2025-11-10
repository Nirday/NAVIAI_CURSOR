#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Find all route.ts files with the old params pattern
const files = execSync(
  'find app/api -name "route.ts" -type f -exec grep -l "{ params }: { params: {" {} \\;',
  { encoding: 'utf-8', cwd: process.cwd() }
)
  .trim()
  .split('\n')
  .filter(Boolean);

console.log(`Found ${files.length} files to fix:`);

files.forEach(file => {
  console.log(`Fixing: ${file}`);
  let content = fs.readFileSync(file, 'utf-8');
  
  // Replace { params }: { params: { ... } } with { params }: { params: Promise<{ ... }> }
  // and add await params destructuring
  
  // Pattern 1: { params }: { params: { id: string } }
  content = content.replace(
    /\{ params \}: \{ params: \{ (\w+): string \} \}/g,
    '{ params }: { params: Promise<{ $1: string }> }'
  );
  
  // Pattern 2: Add const { param } = await params after function start
  // Find the pattern: export async function METHOD(\n  req,\n  { params }: { params: Promise<...> }\n) {\n
  // and insert const { param } = await params
  
  const funcPattern = /export async function (GET|POST|PUT|PATCH|DELETE)\(\s*req: NextRequest,\s*\{ params \}: \{ params: Promise<\{ (\w+): string \}> \}\s*\) \{\s*try \{/g;
  
  content = content.replace(funcPattern, (match, method, paramName) => {
    return `export async function ${method}(\n  req: NextRequest,\n  { params }: { params: Promise<{ ${paramName}: string }> }\n) {\n  try {\n    const { ${paramName} } = await params\n    `;
  });
  
  // For functions without try block
  const funcPatternNoTry = /export async function (GET|POST|PUT|PATCH|DELETE)\(\s*req: NextRequest,\s*\{ params \}: \{ params: Promise<\{ (\w+): string \}> \}\s*\) \{\s*(?!try|const \{)/g;
  
  content = content.replace(funcPatternNoTry, (match, method, paramName) => {
    return `export async function ${method}(\n  req: NextRequest,\n  { params }: { params: Promise<{ ${paramName}: string }> }\n) {\n  const { ${paramName} } = await params\n  `;
  });
  
  // Now replace all params.paramName with just paramName
  // But only for the parameter we extracted
  const extracted = content.match(/const \{ (\w+) \} = await params/);
  if (extracted) {
    const paramName = extracted[1];
    // Replace params.paramName with paramName (but not in the await params line itself)
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].includes('= await params')) {
        lines[i] = lines[i].replace(new RegExp(`params\\.${paramName}\\b`, 'g'), paramName);
      }
    }
    content = lines.join('\n');
  }
  
  fs.writeFileSync(file, content);
  console.log(`✓ Fixed: ${file}`);
});

console.log(`\nFixed ${files.length} files total.`);

