import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { GYM_ID } from '@/lib/constants'
import { compressImageToWebp } from '@/lib/utils'
import type { PtProgressLog, MemberBodyMetric, PtProgressCategory, ExerciseItem, BodyMetricPhase, BodyMeasurements } from '@/lib/types'

const supabase = createClient()

export interface PtProgressLogWithMember extends PtProgressLog {
  member_name?: string
  member_phone?: string
}

// 1. QUERY: Ambil Catatan Latihan Sesi PT
export function usePtProgressLogs(memberId?: string) {
  return useQuery({
    queryKey: ['pt-progress-logs', memberId],
    queryFn: async () => {
      if (!memberId) return []

      const { data, error } = await supabase
        .from('pt_progress_logs')
        .select(`
          *,
          members (full_name, phone)
        `)
        .eq('gym_id', GYM_ID)
        .eq('member_id', memberId)
        .order('created_at', { ascending: false })

      if (error) throw error

      return (data || []).map((log: any) => ({
        ...log,
        member_name: log.members?.full_name,
        member_phone: log.members?.phone,
      })) as PtProgressLogWithMember[]
    },
    enabled: !!memberId,
  })
}

// 1b. QUERY: Ambil Ringkasan Sesi Latihan Terakhir Semua Member PT (untuk direktori)
export function useLatestPtProgressLogs() {
  return useQuery({
    queryKey: ['pt-progress-logs', 'latest-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pt_progress_logs')
        .select('member_id, category, created_at')
        .eq('gym_id', GYM_ID)
        .order('created_at', { ascending: false })

      if (error) throw error

      const map: Record<string, { category: PtProgressCategory; created_at: string }> = {}
      for (const log of (data || []) as any[]) {
        if (!map[log.member_id]) {
          map[log.member_id] = log
        }
      }
      return map
    },
    staleTime: 30000,
  })
}

