import { createClient } from '@supabase/supabase-js'
import { mockSupabase, mockSupabaseAdmin } from './mock-supabase'

// Check if we should use mock data for local development
// Priority: Explicit flag > Missing env vars
// If NEXT_PUBLIC_USE_MOCK_DATA=true, always use mock (even if Supabase env vars are set)
const useMockData = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true' || 
                   (process.env.NEXT_PUBLIC_USE_MOCK_DATA !== 'false' && 
                    (process.env.NEXT_PUBLIC_SUPABASE_URL === undefined || process.env.NEXT_PUBLIC_SUPABASE_URL === '' ||
                     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === undefined || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === ''))

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
