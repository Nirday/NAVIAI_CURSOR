#!/usr/bin/env tsx
/**
 * Module 6: Communication & Automation Hub Setup Verification
 * Verifies that all requirements for Module 6 are met
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
    
    // Check if Module 6 tables exist
    const coreTables = [
      'communication_settings',
      'audiences',
      'broadcasts',
      'automation_sequences',
      'automation_steps',
      'automation_contact_progress'
    ]
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
      checks.push({ name: 'database_tables', status: 'pass', message: `Database tables: ✅ All ${coreTables.length} tables exist` })
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
    'libs/communication-hub/src/composer.ts',
    'libs/communication-hub/src/engine.ts',
    'libs/communication-hub/src/email_service.ts',
    'libs/communication-hub/src/sms_service.ts',
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
  // Module 6 uses Resend for emails
  const resendKey = process.env.RESEND_API_KEY
  if (resendKey && resendKey !== '***' && resendKey.length > 0) {
    checks.push({ name: 'env_resend', status: 'pass', message: 'Resend API Key: ✅ Set (required for email broadcasts)' })
  } else {
    checks.push({ name: 'env_resend', status: 'fail', message: 'Resend API Key: ❌ Missing (required for email)' })
  }
  
  // Twilio for SMS (optional)
  const twilioSid = process.env.TWILIO_ACCOUNT_SID
  const twilioToken = process.env.TWILIO_AUTH_TOKEN
  if (twilioSid && twilioToken && twilioSid !== '***' && twilioToken !== '***') {
    checks.push({ name: 'env_twilio', status: 'pass', message: 'Twilio Credentials: ✅ Set (for SMS broadcasts)' })
  } else {
    checks.push({ name: 'env_twilio', status: 'warning', message: 'Twilio Credentials: ⚠️  Not set (SMS functionality will be limited)' })
  }
  
  // OpenAI for content generation
  const openaiKey = process.env.OPENAI_API_KEY
  if (openaiKey && openaiKey !== '***' && openaiKey.length > 0) {
    checks.push({ name: 'env_openai', status: 'pass', message: 'OpenAI API Key: ✅ Set (for AI content generation)' })
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
    
    // Module 6 uses Resend, Twilio, OpenAI
    const required = ['resend', 'openai']
    const optional = ['twilio']
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
  console.log('🔍 Verifying Module 6: Communication & Automation Hub Setup...\n')
  
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
    console.log('\n🎉 Module 6 setup is complete!')
  } else {
    console.log('\n⚠️  Some checks failed. Please fix the issues above.\n')
  }
}

runChecks().catch(console.error)

