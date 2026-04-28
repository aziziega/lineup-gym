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
      const { data, error } = await supabase
        .from('active_subscriptions_view')
        .select('*')
        .eq('gym_id', GYM_ID)
      if (error) throw error
      return data as ActiveSubscriptionView[]
    },
    refetchInterval: 10000, // Auto-refresh tiap 10 detik agar visitor baru langsung muncul
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
    },
  })
}

export function useUpdateMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Member> }) => {
      const { data: old } = await supabase.from('members').select().eq('id', id).single()
      const { data: updated, error } = await supabase
        .from('members')
        .update(data)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error

      await supabase.from('activity_logs').insert({
        gym_id: GYM_ID,
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        action_type: 'update_member',
        table_name: 'members',
        record_id: id,
        details: { old_data: old, new_data: updated }
      })

      return updated
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
      const { data: old } = await supabase.from('members').select().eq('id', id).single()
      
      // Detach payments agar income tidak hilang
      await supabase.from('payments').update({ member_id: null }).eq('member_id', id)
      
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
    },
  })
}
