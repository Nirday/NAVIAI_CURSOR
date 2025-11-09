"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItem {
  label: string
  href: string
  icon: string
}

const navItems: NavItem[] = [
  { label: 'Chat', href: '/dashboard', icon: '💬' },
  { label: 'Website', href: '/dashboard/website', icon: '🌐' }, // V1.5: New
  { label: 'Content', href: '/dashboard/content', icon: '📝' },
  { label: 'SEO', href: '/dashboard/seo', icon: '📈' },
  { label: 'Social', href: '/dashboard/social', icon: '📱' },
  { label: 'Contacts', href: '/dashboard/contacts', icon: '👥' },
  { label: 'Reputation', href: '/dashboard/reputation', icon: '⭐' },
  { label: 'Billing', href: '/dashboard/billing', icon: '💳' }
]

export default function DashboardNavigation() {
  const pathname = usePathname()

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center gap-6">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

