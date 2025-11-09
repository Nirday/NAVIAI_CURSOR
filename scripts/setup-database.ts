#!/usr/bin/env tsx
/**
 * Database Setup Script
 * 
 * This script sets up the database schema by executing SQL statements
 * against Supabase using a direct PostgreSQL connection.
 * 
 * Usage: 
 *   tsx scripts/setup-database.ts
 * 
 * Or set SUPABASE_DB_PASSWORD in .env.local:
 *   SUPABASE_DB_PASSWORD=your_database_password
 */

import { readFileSync, writeFileSync } from 'fs'
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
  // Use the direct connection (port 5432) for schema execution
  // Format: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
  // Try multiple connection formats
  const formats = [
    `postgresql://postgres.${projectRef}:${encodeURIComponent(password)}@db.${projectRef}.supabase.co:5432/postgres`,
    `postgresql://postgres:${encodeURIComponent(password)}@db.${projectRef}.supabase.co:5432/postgres`,
    `postgresql://postgres.${projectRef}:${encodeURIComponent(password)}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`
  ]
  return formats[0] // Try the first format first
}

/**
 * Execute SQL statements
 */
async function executeSQL(client: Client, sql: string): Promise<void> {
  try {
    await client.query(sql)
  } catch (error: any) {
    // Ignore "already exists" errors for extensions and objects
    if (error.message.includes('already exists') || 
        error.message.includes('duplicate key') ||
        error.code === '42P07' || // duplicate_table
        error.code === '42710') {  // duplicate_object
      console.log(`   ⚠️  Skipped (already exists): ${error.message.split('\n')[0]}`)
      return
    }
    throw error
  }
}

/**
 * Split SQL into executable statements
 */
function splitSQLStatements(sql: string): string[] {
  // Remove single-line comments
  sql = sql.replace(/--.*$/gm, '')
  
  // Split by semicolons, handling strings and dollar-quoted strings
  const statements: string[] = []
  let current = ''
  let inString = false
  let stringChar = ''
  let dollarTag = ''
  let inDollarQuote = false
  
  for (let i = 0; i < sql.length; i++) {
    const char = sql[i]
    const prevChar = i > 0 ? sql[i - 1] : ''
    
    // Handle dollar-quoted strings (e.g., $$...$$, $tag$...$tag$)
    if (!inString && char === '$' && !inDollarQuote) {
      // Check if this starts a dollar quote
      let tag = '$'
      let j = i + 1
      while (j < sql.length && sql[j] !== '$') {
        tag += sql[j]
        j++
      }
      if (j < sql.length) {
        tag += '$'
        dollarTag = tag
        inDollarQuote = true
        current += tag
        i = j
        continue
      }
    } else if (inDollarQuote && sql.substring(i, i + dollarTag.length) === dollarTag) {
      current += dollarTag
      i += dollarTag.length - 1
      dollarTag = ''
      inDollarQuote = false
      continue
    }
    
    if (inDollarQuote) {
      current += char
      continue
    }
    
    // Handle regular strings
    if ((char === "'" || char === '"') && prevChar !== '\\') {
      if (!inString) {
        inString = true
        stringChar = char
      } else if (char === stringChar) {
        inString = false
        stringChar = ''
      }
    }
    
    current += char
    
    // Split on semicolon if not in string
    if (!inString && !inDollarQuote && char === ';') {
      const trimmed = current.trim()
      if (trimmed && trimmed !== ';' && trimmed.length > 2) {
        statements.push(trimmed)
      }
      current = ''
    }
  }
  
  // Add remaining statement
  const trimmed = current.trim()
  if (trimmed && trimmed !== ';' && trimmed.length > 2) {
    statements.push(trimmed)
  }
  
  return statements.filter(s => s.length > 0)
}

/**
 * Main setup function
 */
async function setupDatabase() {
  console.log('🚀 Starting database setup...\n')
  
  if (!supabaseUrl) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL in .env.local')
    process.exit(1)
  }
  
  const projectRef = getProjectRef(supabaseUrl)
  if (!projectRef) {
    console.error('❌ Could not extract project reference from Supabase URL')
    process.exit(1)
  }
  
  const password = await getPassword()
  if (!password) {
    console.error('❌ Database password is required')
    process.exit(1)
  }
  
  const schemaPath = join(process.cwd(), 'supabase-schema.sql')
  let sql: string
  
  try {
    sql = readFileSync(schemaPath, 'utf-8')
    console.log(`✅ Read schema file: ${schemaPath}\n`)
  } catch (error: any) {
    console.error(`❌ Failed to read schema file: ${error.message}`)
    process.exit(1)
  }
  
  const statements = splitSQLStatements(sql)
  console.log(`📊 Found ${statements.length} SQL statements to execute\n`)
  
  const connectionString = getConnectionString(projectRef, password)
  const client = new Client({ connectionString })
  
  try {
    console.log('🔌 Connecting to database...')
    await client.connect()
    console.log('✅ Connected to database\n')
    
    console.log('📝 Executing schema...\n')
    let successCount = 0
    let skippedCount = 0
    let errorCount = 0
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      const statementType = statement.substring(0, 30).replace(/\s+/g, ' ')
      
      try {
        await executeSQL(client, statement)
        successCount++
        if ((i + 1) % 10 === 0) {
          process.stdout.write(`   Progress: ${i + 1}/${statements.length}\r`)
        }
      } catch (error: any) {
        if (error.message.includes('already exists') || 
            error.message.includes('duplicate')) {
          skippedCount++
        } else {
          errorCount++
          console.error(`\n❌ Error executing statement ${i + 1}:`)
          console.error(`   ${statementType}...`)
          console.error(`   ${error.message}\n`)
        }
      }
    }
    
    console.log(`\n✅ Schema execution complete!\n`)
    console.log(`   ✅ Successful: ${successCount}`)
    console.log(`   ⚠️  Skipped (already exists): ${skippedCount}`)
    if (errorCount > 0) {
      console.log(`   ❌ Errors: ${errorCount}`)
    }
    
    await client.end()
    console.log('\n🎉 Database setup completed successfully!\n')
    
  } catch (error: any) {
    console.error(`\n❌ Database connection error: ${error.message}`)
    console.error('\n💡 Alternative: Run the SQL manually in Supabase Dashboard:')
    console.error('   1. Go to https://supabase.com/dashboard')
    console.error(`   2. Select your project`)
    console.error('   3. Navigate to SQL Editor')
    console.error('   4. Copy and paste the contents of supabase-schema.sql')
    console.error('   5. Click "Run"\n')
    process.exit(1)
  }
}

// Run the setup
setupDatabase().catch(console.error)

