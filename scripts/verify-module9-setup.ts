#!/usr/bin/env tsx
/**
 * Module 9: Billing & Subscription Hub Setup Verification
 * Verifies that all requirements for Module 9 are met
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
    
    // Check if Module 9 tables exist
    const coreTables = ['subscriptions', 'one_time_payments']
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
    'libs/billing-hub/src/data.ts',
    'libs/billing-hub/src/config/entitlements.ts',
    'app/api/billing/create-checkout-session/route.ts',
    'app/api/billing/webhook/route.ts',
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
  // Module 9 uses Stripe
  const stripeSecret = process.env.STRIPE_SECRET_KEY
  const stripePublishable = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY
  const stripeWebhook = process.env.STRIPE_WEBHOOK_SECRET
  
  // Note: For client-side Stripe, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is preferred
  // but STRIPE_PUBLISHABLE_KEY will work for server-side only
  
  if (stripeSecret && stripeSecret !== '***' && stripeSecret.length > 0) {
    checks.push({ name: 'env_stripe_secret', status: 'pass', message: 'Stripe Secret Key: ✅ Set' })
  } else {
    checks.push({ name: 'env_stripe_secret', status: 'fail', message: 'Stripe Secret Key: ❌ Missing (required)' })
  }
  
  if (stripePublishable && stripePublishable !== '***' && stripePublishable.length > 0) {
    checks.push({ name: 'env_stripe_publishable', status: 'pass', message: 'Stripe Publishable Key: ✅ Set' })
  } else {
    checks.push({ name: 'env_stripe_publishable', status: 'fail', message: 'Stripe Publishable Key: ❌ Missing (required)' })
  }
  
  if (stripeWebhook && stripeWebhook !== '***' && stripeWebhook.length > 0) {
    checks.push({ name: 'env_stripe_webhook', status: 'pass', message: 'Stripe Webhook Secret: ✅ Set' })
  } else {
    checks.push({ name: 'env_stripe_webhook', status: 'warning', message: 'Stripe Webhook Secret: ⚠️  Not set (webhook verification will fail)' })
  }
  
  // Resend for dunning emails
  const resendKey = process.env.RESEND_API_KEY
  if (resendKey && resendKey !== '***' && resendKey.length > 0) {
    checks.push({ name: 'env_resend', status: 'pass', message: 'Resend API Key: ✅ Set (for dunning emails)' })
  } else {
    checks.push({ name: 'env_resend', status: 'warning', message: 'Resend API Key: ⚠️  Not set (dunning emails will fail)' })
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
    
    // Module 9 uses Stripe
    const required = ['stripe']
    const optional: string[] = []
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
  console.log('🔍 Verifying Module 9: Billing & Subscription Hub Setup...\n')
  
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
    console.log('\n🎉 Module 9 setup is complete!')
  } else {
    console.log('\n⚠️  Some checks failed. Please fix the issues above.\n')
  }
}

runChecks().catch(console.error)

