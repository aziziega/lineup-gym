'use client'

import { createClient } from '@/lib/supabase/client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

export type UserRole = 'admin' | 'staff'

export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  last_seen_at: string
}

export function useAuth() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [session, setSession] = useState<any>(null)
  const [loadingSession, setLoadingSession] = useState(true)

  useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoadingSession(false)
    })

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (_event === 'SIGNED_OUT') {
        queryClient.clear()
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase, queryClient])

  // 3. Fetch profile with React Query
  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ['profile', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
      
      if (error) throw error
      return data as UserProfile
    },
    enabled: !!session?.user?.id,
  })

  // 4. Update last seen periodically
  useEffect(() => {
    if (!session?.user?.id) return

    const updateLastSeen = async () => {
      await supabase
        .from('profiles')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', session.user.id)
    }

    const interval = setInterval(updateLastSeen, 1000 * 60 * 5) // Every 5 minutes
    updateLastSeen() // Initial update

    return () => clearInterval(interval)
  }, [session?.user?.id, supabase])

  return {
    user: session?.user ?? null,
    profile: profile ?? null,
    role: profile?.role ?? 'staff',
    isAdmin: profile?.role === 'admin',
    isLoading: loadingSession || loadingProfile,
    supabase,
  }
}
