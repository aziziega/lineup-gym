'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GYM_ID } from '@/lib/constants'
import { formatRupiah, formatTanggal } from '@/lib/utils'
import { Users, Wallet, UserCheck, Bell } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import MetricCard from '@/components/dashboard/MetricCard'
import RevenueChart from '@/components/dashboard/RevenueChart'
import PackageDonutChart from '@/components/dashboard/PackageDonutChart'
import TodaySchedule from '@/components/dashboard/TodaySchedule'

export default function OverviewPage() {
  const supabase = createClient()
  const [greeting, setGreeting] = useState('')
  const [adminName, setAdminName] = useState('')

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Selamat pagi')
    else if (hour < 15) setGreeting('Selamat siang')
    else if (hour < 18) setGreeting('Selamat sore')
    else setGreeting('Selamat malam')

    supabase.auth.getUser().then(({ data }) => {
      setAdminName(data.user?.email?.split('@')[0] ?? 'Admin')
    })
  }, [supabase])

  // Metric: Member Aktif
  const { data: activeMemberCount, isLoading: loadingMembers } = useQuery({
    queryKey: ['overview', 'active-members'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('active_subscriptions_view')
        .select('*', { count: 'exact', head: true })
        .eq('gym_id', GYM_ID)
        .in('status', ['active', 'expiring_soon', 'critical'])
      if (error) throw error
      return count ?? 0
    },
  })

  // Metric: Revenue Bulan Ini
  const { data: revenue, isLoading: loadingRevenue } = useQuery({
    queryKey: ['overview', 'revenue-month'],
    queryFn: async () => {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()
      const { data, error } = await supabase
        .from('payments')
        .select('amount')
        .eq('gym_id', GYM_ID)
        .gte('paid_at', start)
        .lte('paid_at', end)
      if (error) throw error
      return (data || []).reduce((s, p) => s + Number(p.amount), 0)
    },
  })

  // Metric: Check-In Hari Ini
  const { data: checkInCount, isLoading: loadingCheckIn } = useQuery({
    queryKey: ['overview', 'checkin-today'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]
      const { count, error } = await supabase
        .from('attendance_logs')
        .select('*', { count: 'exact', head: true })
        .eq('gym_id', GYM_ID)
        .gte('check_in_at', `${today}T00:00:00`)
        .lte('check_in_at', `${today}T23:59:59`)
      if (error) throw error
      return count ?? 0
    },
  })

  // Metric: Expiry 7 Hari
  const { data: expiryCount, isLoading: loadingExpiry } = useQuery({
    queryKey: ['overview', 'expiry-7d'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('active_subscriptions_view')
        .select('*', { count: 'exact', head: true })
        .eq('gym_id', GYM_ID)
        .lte('days_remaining', 7)
        .gte('days_remaining', 0)
      if (error) throw error
      return count ?? 0
    },
  })

  // 5 member terbaru
  const { data: recentMembers } = useQuery({
    queryKey: ['overview', 'recent-members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('members')
        .select('id, full_name, created_at')
        .eq('gym_id', GYM_ID)
        .order('created_at', { ascending: false })
        .limit(5)
      if (error) throw error
      return data
    },
  })

  return (
    <div className="space-y-5">
      {/* Greeting */}
      <div>
        <h1 className="font-heading text-2xl text-white lg:text-3xl">
          {greeting}, {adminName} 👋
        </h1>
        <p className="text-xs text-[#888]">{formatTanggal(new Date().toISOString())}</p>
      </div>

      {/* 4 Metric Cards — 2 kolom di mobile, 4 di desktop */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          label="Member Aktif"
          value={activeMemberCount ?? 0}
          icon={Users}
          loading={loadingMembers}
          accent="neon"
        />
        <MetricCard
          label="Revenue Bulan Ini"
          value={revenue ? formatRupiah(revenue) : 'Rp 0'}
          icon={Wallet}
          loading={loadingRevenue}
          accent="neon"
        />
        <MetricCard
          label="Check-In Hari Ini"
          value={checkInCount ?? 0}
          icon={UserCheck}
          loading={loadingCheckIn}
          accent="muted"
        />
        <MetricCard
          label="Expiry 7 Hari"
          value={expiryCount ?? 0}
          icon={Bell}
          loading={loadingExpiry}
          accent={expiryCount && expiryCount > 0 ? 'orange' : 'muted'}
        />
      </div>

      {/* Charts — stacked di mobile, side by side di desktop */}
      <div className="grid gap-4 lg:grid-cols-2">
        <RevenueChart />
        <PackageDonutChart />
      </div>

      {/* Jadwal + Member terbaru */}
      <div className="grid gap-4 lg:grid-cols-2">
        <TodaySchedule />

        {/* 5 Member Terbaru — tanpa scroll */}
        <div className="rounded-xl border border-[#2A2A2A]/50 bg-[#1A1A1A] p-4">
          <h3 className="mb-3 text-sm font-semibold text-white">Member Terbaru</h3>
          {(!recentMembers || recentMembers.length === 0) ? (
            <p className="py-6 text-center text-sm text-[#555]">Belum ada member</p>
          ) : (
            <div className="space-y-2">
              {recentMembers.map((m) => {
                const initials = m.full_name
                  .split(' ')
                  .map((n: string) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)
                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 rounded-lg border border-[#2A2A2A]/50 bg-[#111] px-3 py-2.5"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#D4FF00]/10 text-xs font-bold text-[#D4FF00]">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{m.full_name}</p>
                      <p className="text-[11px] text-[#888]">{formatTanggal(m.created_at)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
