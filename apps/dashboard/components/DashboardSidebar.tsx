"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'

interface NavItem {
  label: string
  href: string
  icon: string
}

const navItems: NavItem[] = [
  { label: 'Chat', href: '/dashboard', icon: '💬' },
  { label: 'Website', href: '/dashboard/website', icon: '🌐' },
  { label: 'Content', href: '/dashboard/content', icon: '📝' },
  { label: 'SEO', href: '/dashboard/seo', icon: '📈' },
  { label: 'Social', href: '/dashboard/social', icon: '📱' },
  { label: 'Contacts', href: '/dashboard/contacts', icon: '👥' },
  { label: 'Reputation', href: '/dashboard/reputation', icon: '⭐' },
  { label: 'Billing', href: '/dashboard/billing', icon: '💳' }
]

export default function DashboardSidebar() {
  const pathname = usePathname()
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.email) {
        setUserEmail(session.user.email)
      }
    }
    fetchUser()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-xl font-bold">Navi AI</h1>
        <p className="text-sm text-gray-400 mt-1">Dashboard</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-2">
          {navItems.map((item) => {
            // Special handling for Chat - active on both /dashboard and /dashboard/chat
            const isActive = item.href === '/dashboard' 
              ? (pathname === '/dashboard' || pathname === '/dashboard/chat')
              : (pathname === item.href || pathname?.startsWith(item.href + '/'))
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                    ${isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }
                  `}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer with user info and sign out */}
      <div className="p-4 border-t border-gray-800 space-y-2">
        {userEmail && (
          <div className="px-4 py-2 text-sm text-gray-400">
            {userEmail}
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <span>🚪</span>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}

