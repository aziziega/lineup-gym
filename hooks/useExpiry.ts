import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { GYM_ID } from '@/lib/constants'
import type { ActiveSubscriptionView } from '@/lib/types'

const supabase = createClient()

export function useExpiry() {
  return useQuery({
    queryKey: ['expiry'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('active_subscriptions_view')
        .select('*')
        .eq('gym_id', GYM_ID)
        .or('days_remaining.lte.30,pt_remaining_sessions.eq.0')
      if (error) throw error
      return data as ActiveSubscriptionView[]
    },
  })
}

export function useExpiryStats() {
  return useQuery({
    queryKey: ['expiry-stats'],
    queryFn: async () => {
      // Ambil data yang lebih luas tanpa filter or yang rumit di awal
      const { data, error } = await supabase
        .from('active_subscriptions_view')
        .select('*')
        .eq('gym_id', GYM_ID)
      
      if (error) throw error

      const list = data || []
      
      return {
        todayCount: list.filter((d) => 
          (d.days_remaining !== null && d.days_remaining <= 0) || 
          (d.pt_remaining_sessions !== null && d.pt_remaining_sessions === 0)
        ).length,
        criticalCount: list.filter((d) => 
          d.days_remaining !== null && d.days_remaining > 0 && d.days_remaining <= 3
        ).length,
        soonCount: list.filter((d) => 
          d.days_remaining !== null && d.days_remaining > 3 && d.days_remaining <= 7
        ).length,
      }
    },
  })
}
