#!/usr/bin/env tsx
/**
 * Website Editor V1.5 Migration Script
 * 
 * Runs the database migration to add last_google_ping_at column
 * 
 * Usage: 
 *   tsx scripts/run-website-editor-migration.ts
 * 
 * Or set SUPABASE_DB_PASSWORD in .env.local:
 *   SUPABASE_DB_PASSWORD=your_database_password
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { Client } from 'pg'
import * as dotenv from 'dotenv'
import * as readline from 'readline'

// Load environment variables
dotenv.config({ path: join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const dbPassword = process.env.SUPABASE_DB_PASSWORD

// Extract project reference from URL
function getProjectRef(url: string): string | null {
  const match = url.match(/https?:\/\/([^.]+)\.supabase\.co/)
  return match ? match[1] : null
}

/**
 * Get database password from user if not in env
 */
function getPassword(): Promise<string> {
  return new Promise((resolve) => {
    if (dbPassword) {
      resolve(dbPassword)
      return
    }
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
    
    rl.question('Enter your Supabase database password (or set SUPABASE_DB_PASSWORD in .env.local): ', (answer) => {
      rl.close()
      resolve(answer)
    })
  })
}

/**
 * Create PostgreSQL connection string
 */
function getConnectionString(projectRef: string, password: string): string {
  return `postgresql://postgres.${projectRef}:${encodeURIComponent(password)}@db.${projectRef}.supabase.co:5432/postgres`
}

/**
 * Main migration function
 */
async function runMigration() {
  console.log('🚀 Starting Website Editor V1.5 migration...\n')
  
  if (!supabaseUrl) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL in .env.local')
    console.error('   Please add it to your .env.local file')
    process.exit(1)
  }
  
  const projectRef = getProjectRef(supabaseUrl)
  if (!projectRef) {
    console.error('❌ Could not extract project reference from Supabase URL')
    console.error(`   URL: ${supabaseUrl}`)
    process.exit(1)
  }
  
  const password = await getPassword()
  if (!password) {
    console.error('❌ Database password is required')
    process.exit(1)
  }
  
  const migrationPath = join(process.cwd(), 'scripts', 'website-editor-schema-update.sql')
  let sql: string
  
  try {
    sql = readFileSync(migrationPath, 'utf-8')
    console.log(`✅ Read migration file: ${migrationPath}\n`)
  } catch (error: any) {
    console.error(`❌ Failed to read migration file: ${error.message}`)
    process.exit(1)
  }
  
  const connectionString = getConnectionString(projectRef, password)
  const client = new Client({ connectionString })
  
  try {
    console.log('🔌 Connecting to database...')
    await client.connect()
    console.log('✅ Connected to database\n')
    
    console.log('📝 Running migration...\n')
    
    // Split SQL into statements (simple split by semicolon for this migration)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (!statement) continue
      
      try {
        console.log(`   Executing statement ${i + 1}/${statements.length}...`)
        await client.query(statement + ';')
        console.log(`   ✅ Success\n`)
      } catch (error: any) {
        // Ignore "already exists" errors
        if (error.message.includes('already exists') || 
            error.message.includes('duplicate') ||
            error.code === '42P07' || // duplicate_table
            error.code === '42710') {  // duplicate_object
          console.log(`   ⚠️  Skipped (already exists): ${error.message.split('\n')[0]}\n`)
        } else {
          console.error(`   ❌ Error: ${error.message}\n`)
          throw error
        }
      }
    }
    
    await client.end()
    console.log('🎉 Migration completed successfully!\n')
    console.log('✅ Added last_google_ping_at column to websites table')
    console.log('✅ Added index for last_google_ping_at\n')
    
  } catch (error: any) {
    console.error(`\n❌ Migration error: ${error.message}`)
    console.error('\n💡 Alternative: Run the SQL manually in Supabase Dashboard:')
    console.error('   1. Go to https://supabase.com/dashboard')
    console.error(`   2. Select your project`)
    console.error('   3. Navigate to SQL Editor')
    console.error('   4. Copy and paste the contents of scripts/website-editor-schema-update.sql')
    console.error('   5. Click "Run"\n')
    process.exit(1)
  }
}

// Run the migration
runMigration().catch(console.error)

