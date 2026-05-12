'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GYM_ID } from '@/lib/constants'
import { formatRupiah, formatTanggal } from '@/lib/utils'
import { Users, Wallet, UserCheck, Bell } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import MetricCard from '@/components/dashboard/MetricCard'
import TrafficChart from '@/components/dashboard/TrafficChart'
import PackageDonutChart from '@/components/dashboard/PackageDonutChart'
import TodayPTSchedule from '@/components/dashboard/TodayPTSchedule'

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

  // Metric: Total Kunjungan Bulan Ini
  const { data: monthlyTraffic, isLoading: loadingTraffic } = useQuery({
    queryKey: ['overview', 'traffic-month'],
    queryFn: async () => {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()
      
      const { count, error } = await supabase
        .from('attendance_logs')
        .select('*', { count: 'exact', head: true })
        .eq('gym_id', GYM_ID)
        .gte('check_in_at', start)
        .lte('check_in_at', end)

      if (error) throw error
      return count ?? 0
    },
  })

  // Metric: Check-In Hari Ini
  const { data: checkInStats, isLoading: loadingCheckIn } = useQuery({
    queryKey: ['overview', 'checkin-today'],
    queryFn: async () => {
      const today = new Date().toLocaleDateString('sv-SE')
      const start = new Date(today)
      start.setHours(0, 0, 0, 0)
      const end = new Date(today)
      end.setHours(23, 59, 59, 999)

      const { data, error } = await supabase
        .from('attendance_logs')
        .select('notes')
        .eq('gym_id', GYM_ID)
        .gte('check_in_at', start.toISOString())
        .lte('check_in_at', end.toISOString())

      if (error) throw error
      
      const total = data?.length || 0
      const visitors = data?.filter(l => l.notes?.toLowerCase().includes('visitor')).length || 0
      const regular = total - visitors

      return { total, visitors, regular }
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
        <h1 className="font-heading text-2xl text-foreground lg:text-3xl">
          {greeting}, {adminName}👋

        </h1>
        <p className="text-xs text-muted-foreground">{new Intl.DateTimeFormat('id-ID', { dateStyle: 'full' }).format(new Date())}</p>
      </div>

      {/* 4 Metric Cards â€” 2 kolom di mobile, 4 di desktop */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          label="Member Aktif"
          value={activeMemberCount ?? 0}
          icon={Users}
          loading={loadingMembers}
          accent="neon"
        />
        <MetricCard
          label="Total Kunjungan (Bulan Ini)"
          value={`${monthlyTraffic ?? 0} Orang`}
          icon={Wallet}
          loading={loadingTraffic}
          accent="neon"
          description="Total kehadiran member & visitor"
        />
        <MetricCard
          label="Check-In Hari Ini"
          value={checkInStats?.total ?? 0}
          icon={UserCheck}
          loading={loadingCheckIn}
          accent="muted"
          description={
            checkInStats ? `${checkInStats.regular} Member · ${checkInStats.visitors} Visitor` : undefined
          }
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
        <TrafficChart />
        <PackageDonutChart />
      </div>

      {/* Jadwal PT & Member Terbaru */}
      <div className="grid gap-4 lg:grid-cols-2">
        <TodayPTSchedule />

        {/* 5 Member Terbaru — tanpa scroll */}
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Member Terbaru</h3>
          {(!recentMembers || recentMembers.length === 0) ? (
            <p className="py-6 text-center text-sm text-muted-foreground/60">Belum ada member</p>
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
                    className="flex items-center gap-3 rounded-lg border border-border/50 bg-background px-3 py-2.5"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#D4FF00]/10 text-xs font-bold text-accent">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{m.full_name}</p>
                      <p className="text-[11px] text-muted-foreground">{formatTanggal(m.created_at)}</p>
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
