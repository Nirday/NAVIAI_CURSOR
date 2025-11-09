#!/usr/bin/env tsx
/**
 * Verify Supabase Connection
 * This script verifies that your Supabase credentials are correct
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { join } from 'path'

dotenv.config({ path: join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🔍 Verifying Supabase connection...\n')

if (!supabaseUrl) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL is not set in .env.local')
  process.exit(1)
}

if (!serviceRoleKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is not set in .env.local')
  process.exit(1)
}

console.log(`📡 Supabase URL: ${supabaseUrl}\n`)

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function verify() {
  try {
    // Try to query a table that might not exist yet
    const { data, error } = await supabase
      .from('business_profiles')
      .select('count')
      .limit(0)
    
    if (error) {
      if (error.code === 'PGRST116') {
        console.log('✅ Connection successful!')
        console.log('   (Table does not exist yet - this is expected before running the schema)\n')
        console.log('📋 Next steps:')
        console.log('   1. Go to: https://supabase.com/dashboard')
        console.log('   2. Log in to your Supabase account')
        console.log('   3. Find your project in the list')
        console.log('   4. Click on your project')
        console.log('   5. Go to SQL Editor → New query')
        console.log('   6. Copy and paste the contents of supabase-schema.sql')
        console.log('   7. Click Run\n')
        return
      } else {
        console.error(`❌ Connection error: ${error.message}`)
        console.error(`   Code: ${error.code}\n`)
        return
      }
    }
    
    console.log('✅ Connection successful!')
    console.log('   Database is accessible.\n')
    
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}\n`)
  }
}

verify()

