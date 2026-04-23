import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { GYM_ID } from '@/lib/constants'
import type { Membership } from '@/lib/types'

const supabase = createClient()

export function useMemberships() {
  return useQuery({
    queryKey: ['memberships'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('memberships')
        .select('*')
        .eq('gym_id', GYM_ID)
        .order('duration_days', { ascending: true })
      if (error) throw error
      return data as Membership[]
    },
  })
}

export function useActiveMemberships() {
  return useQuery({
    queryKey: ['memberships-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('memberships')
        .select('*')
        .eq('gym_id', GYM_ID)
        .eq('is_active', true)
        .order('duration_days', { ascending: true })
      if (error) throw error
      return data as Membership[]
    },
  })
}

export function useCreateMembership() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (membership: Omit<Membership, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('memberships')
        .insert({ ...membership, gym_id: GYM_ID })
        .select()
        .single()
      if (error) throw error

      await supabase.from('activity_logs').insert({
        gym_id: GYM_ID,
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        action_type: 'create_membership',
        table_name: 'memberships',
        record_id: data.id,
        details: { new_data: data },
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships'] })
      queryClient.invalidateQueries({ queryKey: ['memberships-active'] })
    },
  })
}

export function useUpdateMembership() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Membership> }) => {
      const { data: updated, error } = await supabase
        .from('memberships')
        .update(data)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error

      await supabase.from('activity_logs').insert({
        gym_id: GYM_ID,
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        action_type: 'update_membership',
        table_name: 'memberships',
        record_id: id,
        details: { new_data: updated },
      })
      return updated
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships'] })
      queryClient.invalidateQueries({ queryKey: ['memberships-active'] })
    },
  })
}

export function useToggleMembership() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('memberships')
        .update({ is_active })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships'] })
      queryClient.invalidateQueries({ queryKey: ['memberships-active'] })
    },
  })
}
