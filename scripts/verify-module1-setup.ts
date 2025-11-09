#!/usr/bin/env tsx
/**
 * Module 1 Setup Verification
 * Verifies that all requirements for Module 1 are met
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

// Check 1: Environment Variables
function checkEnvironmentVariables() {
  const required = {
    'OPENAI_API_KEY': 'OpenAI API Key (required for AI chat)',
    'NEXT_PUBLIC_SUPABASE_URL': 'Supabase Project URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY': 'Supabase Anon Key',
    'SUPABASE_SERVICE_ROLE_KEY': 'Supabase Service Role Key',
  }
  
  const optional = {
    'RESEND_API_KEY': 'Resend API Key (for email notifications)',
    'TWILIO_ACCOUNT_SID': 'Twilio Account SID (for SMS)',
    'TWILIO_AUTH_TOKEN': 'Twilio Auth Token (for SMS)',
  }
  
  for (const [key, description] of Object.entries(required)) {
    const value = process.env[key]
    if (value && value !== '***' && value.length > 0) {
      checks.push({ name: key, status: 'pass', message: `${description}: ✅ Set` })
    } else {
      checks.push({ name: key, status: 'fail', message: `${description}: ❌ Missing` })
    }
  }
  
  for (const [key, description] of Object.entries(optional)) {
    const value = process.env[key]
    if (value && value !== '***' && value.length > 0) {
      checks.push({ name: key, status: 'pass', message: `${description}: ✅ Set` })
    } else {
      checks.push({ name: key, status: 'warning', message: `${description}: ⚠️  Not set (optional)` })
    }
  }
}

// Check 2: Database Connection
async function checkDatabaseConnection() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !serviceRoleKey) {
    checks.push({ name: 'database_connection', status: 'fail', message: 'Cannot check database: Missing credentials' })
    return
  }
  
  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
    
    // Check if core Module 1 tables exist
    const coreTables = ['business_profiles', 'chat_messages', 'profile_embeddings', 'suggestion_prompts']
    let allExist = true
    
    for (const table of coreTables) {
      const { error } = await supabase.from(table).select('*').limit(0)
      if (error && error.code === 'PGRST116') {
        allExist = false
        break
      }
    }
    
    if (allExist) {
      checks.push({ name: 'database_connection', status: 'pass', message: 'Database connection: ✅ Connected, all tables exist' })
    } else {
      checks.push({ name: 'database_connection', status: 'fail', message: 'Database connection: ❌ Some tables missing' })
    }
  } catch (error: any) {
    checks.push({ name: 'database_connection', status: 'fail', message: `Database connection: ❌ ${error.message}` })
  }
}

// Check 3: File Structure
function checkFileStructure() {
  const requiredFiles = [
    'libs/chat-core/src/orchestrator.ts',
    'libs/chat-core/src/profile.ts',
    'libs/chat-core/src/rag.ts',
    'libs/chat-core/src/scraper.ts',
    'libs/chat-core/src/suggestion_engine.ts',
    'app/api/chat/send/route.ts',
    'app/api/chat/messages/route.ts',
    'app/api/suggestions/route.ts',
    'apps/dashboard/components/ChatInterface.tsx',
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
    checks.push({ name: 'file_structure', status: 'pass', message: 'File structure: ✅ All required files exist' })
  } else {
    checks.push({ name: 'file_structure', status: 'fail', message: `File structure: ❌ Missing files: ${missing.join(', ')}` })
  }
}

// Check 4: Package Dependencies
function checkDependencies() {
  const packageJsonPath = join(process.cwd(), 'package.json')
  if (!existsSync(packageJsonPath)) {
    checks.push({ name: 'dependencies', status: 'fail', message: 'Dependencies: ❌ package.json not found' })
    return
  }
  
  try {
    const packageJson = require(packageJsonPath)
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies }
    
    const required = ['openai', '@supabase/supabase-js', 'next', 'react']
    const missing: string[] = []
    
    for (const dep of required) {
      if (!deps[dep]) {
        missing.push(dep)
      }
    }
    
    if (missing.length === 0) {
      checks.push({ name: 'dependencies', status: 'pass', message: 'Dependencies: ✅ All required packages installed' })
    } else {
      checks.push({ name: 'dependencies', status: 'fail', message: `Dependencies: ❌ Missing: ${missing.join(', ')}` })
    }
  } catch (error: any) {
    checks.push({ name: 'dependencies', status: 'fail', message: `Dependencies: ❌ Error checking: ${error.message}` })
  }
}

// Run all checks
async function runChecks() {
  console.log('🔍 Verifying Module 1 Setup...\n')
  
  checkEnvironmentVariables()
  checkFileStructure()
  checkDependencies()
  await checkDatabaseConnection()
  
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
    console.log('\n🎉 Module 1 setup is complete!')
    console.log('   You can now start the development server:')
    console.log('   npm run dev\n')
  } else {
    console.log('\n⚠️  Some checks failed. Please fix the issues above.\n')
  }
}

runChecks().catch(console.error)

