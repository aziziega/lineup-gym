import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { GYM_ID } from '@/lib/constants'
import { compressImageToWebp } from '@/lib/utils'
import type { PtProgressLog, MemberBodyMetric, PtProgressCategory, ExerciseItem, BodyMetricPhase, BodyMeasurements } from '@/lib/types'

const supabase = createClient()

export interface PtProgressLogWithMember extends PtProgressLog {
  member_name?: string
  member_phone?: string
  is_attendance_only?: boolean
  subscription_id?: string | null
}

// 1. QUERY: Ambil Catatan Latihan Sesi PT (Detail Latihan + Absensi Sesi Selesai)
export function usePtProgressLogs(memberId?: string) {
  return useQuery({
    queryKey: ['pt-progress-logs', memberId],
    queryFn: async () => {
      if (!memberId) return []

      // 1. Ambil catatan latihan detail dari pt_progress_logs (join ke pt_sessions untuk tanggal sesi asli)
      const { data: logsData, error: logsError } = await supabase
        .from('pt_progress_logs')
        .select(`
          *,
          members (full_name, phone),
          pt_sessions (id, session_date, session_time, subscription_id)
        `)
        .eq('gym_id', GYM_ID)
        .eq('member_id', memberId)
        .order('created_at', { ascending: false })

      if (logsError) throw logsError

      // 2. Ambil sesi kehadiran selesai dari pt_sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('pt_sessions')
        .select(`
          *,
          members (full_name, phone)
        `)
        .eq('gym_id', GYM_ID)
        .eq('member_id', memberId)
        .eq('is_completed', true)
        .order('session_date', { ascending: false })

      if (sessionsError) throw sessionsError

      const formattedLogs: PtProgressLogWithMember[] = (logsData || []).map((log: any) => {
        // Jika log terhubung dengan sesi jadwal tertentu yang memiliki session_date,
        // gunakan session_date tersebut sebagai created_at agar selalu tampil di hari jadwalnya
        let effectiveCreatedAt = log.created_at
        if (log.pt_sessions?.session_date) {
          const timeStr = log.pt_sessions.session_time
            ? (log.pt_sessions.session_time.length === 5 ? `${log.pt_sessions.session_time}:00` : log.pt_sessions.session_time)
            : '10:00:00'
          effectiveCreatedAt = `${log.pt_sessions.session_date}T${timeStr}`
        }

        return {
          ...log,
          created_at: effectiveCreatedAt,
          member_name: log.members?.full_name,
          member_phone: log.members?.phone,
          is_attendance_only: false,
          subscription_id: log.pt_sessions?.subscription_id || null,
        }
      })

      // Lacak relasi agar sesi yang sudah memiliki catatan latihan detail tidak dobel
      const linkedSessionIds = new Set<string>()
      const dateLogsCount: Record<string, number> = {}

      formattedLogs.forEach((log) => {
        if (log.pt_session_id) {
          linkedSessionIds.add(log.pt_session_id)
        } else {
          const d = new Date(log.created_at)
          const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          dateLogsCount[dateKey] = (dateLogsCount[dateKey] || 0) + 1
        }
      })

      // Sintesis log absensi fallback untuk sesi completed tanpa catatan gerakan detail
      const synthesizedLogs: PtProgressLogWithMember[] = []
      for (const session of (sessionsData || []) as any[]) {
        if (linkedSessionIds.has(session.id)) {
          continue
        }

        // Jika pada tanggal yang sama sudah ada catatan latihan mandiri/live tanpa id sesi, pasangkan
        if (dateLogsCount[session.session_date] && dateLogsCount[session.session_date] > 0) {
          dateLogsCount[session.session_date]--
          continue
        }

        const timeStr = session.session_time
          ? (session.session_time.length === 5 ? `${session.session_time}:00` : session.session_time)
          : '10:00:00'
        const createdAt = `${session.session_date}T${timeStr}`

        synthesizedLogs.push({
          id: `session-${session.id}`,
          gym_id: session.gym_id,
          pt_session_id: session.id,
          member_id: session.member_id,
          category: 'Lainnya',
          exercises: [],
          notes: session.notes || 'Sesi selesai via jadwal absensi PT',
          trainer_name: session.trainer_name || null,
          recorded_by: null,
          created_at: createdAt,
          member_name: session.members?.full_name,
          member_phone: session.members?.phone,
          is_attendance_only: true,
          subscription_id: session.subscription_id || null,
        })
      }

      const combined = [...formattedLogs, ...synthesizedLogs]
      combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      return combined
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

      let targetSessionId = payload.pt_session_id
      let targetSubscriptionId: string | null = null
      let shouldDecrement = true
      let sessionData: any = null

      // 1. Jika ada targetSessionId yang dipassing (misal dari jadwal tertentu):
      if (targetSessionId) {
        // 🔒 Keamanan vuln-0001: Verifikasi ketat sesi harus milik member dan gym yang valid
        const { data: sessCheck, error: sessCheckErr } = await supabase
          .from('pt_sessions')
          .select('id, member_id, gym_id, is_completed, subscription_id, session_date, session_time')
          .eq('id', targetSessionId)
          .eq('member_id', payload.member_id)
          .eq('gym_id', GYM_ID)
          .maybeSingle()

        if (sessCheckErr) {
          console.error('Error verifying pt_session:', sessCheckErr)
          throw new Error('Gagal memverifikasi sesi PT')
        }

        if (!sessCheck) {
          throw new Error('Sesi PT tidak ditemukan atau bukan milik member yang dipilih!')
        }

        sessionData = sessCheck

        if (sessCheck?.subscription_id) {
          // 🔒 Pastikan subscription_id dari sesi ini benar-benar milik member ini
          const { data: subVerify } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('id', sessCheck.subscription_id)
            .eq('member_id', payload.member_id)
            .maybeSingle()

          if (subVerify) {
            targetSubscriptionId = subVerify.id
          }
        }

        if (sessCheck?.is_completed) {
          // Sesi sudah selesai sebelumnya, jangan potong kuota lagi
          shouldDecrement = false
        } else {
          // 🔒 Optimistic lock: Tandai sesi selesai dan pastikan is_completed masih false saat update
          const { data: updatedSess, error: updateSessErr } = await supabase
            .from('pt_sessions')
            .update({
              is_completed: true,
              completed_at: new Date().toISOString(),
            })
            .eq('id', targetSessionId)
            .eq('member_id', payload.member_id)
            .eq('gym_id', GYM_ID)
            .eq('is_completed', false)
            .select('id')

          if (updateSessErr) throw updateSessErr

          // Jika tidak ada row yang ter-update (berarti sudah diselesaikan proses paralel lain), jangan potong kuota lagi
          if (!updatedSess || updatedSess.length === 0) {
            shouldDecrement = false
          }
        }
      }

      // 2. Jika targetSubscriptionId belum didapat, cari subscription PT aktif langsung dari tabel subscriptions
      if (!targetSubscriptionId) {
        const { data: activeSub } = await supabase
          .from('subscriptions')
          .select('id, remaining_sessions, status, memberships!inner(category)')
          .eq('member_id', payload.member_id)
          .eq('memberships.category', 'pt')
          .gt('remaining_sessions', 0)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (activeSub?.id) {
          targetSubscriptionId = activeSub.id
        }
      }

      // 3. Fallback jika masih belum ada: cek active_subscriptions_view
      if (!targetSubscriptionId) {
        const { data: viewSub } = await supabase
          .from('active_subscriptions_view')
          .select('pt_subscription_id, pt_remaining_sessions')
          .eq('gym_id', GYM_ID)
          .eq('member_id', payload.member_id)
          .gt('pt_remaining_sessions', 0)
          .not('pt_subscription_id', 'is', null)
          .maybeSingle()

        if (viewSub?.pt_subscription_id) {
          targetSubscriptionId = viewSub.pt_subscription_id
        }
      }

      // Validasi ketat: Jika subscription PT tidak ditemukan atau sisa sesi habis, tolak simpan
      if (!targetSubscriptionId) {
        throw new Error('Member tidak memiliki paket PT aktif atau sisa kuota sesi telah habis.')
      }

      // 4. Jika tidak ada targetSessionId yang dipassing, cari sesi terjadwal hari ini yang belum selesai
      if (!targetSessionId) {
        const { data: todaySession } = await supabase
          .from('pt_sessions')
          .select('id, is_completed, subscription_id, session_date, session_time')
          .eq('gym_id', GYM_ID)
          .eq('member_id', payload.member_id)
          .eq('session_date', todayStr)
          .eq('is_completed', false)
          .order('session_time', { ascending: true })
          .limit(1)
          .maybeSingle()

        if (todaySession) {
          targetSessionId = todaySession.id
          sessionData = todaySession
          if (!targetSubscriptionId && todaySession.subscription_id) {
            targetSubscriptionId = todaySession.subscription_id
          }
          // 🔒 Optimistic lock & strict scoping: Tandai sesi selesai
          const { data: updatedSess, error: updateSessErr } = await supabase
            .from('pt_sessions')
            .update({
              is_completed: true,
              completed_at: new Date().toISOString(),
            })
            .eq('id', targetSessionId)
            .eq('member_id', payload.member_id)
            .eq('gym_id', GYM_ID)
            .eq('is_completed', false)
            .select('id')

          if (updateSessErr) throw updateSessErr
          if (!updatedSess || updatedSess.length === 0) {
            shouldDecrement = false
          }
        } else if (targetSubscriptionId) {
          // Kasus Walk-in: Tidak ada jadwal hari ini, otomatis buat record sesi selesai
          const { data: newSession, error: createSessErr } = await supabase
            .from('pt_sessions')
            .insert({
              gym_id: GYM_ID,
              member_id: payload.member_id,
              subscription_id: targetSubscriptionId,
              session_date: todayStr,
              session_time: nowTimeStr,
              is_completed: true,
              completed_at: new Date().toISOString(),
              notes: 'Sesi Walk-in (Live Workout)',
            })
            .select('id')
            .single()

          if (createSessErr) throw createSessErr
          if (newSession) {
            targetSessionId = newSession.id
          }
        }
      }

      // 5. Potong kuota sesi di subscriptions (jika belum pernah dipotong)
      // 🔒 Optimistic lock & retry: cegah TOCTOU race condition jika 2 request serentak
      if (shouldDecrement && targetSubscriptionId) {
        for (let attempt = 0; attempt < 2; attempt++) {
          const { data: subData, error: subFetchErr } = await supabase
            .from('subscriptions')
            .select('remaining_sessions')
            .eq('id', targetSubscriptionId)
            .eq('member_id', payload.member_id)
            .single()

          if (subFetchErr) throw subFetchErr

          if (!subData || subData.remaining_sessions === null || subData.remaining_sessions <= 0) {
            break
          }

          const currentRemaining = subData.remaining_sessions
          const newRemaining = currentRemaining - 1
          const { data: updatedSub, error: subUpdateErr } = await supabase
            .from('subscriptions')
            .update({
              remaining_sessions: newRemaining,
              ...(newRemaining === 0 ? { status: 'expired' as const } : {}),
            })
            .eq('id', targetSubscriptionId)
            .eq('member_id', payload.member_id)
            .eq('remaining_sessions', currentRemaining)
            .select('id, remaining_sessions')

          if (subUpdateErr) throw subUpdateErr

          if (updatedSub && updatedSub.length > 0) {
            // Catat audit log pemotongan kuota
            await supabase.from('activity_logs').insert({
              gym_id: GYM_ID,
              admin_id: user?.id || null,
              action_type: 'complete_pt_session',
              table_name: 'pt_sessions',
              record_id: targetSessionId || payload.member_id,
              details: {
                subscription_id: targetSubscriptionId,
                remaining_sessions: newRemaining,
                source: 'live_workout',
              },
            })
            break
          }
        }
      }

      // 6. Tanggal efektif log latihan (🔒 Keamanan vuln-0003: Cegah manipulasi timestamp klien):
      // Wajib diturunkan secara resmi dari session_date di database, atau waktu server saat ini untuk walk-in
      let effectiveCreatedAt: string
      if (sessionData?.session_date) {
        const timeStr = sessionData.session_time
          ? (sessionData.session_time.length === 5 ? `${sessionData.session_time}:00` : sessionData.session_time)
          : '10:00:00'
        effectiveCreatedAt = `${sessionData.session_date}T${timeStr}`
      } else {
        effectiveCreatedAt = new Date().toISOString()
      }

      // 7. Simpan catatan latihan ke pt_progress_logs
      const insertData: Record<string, any> = {
        gym_id: GYM_ID,
        member_id: payload.member_id,
        category: payload.category,
        exercises: payload.exercises,
        notes: payload.notes || null,
        pt_session_id: targetSessionId || null,
        recorded_by: user?.id || null,
        created_at: effectiveCreatedAt,
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

// Helper internal rollback kuota subscription (+1 sesi)
async function rollbackQuota(
  targetSubscriptionId: string,
  recordId: string,
  memberId: string,
  isSession: boolean,
  ptSessionId?: string | null
) {
  const { data: currentSub, error: fetchSubErr } = await supabase
    .from('subscriptions')
    .select(`
      id,
      member_id,
      remaining_sessions,
      status,
      total_sessions_override,
      memberships (
        total_sessions
      )
    `)
    .eq('id', targetSubscriptionId)
    .eq('member_id', memberId)
    .single()

  if (fetchSubErr) {
    console.warn('Gagal mengambil subscription untuk rollback:', fetchSubErr)
    return
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

      const { data: updatedSub, error: subUpdateErr } = await supabase
        .from('subscriptions')
        .update({
          remaining_sessions: newRemaining,
          status: newStatus,
        })
        .eq('id', currentSub.id)
        .eq('member_id', memberId)
        .eq('remaining_sessions', currentRemaining) // 🔒 Optimistic lock
        .select('id')

      if (subUpdateErr) {
        console.error('Gagal mengembalikan kuota sesi:', subUpdateErr)
        throw subUpdateErr
      }

      if (updatedSub && updatedSub.length > 0) {
        // Catat activity log audit
        const user = (await supabase.auth.getUser()).data.user
        await supabase.from('activity_logs').insert({
          gym_id: GYM_ID,
          admin_id: user?.id || null,
          action_type: 'delete_pt_session_and_refund',
          table_name: isSession ? 'pt_sessions' : 'pt_progress_logs',
          record_id: recordId,
          details: {
            member_id: memberId,
            pt_session_id: ptSessionId || null,
            subscription_id: targetSubscriptionId,
            refunded_sessions: 1,
            new_remaining: newRemaining,
            total_allowed: totalAllowed,
          },
        })
      }
    }
  }
}

// 3. MUTATION: Hapus Catatan Latihan & Rollback Kuota (+1 Sesi & Hapus Jadwal Terkait Opsi A)
export function useDeletePtProgressLog() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (args: string | { logId: string; memberId?: string }) => {
      const logId = typeof args === 'string' ? args : args.logId
      const deleteMemberId = typeof args === 'string' ? undefined : args.memberId

      // Kasus A: Log disintesis dari pt_sessions (attendance only)
      if (logId.startsWith('session-')) {
        const sessionId = logId.replace('session-', '')

        let query = supabase
          .from('pt_sessions')
          .select('id, gym_id, member_id, subscription_id, session_date, is_completed')
          .eq('id', sessionId)
          .eq('gym_id', GYM_ID)

        if (deleteMemberId) {
          query = query.eq('member_id', deleteMemberId)
        }

        const { data: sessionData, error: sessErr } = await query.maybeSingle()

        if (sessErr) throw sessErr
        if (!sessionData) {
          throw new Error('Sesi PT tidak ditemukan atau Anda tidak memiliki akses.')
        }

        if (deleteMemberId && sessionData.member_id !== deleteMemberId) {
          throw new Error('Sesi PT bukan milik member yang dipilih!')
        }

        // 🔒 Keamanan vuln-0002: Hanya refund kuota jika sesi tersebut SUDAH SELESAI (is_completed === true).
        // Sesi yang belum selesai (is_completed === false) belum pernah memotong kuota.
        const wasCompleted = Boolean(sessionData.is_completed)

        const { error: delSessionErr } = await supabase
          .from('pt_sessions')
          .delete()
          .eq('id', sessionId)
          .eq('gym_id', GYM_ID)
          .eq('member_id', sessionData.member_id)

        if (delSessionErr) throw delSessionErr

        // Refund kuota hanya jika sesi sebelumnya berstatus completed
        if (wasCompleted) {
          let targetSubscriptionId = sessionData.subscription_id

          // Jika targetSubscriptionId tidak ada, cocokkan subscription aktif sesuai session_date
          if (!targetSubscriptionId && sessionData.member_id && sessionData.session_date) {
            const { data: matchedSub } = await supabase
              .from('subscriptions')
              .select('id, remaining_sessions, status, memberships!inner(category)')
              .eq('member_id', sessionData.member_id)
              .eq('memberships.category', 'pt')
              .lte('start_date', sessionData.session_date)
              .gte('end_date', sessionData.session_date)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()

            if (matchedSub?.id) {
              targetSubscriptionId = matchedSub.id
            } else {
              console.warn('Subscription pemilik sesi tidak dapat dipastikan; refund kuota dilewati untuk mencegah inflasi kuota.')
            }
          }

          if (targetSubscriptionId && sessionData.member_id) {
            await rollbackQuota(targetSubscriptionId, sessionId, sessionData.member_id, true, sessionId)
          }
        }

        return
      }

      // Kasus B: Log detail dari pt_progress_logs
      let logQuery = supabase
        .from('pt_progress_logs')
        .select('id, member_id, pt_session_id, created_at')
        .eq('id', logId)
        .eq('gym_id', GYM_ID)

      if (deleteMemberId) {
        logQuery = logQuery.eq('member_id', deleteMemberId)
      }

      const { data: log, error: fetchErr } = await logQuery.maybeSingle()

      if (fetchErr) throw fetchErr
      if (!log) {
        throw new Error('Catatan latihan tidak ditemukan atau Anda tidak memiliki akses.')
      }

      if (deleteMemberId && log.member_id !== deleteMemberId) {
        throw new Error('Catatan latihan bukan milik member yang dipilih!')
      }

      let targetSubscriptionId: string | null = null

      // 2. Jika ada jadwal pt_session_id terkait, ambil subscription_id sebelum dihapus
      if (log.pt_session_id) {
        const { data: sessionData } = await supabase
          .from('pt_sessions')
          .select('id, gym_id, member_id, subscription_id, session_date')
          .eq('id', log.pt_session_id)
          .eq('gym_id', GYM_ID)
          .eq('member_id', log.member_id)
          .maybeSingle()

        if (sessionData?.subscription_id) {
          targetSubscriptionId = sessionData.subscription_id
        }

        // Hapus sesi dari pt_sessions (Opsi A) scoped gym_id & member_id
        const { error: delSessionErr } = await supabase
          .from('pt_sessions')
          .delete()
          .eq('id', log.pt_session_id)
          .eq('gym_id', GYM_ID)
          .eq('member_id', log.member_id)

        if (delSessionErr) console.warn('Gagal menghapus pt_sessions terkait:', delSessionErr)

        // 🔒 Keamanan vuln-0002: Jika targetSubscriptionId tidak ada, JANGAN asal credit paket terbaru.
        // Cocokkan secara presisi dengan subscription yang menaungi tanggal sesi / catatan latihan ini.
        if (!targetSubscriptionId && log.member_id) {
          const logDate = sessionData?.session_date || (log.created_at ? log.created_at.slice(0, 10) : null)
          if (logDate) {
            const { data: matchedSub, error: findSubErr } = await supabase
              .from('subscriptions')
              .select('id, remaining_sessions, status, memberships!inner(category)')
              .eq('member_id', log.member_id)
              .eq('memberships.category', 'pt')
              .lte('start_date', logDate)
              .gte('end_date', logDate)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()

            if (findSubErr) console.warn('Gagal mencari subscription PT member sesuai rentang tanggal:', findSubErr)
            if (matchedSub?.id) {
              targetSubscriptionId = matchedSub.id
            } else {
              console.warn('Subscription pemilik catatan latihan tidak dapat dipastikan; refund kuota dilewati untuk mencegah inflasi kuota.')
            }
          }
        }
      }

      // 3. Rollback kuota HANYA JIKA targetSubscriptionId terverifikasi sah
      if (targetSubscriptionId && log.member_id) {
        await rollbackQuota(targetSubscriptionId, logId, log.member_id, false, log.pt_session_id)
      }

      // 4. Hapus catatan pt_progress_logs scoped gym_id & member_id
      const { error: delLogErr } = await supabase
        .from('pt_progress_logs')
        .delete()
        .eq('id', logId)
        .eq('gym_id', GYM_ID)
        .eq('member_id', log.member_id)

      if (delLogErr) throw delLogErr
    },
    onSuccess: (_, args) => {
      const deleteMemberId = typeof args === 'string' ? undefined : args?.memberId
      queryClient.invalidateQueries({ queryKey: ['pt-progress-logs'] })
      if (deleteMemberId) {
        queryClient.invalidateQueries({ queryKey: ['pt-progress-logs', deleteMemberId] })
      }
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
        weight_kg: payload.weight_kg,
        measurements: payload.measurements || {},
        phase: payload.phase || 'regular',
        notes: payload.notes || null,
        recorded_at: payload.recorded_at || new Date().toISOString(),
      }

      if (payload.photo_front_url !== undefined) recordData.photo_front_url = payload.photo_front_url
      if (payload.photo_side_url !== undefined) recordData.photo_side_url = payload.photo_side_url
      if (payload.photo_back_url !== undefined) recordData.photo_back_url = payload.photo_back_url

      if (payload.id) {
        // Ownership pre-check before update (vuln-0002)
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

        // NOTE (vuln-0004): On UPDATE, do NOT include member_id (immutable) or recorded_by (preserve creator audit trail)
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
        // On INSERT, set immutable member_id and creator recorded_by
        recordData.member_id = payload.member_id
        recordData.recorded_by = user?.id || null

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

// 7. MUTATION: Hapus Metrik Tubuh (scoped by id & memberId)
export function useDeleteBodyMetric() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, memberId }: { id: string; memberId: string }) => {
      const { error } = await supabase
        .from('member_body_metrics')
        .delete()
        .eq('id', id)
        .eq('member_id', memberId)

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['member-body-metrics', variables.memberId] })
    },
  })
}

// 8. MUTATION: Hapus Foto Spesifik pada Metrik Tubuh (Depan, Samping, atau Belakang) & Storage Cleanup (vuln-0001, vuln-0005)
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

      // 3. Hapus file fisik dari Supabase Storage jika ada (dengan isolasi prefix path folder member - vuln-0005)
      if (photoUrlBeforeNull) {
        try {
          const pathSegments = photoUrlBeforeNull.split('/pt-progress/')
          if (pathSegments.length > 1) {
            const storagePath = decodeURIComponent(pathSegments[1].split('?')[0])
            const expectedPrefix = `${GYM_ID}/${memberId}/`
            if (storagePath && storagePath.startsWith(expectedPrefix)) {
              await supabase.storage.from('pt-progress').remove([storagePath])
            } else {
              console.warn('[Security Guard] Storage path prefix tidak sesuai dengan member:', storagePath)
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
