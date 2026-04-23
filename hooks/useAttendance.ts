import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { GYM_ID } from '@/lib/constants'
import type { AttendanceLog } from '@/lib/types'

const supabase = createClient()

export function useTodayAttendance() {
  const today = new Date().toISOString().split('T')[0]
  return useQuery({
    queryKey: ['attendance-today', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance_logs')
        .select('*, members(full_name, phone)')
        .eq('gym_id', GYM_ID)
        .gte('check_in_at', `${today}T00:00:00`)
        .lte('check_in_at', `${today}T23:59:59`)
        .order('check_in_at', { ascending: false })
      if (error) throw error
      return data
    },
    refetchInterval: 30000, // Refresh tiap 30 detik
  })
}

export function useTodayAttendanceCount() {
  const today = new Date().toISOString().split('T')[0]
  return useQuery({
    queryKey: ['attendance-today-count', today],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('attendance_logs')
        .select('*', { count: 'exact', head: true })
        .eq('gym_id', GYM_ID)
        .gte('check_in_at', `${today}T00:00:00`)
        .lte('check_in_at', `${today}T23:59:59`)
      if (error) throw error
      return count ?? 0
    },
  })
}

export function useCheckIn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (memberId: string) => {
      const userId = (await supabase.auth.getUser()).data.user?.id

      const { data, error } = await supabase
        .from('attendance_logs')
        .insert({
          gym_id: GYM_ID,
          member_id: memberId,
          checked_by: userId,
        })
        .select()
        .single()
      if (error) throw error

      // Audit log
      await supabase.from('activity_logs').insert({
        gym_id: GYM_ID,
        admin_id: userId,
        action_type: 'check_in',
        table_name: 'attendance_logs',
        record_id: data.id,
        details: { new_data: data },
      })

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] })
      queryClient.invalidateQueries({ queryKey: ['attendance-today-count'] })
      queryClient.invalidateQueries({ queryKey: ['overview'] })
    },
  })
}
