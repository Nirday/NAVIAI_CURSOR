import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getUserRole, UserRole } from '@/libs/admin-center/src/data'
import AdminSidebar from './components/AdminSidebar'

/**
 * Admin Layout with Server-Side Auth Guard
 * Checks authentication and role before rendering admin pages
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get cookies for server-side session
  const cookieStore = await cookies()
  
  // Create Supabase client for server-side auth
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )

  // Get current session
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Check if user is authenticated
  if (!session?.user) {
    redirect('/dashboard?error=unauthorized')
  }

  const userId = session.user.id
  
  // Try to get role from JWT custom claim (app_metadata.role)
  let role: UserRole = 'user'
  const appMetadata = session.user.app_metadata as any
  if (appMetadata?.role && ['user', 'admin', 'super_admin'].includes(appMetadata.role)) {
    role = appMetadata.role as UserRole
  } else {
    // Fallback to database if JWT doesn't have role
    role = await getUserRole(userId)
  }

  // Check if user has admin or super_admin role
  if (role !== 'admin' && role !== 'super_admin') {
    // Redirect non-admin users to dashboard with message
    redirect('/dashboard?admin_required=true')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar role={role} />
      <main className="flex-1 ml-64">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  )
}

