import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { GYM_ID } from '@/lib/constants'
import type { Expense } from '@/lib/types'

const supabase = createClient()

export function useExpenses() {
  return useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('gym_id', GYM_ID)
        .order('expense_date', { ascending: false })
      if (error) throw error
      return data as Expense[]
    },
  })
}

export function useCurrentMonthExpenses() {
  return useQuery({
    queryKey: ['expenses-current-month'],
    queryFn: async () => {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

      const { data, error } = await supabase
        .from('expenses')
        .select('amount')
        .eq('gym_id', GYM_ID)
        .gte('expense_date', startOfMonth)
        .lte('expense_date', endOfMonth)
      if (error) throw error

      const total = (data || []).reduce((sum, e) => sum + Number(e.amount), 0)
      return { total, count: data?.length ?? 0 }
    },
  })
}

export function useCreateExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (expense: Omit<Expense, 'id' | 'created_at' | 'gym_id'>) => {
      const { data, error } = await supabase
        .from('expenses')
        .insert({ ...expense, gym_id: GYM_ID })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['expenses-current-month'] })
      queryClient.invalidateQueries({ queryKey: ['overview'] })
    },
  })
}

export function useDeleteExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('expenses').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['expenses-current-month'] })
      queryClient.invalidateQueries({ queryKey: ['overview'] })
    },
  })
}

export function useUpdateExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Expense> }) => {
      const { data: updated, error } = await supabase
        .from('expenses')
        .update(data)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return updated
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['expenses-current-month'] })
      queryClient.invalidateQueries({ queryKey: ['overview'] })
    },
  })
}
