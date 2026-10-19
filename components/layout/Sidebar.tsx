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
  Dumbbell,
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
  ShieldCheck,
  ChevronRight,
  User,
  BicepsFlexed,
  Ticket,
  CalendarClock,
  TrendingUp,
  UserCog,
  Activity,
  IdCard,
} from 'lucide-react'
import { GYM_INFO } from '@/lib/constants'
import { useQuery } from '@tanstack/react-query'
import { GYM_ID } from '@/lib/constants'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

interface SubNavItem {
  label: string
  href: string
  icon?: any
  isPro?: boolean
  isAdminOnly?: boolean
}

interface NavItem {
  label: string
  href: string
  icon: any
  subItems?: SubNavItem[]
  isUpgrade?: boolean
  isPro?: boolean
  isAdminOnly?: boolean
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
          { label: 'Member Reguler', href: '/dashboard/members?type=regular', icon: User },
          { label: 'Member PT', href: '/dashboard/members?type=pt', icon: BicepsFlexed },
          { label: 'Pengunjung Harian', href: '/dashboard/members?type=visitor', icon: Ticket },
        ]
      },
      { label: 'Paket', href: '/dashboard/packages', icon: Package },
      {
        label: 'Personal Trainer',
        href: '/dashboard/schedule',
        icon: Dumbbell,
        subItems: [
          { label: 'Jadwal Sesi', href: '/dashboard/schedule', icon: CalendarClock },
          { label: 'Progress & Tracking', href: '/dashboard/pt/progress', icon: TrendingUp },
          {
            label: 'Manajemen Staff PT',
            href: '/dashboard/pt/staff',
            icon: UserCog,
            isPro: true,
            isAdminOnly: true,
          },
        ]
      },
      { label: 'Keuangan', href: '/dashboard/finance', icon: Wallet },
      { label: 'Expiry', href: '/dashboard/expiry', icon: Bell },
    ]
  },
  {
    title: 'BISNIS',
    items: [
      { label: 'Halaman Publik', href: '/dashboard/formulir', icon: Globe, isPro: true },
      { label: 'Analisis Lengkap', href: '/dashboard/analysis', icon: BarChart3, isPro: true, isAdminOnly: true },
    ]
  },
  {
    title: 'SISTEM',
    items: [
      {
        label: 'Staff',
        href: '/dashboard/users',
        icon: IdCard,
        isAdminOnly: true,
        subItems: [
          { label: 'Daftar Akun Staff', href: '/dashboard/users', icon: UserCheck, isAdminOnly: true },
          {
            label: 'Manajemen Staff PT',
            href: '/dashboard/pt/staff',
            icon: UserCog,
            isPro: true,
            isAdminOnly: true,
          },
          { label: 'Log Aktivitas', href: '/dashboard/activity-logs', icon: Activity, isAdminOnly: true },
        ]
      }
    ]
  },
  {
    title: 'PENGATURAN',
    items: [
      { label: 'Import Excel', href: '/dashboard/import', icon: FileSpreadsheet, isAdminOnly: true },
      { label: 'Pengaturan', href: '/dashboard/settings', icon: Settings, isAdminOnly: true },
      { label: 'Upgrade Web ke-V2', href: '#', icon: ArrowUpCircle, isUpgrade: true },
    ]
  }
]

