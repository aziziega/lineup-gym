'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  UserCheck,
  Users,
  Package,
  CalendarDays,
  Wallet,
  Bell,
  LogOut,
  Phone,
  MapPin,
  X,
  Star,
} from 'lucide-react'
import { GYM_INFO } from '@/lib/constants'
import { useQuery } from '@tanstack/react-query'
import { GYM_ID } from '@/lib/constants'

const navItems = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Check-In', href: '/dashboard/checkin', icon: UserCheck },
  { 
    label: 'Member', 
    href: '/dashboard/members', 
    icon: Users,
    subItems: [
      { label: 'Semua Tipe', href: '/dashboard/members?type=all' },
      { label: 'Member Reguler', href: '/dashboard/members?type=regular' },
      { label: 'Member PT', href: '/dashboard/members?type=pt' },
      { label: 'Pengunjung Harian', href: '/dashboard/members?type=visitor' },
    ]
  },
  { label: 'Paket', href: '/dashboard/packages', icon: Package },
  { label: 'Jadwal PT', href: '/dashboard/schedule', icon: CalendarDays },
  { label: 'Keuangan', href: '/dashboard/finance', icon: Wallet },
  { label: 'Expiry', href: '/dashboard/expiry', icon: Bell },
]

function SidebarNav({ onClose, criticalCount }: { onClose?: () => void, criticalCount?: number | null }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const isActive = (href: string) => {
    const basePath = href.split('?')[0]
    if (basePath === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(basePath)
  }

  return (
    <nav className="mt-4 flex-1 space-y-1.5 px-3">
      {navItems.map((item) => {
        const active = isActive(item.href)
        return (
          <div key={item.label} className="space-y-1">
            <Link
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                active
                  ? 'border-l-[3px] border-[#FF2A2A] bg-[#FF2A2A]/10 text-[#FF2A2A]'
                  : 'border-l-[3px] border-transparent text-[#888] hover:bg-[#1A1A1A] hover:text-white'
              )}
            >
              <item.icon className={cn('h-[18px] w-[18px]', active && 'text-[#FF2A2A]')} />
              <span>{item.label}</span>
              {/* Badge merah untuk Expiry */}
              {item.href.startsWith('/dashboard/expiry') && criticalCount && criticalCount > 0 && (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                  {criticalCount}
                </span>
              )}
            </Link>

            {/* Sub Items (Only shown if parent is active) */}
            {item.subItems && active && (
              <div className="ml-9 mt-1 flex flex-col gap-1 border-l border-[#2A2A2A] pl-4">
                {item.subItems.map((sub) => {
                  const currentType = searchParams.get('type') || 'all'
                  const subType = sub.href.split('type=')[1] || 'all'
                  const isSubActive = currentType === subType

                  return (
                    <Link
                      key={sub.label}
                      href={sub.href}
                      className={cn(
                        'block py-1.5 text-[11px] font-medium transition-colors',
                        isSubActive ? 'text-[#D4FF00]' : 'text-[#888] hover:text-white'
                      )}
                    >
                      {sub.label}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const router = useRouter()
  const supabase = createClient()

  // Hitung member kritis untuk badge
  const { data: criticalCount } = useQuery({
    queryKey: ['critical-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('active_subscriptions_view')
        .select('*', { count: 'exact', head: true })
        .lte('days_remaining', 7)
        .eq('gym_id', GYM_ID)
      return count ?? 0
    },
  })

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="flex h-full w-full flex-col border-r border-[#2A2A2A] bg-[#111]">
      {/* Header: Logo */}
      <div className="flex items-center justify-between px-5 pb-2 pt-5">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <img src="/logo.jpg" alt="Logo" className="w-10 h-10 rounded-full object-cover border border-[#FF2A2A]" />
            <h1 className="font-heading text-[24px] leading-none tracking-tight">
              <span className="text-[#FF2A2A]">LINE UP</span>{' '}
              <span className="text-white">GYM</span>
            </h1>
          </div>
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-[#D4FF00] text-[#D4FF00]" />
            <span className="text-xs text-[#888]">{GYM_INFO.RATING} · Prambanan</span>
          </div>
        </div>
        {/* Tombol close hanya di mobile */}
        {onClose && (
          <button onClick={onClose} className="rounded-lg p-1.5 text-[#888] hover:bg-[#1A1A1A] hover:text-white lg:hidden">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <Suspense fallback={<div className="mt-4 flex-1 px-3" />}>
        <SidebarNav onClose={onClose} criticalCount={criticalCount} />
      </Suspense>

      {/* Footer */}
      <div className="border-t border-[#2A2A2A] px-4 py-4">
        {/* Info kontak */}
        <div className="mb-3 space-y-1.5 text-[11px] text-[#555]">
          <div className="flex items-start gap-1.5">
            <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
            <span>Prambanan, Klaten</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Phone className="h-3 w-3 shrink-0" />
            <a
              href="https://wa.me/6285647618646"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-[#FF2A2A]"
            >
              {GYM_INFO.PHONE}
            </a>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#888] transition-colors hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          <span>Keluar</span>
        </button>

        <p className="mt-3 text-center text-[10px] text-[#333]">
          © {new Date().getFullYear()} {GYM_INFO.NAME}
        </p>
      </div>
    </div>
  )
}
