import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { GYM_ID } from '@/lib/constants'
import type { Class, Booking } from '@/lib/types'

const supabase = createClient()

const dayMap: Record<string, string> = {
  sunday: 'Minggu',
  monday: 'Senin',
  tuesday: 'Selasa',
  wednesday: 'Rabu',
  thursday: 'Kamis',
  friday: 'Jumat',
  saturday: 'Sabtu',
}

export { dayMap }

export function useClasses() {
  return useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('gym_id', GYM_ID)
        .order('start_time', { ascending: true })
      if (error) throw error
      return data as Class[]
    },
  })
}

export function useTodayClasses() {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const today = days[new Date().getDay()]

  return useQuery({
    queryKey: ['classes-today', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('gym_id', GYM_ID)
        .eq('day_of_week', today)
        .eq('is_active', true)
        .order('start_time', { ascending: true })
      if (error) throw error
      return data as Class[]
    },
  })
}

export function useBookingsByDate(classId: string | null, date: string) {
  return useQuery({
    queryKey: ['bookings', classId, date],
    queryFn: async () => {
      if (!classId) return []
      const { data, error } = await supabase
        .from('bookings')
        .select('*, members(full_name, phone)')
        .eq('class_id', classId)
        .eq('booked_date', date)
        .eq('status', 'confirmed')
      if (error) throw error
      return data
    },
    enabled: !!classId,
  })
}

export function useCreateClass() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (cls: Omit<Class, 'id' | 'created_at' | 'updated_at' | 'is_active'>) => {
      const { data, error } = await supabase
        .from('classes')
        .insert({ ...cls, gym_id: GYM_ID, is_active: true })
        .select()
        .single()
      if (error) throw error

      await supabase.from('activity_logs').insert({
        gym_id: GYM_ID,
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        action_type: 'create_class',
        table_name: 'classes',
        record_id: data.id,
        details: { new_data: data },
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] })
      queryClient.invalidateQueries({ queryKey: ['classes-today'] })
    },
  })
}

export function useToggleClass() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('classes')
        .update({ is_active })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] })
      queryClient.invalidateQueries({ queryKey: ['classes-today'] })
    },
  })
}

export function useCreateBooking() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (booking: { member_id: string; class_id: string; booked_date: string }) => {
      const { data, error } = await supabase
        .from('bookings')
        .insert({ ...booking, gym_id: GYM_ID, status: 'confirmed' })
        .select()
        .single()
      if (error) throw error

      await supabase.from('activity_logs').insert({
        gym_id: GYM_ID,
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        action: 'create_booking',
        table_name: 'bookings',
        record_id: data.id,
        new_data: data,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
    },
  })
}

export function useCancelBooking() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
    },
  })
}
