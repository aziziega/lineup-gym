import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { GYM_ID } from '@/lib/constants'

const supabase = createClient()

export interface PtSession {
  id: string
  gym_id: string
  member_id: string
  subscription_id: string
  session_date: string
  session_time: string
  is_completed: boolean
  completed_at: string | null
  notes: string | null
  created_at: string
  // Joined fields
  member_name?: string
  member_phone?: string
  pt_membership_name?: string
  remaining_sessions?: number
  total_sessions?: number
}

export function usePtSessionsByWeek(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['pt-sessions', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pt_sessions')
        .select(`
          *,
          members(full_name, phone),
          subscriptions(
            remaining_sessions,
            total_sessions_override,
            memberships(name, total_sessions)
          )
        `)
        .eq('gym_id', GYM_ID)
        .gte('session_date', startDate)
        .lte('session_date', endDate)
        .order('session_time', { ascending: true })

      if (error) throw error

      return (data || []).map((s: any) => ({
        id: s.id,
        gym_id: s.gym_id,
        member_id: s.member_id,
        subscription_id: s.subscription_id,
        session_date: s.session_date,
        session_time: s.session_time,
        is_completed: s.is_completed,
        completed_at: s.completed_at,
        notes: s.notes,
        created_at: s.created_at,
        member_name: s.members?.full_name,
        member_phone: s.members?.phone,
        pt_membership_name: s.subscriptions?.memberships?.name,
        remaining_sessions: s.subscriptions?.remaining_sessions,
        total_sessions: s.subscriptions?.total_sessions_override ?? s.subscriptions?.memberships?.total_sessions,
      })) as PtSession[]
    },
    refetchInterval: 10000, // Auto-refresh agar sesi yang selesai langsung hilang dari grid
  })
}

export function useCreatePtSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      memberId: string
      subscriptionId: string
      sessionDate: string
      sessionTime: string
      notes?: string
    }) => {
      const { data, error } = await supabase
        .from('pt_sessions')
        .insert({
          gym_id: GYM_ID,
          member_id: payload.memberId,
          subscription_id: payload.subscriptionId,
          session_date: payload.sessionDate,
          session_time: payload.sessionTime,
          notes: payload.notes || null,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-sessions'] })
    },
  })
}

export function useCompletePtSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ sessionId, subscriptionId }: { sessionId: string; subscriptionId: string }) => {
      // 1. Tandai sesi selesai
      const { error: sessErr } = await supabase
        .from('pt_sessions')
        .update({
          is_completed: true,
          completed_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
      if (sessErr) throw sessErr

      // 2. Kurangi remaining_sessions di subscription
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('remaining_sessions')
        .eq('id', subscriptionId)
        .single()

      if (sub && sub.remaining_sessions !== null && sub.remaining_sessions > 0) {
        const newRemaining = sub.remaining_sessions - 1
        const { error: subErr } = await supabase
          .from('subscriptions')
          .update({
            remaining_sessions: newRemaining,
            ...(newRemaining === 0 ? { status: 'expired' as const } : {}),
          })
          .eq('id', subscriptionId)
        if (subErr) throw subErr
      } else {
        console.warn('PT session completed but subscription decrement skipped:', { sub, subscriptionId })
      }

      // 3. Audit log
      await supabase.from('activity_logs').insert({
        gym_id: GYM_ID,
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        action_type: 'complete_pt_session',
        table_name: 'pt_sessions',
        record_id: sessionId,
        details: { subscription_id: subscriptionId },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-sessions'] })
      queryClient.invalidateQueries({ queryKey: ['members-with-subscription'] })
      queryClient.invalidateQueries({ queryKey: ['pt-active-members'] })
      queryClient.invalidateQueries({ queryKey: ['expiry'] })
      queryClient.invalidateQueries({ queryKey: ['expiry-stats'] })
    },
  })
}

export function useDeletePtSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('pt_sessions')
        .delete()
        .eq('id', sessionId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-sessions'] })
    },
  })
}

