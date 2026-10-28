'use client'

import { useState, useMemo, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAllPtMembers, usePtSessionsByWeek, usePendingPtSessions, usePtMemberCycles, type PtSubscriptionCycle } from '@/hooks/usePtSessions'
import {
  usePtProgressLogs,
  useDeletePtProgressLog,
  useMemberBodyMetrics,
  useDeleteBodyMetric,
} from '@/hooks/usePtProgress'
import MemberCombobox from '@/components/dashboard/MemberCombobox'
import { BodyMetricModal } from '@/components/dashboard/pt/BodyMetricModal'
import { WeightProgressChart } from '@/components/dashboard/pt/WeightProgressChart'
import { PhotoComparisonGallery } from '@/components/dashboard/pt/PhotoComparisonGallery'
import { ExportProgressPdfModal } from '@/components/dashboard/pt/ExportProgressPdfModal'
import { PtCycleSelector } from '@/components/dashboard/pt/PtCycleSelector'
import PtWorkoutMonthlyCalendar from '@/components/dashboard/pt/PtWorkoutMonthlyCalendar'
import PtProgressEmptyDashboard from '@/components/dashboard/pt/PtProgressEmptyDashboard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dumbbell,
  Scale,
  Plus,
  Trash2,
  Calendar,
  MessageCircle,
  FileDown,
  TrendingDown,
  User,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Flame,
  CheckCircle2,
  Copy,
  Check,
} from 'lucide-react'
import { toast } from 'sonner'
import type { PtProgressCategory } from '@/lib/types'

const CATEGORY_STYLES: Record<
  PtProgressCategory,
  { border: string; text: string; bg: string }
