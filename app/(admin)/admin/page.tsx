import { redirect } from 'next/navigation'

/**
 * Admin Entry Point
 * Redirects to admin dashboard
 */
export default function AdminPage() {
  redirect('/admin/dashboard')
}