// Reschedule sesi PT (ganti tanggal & jam sesi)
export function useReschedulePtSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      sessionId,
      sessionDate,
      sessionTime,
    }: {
      sessionId: string
      sessionDate: string
      sessionTime: string
    }) => {
      const { data, error } = await supabase
        .from('pt_sessions')
        .update({
          session_date: sessionDate,
          session_time: sessionTime,
        })
        .eq('id', sessionId)
        .select()
        .single()

      if (error) throw error

      // Audit log
      const { data: userData } = await supabase.auth.getUser()
      await supabase.from('activity_logs').insert({
        gym_id: GYM_ID,
        admin_id: userData.user?.id || null,
        action_type: 'reschedule_pt_session',
        table_name: 'pt_sessions',
        record_id: sessionId,
        details: { new_date: sessionDate, new_time: sessionTime },
      })

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-sessions'] })
    },
  })
}

// Ambil member yang punya PT aktif (untuk dropdown tambah sesi di Jadwal Sesi)
export function usePtActiveMembers() {
  return useQuery({
    queryKey: ['pt-active-members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          id,
          remaining_sessions,
          total_sessions_override,
          status,
          start_date,
          end_date,
          created_at,
          members!inner (
            id,
            gym_id,
            full_name,
            phone
          ),
          memberships!inner (
            name,
            category,
            total_sessions
          )
        `)
        .eq('members.gym_id', GYM_ID)
        .eq('memberships.category', 'pt')
        .gt('remaining_sessions', 0)
        .order('created_at', { ascending: false })

      if (error) {
        // Fallback ke view jika query relasi subscriptions gagal
        const { data: viewData, error: viewError } = await supabase
          .from('active_subscriptions_view')
          .select('member_id, full_name, phone, pt_membership_name, pt_subscription_id, pt_start_date, pt_end_date, pt_remaining_sessions, pt_total_sessions, pt_status')
          .eq('gym_id', GYM_ID)
          .gt('pt_remaining_sessions', 0)
          .not('pt_subscription_id', 'is', null)

        if (viewError) throw viewError
        return viewData || []
      }

      const memberMap = new Map<string, any>()
      ;(data || []).forEach((sub: any) => {
        const m = sub.members
        if (m && !memberMap.has(m.id)) {
          memberMap.set(m.id, {
            member_id: m.id,
            full_name: m.full_name,
            phone: m.phone,
            pt_membership_name: sub.memberships?.name,
            pt_subscription_id: sub.id,
            pt_start_date: sub.start_date,
            pt_end_date: sub.end_date,
            pt_remaining_sessions: sub.remaining_sessions,
            pt_total_sessions: sub.total_sessions_override ?? sub.memberships?.total_sessions,
            pt_status: sub.remaining_sessions > 0 ? 'active' : sub.status,
          })
        }
      })

      return Array.from(memberMap.values())
    },
    refetchInterval: 10000, // Auto-refresh tiap 10 detik agar member baru langsung muncul
  })
}

// Ambil SEMUA member yang memiliki paket PT (termasuk sisa sesi 0 untuk direktori progress & perpanjangan)
export function useAllPtMembers() {
  return useQuery({
    queryKey: ['all-pt-members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          id,
          remaining_sessions,
          total_sessions_override,
          status,
          start_date,
          end_date,
          created_at,
          members!inner (
            id,
            gym_id,
            full_name,
            phone
          ),
          memberships!inner (
            name,
            category,
            total_sessions
          )
        `)
        .eq('members.gym_id', GYM_ID)
        .eq('memberships.category', 'pt')
        .order('created_at', { ascending: false })

      if (error) {
        const { data: viewData, error: viewError } = await supabase
          .from('active_subscriptions_view')
          .select('member_id, full_name, phone, pt_membership_name, pt_subscription_id, pt_start_date, pt_end_date, pt_remaining_sessions, pt_total_sessions, pt_status')
          .eq('gym_id', GYM_ID)
          .not('pt_subscription_id', 'is', null)

        if (viewError) throw viewError
        return viewData || []
      }

      const memberMap = new Map<string, any>()
      ;(data || []).forEach((sub: any) => {
        const m = sub.members
        if (m && !memberMap.has(m.id)) {
          memberMap.set(m.id, {
            member_id: m.id,
            full_name: m.full_name,
            phone: m.phone,
            pt_membership_name: sub.memberships?.name,
            pt_subscription_id: sub.id,
            pt_start_date: sub.start_date,
            pt_end_date: sub.end_date,
            pt_remaining_sessions: sub.remaining_sessions,
            pt_total_sessions: sub.total_sessions_override ?? sub.memberships?.total_sessions,
            pt_status: sub.remaining_sessions > 0 ? 'active' : sub.status,
          })
        }
      })

      return Array.from(memberMap.values())
    },
    refetchInterval: 10000,
  })
}

