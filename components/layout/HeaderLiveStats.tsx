'use client'

import { useEffect, useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { GYM_ID } from '@/lib/constants'
import { Users, UserCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function HeaderLiveStats() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [hasNewCheckin, setHasNewCheckin] = useState(false)

  // Query Data: Member Aktif & Kehadiran Hari Ini
  const { data: stats, isLoading } = useQuery({
    queryKey: ['header-live-stats'],
    queryFn: async () => {
      const today = new Date().toLocaleDateString('sv-SE')
      const start = new Date(today)
      start.setHours(0, 0, 0, 0)
      const end = new Date(today)
      end.setHours(23, 59, 59, 999)

      // 1. Total Member Aktif (membership aktif / belum expired)
      const { count: activeCount, error: activeErr } = await supabase
        .from('active_subscriptions_view')
        .select('*', { count: 'exact', head: true })
        .eq('gym_id', GYM_ID)
        .in('status', ['active', 'expiring_soon', 'critical'])

      if (activeErr) console.error('Error fetching active member count:', activeErr)

      // 2. Kehadiran Hari Ini (Member + Visitor)
      const { data: checkinData, error: checkinErr } = await supabase
        .from('attendance_logs')
        .select('notes')
        .eq('gym_id', GYM_ID)
        .gte('check_in_at', start.toISOString())
        .lte('check_in_at', end.toISOString())

      if (checkinErr) console.error('Error fetching checkin count:', checkinErr)

      const totalCheckin = checkinData?.length || 0
      const visitorCount = checkinData?.filter((l) => l.notes?.toLowerCase().includes('visitor')).length || 0
      const memberCheckin = totalCheckin - visitorCount

      return {
        active: activeCount ?? 0,
        hadir: totalCheckin,
        memberCheckin,
        visitorCount,
      }
    },
    refetchInterval: 15000, // Polling interval 15s sebagai fallback
    refetchOnWindowFocus: true,
  })

  // Realtime WebSocket Subscription
  useEffect(() => {
    const channel = supabase
      .channel('header-live-stats-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendance_logs' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['header-live-stats'] })
          // Trigger visual feedback scale glow selama 2 detik
          setHasNewCheckin(true)
          setTimeout(() => setHasNewCheckin(false), 2000)
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subscriptions' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['header-live-stats'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, queryClient])

  const activeCount = stats?.active ?? 0
  const hadirCount = stats?.hadir ?? 0
  const memberCheckin = stats?.memberCheckin ?? 0
  const visitorCount = stats?.visitorCount ?? 0

  return (
    <div className="hidden md:flex items-center gap-2 select-none">
      {/* Container Widget */}
      <div className="flex items-center gap-2 rounded-full border border-border/40 bg-card/60 px-2.5 py-1 text-xs shadow-sm backdrop-blur-sm transition-all hover:border-border/70">
        {/* 1. Item Aktif (dengan Micro-Tooltip Opsi 3) */}
        <div className="group relative flex items-center gap-1.5 cursor-help">
          <Users className="h-3.5 w-3.5 text-accent" />
          <span className="hidden text-accent font-medium sm:inline">Aktif :</span>
          <span className="inline-flex min-w-[24px] items-center justify-center rounded-full border border-border/60 bg-background/80 px-2 py-0.5 font-mono text-[11px] font-bold text-foreground shadow-inner">
            {isLoading ? '...' : activeCount}
          </span>

          {/* Micro-Tooltip Hover */}
          <div className="pointer-events-none absolute -bottom-12 left-1/2 -translate-x-1/2 opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:-bottom-10 z-50">
            <div className="whitespace-nowrap rounded-md border border-border/80 bg-popover px-2.5 py-1.5 text-[10px] text-popover-foreground shadow-xl">
              <p className="font-semibold text-foreground">Member Langganan Aktif</p>
              <p className="text-muted-foreground">{activeCount} member membership belum kadaluarsa</p>
            </div>
          </div>
        </div>

        {/* Separator Slash */}
        <span className="text-muted-foreground/40 font-light">/</span>

        {/* 2. Item Hadir (dengan Micro-Tooltip Opsi 3) */}
        <div className="group relative flex items-center gap-1.5 cursor-help">
          <UserCheck className="h-3.5 w-3.5 text-accent" />
          <span className="hidden text-accent font-medium sm:inline">Hadir :</span>
          
          <span
            className={cn(
              'inline-flex min-w-[24px] items-center justify-center rounded-full border border-border/60 bg-background/80 px-2 py-0.5 font-mono text-[11px] font-bold text-foreground shadow-inner transition-all duration-300',
              hasNewCheckin && 'scale-110 border-accent/60 bg-accent/20 text-accent shadow-[0_0_10px_rgba(212,255,0,0.4)]'
            )}
          >
            {isLoading ? '...' : hadirCount}
          </span>

          {/* Micro-Tooltip Hover */}
          <div className="pointer-events-none absolute -bottom-14 left-1/2 -translate-x-1/2 opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:-bottom-12 z-50">
            <div className="whitespace-nowrap rounded-md border border-border/80 bg-popover px-2.5 py-1.5 text-[10px] text-popover-foreground shadow-xl space-y-0.5">
              <p className="font-semibold text-foreground flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_6px_rgba(212,255,0,0.8)]" />
                Kehadiran Hari Ini (Live)
              </p>
              <p className="text-muted-foreground">
                {memberCheckin} Member · {visitorCount} Visitor
              </p>
            </div>
          </div>
        </div>

        {/* 3. Live Pulse Dot di Ujung Paling Kanan */}
        <div className="relative flex items-center pl-0.5 pr-0.5" title="Koneksi Real-time Aktif">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-80" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent shadow-[0_0_8px_rgba(212,255,0,0.9)]" />
          </span>
        </div>
      </div>
    </div>
  )
}
