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
    <aside className="fixed left-0 top-0 h-full w-72 bg-gradient-to-b from-purple-500 via-pink-500 to-orange-400 text-white flex flex-col shadow-2xl">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-yellow-300 rounded-full opacity-20 blur-3xl animate-pulse"></div>
        <div className="absolute top-1/3 -left-16 w-48 h-48 bg-cyan-300 rounded-full opacity-20 blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-green-300 rounded-full opacity-20 blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Header with cute mascot */}
      <div className="relative p-6 border-b border-white/20">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-3xl shadow-lg animate-bounce" style={{ animationDuration: '2s' }}>
            🤖
          </div>
          <div>
            <h1 className="text-2xl font-bold">Navi AI</h1>
            <p className="text-sm text-white/80">Your friendly helper</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="relative flex-1 p-4 overflow-y-auto">
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
                    flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 transform hover:scale-105
                    ${isActive
                      ? 'bg-white text-purple-600 shadow-lg font-semibold'
                      : 'text-white/90 hover:bg-white/20 hover:text-white backdrop-blur-sm'
                    }
                  `}
                >
                  <span className="text-2xl">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer with user info and sign out */}
      <div className="relative p-4 border-t border-white/20 space-y-2">
        {userEmail && (
          <div className="px-4 py-2 text-sm text-white/80 bg-white/10 rounded-xl backdrop-blur-sm">
            {userEmail}
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-white bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-all duration-200 transform hover:scale-105 font-medium"
        >
          <span className="text-xl">🚪</span>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}

