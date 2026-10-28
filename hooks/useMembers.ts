import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { GYM_ID } from '@/lib/constants'
import type { Member, ActiveSubscriptionView } from '@/lib/types'

const supabase = createClient()

export function useMembers() {
  return useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('gym_id', GYM_ID)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Member[]
    },
  })
}

export function useMembersWithSubscription() {
  return useQuery({
    queryKey: ['members-with-subscription'],
    queryFn: async () => {
      const { data: members, error } = await supabase
        .from('active_subscriptions_view')
        .select('*')
        .eq('gym_id', GYM_ID)
      if (error) throw error

      if (!members || members.length === 0) return []

      // Ambil subscription PT aktif terbaru secara langsung dari tabel subscriptions
      // agar terhindar dari bug tie-breaker view database (end_date 2099-12-31)
      const { data: ptSubs } = await supabase
        .from('subscriptions')
        .select(`
          id,
          member_id,
          start_date,
          end_date,
          remaining_sessions,
          total_sessions_override,
          status,
          created_at,
          memberships!inner (name, category, total_sessions)
        `)
        .eq('memberships.category', 'pt')
        .order('created_at', { ascending: false })

      const latestPtByMember = new Map<string, any>()
      // Prioritaskan subscription PT yang masih memiliki sisa kuota sesi > 0
      ;(ptSubs || []).forEach((sub: any) => {
        if (!latestPtByMember.has(sub.member_id) && sub.remaining_sessions !== null && sub.remaining_sessions > 0) {
          latestPtByMember.set(sub.member_id, sub)
        }
      })
      // Fallback untuk member yang hanya memiliki subscription PT kedaluwarsa (ambil yang paling baru dibuat)
      ;(ptSubs || []).forEach((sub: any) => {
        if (!latestPtByMember.has(sub.member_id)) {
          latestPtByMember.set(sub.member_id, sub)
        }
      })

      // Fetch ALL attendance logs with pagination (Supabase caps at 1000 rows per request)
      const PAGE_SIZE = 1000
      let allAttendanceLogs: { member_id: string }[] = []
      let from = 0
      let hasMore = true

      while (hasMore) {
        const { data: batch, error: batchError } = await supabase
          .from('attendance_logs')
          .select('member_id')
          .eq('gym_id', GYM_ID)
          .range(from, from + PAGE_SIZE - 1)

        if (batchError) throw batchError

        if (batch && batch.length > 0) {
          allAttendanceLogs = allAttendanceLogs.concat(batch)
          from += PAGE_SIZE
          hasMore = batch.length === PAGE_SIZE
        } else {
          hasMore = false
        }
      }

      // Group & count total check-ins per member_id
      const logsCountByMember: Record<string, number> = {}
      allAttendanceLogs.forEach((log) => {
        if (log.member_id) {
          logsCountByMember[log.member_id] = (logsCountByMember[log.member_id] || 0) + 1
        }
      })

      const membersWithVisits = members.map((m: any) => {
        const ptSub = latestPtByMember.get(m.member_id)
        let ptRem = m.pt_remaining_sessions
        let ptTot = m.pt_total_sessions
        let ptName = m.pt_membership_name
        let ptSubId = m.pt_subscription_id
        let ptStart = m.pt_start_date
        let ptEnd = m.pt_end_date
        let ptStatus = m.pt_status
        let mainStatus = m.status

        if (ptSub) {
          ptSubId = ptSub.id
          ptName = ptSub.memberships?.name ?? ptName
          ptStart = ptSub.start_date
          ptEnd = ptSub.end_date
          ptRem = ptSub.remaining_sessions
          ptTot = ptSub.total_sessions_override ?? ptSub.memberships?.total_sessions
          const hasRemaining = ptSub.remaining_sessions !== null && ptSub.remaining_sessions > 0
          ptStatus = hasRemaining ? 'active' : 'expired'
          // Jika paket PT aktif, pastikan member berstatus aktif
          if (hasRemaining && (mainStatus === 'expired' || mainStatus === 'inactive')) {
            mainStatus = 'active'
          }
        }

        return {
          ...m,
          status: mainStatus,
          pt_subscription_id: ptSubId,
          pt_membership_name: ptName,
          pt_start_date: ptStart,
          pt_end_date: ptEnd,
          pt_remaining_sessions: ptRem,
          pt_total_sessions: ptTot,
          pt_status: ptStatus,
          attendance_count: logsCountByMember[m.member_id] || 0,
          total_attendance_count: logsCountByMember[m.member_id] || 0,
        }
      })

      return membersWithVisits as ActiveSubscriptionView[]
    },
    refetchInterval: 30000, 
  })
}

