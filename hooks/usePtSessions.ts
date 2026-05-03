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
          members!inner(full_name, phone),
          subscriptions!inner(
            remaining_sessions,
            memberships!inner(name, total_sessions)
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
        total_sessions: s.subscriptions?.memberships?.total_sessions,
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

// Ambil member yang punya PT aktif (untuk dropdown tambah sesi)
export function usePtActiveMembers() {
  return useQuery({
    queryKey: ['pt-active-members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('active_subscriptions_view')
        .select('member_id, full_name, phone, pt_membership_name, pt_subscription_id, pt_remaining_sessions, pt_total_sessions, pt_status')
        .eq('gym_id', GYM_ID)
        .eq('pt_status', 'active')
        .not('pt_subscription_id', 'is', null)

      if (error) throw error
      return data || []
    },
    refetchInterval: 10000, // Auto-refresh tiap 10 detik agar member baru langsung muncul
  })
}
