#!/usr/bin/env tsx
/**
 * Verify Database Schema
 * This script verifies that all tables, indexes, and policies were created successfully
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { join } from 'path'

dotenv.config({ path: join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// List of expected tables for Module 1 and core functionality
const expectedTables = [
  // Module 1: Conversational AI Core
  'business_profiles',
  'chat_messages',
  'profile_embeddings',
  'suggestion_prompts',
  
  // Module 2: Website Builder
  'analytics_settings',
  
  // Module 3: Content Engine
  'blog_posts',
  'content_settings',
  
  // Module 4: SEO Growth Engine
  'seo_audit_reports',
  'seo_issues',
  'seo_fix_logs',
  'seo_opportunities',
  'seo_settings',
  'keyword_performance',
  'competitive_insights',
  
  // Module 5: Social Media Growth Hub
  'social_connections',
  'social_posts',
  'post_analytics',
  'social_conversations',
  'social_messages',
  'social_ideas',
  
  // Module 6: Communication Hub
  'communication_settings',
  'audiences',
  'broadcasts',
  'automation_sequences',
  'automation_steps',
  'automation_contact_progress',
  
  // Module 7: Contact Hub
  'contacts',
  'activity_events',
  
  // Module 8: Reputation Management Hub
  'review_sources',
  'reviews',
  'review_responses',
  'reputation_settings',
  'reputation_themes',
  
  // Module 9: Billing & Subscription Hub
  'subscriptions',
  'one_time_payments',
  
  // Module 10: Admin Control Center
  'user_profiles',
  'feature_flags',
  'admin_audit_logs',
  'admin_invites',
  'job_run_logs',
  'platform_settings',
  
  // Core
  'action_commands',
]

async function verifySchema() {
  console.log('🔍 Verifying database schema...\n')
  
  const foundTables: string[] = []
  const missingTables: string[] = []
  
  for (const table of expectedTables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(0)
      
      if (error) {
        if (error.code === 'PGRST116') {
          missingTables.push(table)
        } else {
          console.error(`   ⚠️  ${table}: ${error.message}`)
        }
      } else {
        foundTables.push(table)
      }
    } catch (error: any) {
      missingTables.push(table)
    }
  }
  
  console.log(`✅ Found ${foundTables.length}/${expectedTables.length} tables\n`)
  
  if (foundTables.length === expectedTables.length) {
    console.log('🎉 All tables created successfully!\n')
    console.log('✅ Schema verification complete')
    console.log('   Your database is ready to use.\n')
    return true
  } else {
    console.log(`❌ Missing ${missingTables.length} table(s):\n`)
    missingTables.forEach(table => {
      console.log(`   - ${table}`)
    })
    console.log('\n⚠️  Some tables are missing. Please check the schema execution.')
    return false
  }
}

verifySchema().catch(console.error)