// 2. MUTATION: Buat Catatan Latihan Baru & Selesaikan Sesi PT (Potong Kuota Otomatis)
export function useCreatePtProgressLog() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      member_id: string
      category: PtProgressCategory
      exercises: ExerciseItem[]
      notes?: string | null
      pt_session_id?: string | null
      trainer_name?: string | null
    }) => {
      const user = (await supabase.auth.getUser()).data.user
      const todayStr = new Date().toLocaleDateString('sv-SE')
      const nowTimeStr = new Date().toTimeString().slice(0, 5)

      // 1. Dapatkan subscription PT aktif untuk member ini
      const { data: activeSub } = await supabase
        .from('active_subscriptions_view')
        .select('pt_subscription_id, pt_remaining_sessions')
        .eq('gym_id', GYM_ID)
        .eq('member_id', payload.member_id)
        .gt('pt_remaining_sessions', 0)
        .not('pt_subscription_id', 'is', null)
        .maybeSingle()

      const subscriptionId = activeSub?.pt_subscription_id
      let targetSessionId = payload.pt_session_id
      let shouldDecrement = true

      // 2. Jika tidak ada pt_session_id yang dipassing, cari sesi terjadwal hari ini yang belum selesai
      if (!targetSessionId) {
        const { data: todaySession } = await supabase
          .from('pt_sessions')
          .select('id, is_completed, subscription_id')
          .eq('gym_id', GYM_ID)
          .eq('member_id', payload.member_id)
          .eq('session_date', todayStr)
          .eq('is_completed', false)
          .order('session_time', { ascending: true })
          .limit(1)
          .maybeSingle()

        if (todaySession) {
          targetSessionId = todaySession.id
        }
      }

      // 3. Cek apakah sesi ini sudah pernah diselesaikan sebelumnya (cegah double decrement)
      if (targetSessionId) {
        const { data: sessCheck } = await supabase
          .from('pt_sessions')
          .select('id, is_completed, subscription_id')
          .eq('id', targetSessionId)
          .maybeSingle()

        if (sessCheck?.is_completed) {
          // Sesi sudah selesai sebelumnya, jangan potong kuota lagi
          shouldDecrement = false
        } else {
          // Tandai sesi selesai sekarang
          await supabase
            .from('pt_sessions')
            .update({
              is_completed: true,
              completed_at: new Date().toISOString(),
            })
            .eq('id', targetSessionId)
        }
      } else if (subscriptionId) {
        // Kasus Walk-in: Tidak ada jadwal hari ini, otomatis buat record sesi selesai
        const { data: newSession, error: createSessErr } = await supabase
          .from('pt_sessions')
          .insert({
            gym_id: GYM_ID,
            member_id: payload.member_id,
            subscription_id: subscriptionId,
            session_date: todayStr,
            session_time: nowTimeStr,
            is_completed: true,
            completed_at: new Date().toISOString(),
            notes: 'Sesi Walk-in (Live Workout)',
          })
          .select('id')
          .single()

        if (!createSessErr && newSession) {
          targetSessionId = newSession.id
        }
      }

      // 4. Potong kuota sesi di subscriptions (jika belum pernah dipotong)
      if (shouldDecrement && subscriptionId) {
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('remaining_sessions')
          .eq('id', subscriptionId)
          .single()

        if (subData && subData.remaining_sessions !== null && subData.remaining_sessions > 0) {
          const newRemaining = subData.remaining_sessions - 1
          await supabase
            .from('subscriptions')
            .update({
              remaining_sessions: newRemaining,
              ...(newRemaining === 0 ? { status: 'expired' as const } : {}),
            })
            .eq('id', subscriptionId)

          // Catat audit log pemotongan kuota
          await supabase.from('activity_logs').insert({
            gym_id: GYM_ID,
            admin_id: user?.id || null,
            action_type: 'complete_pt_session',
            table_name: 'pt_sessions',
            record_id: targetSessionId || payload.member_id,
            details: {
              subscription_id: subscriptionId,
              remaining_sessions: newRemaining,
              source: 'live_workout',
            },
          })
        }
      }

      // 5. Simpan catatan latihan ke pt_progress_logs
      const insertData: Record<string, any> = {
        gym_id: GYM_ID,
        member_id: payload.member_id,
        category: payload.category,
        exercises: payload.exercises,
        notes: payload.notes || null,
        pt_session_id: targetSessionId || null,
        recorded_by: user?.id || null,
      }

      if (payload.trainer_name && payload.trainer_name.trim()) {
        insertData.trainer_name = payload.trainer_name.trim()
      }

      let { data, error } = await supabase
        .from('pt_progress_logs')
        .insert(insertData)
        .select()
        .single()

      // Graceful fallback jika kolom trainer_name belum dimigrasi di database (error code 42703)
      if (error && (error.code === '42703' || error.message?.includes('trainer_name'))) {
        delete insertData.trainer_name
        const retry = await supabase
          .from('pt_progress_logs')
          .insert(insertData)
          .select()
          .single()
        data = retry.data
        error = retry.error
      }

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pt-progress-logs'] })
      queryClient.invalidateQueries({ queryKey: ['pt-progress-logs', variables.member_id] })
      queryClient.invalidateQueries({ queryKey: ['pt-sessions'] })
      queryClient.invalidateQueries({ queryKey: ['pt-active-members'] })
      queryClient.invalidateQueries({ queryKey: ['members-with-subscription'] })
      queryClient.invalidateQueries({ queryKey: ['expiry'] })
      queryClient.invalidateQueries({ queryKey: ['expiry-stats'] })
    },
  })
}

