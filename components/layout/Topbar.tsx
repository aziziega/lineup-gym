'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Menu, User, Sun, Moon, UserPlus } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import NotificationDropdown from './NotificationDropdown'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Overview',
  '/dashboard/checkin': 'Check-In',
  '/dashboard/members': 'Manajemen Member',
  '/dashboard/packages': 'Paket Membership',
  '/dashboard/schedule': 'Jadwal & Booking',
  '/dashboard/finance': 'Laporan Keuangan',
  '/dashboard/expiry': 'Notifikasi Expiry',
}

export default function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname()
  const supabase = createClient()
  const [currentTime, setCurrentTime] = useState('')
  const [currentDate, setCurrentDate] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const updateClock = () => {
      const now = new Date()
      setCurrentTime(
        now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      )
      setCurrentDate(
        now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      )
    }
    updateClock()
    const interval = setInterval(updateClock, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setAdminEmail(data.user?.email ?? '')
    })
  }, [supabase])

  const title = pageTitles[pathname] ?? 'Dashboard'
  const initials = adminEmail ? adminEmail.slice(0, 2).toUpperCase() : 'AD'

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="flex items-center justify-between px-4 py-3 lg:px-6">
        {/* Kiri: hamburger (mobile) + judul */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent/10 hover:text-foreground lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div>
            <h2 className="font-heading text-xl leading-none text-foreground lg:text-2xl">
              {title}
            </h2>
            {/* Tanggal (tampil di bawah judul di mobile, di samping di desktop) */}
            <p className="mt-0.5 text-[11px] text-muted-foreground lg:hidden">{currentDate}</p>
          </div>
        </div>

        {/* Kanan: tanggal + jam + avatar */}
        <div className="flex items-center gap-3">
          {/* Tambah Member Button */}
          <Link
            href="/dashboard/members?add=true"
            className="hidden items-center gap-2 rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-white transition-all hover:bg-primary/90 active:scale-95 sm:flex"
          >
            <UserPlus className="h-4 w-4" />
            <span>Tambah Member</span>
          </Link>

          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-all hover:bg-accent/10"
            aria-label="Toggle Theme"
          >
            {mounted && (theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />)}
          </button>

          {/* Notifikasi */}
          <NotificationDropdown />

          {/* Separator Desktop */}
          <div className="hidden h-6 w-[1px] bg-border lg:block" />

          {/* Tanggal & jam — desktop */}
          <div className="hidden text-right lg:block">
            <p className="text-xs text-muted-foreground">{currentDate}</p>
            <p className="font-heading text-lg leading-none text-accent">{currentTime}</p>
          </div>

          {/* Jam mobile */}
          <span className="font-heading text-base text-accent lg:hidden">{currentTime}</span>

          {/* Avatar */}
          <Avatar className="h-8 w-8 border border-border bg-card">
            <AvatarFallback className="bg-card text-xs text-accent">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}
