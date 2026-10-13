import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { GYM_ID } from '@/lib/constants'
import type { PtProgressCategory } from '@/lib/types'

const supabase = createClient()

export interface PtExercisePreset {
  id: string
  gym_id: string
  name: string
  category: PtProgressCategory
  created_at: string
}

// 1. Query: Ambil Semua Preset Gerakan Kustom Gym
export function usePtExercisePresets() {
  return useQuery({
    queryKey: ['pt-exercise-presets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pt_exercise_presets')
        .select('*')
        .eq('gym_id', GYM_ID)
        .order('created_at', { ascending: false })

      if (error) {
        console.warn('Gagal memuat preset kustom (fallback ke default):', error.message)
        return []
      }

      return (data || []) as PtExercisePreset[]
    },
    staleTime: 1000 * 60 * 5, // 5 menit
  })
}

// 2. Mutation: Tambah Preset Gerakan Kustom Baru
export function useCreatePtExercisePreset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { name: string; category: PtProgressCategory }) => {
      const { data, error } = await supabase
        .from('pt_exercise_presets')
        .insert({
          gym_id: GYM_ID,
          name: payload.name.trim(),
          category: payload.category,
        })
        .select()
        .single()

      if (error) throw error
      return data as PtExercisePreset
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-exercise-presets'] })
    },
  })
}

// 3. Mutation: Hapus Preset Gerakan Kustom
export function useDeletePtExercisePreset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pt_exercise_presets')
        .delete()
        .eq('id', id)
        .eq('gym_id', GYM_ID)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-exercise-presets'] })
    },
  })
}