// 3. MUTATION: Hapus Catatan Latihan & Rollback Kuota (+1 Sesi & Hapus Jadwal Terkait Opsi A)
export function useDeletePtProgressLog() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (logId: string) => {
      // 1. Ambil data log sebelum dihapus untuk mengetahui pt_session_id dan member_id
      const { data: log, error: fetchErr } = await supabase
        .from('pt_progress_logs')
        .select('id, member_id, pt_session_id')
        .eq('id', logId)
        .single()

      if (fetchErr) throw fetchErr

      let targetSubscriptionId: string | null = null

      // 2. Jika ada jadwal pt_session_id terkait, ambil subscription_id sebelum dihapus
      if (log?.pt_session_id) {
        const { data: sessionData } = await supabase
          .from('pt_sessions')
          .select('id, subscription_id')
          .eq('id', log.pt_session_id)
          .maybeSingle()

        if (sessionData?.subscription_id) {
          targetSubscriptionId = sessionData.subscription_id
        }

        // Hapus sesi dari pt_sessions (Opsi A)
        const { error: delSessionErr } = await supabase
          .from('pt_sessions')
          .delete()
          .eq('id', log.pt_session_id)

        if (delSessionErr) console.warn('Gagal menghapus pt_sessions terkait:', delSessionErr)
      }

      // 3. Jika targetSubscriptionId belum didapat, cari subscription PT member
      if (!targetSubscriptionId && log?.member_id) {
        const { data: subData, error: findSubErr } = await supabase
          .from('subscriptions')
          .select('id, remaining_sessions, status, memberships!inner(category)')
          .eq('member_id', log.member_id)
          .eq('memberships.category', 'pt')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (findSubErr) console.warn('Gagal mencari subscription PT member:', findSubErr)
        if (subData?.id) {
          targetSubscriptionId = subData.id
        }
      }

      // 4. Rollback kuota: kembalikan 1 sesi ke subscription member (+1 dengan batas maksimal total_sessions)
      if (targetSubscriptionId) {
        const { data: currentSub, error: fetchSubErr } = await supabase
          .from('subscriptions')
          .select(`
            id,
            remaining_sessions,
            status,
            total_sessions_override,
            memberships (
              total_sessions
            )
          `)
          .eq('id', targetSubscriptionId)
          .single()

        if (fetchSubErr) {
          console.warn('Gagal mengambil subscription untuk rollback:', fetchSubErr)
        }

        if (currentSub && currentSub.remaining_sessions !== null) {
          const totalAllowed =
            currentSub.total_sessions_override ??
            (currentSub.memberships as any)?.total_sessions ??
            null

          const currentRemaining = currentSub.remaining_sessions ?? 0

          // Invariant Check: Cegah inflasi kuota jika sudah mencapai atau melebihi total paket yang dibeli
          if (totalAllowed !== null && currentRemaining >= totalAllowed) {
            console.warn('Rollback kuota dibatalkan: Kuota member sudah mencapai batas maksimal paket yang dibeli.', {
              currentRemaining,
              totalAllowed,
            })
          } else {
            // Clamping: Kuota baru tidak boleh melebihi total paket yang dibeli
            const newRemaining =
              totalAllowed !== null
                ? Math.min(totalAllowed, currentRemaining + 1)
                : currentRemaining + 1

            // Invariant Check: Status hanya diubah ke 'active' jika kuota > 0
            const newStatus = newRemaining > 0 ? 'active' : currentSub.status

            const { error: subUpdateErr } = await supabase
              .from('subscriptions')
              .update({
                remaining_sessions: newRemaining,
                status: newStatus,
              })
              .eq('id', currentSub.id)

            if (subUpdateErr) {
              console.error('Gagal mengembalikan kuota sesi:', subUpdateErr)
              throw subUpdateErr
            }

            // Catat activity log audit
            const user = (await supabase.auth.getUser()).data.user
            await supabase.from('activity_logs').insert({
              gym_id: GYM_ID,
              admin_id: user?.id || null,
              action_type: 'delete_pt_session_and_refund',
              table_name: 'pt_progress_logs',
              record_id: logId,
              details: {
                member_id: log.member_id,
                pt_session_id: log.pt_session_id,
                subscription_id: targetSubscriptionId,
                refunded_sessions: 1,
                new_remaining: newRemaining,
                total_allowed: totalAllowed,
              },
            })
          }
        }
      }

      // 5. Hapus catatan pt_progress_logs
      const { error: delLogErr } = await supabase
        .from('pt_progress_logs')
        .delete()
        .eq('id', logId)

      if (delLogErr) throw delLogErr
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-progress-logs'] })
      queryClient.invalidateQueries({ queryKey: ['pt-sessions'] })
      queryClient.invalidateQueries({ queryKey: ['pt-active-members'] })
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      queryClient.invalidateQueries({ queryKey: ['members-with-subscription'] })
      queryClient.invalidateQueries({ queryKey: ['expiry'] })
      queryClient.invalidateQueries({ queryKey: ['expiry-stats'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })
}

// 4. QUERY: Ambil Metrik Tubuh (Berat & Ukuran) Member
export function useMemberBodyMetrics(memberId?: string) {
  return useQuery({
    queryKey: ['member-body-metrics', memberId],
    queryFn: async () => {
      if (!memberId) return []

      const { data, error } = await supabase
        .from('member_body_metrics')
        .select('*')
        .eq('gym_id', GYM_ID)
        .eq('member_id', memberId)
        .order('recorded_at', { ascending: true }) // ASC untuk urutan kronologis grafik

      if (error) throw error
      return (data || []) as MemberBodyMetric[]
    },
    enabled: !!memberId,
  })
}

// 5. MUTATION: Upload Foto Progress dengan Kompresi WebP
export async function uploadProgressPhoto(
  file: File,
  memberId: string,
  tag: 'front' | 'side' | 'back'
): Promise<string> {
  // Kompres client-side ke WebP (target ~80-120KB)
  const compressed = await compressImageToWebp(file, 1200, 0.72)
  const timestamp = Date.now()
  const path = `${GYM_ID}/${memberId}/${timestamp}_${tag}.webp`

  const { error: uploadError } = await supabase.storage
    .from('pt-progress')
    .upload(path, compressed, {
      contentType: 'image/webp',
      upsert: true,
    })

  if (uploadError) throw uploadError

  const { data } = supabase.storage.from('pt-progress').getPublicUrl(path)
  return data.publicUrl
}

// 6. MUTATION: Simpan Metrik Tubuh Baru
export function useCreateBodyMetric() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      id?: string
      member_id: string
      weight_kg: number | null
      measurements?: BodyMeasurements
      photo_front_url?: string | null
      photo_side_url?: string | null
      photo_back_url?: string | null
      phase?: BodyMetricPhase
      notes?: string | null
      recorded_at?: string
    }) => {
      const user = (await supabase.auth.getUser()).data.user

      const recordData: any = {
        gym_id: GYM_ID,
        member_id: payload.member_id,
        weight_kg: payload.weight_kg,
        measurements: payload.measurements || {},
        phase: payload.phase || 'regular',
        notes: payload.notes || null,
        recorded_at: payload.recorded_at || new Date().toISOString(),
        recorded_by: user?.id || null,
      }

      if (payload.photo_front_url !== undefined) recordData.photo_front_url = payload.photo_front_url
      if (payload.photo_side_url !== undefined) recordData.photo_side_url = payload.photo_side_url
      if (payload.photo_back_url !== undefined) recordData.photo_back_url = payload.photo_back_url

      if (payload.id) {
        // Server-side ownership pre-check before update (vuln-0002)
        const { data: ownedRow, error: fetchError } = await supabase
          .from('member_body_metrics')
          .select('id')
          .eq('id', payload.id)
          .eq('member_id', payload.member_id)
          .maybeSingle()

        if (fetchError) throw fetchError
        if (!ownedRow) {
          throw new Error('Metrik tidak ditemukan untuk member ini')
        }

        const { data, error } = await supabase
          .from('member_body_metrics')
          .update(recordData)
          .eq('id', payload.id)
          .eq('member_id', payload.member_id)
          .select()
          .single()

        if (error) throw error
        return data
      } else {
        const { data, error } = await supabase
          .from('member_body_metrics')
          .insert(recordData)
          .select()
          .single()

        if (error) throw error
        return data
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['member-body-metrics', variables.member_id] })
    },
  })
}