export function useCreateMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      member: Omit<Member, 'id' | 'created_at' | 'updated_at'>
      subscription?: { membership_id: string; start_date: string; end_date: string }
      ptSubscription?: { membership_id: string; start_date: string; end_date: string; remaining_sessions: number | null }
      payment?: { paymentMethod: 'cash' | 'transfer' | 'qris'; amount: number; membershipType: string; notes?: string }
      ptPayment?: { paymentMethod: 'cash' | 'transfer' | 'qris'; amount: number; membershipType: string; notes?: string }
    }) => {
      // Insert member
      const { data: member, error: memberError } = await supabase
        .from('members')
        .insert({ ...payload.member, gym_id: GYM_ID })
        .select()
        .single()
      if (memberError) throw memberError

      // Insert subscription jika ada
      if (payload.subscription) {
        const { error: subError } = await supabase
          .from('subscriptions')
          .insert({
            member_id: member.id,
            membership_id: payload.subscription.membership_id,
            start_date: payload.subscription.start_date,
            end_date: payload.subscription.end_date,
            status: 'active',
          })
        if (subError) throw subError
      }

      // Insert PT subscription jika ada
      if (payload.ptSubscription) {
        const { error: ptSubError } = await supabase
          .from('subscriptions')
          .insert({
            member_id: member.id,
            membership_id: payload.ptSubscription.membership_id,
            start_date: payload.ptSubscription.start_date,
            end_date: payload.ptSubscription.end_date,
            remaining_sessions: payload.ptSubscription.remaining_sessions,
            status: 'active',
          })
        if (ptSubError) throw ptSubError
      }

      // Insert payment jika ada data paket & payment
      if (payload.payment) {
        const { error: payError } = await supabase.from('payments').insert({
          gym_id: GYM_ID,
          member_id: member.id,
          amount: payload.payment.amount,
          payment_method: payload.payment.paymentMethod,
          membership_type: payload.payment.membershipType,
          notes: payload.payment.notes || 'Pembayaran Member Baru (Gym)',
          paid_at: payload.subscription?.start_date,
        })
        if (payError) throw payError
      }

      // Insert PT payment jika ada data PT & payment
      if (payload.ptPayment) {
        const { error: ptPayError } = await supabase.from('payments').insert({
          gym_id: GYM_ID,
          member_id: member.id,
          amount: payload.ptPayment.amount,
          payment_method: payload.ptPayment.paymentMethod,
          membership_type: payload.ptPayment.membershipType,
          notes: payload.ptPayment.notes || 'Pembayaran Member Baru (PT)',
          paid_at: payload.ptSubscription?.start_date,
        })
        if (ptPayError) throw ptPayError
      }

      // Audit log
      await supabase.from('activity_logs').insert({
        gym_id: GYM_ID,
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        action_type: 'create_member',
        table_name: 'members',
        record_id: member.id,
        details: { new_data: member }
      })

      return member
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
      queryClient.invalidateQueries({ queryKey: ['members-with-subscription'] })
      queryClient.invalidateQueries({ queryKey: ['critical-count'] })
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['revenue-monthly'] })
      queryClient.invalidateQueries({ queryKey: ['revenue-current-month'] })
      queryClient.invalidateQueries({ queryKey: ['overview'] })
      queryClient.invalidateQueries({ queryKey: ['expiry'] })
      queryClient.invalidateQueries({ queryKey: ['pt-active-members'] })
    },
  })
}

export function useUpdateMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Member> }) => {
      const { data: old } = await supabase.from('members').select().eq('id', id)
      const { data: updated, error } = await supabase
        .from('members')
        .update(data)
        .eq('id', id)
        .select()
        
      if (error) throw error
      const updatedRow = updated?.[0]

      await supabase.from('activity_logs').insert({
        gym_id: GYM_ID,
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        action_type: 'update_member',
        table_name: 'members',
        record_id: id,
        details: { old_data: old?.[0], new_data: updatedRow }
      })

      return updatedRow
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
      queryClient.invalidateQueries({ queryKey: ['members-with-subscription'] })
    },
  })
}

export function useDeleteMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: old } = await supabase.from('members').select().eq('id', id)
      
      // 1. Hapus pt_sessions, logs, subscriptions, payments terlebih dahulu
      await supabase.from('pt_sessions').delete().eq('member_id', id)
      await supabase.from('attendance_logs').delete().eq('member_id', id)
      await supabase.from('subscriptions').delete().eq('member_id', id)
      
      // 2. Hapus payments juga agar tidak menyangkut FK constraint
      await supabase.from('payments').delete().eq('member_id', id)
      
      // 3. Hapus data member utama
      const { error } = await supabase.from('members').delete().eq('id', id)
      if (error) throw error

      await supabase.from('activity_logs').insert({
        gym_id: GYM_ID,
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        action_type: 'delete_member',
        table_name: 'members',
        record_id: id,
        details: { old_data: old }
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
      queryClient.invalidateQueries({ queryKey: ['members-with-subscription'] })
      queryClient.invalidateQueries({ queryKey: ['critical-count'] })
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['revenue-monthly'] })
      queryClient.invalidateQueries({ queryKey: ['revenue-current-month'] })
      queryClient.invalidateQueries({ queryKey: ['overview'] })
      queryClient.invalidateQueries({ queryKey: ['expiry'] })
    },
  })
}
