import { createClient } from '@supabase/supabase-js'
import { mockSupabase, mockSupabaseAdmin } from './mock-supabase'

// TEMPORARY: Force mock mode ON until Supabase is properly configured
// TODO: Remove this hardcode when ready to use real Supabase
const useMockData = true

if (useMockData && process.env.NODE_ENV !== 'production') {
  console.log('🔧 Using mock Supabase client for local development')
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-key'

export const supabase = useMockData 
  ? (mockSupabase as any)
  : createClient(supabaseUrl, supabaseAnonKey)

// Server-side client with service role key for admin operations
export const supabaseAdmin = useMockData
  ? (mockSupabaseAdmin as any)
  : createClient(
      supabaseUrl,
      process.env.SUPABASE_SERVICE_ROLE_KEY || 'mock-service-key',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