// 7. MUTATION: Hapus Metrik Tubuh
export function useDeleteBodyMetric() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, memberId }: { id: string; memberId: string }) => {
      const { error } = await supabase
        .from('member_body_metrics')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['member-body-metrics', variables.memberId] })
    },
  })
}

// 8. MUTATION: Hapus Foto Spesifik pada Metrik Tubuh (Depan, Samping, atau Belakang) & Storage Cleanup (vuln-0001)
export function useRemoveBodyMetricPhoto() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      metricId,
      angle,
      memberId,
    }: {
      metricId: string
      angle: 'front' | 'side' | 'back'
      memberId: string
    }) => {
      const field =
        angle === 'front'
          ? 'photo_front_url'
          : angle === 'side'
          ? 'photo_side_url'
          : 'photo_back_url'

      // 1. Ambil URL foto SEBELUM dinull untuk penghapusan file fisik dari storage
      const { data: existingRow, error: fetchError } = await supabase
        .from('member_body_metrics')
        .select(`id, ${field}`)
        .eq('id', metricId)
        .eq('member_id', memberId)
        .maybeSingle()

      if (fetchError) throw fetchError
      if (!existingRow) {
        throw new Error('Metrik tidak ditemukan untuk member ini')
      }

      const photoUrlBeforeNull = (existingRow as any)?.[field] as string | null

      // 2. Set kolom foto ke null di database (scoped id & member_id)
      const { error: updateError } = await supabase
        .from('member_body_metrics')
        .update({ [field]: null })
        .eq('id', metricId)
        .eq('member_id', memberId)

      if (updateError) throw updateError

      // 3. Hapus file fisik dari Supabase Storage jika ada
      if (photoUrlBeforeNull) {
        try {
          const pathSegments = photoUrlBeforeNull.split('/pt-progress/')
          if (pathSegments.length > 1) {
            const storagePath = decodeURIComponent(pathSegments[1].split('?')[0])
            if (storagePath) {
              await supabase.storage.from('pt-progress').remove([storagePath])
            }
          }
        } catch (e) {
          console.warn('Gagal menghapus file dari storage:', e)
        }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['member-body-metrics', variables.memberId] })
    },
  })
}
