#!/usr/bin/env tsx
/**
 * Module 3: Content Engine Setup Verification
 * Verifies that all requirements for Module 3 are met
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

// Check 1: Database Tables
async function checkDatabaseTables() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !serviceRoleKey) {
    checks.push({ name: 'database_tables', status: 'fail', message: 'Cannot check: Missing Supabase credentials' })
    return
  }
  
  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
    
    // Check if Module 3 tables exist
    const coreTables = ['blog_posts', 'content_settings']
    let allExist = true
    const missing: string[] = []
    
    for (const table of coreTables) {
      const { error } = await supabase.from(table).select('*').limit(0)
      if (error && error.code === 'PGRST116') {
        allExist = false
        missing.push(table)
      }
    }
    
    if (allExist) {
      checks.push({ name: 'database_tables', status: 'pass', message: 'Database tables: ✅ All exist (blog_posts, content_settings)' })
    } else {
      checks.push({ name: 'database_tables', status: 'fail', message: `Database tables: ❌ Missing: ${missing.join(', ')}` })
    }
  } catch (error: any) {
    checks.push({ name: 'database_tables', status: 'fail', message: `Database check: ❌ ${error.message}` })
  }
}

// Check 2: Required Files
function checkRequiredFiles() {
  const requiredFiles = [
    'libs/content-engine/src/draft_generator.ts',
    'libs/content-engine/src/scheduler.ts',
    'libs/content-engine/src/approval_workflow.ts',
    'libs/content-engine/src/publisher.ts',
    'libs/content-engine/src/repurposer.ts',
    'app/api/content/posts/route.ts',
    'app/api/content/approve/route.ts',
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
  // Module 3 uses OpenAI (already checked in Module 1)
  const openaiKey = process.env.OPENAI_API_KEY
  if (openaiKey && openaiKey !== '***' && openaiKey.length > 0) {
    checks.push({ name: 'env_openai', status: 'pass', message: 'OpenAI API Key: ✅ Set (required for AI content generation)' })
  } else {
    checks.push({ name: 'env_openai', status: 'fail', message: 'OpenAI API Key: ❌ Missing (required)' })
  }
  
  // Resend for email notifications (optional)
  const resendKey = process.env.RESEND_API_KEY
  if (resendKey && resendKey !== '***' && resendKey.length > 0) {
    checks.push({ name: 'env_resend', status: 'pass', message: 'Resend API Key: ✅ Set (for approval emails)' })
  } else {
    checks.push({ name: 'env_resend', status: 'warning', message: 'Resend API Key: ⚠️  Not set (optional for email notifications)' })
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
    
    // Module 3 uses OpenAI, Resend (for emails)
    const required = ['openai']
    const optional = ['resend']
    const missing: string[] = []
    
    for (const dep of required) {
      if (!deps[dep]) {
        missing.push(dep)
      }
    }
    
    if (missing.length === 0) {
      let message = 'Dependencies: ✅ All required packages available'
      const missingOptional = optional.filter(dep => !deps[dep])
      if (missingOptional.length > 0) {
        message += ` (${missingOptional.join(', ')} optional)`
      }
      checks.push({ name: 'dependencies', status: 'pass', message })
    } else {
      checks.push({ name: 'dependencies', status: 'fail', message: `Dependencies: ❌ Missing: ${missing.join(', ')}` })
    }
  } catch (error: any) {
    checks.push({ name: 'dependencies', status: 'fail', message: `Dependencies: ❌ Error: ${error.message}` })
  }
}

// Run all checks
async function runChecks() {
  console.log('🔍 Verifying Module 3: Content Engine Setup...\n')
  
  checkRequiredFiles()
  checkEnvironmentVariables()
  checkDependencies()
  await checkDatabaseTables()
  
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
    console.log('\n🎉 Module 3 setup is complete!')
  } else {
    console.log('\n⚠️  Some checks failed. Please fix the issues above.\n')
  }
}

runChecks().catch(console.error)

