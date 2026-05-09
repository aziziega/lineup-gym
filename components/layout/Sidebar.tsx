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
  Settings,
  ArrowUpCircle,
  CheckCircle2,
  FileSpreadsheet,
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

function UpgradeModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-background border border-border shadow-2xl">
        <div className="absolute top-0 right-0 p-4 z-10">
          <button onClick={onClose} className="rounded-full bg-background/40 p-2 text-foreground/70 hover:bg-background/60 hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Header Image/Pattern Area */}
        <div className="h-32 bg-gradient-to-br from-[#FF2A2A]/20 to-[#9D00FF]/20 relative overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <ArrowUpCircle className="h-16 w-16 text-foreground drop-shadow-lg" />
        </div>

        <div className="p-6 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-foreground tracking-tight">Upgrade ke Dashboard V2</h2>
            <p className="text-sm text-muted-foreground">Tingkatkan performa gym Anda dengan fitur eksklusif di versi terbaru.</p>
          </div>

          <div className="space-y-3">
            {[
              "Integrasi Kirim Notifikasi WhatsApp Otomatis",
              "Pendaftaran Member Full-Digital (Paperless)",
              "Integrasi Barcode/QR Check-In Setiap Member",
              "Promo Otomatis setiap Member Ulang Tahun",
              "Catatan Progress & Latihan Member (Mobile/Desktop)",
              "Multi-Coach PT Support",
              "Domain lineupgym.com atau lineupgym.fitness",
              "Akun Khusus Staff (Keamanan Data)"
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-accent shrink-0" />
                <span className="text-sm text-gray-200">{feature}</span>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground text-center mb-3">Hubungi Developer untuk konsultasi dan upgrade:</p>
            <a
              href="https://wa.me/6282153608914"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 bg-primary hover:bg-primary/90 text-foreground font-medium rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Phone className="h-4 w-4" />
              0821-5360-8914 (Azizi)
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'

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
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-accent text-accent" />
            <span className="text-xs text-sidebar-foreground/60">{GYM_INFO.RATING} · Prambanan</span>
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
