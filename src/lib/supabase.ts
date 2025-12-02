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
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Validate that we have the service role key in production
if (!useMockData && !serviceRoleKey) {
  console.error('⚠️ SUPABASE_SERVICE_ROLE_KEY is not set. Admin operations will fail.')
}

export const supabaseAdmin = useMockData
  ? (mockSupabaseAdmin as any)
  : (() => {
      try {
        const client = createClient(
          supabaseUrl,
          serviceRoleKey || 'mock-service-key',
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false
            }
          }
        )
        
        // Verify the client is properly initialized
        if (!client || typeof client.from !== 'function') {
          throw new Error('Failed to initialize Supabase admin client')
        }
        
        return client
      } catch (error) {
        console.error('Failed to create Supabase admin client:', error)
        // Fall back to mock in case of initialization failure
        console.warn('Falling back to mock Supabase admin client')
        return mockSupabaseAdmin as any
      }
    })()
