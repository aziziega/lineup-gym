import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { GYM_ID } from '@/lib/constants'
import type { Subscription } from '@/lib/types'

const supabase = createClient()

export function useSubscriptions() {
  return useQuery({
    queryKey: ['subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('status', 'active')
      if (error) throw error
      return data as Subscription[]
    },
  })
}

export function useRenewSubscription() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      memberId,
      membershipId,
      startDate,
      endDate,
      amount,
      paymentMethod,
      membershipType,
      ptPayment,
    }: {
      memberId: string
      membershipId?: string
      startDate?: string
      endDate?: string
      amount?: number
      paymentMethod: 'cash' | 'transfer' | 'qris'
      membershipType?: string
      ptPayment?: {
        membershipId: string
        startDate: string
        endDate: string
        amount: number
        membershipType: string
        totalSessions: number
      }
    }) => {
      let subId = null;

      if (membershipId && startDate && endDate && amount !== undefined && membershipType) {
        // Nonaktifkan subscription GYM lama saja (JANGAN sentuh PT!)
        const { data: gymSubs } = await supabase
          .from('subscriptions')
          .select('id, memberships!inner(category)')
          .eq('member_id', memberId)
          .eq('status', 'active')
          .eq('memberships.category', 'gym')

        if (gymSubs && gymSubs.length > 0) {
          await supabase
            .from('subscriptions')
            .update({ status: 'expired' })
            .in('id', gymSubs.map((s: any) => s.id))
        }

        // Buat subscription gym baru
        const { data: sub, error: subError } = await supabase
          .from('subscriptions')
          .insert({
            member_id: memberId,
            membership_id: membershipId,
            start_date: startDate,
            end_date: endDate,
            status: 'active',
          })
          .select()
          .single()
        if (subError) throw subError
        subId = sub.id

        // Insert gym payment
        const { error: payError } = await supabase
          .from('payments')
          .insert({
            gym_id: GYM_ID,
            member_id: memberId,
            amount,
            payment_method: paymentMethod,
            membership_type: membershipType,
            paid_at: startDate,
          })
        if (payError) throw payError
      }

      // Jika ada PT package, buat subscription + payment PT juga
      if (ptPayment) {
        const { error: ptSubError } = await supabase
          .from('subscriptions')
          .insert({
            member_id: memberId,
            membership_id: ptPayment.membershipId,
            start_date: ptPayment.startDate,
            end_date: ptPayment.endDate,
            remaining_sessions: ptPayment.totalSessions,
            status: 'active',
          })
        if (ptSubError) throw ptSubError

        const { error: ptPayError } = await supabase
          .from('payments')
          .insert({
            gym_id: GYM_ID,
            member_id: memberId,
            amount: ptPayment.amount,
            payment_method: paymentMethod,
            membership_type: ptPayment.membershipType,
            notes: 'Pembayaran Paket PT (Perpanjangan)',
            paid_at: ptPayment.startDate,
          })
        if (ptPayError) throw ptPayError
      }

      // Audit log
      await supabase.from('activity_logs').insert({
        gym_id: GYM_ID,
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        action_type: 'renew_subscription',
        table_name: 'subscriptions',
        record_id: subId || 'PT_ONLY_RENEWAL',
        details: { has_gym: !!membershipId, has_pt: !!ptPayment },
      })

      return true
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      queryClient.invalidateQueries({ queryKey: ['members-with-subscription'] })
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['revenue-monthly'] })
      queryClient.invalidateQueries({ queryKey: ['revenue-current-month'] })
      queryClient.invalidateQueries({ queryKey: ['critical-count'] })
      queryClient.invalidateQueries({ queryKey: ['overview'] })
      queryClient.invalidateQueries({ queryKey: ['expiry'] })
      queryClient.invalidateQueries({ queryKey: ['pt-active-members'] })
    },
  })
}