> = {
  Push: { border: 'border-amber-500/40', text: 'text-amber-400', bg: 'bg-amber-500/10' },
  Pull: { border: 'border-blue-500/40', text: 'text-blue-400', bg: 'bg-blue-500/10' },
  Leg: { border: 'border-emerald-500/40', text: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  'Full Body': { border: 'border-purple-500/40', text: 'text-purple-400', bg: 'bg-purple-500/10' },
  Cardio: { border: 'border-rose-500/40', text: 'text-rose-400', bg: 'bg-rose-500/10' },
  Lainnya: { border: 'border-neutral-500/40', text: 'text-neutral-300', bg: 'bg-neutral-500/10' },
}

function ProgressTrackingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialMemberId = searchParams.get('memberId') || ''
  const initialSessionId = searchParams.get('sessionId') || null

  const [selectedMemberId, setSelectedMemberId] = useState<string>(initialMemberId)
  const [activeTab, setActiveTab] = useState<'workout' | 'metrics'>('workout')

  // Modals state
  const [metricModalOpen, setMetricModalOpen] = useState(false)
  const [workoutToDelete, setWorkoutToDelete] = useState<any | null>(null)
  const [metricToDelete, setMetricToDelete] = useState<any | null>(null)
  const [exportPdfOpen, setExportPdfOpen] = useState(false)
  const [waModalOpen, setWaModalOpen] = useState(false)
  const [isCopied, setIsCopied] = useState(false)

  // Data fetching
  const todayStr = useMemo(() => new Date().toLocaleDateString('sv-SE'), [])
  const [selectedAgendaDate, setSelectedAgendaDate] = useState<string>(todayStr)
  const { data: ptMembers, isLoading: membersLoading } = useAllPtMembers()
  const { data: agendaSessions, isLoading: sessionsLoading } = usePtSessionsByWeek(
    selectedAgendaDate,
    selectedAgendaDate
  )
  const { data: pendingSessions, isLoading: pendingLoading } = usePendingPtSessions(todayStr)
  const { data: workoutLogs, isLoading: logsLoading } = usePtProgressLogs(
    selectedMemberId || undefined
  )
  const { data: bodyMetrics, isLoading: metricsLoading } = useMemberBodyMetrics(
    selectedMemberId || undefined
  )

  const deleteWorkoutLog = useDeletePtProgressLog()
  const deleteBodyMetric = useDeleteBodyMetric()

  // Selected member detail
  const currentMember = useMemo(
    () => (ptMembers || []).find((m) => m.member_id === selectedMemberId),
    [ptMembers, selectedMemberId]
  )

  // Riwayat siklus paket PT member (Opsi B)
  const { data: memberCycles, isLoading: cyclesLoading } = usePtMemberCycles(
    selectedMemberId || undefined
  )
  const [selectedCycleId, setSelectedCycleId] = useState<string>('')

  // Sinkronkan selectedCycleId dengan siklus aktif atau siklus terbaru
  useEffect(() => {
    if (memberCycles && memberCycles.length > 0) {
      const exists = memberCycles.some((c) => c.id === selectedCycleId)
      if (!exists) {
        const active = memberCycles.find((c) => c.is_active) || memberCycles[0]
        setSelectedCycleId(active?.id || '')
      }
    } else {
      setSelectedCycleId('')
    }
  }, [memberCycles, selectedCycleId])

  const currentCycle = useMemo(() => {
    if (!memberCycles || memberCycles.length === 0) return null
    return memberCycles.find((c) => c.id === selectedCycleId) || memberCycles[0] || null
  }, [memberCycles, selectedCycleId])

  // Data member efektif disesuaikan dengan siklus yang sedang dipilih
  const effectiveMember = useMemo(() => {
    if (!currentMember) return null
    if (!currentCycle) return currentMember
    return {
      ...currentMember,
      pt_membership_name: currentCycle.membership_name,
      pt_remaining_sessions: currentCycle.remaining_sessions,
      pt_total_sessions: currentCycle.total_sessions,
      pt_start_date: currentCycle.start_date,
      pt_end_date: currentCycle.end_date,
    }
  }, [currentMember, currentCycle])

  // Filter riwayat latihan per siklus paket (Opsi A + B)
  const filteredWorkoutLogs = useMemo(() => {
    if (!workoutLogs) return []
    if (!currentCycle) return workoutLogs

    const cycleStart = new Date(currentCycle.created_at).getTime()
    const cycleEnd = currentCycle.next_cycle_created_at
      ? new Date(currentCycle.next_cycle_created_at).getTime()
      : Infinity

    return workoutLogs.filter((w) => {
      if (w.subscription_id) {
        return w.subscription_id === currentCycle.id
      }
      const t = new Date(w.created_at).getTime()
      return t >= cycleStart && t < cycleEnd
    })
  }, [workoutLogs, currentCycle])

  // Filter metrik tubuh & foto per siklus paket (Opsi A + B)
  const filteredBodyMetrics = useMemo(() => {
    if (!bodyMetrics) return []
    if (!currentCycle) return bodyMetrics

    const cycleStart = new Date(currentCycle.created_at).getTime()
    const cycleEnd = currentCycle.next_cycle_created_at
      ? new Date(currentCycle.next_cycle_created_at).getTime()
      : Infinity

    return bodyMetrics.filter((m) => {
      const t = new Date(m.created_at || m.recorded_at).getTime()
      return t >= cycleStart && t < cycleEnd
    })
  }, [bodyMetrics, currentCycle])

  // Options for MemberCombobox
  const memberOptions = useMemo(
    () =>
      (ptMembers || []).map((m) => ({
        id: m.member_id,
        full_name: m.full_name,
        phone: m.phone,
      })),
    [ptMembers]
  )

  const statusMap = useMemo(() => {
    const map = new Map<string, string>()
      ; (ptMembers || []).forEach((m) => {
        map.set(m.member_id, `${m.pt_membership_name} · Sisa ${m.pt_remaining_sessions} sesi`)
      })
    return map
  }, [ptMembers])

  // Redirect otomatis jika datang dari jadwal session "Catat Latihan"
  useEffect(() => {
    if (initialMemberId && initialSessionId) {
      router.push(`/dashboard/pt/progress/workout?memberId=${initialMemberId}&sessionId=${initialSessionId}`)
    }
  }, [initialMemberId, initialSessionId, router])

  // Jika member yang dipilih sudah tidak lagi berstatus PT aktif (misal badge PT dihapus), bersihkan seleksi
  useEffect(() => {
    if (!membersLoading && ptMembers && selectedMemberId) {
      const exists = ptMembers.some((m) => m.member_id === selectedMemberId)
      if (!exists) {
        setSelectedMemberId('')
        router.replace('/dashboard/pt/progress', { scroll: false })
      }
    }
  }, [membersLoading, ptMembers, selectedMemberId, router])

  // Sync state dengan URL param jika berubah
  const handleSelectMember = (id: string) => {
    setSelectedMemberId(id)
    setSelectedCycleId('')
    if (id) {
      router.replace(`/dashboard/pt/progress?memberId=${id}`, { scroll: false })
    } else {
      router.replace('/dashboard/pt/progress', { scroll: false })
    }
  }

  // Auto-buka Laporan PDF jika diarahkan dengan query exportPdf=true
  useEffect(() => {
    if (searchParams.get('exportPdf') === 'true') {
      setExportPdfOpen(true)
    }
  }, [searchParams])

  const lastWorkout = filteredWorkoutLogs && filteredWorkoutLogs[0]

  // Format pesan WhatsApp berdasarkan sesi latihan TERAKHIR saja (sesuai format live workout)
  const waMessageText = useMemo(() => {
    if (!effectiveMember || !lastWorkout) return ''

    const list = (lastWorkout.exercises || [])
      .map((e) => {
        // Cek apakah ada variasi perbedaan beban atau repetisi antar set
        const isProgressive =
          e.sets_detail &&
          e.sets_detail.length > 1 &&
          e.sets_detail.some(
            (s) =>
              s.weight_kg !== e.sets_detail![0].weight_kg ||
              s.reps !== e.sets_detail![0].reps
          )

        if (isProgressive && e.sets_detail) {
          // 1. Jika beban/reps berbeda antar set: tampilkan rincian per set
          const setsLines = e.sets_detail
            .map((s, idx) => `  ↳ Set ${idx + 1}: ${s.reps} reps | ${s.weight_kg}kg`)
            .join('\n')
          return `• *${e.name}* (${e.sets_detail.length} set):\n${setsLines}`
        } else {
          // 2. Jika beban & reps sama (flat): tampilkan 1 baris ringkas
          const totalSets = e.sets_detail?.length || e.sets || 1
          const reps = e.sets_detail?.[0]?.reps ?? e.reps
          const weight = e.sets_detail?.[0]?.weight_kg ?? e.weight_kg
          return `• *${e.name}*: ${totalSets} set × ${reps} reps | ${weight}kg`
        }
      })
      .join('\n')

    const graduationClosing =
      effectiveMember.pt_remaining_sessions === 0
        ? `*SELAMAT KELULUSAN PROGRAM PT!* Seluruh kuota sesi paket kamu telah selesai 100%. Untuk mempertahankan progres & mencapai target berikutnya, tanyakan ke Coach untuk rekomendasi perpanjangan paket (renewal) ya!\n`
        : `Sisa Kuota PT Kamu: *${effectiveMember.pt_remaining_sessions ?? 0} sesi*\nTetap semangat dan konsisten latihannya!\n`

    const formattedDate = new Date(lastWorkout.created_at).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    return (
      `Halo Kak *${effectiveMember.full_name}*! \n\n` +
      `Berikut catatan sesi latihan Personal Trainer terakhir kamu di *Line Up Gym*:\n` +
      `• Tanggal: *${formattedDate}*\n` +
      `• Fokus: *${lastWorkout.category} Day*\n` +
      (lastWorkout.trainer_name ? `• Coach: *${lastWorkout.trainer_name}*\n` : '') +
      `\n*Daftar Latihan:*\n${list || '- Tidak ada gerakan tercatat -'}\n\n` +
      (lastWorkout.notes ? `_Catatan Coach: "${lastWorkout.notes}"_\n\n` : '') +
      `${graduationClosing}\n` +
      `*LINEUP GYM PRAMBANAN*\nBe Strong Be Healthy!`
    )
  }, [effectiveMember, lastWorkout])

  const handleOpenWhatsAppModal = () => {
    if (!effectiveMember) return
    if (!filteredWorkoutLogs || filteredWorkoutLogs.length === 0) {
      toast.info('Member ini belum memiliki catatan sesi latihan pada siklus ini untuk dikirim ke WhatsApp.')
      return
    }
    setIsCopied(false)
    setWaModalOpen(true)
  }

  const handleConfirmDeleteWorkout = async () => {
    if (!workoutToDelete) return
    try {
      await deleteWorkoutLog.mutateAsync({
        logId: workoutToDelete.id,
        memberId: workoutToDelete.member_id || selectedMemberId,
      })
      toast.success('Catatan latihan berhasil dihapus & kuota sesi dikembalikan (+1)!')
      setWorkoutToDelete(null)
    } catch {
      toast.error('Gagal menghapus catatan latihan')
    }
  }

  const handleConfirmDeleteMetric = async () => {
    if (!metricToDelete) return
    try {
      await deleteBodyMetric.mutateAsync({ id: metricToDelete.id, memberId: selectedMemberId })
      toast.success('Data fisik berhasil dihapus')
      setMetricToDelete(null)
    } catch {
      toast.error('Gagal menghapus data fisik')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          {selectedMemberId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSelectMember('')}
              className="h-9 px-3 text-xs font-semibold border-border/80 hover:bg-muted text-muted-foreground hover:text-foreground shrink-0 gap-1.5 shadow-xs"
              title="Kembali ke Dashboard Ringkasan PT"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Kembali</span>
            </Button>
          )}
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#D4FF00]/10 text-primary">
              <Dumbbell className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-heading text-lg sm:text-xl text-foreground">
                Progress & Tracking PT
              </h2>
              <p className="text-xs text-muted-foreground">
                Catatan latihan per sesi, pantau grafik berat badan, dan galeri before-after.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Switcher Member: Hanya tampil saat sedang berada di detail profil member */}
        {selectedMemberId && (
          <div className="w-full sm:w-72">
            <MemberCombobox
              members={memberOptions}
              value={selectedMemberId}
              onValueChange={handleSelectMember}
              placeholder="Ganti Member PT..."
              statusMap={statusMap}
              emptyMessage="Tidak ada member PT aktif"
            />
          </div>
        )}
      </div>

      {/* Jika belum ada member yang dipilih: Tampilkan Hybrid Dashboard Lengkap */}
      {!selectedMemberId ? (
        <PtProgressEmptyDashboard
          ptMembers={ptMembers || []}
          todaySessions={agendaSessions || []}
          selectedAgendaDate={selectedAgendaDate}
          onChangeAgendaDate={setSelectedAgendaDate}
          pendingSessions={pendingSessions || []}
          onSelectMember={handleSelectMember}
          onStartWorkout={(memberId, sessionId) => {
            const url = memberId
              ? `/dashboard/pt/progress/workout?memberId=${memberId}${sessionId ? `&sessionId=${sessionId}` : ''}`
              : '/dashboard/pt/progress/workout'
            router.push(url)
          }}
          isLoading={membersLoading || sessionsLoading}
        />
      ) : (
        <>
          {/* Member Info Card Banner */}
          <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/20 text-primary font-heading font-bold text-base">
                  {effectiveMember?.full_name?.charAt(0) || 'M'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading text-base font-bold text-foreground">
                      {effectiveMember?.full_name}
                    </h3>
                    <Badge variant="outline" className="border-primary/40 text-primary text-[10px]">
                      {effectiveMember?.pt_membership_name || 'Member PT'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                    <span>Telp: {effectiveMember?.phone || '-'}</span>
                    <span>•</span>
                    <span className="font-semibold text-accent">
                      Sisa {effectiveMember?.pt_remaining_sessions} sesi
                    </span>
                    {currentCycle && (
                      <>
                        <span>•</span>
                        <span className="text-muted-foreground">
                          Siklus {currentCycle.cycle_number} ({currentCycle.is_active ? 'Aktif' : currentCycle.remaining_sessions === 0 ? 'Lulus' : 'Selesai'})
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleSelectMember('')}
                  className="text-xs text-muted-foreground hover:text-foreground gap-1.5 h-9 px-2 sm:px-2.5 shrink-0"
                  title="Tutup detail member & kembali ke ringkasan"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Overview Hub</span>
                </Button>

                <Button
                  size="sm"
                  variant={effectiveMember?.pt_remaining_sessions === 0 ? 'default' : 'outline'}
                  onClick={() => setExportPdfOpen(true)}
                  className={`flex-1 sm:flex-initial text-xs h-9 px-2.5 sm:px-3 whitespace-nowrap font-medium ${effectiveMember?.pt_remaining_sessions === 0
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black font-extrabold hover:from-amber-400 hover:to-amber-500 shadow-md shadow-amber-500/20'
                    : 'border-border bg-card hover:bg-muted/50 text-foreground'
                    }`}
                >
                  <FileDown className="h-3.5 w-3.5 mr-1 sm:mr-1.5 shrink-0" />
                  {effectiveMember?.pt_remaining_sessions === 0 ? (
                    <>
                      <span className="sm:hidden">🏆 Laporan PDF</span>
                      <span className="hidden sm:inline">🏆 Laporan Kelulusan PDF</span>
                    </>
                  ) : (
                    <span>Export PDF</span>
                  )}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleOpenWhatsAppModal}
                  className="flex-1 sm:flex-initial text-xs h-9 px-2.5 sm:px-3 whitespace-nowrap font-medium border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                >
                  <MessageCircle className="h-3.5 w-3.5 mr-1 sm:mr-1.5 shrink-0" />
                  <span className="sm:hidden">Update WA</span>
                  <span className="hidden sm:inline">Kirim Update WA</span>
                </Button>
              </div>
            </div>

            {/* Cycle Selector Bar: Pilih Siklus Paket PT (Opsi A Smart Switcher) */}
            {memberCycles && memberCycles.length > 1 && (
              <PtCycleSelector
                cycles={memberCycles}
                selectedCycleId={selectedCycleId}
                onSelectCycle={(cycleId) => setSelectedCycleId(cycleId)}
                className="pt-2 border-t border-border/40"
              />
            )}
          </div>

          {/* 1. Custom Segmented Tabs (Gaya Dashboard Finance — Full Width di Atas) */}
          <div className="flex gap-2 rounded-xl bg-card p-1.5 border border-border w-full">
            <button
              type="button"
              onClick={() => setActiveTab('workout')}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 px-3 text-xs sm:text-sm font-semibold transition-all ${activeTab === 'workout'
                ? 'bg-primary text-black font-bold shadow-sm shadow-primary/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                }`}
            >
              <Dumbbell className="h-4 w-4" />
              <span>Catatan Sesi</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${activeTab === 'workout' ? 'bg-black/20 text-black' : 'bg-muted text-muted-foreground'
                  }`}
              >
                {filteredWorkoutLogs?.length || 0}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('metrics')}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 px-3 text-xs sm:text-sm font-semibold transition-all ${activeTab === 'metrics'
                ? 'bg-primary text-black font-bold shadow-sm shadow-primary/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                }`}
            >
              <Scale className="h-4 w-4" />
              <span>Body Metrics & Foto</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${activeTab === 'metrics' ? 'bg-black/20 text-black' : 'bg-muted text-muted-foreground'
                  }`}
              >
                {filteredBodyMetrics?.length || 0}
              </span>
            </button>
          </div>

          {/* 2. Action Bar Lega Tepat di Bawah Tabs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            <div className="text-xs text-muted-foreground">
              {activeTab === 'workout' ? (
                <span>Riwayat sesi latihan yang telah diselesaikan bersama member.</span>
              ) : (
                <span>Pemantauan perubahan berat badan, ukuran tubuh, dan foto fisik.</span>
              )}
            </div>

            {activeTab === 'workout' ? (
              <Button
                size="sm"
                onClick={() => {
                  const url = selectedMemberId
                    ? `/dashboard/pt/progress/workout?memberId=${selectedMemberId}`
                    : '/dashboard/pt/progress/workout'
                  router.push(url)
                }}
                className="h-9 px-4 bg-primary text-black font-bold hover:bg-primary/90 text-xs shadow-md shadow-primary/20 active:scale-[0.98] transition-all"
              >
                <Plus className="h-4 w-4 mr-1.5" /> Catat Latihan Live
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => {
                  const url = selectedMemberId
                    ? `/dashboard/pt/progress/metrics?memberId=${selectedMemberId}`
                    : '/dashboard/pt/progress/metrics'
                  router.push(url)
                }}
                className="h-10 sm:h-9 px-4 bg-emerald-500 text-black font-bold hover:bg-emerald-600 text-xs shadow-md shadow-emerald-500/20 active:scale-[0.98] transition-all"
              >
                <Plus className="h-4 w-4 mr-1.5" /> Catat Metrics & Foto
              </Button>
            )}
          </div>

          {/* 3. KONTEN TAB: Kalender Bulanan Progres Latihan */}
          {activeTab === 'workout' && (
            <div className="space-y-4">
              {logsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-32 rounded-xl bg-card border border-border animate-pulse" />
                  ))}
                </div>
              ) : (
                <PtWorkoutMonthlyCalendar
                  workoutLogs={filteredWorkoutLogs || []}
                  onDeleteWorkout={(log) => setWorkoutToDelete(log)}
                  onAddWorkoutClick={() => {
                    const url = selectedMemberId
                      ? `/dashboard/pt/progress/workout?memberId=${selectedMemberId}`
                      : '/dashboard/pt/progress/workout'
                    router.push(url)
                  }}
                  memberName={effectiveMember?.full_name}
                />
              )}
            </div>
          )}

          {/* TAB 2: BODY METRICS & FOTO */}
          {activeTab === 'metrics' && (
            <div className="space-y-6">
              {metricsLoading ? (
                <div className="h-64 rounded-xl bg-card border border-border animate-pulse" />
              ) : (
                <>
                  {/* Grafik Berat Badan */}
                  <div>
                    <h4 className="font-heading text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                      <Scale className="h-4 w-4 text-primary" />
                      Grafik Perkembangan Berat Badan
                    </h4>
                    <WeightProgressChart metrics={filteredBodyMetrics || []} />
                  </div>

                  {/* Galeri Perbandingan Foto Before vs After */}
                  <div>
                    <PhotoComparisonGallery metrics={filteredBodyMetrics || []} />
                  </div>

                  {/* Riwayat Catatan Ukuran Tubuh */}
                  {filteredBodyMetrics && filteredBodyMetrics.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-heading text-sm font-semibold text-foreground">
                        Riwayat Pengukuran Fisik
                      </h4>
                      <div className="space-y-2">
                        {filteredBodyMetrics
                          .slice()
                          .reverse()
                          .map((m) => (
                            <div
                              key={m.id}
                              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 rounded-lg border border-border/50 bg-card p-3 text-xs"
                            >
                              <div className="flex items-center gap-3">
                                <span className="font-semibold text-foreground">
                                  {new Date(m.recorded_at).toLocaleDateString('id-ID', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </span>
                                {m.phase && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] uppercase font-bold"
                                  >
                                    {m.phase.replace('_', ' ')}
                                  </Badge>
                                )}
                                {m.weight_kg && (
                                  <span className="font-bold text-accent">{m.weight_kg} kg</span>
                                )}
                              </div>

                              <div className="flex items-center gap-3 text-muted-foreground flex-wrap">
                                {m.measurements && Object.keys(m.measurements).length > 0 && (
                                  <div className="flex items-center gap-2">
                                    {m.measurements.perut && <span>Perut: {m.measurements.perut}cm</span>}
                                    {m.measurements.lengan && <span>Lengan: {m.measurements.lengan}cm</span>}
                                    {m.measurements.dada && <span>Dada: {m.measurements.dada}cm</span>}
                                    {m.measurements.paha && <span>Paha: {m.measurements.paha}cm</span>}
                                    {m.measurements.pinggul && <span>Pinggul: {m.measurements.pinggul}cm</span>}
                                    {m.measurements.body_fat && <span>Fat: {m.measurements.body_fat}%</span>}
                                  </div>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setMetricToDelete(m)}
                                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                  title="Hapus data pengukuran fisik ini"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Modal Pengukuran Fisik & Foto */}
          <BodyMetricModal
            open={metricModalOpen}
            onOpenChange={setMetricModalOpen}
            memberId={selectedMemberId}
            memberName={effectiveMember?.full_name || ''}
          />

          {/* Modal Export Laporan PDF Progress PT */}
          <ExportProgressPdfModal
            open={exportPdfOpen}
            onOpenChange={setExportPdfOpen}
            member={effectiveMember || null}
            workoutLogs={workoutLogs || []}
            bodyMetrics={bodyMetrics || []}
            currentCycle={currentCycle}
            cycles={memberCycles || []}
            onSelectCycle={(cycleId) => setSelectedCycleId(cycleId)}
          />

          {/* Modal Konfirmasi Kirim Update WA (Latihan Terakhir) */}
          <Dialog open={waModalOpen} onOpenChange={setWaModalOpen}>
            <DialogContent className="max-w-md border-border bg-card text-foreground sm:max-w-lg">
              <DialogHeader>
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366]/10 text-[#25D366]">
                  <MessageCircle className="h-6 w-6" />
                </div>
                <DialogTitle className="text-center font-heading text-lg">
                  Kirim Catatan Latihan ke WhatsApp
                </DialogTitle>
                <DialogDescription className="text-center text-xs text-muted-foreground">
                  Pratinjau ringkasan sesi latihan terakhir yang akan dikirimkan kepada{' '}
                  <span className="font-semibold text-foreground">{effectiveMember?.full_name}</span>{' '}
                  ({effectiveMember?.phone || 'Tanpa nomor HP'}).
                </DialogDescription>
              </DialogHeader>

              {lastWorkout ? (
                <div className="space-y-3">
                  {/* Info Chip Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Sesi Terakhir:</span>
                      <Badge variant="outline" className={`text-[10px] ${CATEGORY_STYLES[lastWorkout.category]?.bg || ''} ${CATEGORY_STYLES[lastWorkout.category]?.text || ''} ${CATEGORY_STYLES[lastWorkout.category]?.border || ''}`}>
                        {lastWorkout.category} Day
                      </Badge>
                      <span className="text-muted-foreground">•</span>
                      <span className="font-medium text-foreground">
                        {new Date(lastWorkout.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    {lastWorkout.trainer_name && (
                      <span className="text-[11px] text-muted-foreground">
                        Coach: <strong className="text-foreground">{lastWorkout.trainer_name}</strong>
                      </span>
                    )}
                  </div>

                  {/* WhatsApp Chat Bubble Preview (Read-Only) */}
                  <div>
                    <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                      Pratinjau Pesan (Read-Only):
                    </span>
                    <div className="max-h-72 overflow-y-auto rounded-xl border border-[#202C33] bg-[#0B141A] p-3.5 font-mono text-[11px] leading-relaxed text-[#E9EDEF] shadow-inner selection:bg-[#00A884]/30 whitespace-pre-wrap">
                      {waMessageText}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground space-y-1">
                  <p className="font-semibold text-foreground">Belum Ada Sesi Latihan</p>
                  <p>Member ini belum memiliki catatan latihan pada siklus ini. Silakan mulai sesi latihan di Live Workout terlebih dahulu.</p>
                </div>
              )}

              <DialogFooter className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setWaModalOpen(false)}
                  className="text-xs text-muted-foreground hover:bg-muted"
                >
                  Tutup
                </Button>

                {lastWorkout && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(waMessageText)
                        setIsCopied(true)
                        toast.success('Pesan WhatsApp disalin!')
                        setTimeout(() => setIsCopied(false), 2000)
                      }}
                      className="text-xs border-border text-foreground hover:bg-muted"
                    >
                      {isCopied ? <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-400" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
                      {isCopied ? 'Tersalin' : 'Salin Teks'}
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        const phone = effectiveMember?.phone?.replace(/[^0-9]/g, '').replace(/^0/, '62')
                        if (!phone) {
                          toast.error('Nomor telepon member tidak valid atau belum terdaftar')
                          return
                        }
                        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(waMessageText)}`, '_blank')
                        setWaModalOpen(false)
                      }}
                      className="bg-[#25D366] text-black font-bold hover:bg-[#1DA851] text-xs shadow-md shadow-[#25D366]/20"
                    >
                      <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                      Buka WhatsApp
                    </Button>
                  </>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Modal Konfirmasi Hapus Sesi Latihan & Rollback Kuota */}
          <AlertDialog open={!!workoutToDelete} onOpenChange={(open) => !open && setWorkoutToDelete(null)}>
            <AlertDialogContent className="border-border bg-card text-foreground">
              <AlertDialogHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 mb-2 mx-auto">
                  <Trash2 className="h-6 w-6 text-red-500" />
                </div>
                <AlertDialogTitle className="text-center font-heading text-lg">Hapus Catatan Latihan?</AlertDialogTitle>
                <AlertDialogDescription className="text-center text-xs text-muted-foreground space-y-2">
                  <p>
                    Catatan latihan <span className="font-semibold text-foreground">{workoutToDelete?.category}</span> pada tanggal{' '}
                    <span className="font-semibold text-foreground">
                      {workoutToDelete ? new Date(workoutToDelete.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                    </span>{' '}
                    akan dihapus permanen.
                  </p>
                  <p className="rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-primary font-medium text-left">
                    💡 Kuota sesi PT member akan otomatis <strong>dikembalikan (+1 sesi)</strong> dan jadwal terkait di kalender akan dibatalkan.
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex gap-2 sm:justify-center">
                <AlertDialogCancel className="border-border text-muted-foreground hover:bg-muted">
                  Batal
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleConfirmDeleteWorkout}
                  disabled={deleteWorkoutLog.isPending}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold"
                >
                  {deleteWorkoutLog.isPending ? 'Menghapus...' : 'Ya, Hapus & Kembalikan Sesi'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Modal Konfirmasi Hapus Data Pengukuran Fisik */}
          <AlertDialog open={!!metricToDelete} onOpenChange={(open) => !open && setMetricToDelete(null)}>
            <AlertDialogContent className="border-border bg-card text-foreground">
              <AlertDialogHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 mb-2 mx-auto">
                  <Trash2 className="h-6 w-6 text-red-500" />
                </div>
                <AlertDialogTitle className="text-center font-heading text-lg">Hapus Data Pengukuran Fisik?</AlertDialogTitle>
                <AlertDialogDescription className="text-center text-xs text-muted-foreground space-y-2">
                  <p>
                    Data pengukuran fisik pada tanggal{' '}
                    <span className="font-semibold text-foreground">
                      {metricToDelete ? new Date(metricToDelete.recorded_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                    </span>
                    {metricToDelete?.weight_kg ? ` (${metricToDelete.weight_kg} kg)` : ''} beserta foto dokumentasi terkait akan dihapus permanen.
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex gap-2 sm:justify-center">
                <AlertDialogCancel className="border-border text-muted-foreground hover:bg-muted">
                  Batal
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleConfirmDeleteMetric}
                  disabled={deleteBodyMetric.isPending}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold"
                >
                  {deleteBodyMetric.isPending ? 'Menghapus...' : 'Ya, Hapus Data Fisik'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  )
}

export default function PtProgressPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <div className="h-10 w-48 rounded bg-card animate-pulse" />
          <div className="h-48 rounded-xl bg-card animate-pulse" />
        </div>
      }
    >
      <ProgressTrackingContent />
    </Suspense>
  )
}
