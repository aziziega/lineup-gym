'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { useState } from 'react'
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
  Settings,
  ArrowUpCircle,
  CheckCircle2,
  FileSpreadsheet,
  Globe,
  BarChart3,
} from 'lucide-react'
import { GYM_INFO } from '@/lib/constants'
import { useQuery } from '@tanstack/react-query'
import { GYM_ID } from '@/lib/constants'

interface NavItem {
  label: string
  href: string
  icon: any
  subItems?: { label: string; href: string }[]
  isUpgrade?: boolean
  isPro?: boolean
}

interface NavGroup {
  title: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    title: 'UTAMA',
    items: [
      { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Check-In', href: '/dashboard/checkin', icon: UserCheck },
      {
        label: 'Member',
        href: '/dashboard/members?type=regular',
        icon: Users,
        subItems: [
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
  },
  {
    title: 'BISNIS',
    items: [
      { label: 'Halaman Publik', href: '/dashboard/formulir', icon: Globe, isPro: true },
      { label: 'Analisis Lengkap', href: '/dashboard/analysis', icon: BarChart3, isPro: true },
    ]
  },
  {
    title: 'PENGATURAN',
    items: [
      { label: 'Import Excel', href: '/dashboard/import', icon: FileSpreadsheet },
      { label: 'Pengaturan', href: '/dashboard/settings', icon: Settings },
      { label: 'Upgrade Web ke-V2', href: '#', icon: ArrowUpCircle, isUpgrade: true },
    ]
  }
]

function SidebarNav({ onClose, criticalCount, onOpenUpgrade }: { onClose?: () => void, criticalCount?: number | null, onOpenUpgrade: () => void }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const isActive = (href: string) => {
    if (href === '#') return false
    const basePath = href.split('?')[0]
    if (basePath === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(basePath)
  }

  return (
    <nav className="mt-4 flex-1 space-y-6 px-3 overflow-y-auto">
      {navGroups.map((group) => (
        <div key={group.title} className="space-y-1.5">
          <h4 className="px-3 text-[10px] font-bold text-sidebar-foreground/40 tracking-wider mb-2">
            {group.title}
          </h4>
          {group.items.map((item) => {
            const active = isActive(item.href)

            if (item.isUpgrade) {
              return (
                <div key={item.label} className="space-y-1">
                  <button
                    onClick={onOpenUpgrade}
                    className="w-full group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 border-l-[3px] border-transparent text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  >
                    <item.icon className="h-[18px] w-[18px]" />
                    <span>{item.label}</span>
                  </button>
                </div>
              )
            }

            return (
              <div key={item.label} className="space-y-1">
                <Link
                  href={item.href}
                  className={cn(
                    'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                    active
                      ? 'border-l-[3px] border-primary bg-primary/10 text-primary'
                      : 'border-l-[3px] border-transparent text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  )}
                >
                  <item.icon className={cn('h-[18px] w-[18px]', active && 'text-primary')} />
                  <span>{item.label}</span>
                  
                  {/* Badge V2 untuk Fitur Masa Depan */}
                  {item.isPro && (
                    <span className="ml-auto flex items-center justify-center rounded bg-red-500/10 px-1.5 py-0.5 text-[9px] font-bold text-red-500">
                      V2
                    </span>
                  )}

                  {/* Badge merah untuk Expiry */}
                  {item.href.startsWith('/dashboard/expiry') && criticalCount && criticalCount > 0 && (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-foreground">
                      {criticalCount}
                    </span>
                  )}
                </Link>

                {/* Sub Items (Only shown if parent is active) */}
                {item.subItems && active && (
                  <div className="ml-9 mt-1 flex flex-col gap-1 border-l border-border pl-4">
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
                            isSubActive ? 'text-accent' : 'text-sidebar-foreground/60 hover:text-sidebar-foreground'
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
        </div>
      ))}
    </nav>
  )
}

import { UpgradeModal } from './UpgradeModal'

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const router = useRouter()
  const supabase = createClient()
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false)

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

  const { data: logoUrl } = useQuery({
    queryKey: ['gym-logo'],
    queryFn: async () => {
      const { data } = await supabase
        .from('settings')
        .select('logo_url')
        .eq('id', GYM_ID)
        .single()
      return data?.logo_url || '/logo.jpg'
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="flex h-full w-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      {/* Header: Logo */}
      <div className="flex items-center justify-between px-5 pb-2 pt-5">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <img
              src={logoUrl || '/logo.jpg'}
              alt="Logo"
              className="w-10 h-10 rounded-full object-cover border border-[#FF2A2A]"
            />
            <h1 className="font-heading text-[24px] leading-none tracking-tight">
              <span className="text-primary">LINE UP</span>{' '}
              <span className="text-foreground">GYM</span>
            </h1>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-sidebar-foreground/30 tracking-wider">DASHBOARD V1.2</span>
              <button 
                onClick={() => setIsUpgradeModalOpen(true)}
                className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary hover:bg-primary/20 transition-colors"
              >
                UPGRADE KE V2
              </button>
            </div>
            <p className="text-[9px] text-sidebar-foreground/20 uppercase tracking-tighter font-medium">
              LAST UPDATE: 13 MEI, 05:38 WIB
            </p>
          </div>
        </div>
        {/* Tombol close hanya di mobile */}
        {onClose && (
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-card hover:text-foreground lg:hidden">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <Suspense fallback={<div className="mt-4 flex-1 px-3" />}>
        <SidebarNav onClose={onClose} criticalCount={criticalCount} onOpenUpgrade={() => setIsUpgradeModalOpen(true)} />
      </Suspense>

      {/* Footer */}
      <div className="border-t border-border px-4 py-4">
        {/* Info kontak Developer */}
        <div className="mb-3 space-y-2 text-[11px] text-muted-foreground/60">
          <p className="px-1 text-[10px] text-[#444] leading-relaxed">
            Butuh bantuan? Laporkan jika ada masalah langsung ke WhatsApp saya:
          </p>
          <div className="flex items-center gap-1.5 px-1">
            <Phone className="h-3 w-3 shrink-0" />
            <a
              href="https://wa.me/6282153608914"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium transition-colors hover:text-primary"
            >
              0821-5360-8914 (Azizi)
            </a>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          <span>Keluar</span>
        </button>

        <p className="mt-3 text-center text-[10px] text-sidebar-foreground/20">
          © {new Date().getFullYear()} {GYM_INFO.NAME}
        </p>
      </div>

      <UpgradeModal isOpen={isUpgradeModalOpen} onClose={() => setIsUpgradeModalOpen(false)} />
    </div>
  )
}