// Ambil sesi PT di masa lampau yang belum diselesaikan (Pending / Missed sessions)
export function usePendingPtSessions(beforeDate: string) {
  return useQuery({
    queryKey: ['pt-sessions-pending', beforeDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pt_sessions')
        .select(`
          *,
          members(full_name, phone),
          subscriptions(
            remaining_sessions,
            total_sessions_override,
            memberships(name, total_sessions)
          )
        `)
        .eq('gym_id', GYM_ID)
        .lt('session_date', beforeDate)
        .eq('is_completed', false)
        .order('session_date', { ascending: false })
        .order('session_time', { ascending: true })
        .limit(20)

      if (error) throw error

      return (data || []).map((s: any) => ({
        id: s.id,
        gym_id: s.gym_id,
        member_id: s.member_id,
        subscription_id: s.subscription_id,
        session_date: s.session_date,
        session_time: s.session_time,
        is_completed: s.is_completed,
        completed_at: s.completed_at,
        notes: s.notes,
        created_at: s.created_at,
        member_name: s.members?.full_name,
        member_phone: s.members?.phone,
        pt_membership_name: s.subscriptions?.memberships?.name,
        remaining_sessions: s.subscriptions?.remaining_sessions,
        total_sessions: s.subscriptions?.total_sessions_override ?? s.subscriptions?.memberships?.total_sessions,
      })) as PtSession[]
    },
    refetchInterval: 15000,
  })
}

export interface PtSubscriptionCycle {
  id: string
  cycle_number: number
  is_active: boolean
  start_date: string
  end_date: string
  created_at: string
  next_cycle_created_at?: string | null
  remaining_sessions: number
  total_sessions: number
  membership_name: string
  label: string
}

// Ambil riwayat siklus paket PT untuk member (termasuk paket aktif dan paket-paket terdahulu)
export function usePtMemberCycles(memberId?: string) {
  return useQuery({
    queryKey: ['pt-member-cycles', memberId],
    queryFn: async () => {
      if (!memberId) return []

      const { data: subs, error } = await supabase
        .from('subscriptions')
        .select(`
          id,
          start_date,
          end_date,
          remaining_sessions,
          total_sessions_override,
          status,
          created_at,
          memberships!inner (name, total_sessions)
        `)
        .eq('member_id', memberId)
        .eq('memberships.category', 'pt')
        .order('created_at', { ascending: true })

      if (error) throw error

      const total = (subs || []).length
      if (total === 0) return []

      const cycles: PtSubscriptionCycle[] = (subs || []).map((s: any, idx: number) => {
        const cycleNum = idx + 1
        const isLatest = idx === total - 1
        const isActive = isLatest && s.status === 'active' && (s.remaining_sessions || 0) > 0
        const totalSessions = s.total_sessions_override || s.memberships?.total_sessions || 0
        const remSessions = s.remaining_sessions ?? 0
        const dateFormatted = new Date(s.start_date || s.created_at).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
        const nextSub = subs[idx + 1]

        return {
          id: s.id,
          cycle_number: cycleNum,
          is_active: isActive,
          start_date: s.start_date,
          end_date: s.end_date,
          created_at: s.created_at,
          next_cycle_created_at: nextSub ? nextSub.created_at : null,
          remaining_sessions: remSessions,
          total_sessions: totalSessions,
          membership_name: s.memberships?.name || 'Personal Trainer',
          label: `Siklus ${cycleNum} (${isActive ? 'Aktif' : 'Selesai'} · ${remSessions}/${totalSessions} Sesi - ${dateFormatted})`,
        }
      }).reverse() // Urutkan terbaru di paling atas untuk dropdown

      return cycles
    },
    enabled: !!memberId,
    refetchInterval: 10000,
  })
}
