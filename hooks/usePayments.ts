import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { GYM_ID } from '@/lib/constants'
import type { Payment } from '@/lib/types'

const supabase = createClient()

export function usePayments() {
  return useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*, members(full_name)')
        .eq('gym_id', GYM_ID)
        .order('paid_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useMonthlyRevenue() {
  return useQuery({
    queryKey: ['revenue-monthly'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('revenue_monthly_view')
        .select('*')
      if (error) throw error
      return data
    },
  })
}

export function useCurrentMonthRevenue() {
  return useQuery({
    queryKey: ['revenue-current-month'],
    queryFn: async () => {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

      const { data, error } = await supabase
        .from('payments')
        .select('amount')
        .eq('gym_id', GYM_ID)
        .gte('paid_at', startOfMonth)
        .lte('paid_at', endOfMonth)
      if (error) throw error

      const total = (data || []).reduce((sum, p) => sum + Number(p.amount), 0)
      return { total, count: data?.length ?? 0 }
    },
  })
}

export function useCreatePayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payment: Omit<Payment, 'id' | 'gym_id' | 'created_at' | 'paid_at'> & { paid_at?: string }) => {
      const { data, error } = await supabase
        .from('payments')
        .insert({ ...payment, gym_id: GYM_ID })
        .select()
        .single()
      if (error) throw error

      await supabase.from('activity_logs').insert({
        gym_id: GYM_ID,
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        action_type: 'create_payment',
        table_name: 'payments',
        record_id: data.id,
        details: { new_data: data },
      })

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['revenue-monthly'] })
      queryClient.invalidateQueries({ queryKey: ['revenue-current-month'] })
      queryClient.invalidateQueries({ queryKey: ['overview'] })
    },
  })
}

export function useUpdatePayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Payment> }) => {
      const { data: old } = await supabase.from('payments').select().eq('id', id).single()
      const { data: updated, error } = await supabase
        .from('payments')
        .update(data)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error

      await supabase.from('activity_logs').insert({
        gym_id: GYM_ID,
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        action_type: 'update_payment',
        table_name: 'payments',
        record_id: id,
        details: { old_data: old, new_data: updated }
      })

      return updated
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['revenue-monthly'] })
      queryClient.invalidateQueries({ queryKey: ['revenue-current-month'] })
      queryClient.invalidateQueries({ queryKey: ['overview'] })
    },
  })
}

export function useDeletePayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: old } = await supabase.from('payments').select().eq('id', id).single()
      const { error } = await supabase.from('payments').delete().eq('id', id)
      if (error) throw error

      await supabase.from('activity_logs').insert({
        gym_id: GYM_ID,
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        action_type: 'delete_payment',
        table_name: 'payments',
        record_id: id,
        details: { old_data: old }
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['revenue-monthly'] })
      queryClient.invalidateQueries({ queryKey: ['revenue-current-month'] })
      queryClient.invalidateQueries({ queryKey: ['overview'] })
    },
  })
}
