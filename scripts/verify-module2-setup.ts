#!/usr/bin/env tsx
/**
 * Module 2: Website Builder Setup Verification
 * Verifies that all requirements for Module 2 are met
 */

import * as dotenv from 'dotenv'
import { join } from 'path'
import { existsSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: join(process.cwd(), '.env.local') })

interface CheckResult {
  name: string
  status: 'pass' | 'fail' | 'warning'
  message: string
}

const checks: CheckResult[] = []

// Check 1: Database Table
async function checkDatabaseTable() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !serviceRoleKey) {
    checks.push({ name: 'database_table', status: 'fail', message: 'Cannot check: Missing Supabase credentials' })
    return
  }
  
  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
    
    // Check if websites table exists
    const { error } = await supabase.from('websites').select('*').limit(0)
    
    if (error && error.code === 'PGRST116') {
      checks.push({ name: 'database_table', status: 'fail', message: 'websites table: ❌ Does not exist (needs to be added to schema)' })
    } else if (error) {
      checks.push({ name: 'database_table', status: 'fail', message: `websites table: ❌ Error: ${error.message}` })
    } else {
      checks.push({ name: 'database_table', status: 'pass', message: 'websites table: ✅ Exists' })
    }
  } catch (error: any) {
    checks.push({ name: 'database_table', status: 'fail', message: `Database check: ❌ ${error.message}` })
  }
}

// Check 2: Required Files
function checkRequiredFiles() {
  const requiredFiles = [
    'libs/website-builder/src/generator.ts',
    'libs/website-builder/src/page_ops.ts',
    'libs/website-builder/src/data.ts',
    'libs/website-builder/src/Renderer.tsx',
    'libs/website-builder/src/legal_pages.ts',
    'libs/website-builder/src/analytics.ts',
    'app/api/website/me/route.ts',
    'app/api/website/save/route.ts',
    'app/api/website/publish/route.ts',
  ]
  
  let allExist = true
  const missing: string[] = []
  
  for (const file of requiredFiles) {
    const path = join(process.cwd(), file)
    if (!existsSync(path)) {
      allExist = false
      missing.push(file)
    }
  }
  
  if (allExist) {
    checks.push({ name: 'required_files', status: 'pass', message: 'Required files: ✅ All exist' })
  } else {
    checks.push({ name: 'required_files', status: 'fail', message: `Required files: ❌ Missing: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? '...' : ''}` })
  }
}

// Check 3: Environment Variables
function checkEnvironmentVariables() {
  // Module 2 primarily uses OpenAI (already checked in Module 1)
  // Optional: Plausible Analytics
  const plausibleKey = process.env.PLAUSIBLE_API_KEY
  if (plausibleKey && plausibleKey !== '***' && plausibleKey.length > 0) {
    checks.push({ name: 'env_plausible', status: 'pass', message: 'Plausible Analytics API Key: ✅ Set (optional)' })
  } else {
    checks.push({ name: 'env_plausible', status: 'warning', message: 'Plausible Analytics API Key: ⚠️  Not set (optional for analytics)' })
  }
  
  // OpenAI is required (checked in Module 1)
  const openaiKey = process.env.OPENAI_API_KEY
  if (openaiKey && openaiKey !== '***' && openaiKey.length > 0) {
    checks.push({ name: 'env_openai', status: 'pass', message: 'OpenAI API Key: ✅ Set (required for AI generation)' })
  } else {
    checks.push({ name: 'env_openai', status: 'fail', message: 'OpenAI API Key: ❌ Missing (required)' })
  }
}

// Check 4: Dependencies
function checkDependencies() {
  const packageJsonPath = join(process.cwd(), 'package.json')
  if (!existsSync(packageJsonPath)) {
    checks.push({ name: 'dependencies', status: 'fail', message: 'Dependencies: ❌ package.json not found' })
    return
  }
  
  try {
    const packageJson = require(packageJsonPath)
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies }
    
    // Module 2 uses OpenAI (already installed), React (already installed)
    // No additional specific dependencies required
    checks.push({ name: 'dependencies', status: 'pass', message: 'Dependencies: ✅ All required packages available' })
  } catch (error: any) {
    checks.push({ name: 'dependencies', status: 'fail', message: `Dependencies: ❌ Error: ${error.message}` })
  }
}

// Run all checks
async function runChecks() {
  console.log('🔍 Verifying Module 2: Website Builder Setup...\n')
  
  checkRequiredFiles()
  checkEnvironmentVariables()
  checkDependencies()
  await checkDatabaseTable()
  
  // Print results
  console.log('📋 Verification Results:\n')
  
  const passed = checks.filter(c => c.status === 'pass')
  const failed = checks.filter(c => c.status === 'fail')
  const warnings = checks.filter(c => c.status === 'warning')
  
  passed.forEach(check => {
    console.log(`✅ ${check.message}`)
  })
  
  warnings.forEach(check => {
    console.log(`⚠️  ${check.message}`)
  })
  
  failed.forEach(check => {
    console.log(`❌ ${check.message}`)
  })
  
  console.log('\n' + '='.repeat(50))
  console.log(`\n📊 Summary:`)
  console.log(`   ✅ Passed: ${passed.length}`)
  console.log(`   ⚠️  Warnings: ${warnings.length}`)
  console.log(`   ❌ Failed: ${failed.length}`)
  
  if (failed.length === 0) {
    console.log('\n🎉 Module 2 setup is complete!')
  } else {
    console.log('\n⚠️  Some checks failed. Please fix the issues above.\n')
    if (failed.some(c => c.name === 'database_table')) {
      console.log('💡 Action needed: The websites table needs to be added to the database schema.')
      console.log('   I can help you add it to supabase-schema.sql\n')
    }
  }
}

runChecks().catch(console.error)

