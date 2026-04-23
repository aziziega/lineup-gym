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
    }: {
      memberId: string
      membershipId: string
      startDate: string
      endDate: string
      amount: number
      paymentMethod: 'cash' | 'transfer' | 'qris'
      membershipType: string
    }) => {
      // Nonaktifkan subscription lama
      await supabase
        .from('subscriptions')
        .update({ status: 'expired' })
        .eq('member_id', memberId)
        .eq('status', 'active')

      // Buat subscription baru
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

      // Insert payment
      const { error: payError } = await supabase
        .from('payments')
        .insert({
          gym_id: GYM_ID,
          member_id: memberId,
          amount,
          payment_method: paymentMethod,
          membership_type: membershipType,
        })
      if (payError) throw payError

      // Audit log
      await supabase.from('activity_logs').insert({
        gym_id: GYM_ID,
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        action_type: 'renew_subscription',
        table_name: 'subscriptions',
        record_id: sub.id,
        details: { new_data: sub },
      })

      return sub
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      queryClient.invalidateQueries({ queryKey: ['members-with-subscription'] })
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['critical-count'] })
      queryClient.invalidateQueries({ queryKey: ['overview'] })
      queryClient.invalidateQueries({ queryKey: ['expiry'] })
    },
  })
}