function SidebarNav({ onClose, criticalCount, onOpenUpgrade }: { onClose?: () => void, criticalCount?: number | null, onOpenUpgrade: () => void }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { isAdmin } = useAuth()
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({})

  const isActive = (item: NavItem) => {
    if (item.href === '#') return false
    const basePath = item.href.split('?')[0]
    if (basePath === '/dashboard') return pathname === '/dashboard'
    if (pathname.startsWith(basePath)) return true
    if (item.subItems?.some(sub => {
      const subBase = sub.href.split('?')[0]
      return pathname.startsWith(subBase)
    })) return true
    return false
  }

  const isMenuOpen = (item: NavItem) => {
    if (expandedMenus[item.label] !== undefined) {
      return expandedMenus[item.label]
    }
    return isActive(item)
  }

  const toggleMenu = (item: NavItem) => {
    setExpandedMenus((prev) => {
      const current = prev[item.label] !== undefined ? prev[item.label] : isActive(item)
      return {
        ...prev,
        [item.label]: !current,
      }
    })
  }

  return (
    <nav className="mt-4 flex-1 space-y-6 px-3 overflow-y-auto">
      {navGroups.map((group) => {
        // Filter out admin-only items if user is not admin
        const visibleItems = group.items.filter(item => !item.isAdminOnly || isAdmin)

        if (visibleItems.length === 0) return null

        return (
          <div key={group.title} className="space-y-1.5">
            <h4 className="px-3 text-[10px] font-bold text-sidebar-foreground/40 tracking-wider mb-2">
              {group.title}
            </h4>
            {visibleItems.map((item) => {
              const active = isActive(item)

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

              // Dropdown Menu untuk yang punya subItems (Member & Personal Trainer)
              if (item.subItems) {
                const isOpen = isMenuOpen(item)

                return (
                  <div key={item.label} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => toggleMenu(item)}
                      className={cn(
                        'w-full group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 select-none cursor-default',
                        active
                          ? 'border-l-[3px] border-primary bg-primary/10 text-primary'
                          : 'border-l-[3px] border-transparent text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                      )}
                    >
                      <item.icon className={cn('h-[18px] w-[18px]', active && 'text-primary')} />
                      <span>{item.label}</span>

                      {/* Icon chevron > berputar jadi v */}
                      <ChevronRight
                        className={cn(
                          'ml-auto h-4 w-4 transition-transform duration-200 text-sidebar-foreground/40 group-hover:text-sidebar-foreground',
                          isOpen && 'rotate-90 text-primary'
                        )}
                      />
                    </button>

                    {/* Sub Items (Hanya tampil saat terbuka) */}
                    {isOpen && (
                      <div className="ml-9 mt-1 flex flex-col gap-1 border-l border-border pl-4">
                        {item.subItems
                          .filter((sub) => !sub.isAdminOnly || isAdmin)
                          .map((sub) => {
                            const isSubActive = (() => {
                              if (sub.href.includes('?')) {
                                const [subPath, subQuery] = sub.href.split('?')
                                const subType = new URLSearchParams(subQuery).get('type')
                                const currentType = searchParams.get('type') || 'all'
                                return pathname === subPath && currentType === subType
                              }
                              return pathname === sub.href || pathname.startsWith(sub.href + '/')
                            })()

                            const SubIcon = sub.icon

                            return (
                              <Link
                                key={sub.label}
                                href={sub.href}
                                onClick={onClose}
                                className={cn(
                                  'group/sub flex items-center gap-2.5 py-1.5 text-[11px] font-medium transition-colors',
                                  isSubActive ? 'text-accent font-semibold' : 'text-sidebar-foreground/60 hover:text-sidebar-foreground'
                                )}
                              >
                                {SubIcon && (
                                  <SubIcon
                                    className={cn(
                                      'h-3.5 w-3.5 transition-colors',
                                      isSubActive
                                        ? 'text-accent'
                                        : 'text-sidebar-foreground/40 group-hover/sub:text-sidebar-foreground'
                                    )}
                                  />
                                )}
                                <span>{sub.label}</span>

                                {/* Badge V2 untuk Sub Item */}
                                {sub.isPro && (
                                  <span className="ml-auto flex items-center justify-center rounded bg-red-500/10 px-1.5 py-0.5 text-[9px] font-bold text-red-500">
                                    V2
                                  </span>
                                )}
                              </Link>
                            )
                          })}
                      </div>
                    )}
                  </div>
                )
              }

              // Menu biasa tanpa subItems
              return (
                <div key={item.label} className="space-y-1">
                  <Link
                    href={item.href}
                    onClick={onClose}
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
                </div>
              )
            })}
          </div>
        )
      })}
    </nav>
  )
}

import { UpgradeModal } from './UpgradeModal'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const router = useRouter()
  const supabase = createClient()
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false)
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

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

  const handleConfirmLogout = async () => {
    try {
      setIsLoggingOut(true)
      await supabase.auth.signOut()
      toast.success('Berhasil keluar. Sampai jumpa kembali!')
      router.push('/login')
      router.refresh()
    } catch (error) {
      toast.error('Gagal keluar dari akun. Silakan coba lagi.')
      console.error('Logout error:', error)
    } finally {
      setIsLoggingOut(false)
      setIsLogoutModalOpen(false)
    }
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
              <span className="text-[10px] font-bold text-sidebar-foreground/30 tracking-wider">DASHBOARD V1.5</span>
              <button
                onClick={() => setIsUpgradeModalOpen(true)}
                className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary hover:bg-primary/20 transition-colors"
              >
                UPGRADE KE V2
              </button>
            </div>
            <p className="text-[9px] text-sidebar-foreground/20 uppercase tracking-tighter font-medium">
              LAST UPDATE: 19 Oktober 2026, 12.03 WIB
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
          onClick={() => setIsLogoutModalOpen(true)}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          <span>Keluar</span>
        </button>

        <p className="mt-3 text-center text-[10px] text-sidebar-foreground/20">
          © {new Date().getFullYear()} {GYM_INFO.NAME}
        </p>
      </div>

      {/* Modal Konfirmasi Keluar */}
      <AlertDialog open={isLogoutModalOpen} onOpenChange={setIsLogoutModalOpen}>
        <AlertDialogContent className="border-border bg-card text-foreground max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading text-lg">Konfirmasi Keluar</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Apakah Anda yakin ingin keluar dari akun dashboard Line Up Gym?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-muted-foreground text-xs">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmLogout}
              disabled={isLoggingOut}
              className="bg-red-500 hover:bg-red-600 text-white font-semibold text-xs"
            >
              {isLoggingOut ? 'Mengeluarkan...' : 'Ya, Keluar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <UpgradeModal isOpen={isUpgradeModalOpen} onClose={() => setIsUpgradeModalOpen(false)} />
    </div>
  )
}
