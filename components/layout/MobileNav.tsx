'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  UserCheck,
  Users,
  Wallet,
  Bell,
} from 'lucide-react'

const navItems = [
  { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Check-In', href: '/dashboard/checkin', icon: UserCheck },
  { label: 'Member', href: '/dashboard/members', icon: Users },
  { label: 'Uang', href: '/dashboard/finance', icon: Wallet },
  { label: 'Expiry', href: '/dashboard/expiry', icon: Bell },
]

export default function MobileNav() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#2A2A2A] bg-[#111]/95 backdrop-blur-md lg:hidden">
      <div className="flex items-center justify-around px-1 pb-[env(safe-area-inset-bottom)] pt-1">
        {navItems.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 rounded-lg px-3 py-2 text-[10px] font-medium transition-colors',
                active
                  ? 'text-[#FF2A2A]'
                  : 'text-[#666] active:text-[#999]'
              )}
            >
              <item.icon className={cn('h-5 w-5', active && 'text-[#FF2A2A]')} />
              <span>{item.label}</span>
              {/* dot indicator aktif */}
              {active && (
                <div className="h-1 w-1 rounded-full bg-[#FF2A2A]" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
