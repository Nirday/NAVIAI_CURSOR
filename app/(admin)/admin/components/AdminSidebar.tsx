'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserRole } from '@/libs/admin-center/src/types'

interface AdminSidebarProps {
  role: UserRole
}

interface NavItem {
  label: string
  href: string
  icon?: string
  roles: UserRole[] // Which roles can see this item
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/admin/dashboard',
    icon: '📊',
    roles: ['admin', 'super_admin']
  },
  {
    label: 'User Management',
    href: '/admin/users',
    icon: '👥',
    roles: ['admin', 'super_admin']
  },
  {
    label: 'Feature Flags',
    href: '/admin/feature-flags',
    icon: '🚩',
    roles: ['admin', 'super_admin']
  },
  {
    label: 'SEO Opportunities',
    href: '/admin/seo-opportunities',
    icon: '🔍',
    roles: ['admin', 'super_admin']
  },
  {
    label: 'Audit Logs',
    href: '/admin/audit-logs',
    icon: '📝',
    roles: ['admin', 'super_admin']
  },
  // Super admin only items
  {
    label: 'Admin Management',
    href: '/admin/admins',
    icon: '👑',
    roles: ['super_admin']
  },
  {
    label: 'Platform Settings',
    href: '/admin/settings',
    icon: '⚙️',
    roles: ['super_admin']
  },
  {
    label: 'Admin Broadcasts',
    href: '/admin/broadcasts',
    icon: '📢',
    roles: ['super_admin']
  }
]

export default function AdminSidebar({ role }: AdminSidebarProps) {
  const pathname = usePathname()

  // Filter nav items based on role
  const visibleItems = navItems.filter(item => item.roles.includes(role))

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-gray-900 text-white flex flex-col">
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-xl font-bold">Admin Center</h1>
        <p className="text-sm text-gray-400 mt-1">
          {role === 'super_admin' ? 'Super Admin' : 'Admin'}
        </p>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-2">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
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
                  {item.icon && <span className="text-xl">{item.icon}</span>}
                  <span>{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-gray-800">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <span>←</span>
          <span>Back to Dashboard</span>
        </Link>
      </div>
    </aside>
  )
}

