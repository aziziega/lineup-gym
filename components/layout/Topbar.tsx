'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Menu, User } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

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
    <header className="sticky top-0 z-30 border-b border-[#2A2A2A] bg-[#0A0A0A]/80 backdrop-blur-md">
      <div className="flex items-center justify-between px-4 py-3 lg:px-6">
        {/* Kiri: hamburger (mobile) + judul */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="rounded-lg p-1.5 text-[#888] hover:bg-[#1A1A1A] hover:text-white lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div>
            <h2 className="font-heading text-xl leading-none text-white lg:text-2xl">
              {title}
            </h2>
            {/* Tanggal (tampil di bawah judul di mobile, di samping di desktop) */}
            <p className="mt-0.5 text-[11px] text-[#888] lg:hidden">{currentDate}</p>
          </div>
        </div>

        {/* Kanan: tanggal + jam + avatar */}
        <div className="flex items-center gap-3">
          {/* Tanggal & jam — desktop */}
          <div className="hidden text-right lg:block">
            <p className="text-xs text-[#888]">{currentDate}</p>
            <p className="font-heading text-lg leading-none text-[#D4FF00]">{currentTime}</p>
          </div>

          {/* Jam mobile */}
          <span className="font-heading text-base text-[#D4FF00] lg:hidden">{currentTime}</span>

          {/* Avatar */}
          <Avatar className="h-8 w-8 border border-[#2A2A2A] bg-[#1A1A1A]">
            <AvatarFallback className="bg-[#1A1A1A] text-xs text-[#D4FF00]">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}
