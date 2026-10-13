'use client'

import { useState, useMemo, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAllPtMembers, usePtSessionsByWeek, usePendingPtSessions } from '@/hooks/usePtSessions'
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
import PtWorkoutMonthlyCalendar from '@/components/dashboard/pt/PtWorkoutMonthlyCalendar'
import PtProgressEmptyDashboard from '@/components/dashboard/pt/PtProgressEmptyDashboard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
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
  ClipboardList,
  Flame,
  CheckCircle2,
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
  const [workoutViewMode, setWorkoutViewMode] = useState<'calendar' | 'list'>('calendar')

  // Modals state
  const [metricModalOpen, setMetricModalOpen] = useState(false)
  const [workoutToDelete, setWorkoutToDelete] = useState<any | null>(null)
  const [metricToDelete, setMetricToDelete] = useState<any | null>(null)
  const [exportPdfOpen, setExportPdfOpen] = useState(false)

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

  // Generate WA share progress summary
  const handleShareWhatsApp = () => {
    if (!currentMember) return

    const phone = currentMember.phone.replace(/[^0-9]/g, '').replace(/^0/, '62')
    const totalWorkouts = (workoutLogs || []).length
    const lastWorkout = workoutLogs && workoutLogs[0]
    const lastMetric = bodyMetrics && bodyMetrics[bodyMetrics.length - 1]
    const initialMetric = bodyMetrics && bodyMetrics[0]

    let weightChangeMsg = ''
    if (initialMetric?.weight_kg && lastMetric?.weight_kg) {
      const diff = Number((lastMetric.weight_kg - initialMetric.weight_kg).toFixed(1))
      weightChangeMsg = `\n- Berat Awal: ${initialMetric.weight_kg} kg\n- Berat Sekarang: ${lastMetric.weight_kg} kg (${diff < 0 ? diff : '+' + diff} kg)`
    }

    const message = encodeURIComponent(
      `Halo Kak *${currentMember.full_name}*! \n\nBerikut ringkasan progress latihan Personal Trainer kamu di *Line Up Gym*:\n` +
      `- Paket: ${currentMember.pt_membership_name}\n` +
      `- Sisa Sesi: *${currentMember.pt_remaining_sessions} sesi*\n` +
      `- Total Latihan Tercatat: *${totalWorkouts} sesi*` +
      weightChangeMsg +
      (lastWorkout
        ? `\n\n*Latihan Terakhir (${new Date(lastWorkout.created_at).toLocaleDateString('id-ID')} - ${lastWorkout.category}):*\n` +
        (lastWorkout.trainer_name ? `• Coach: *${lastWorkout.trainer_name}*\n` : '') +
        lastWorkout.exercises
          .map((e) => `• ${e.name}: ${e.sets}×${e.reps} | ${e.weight_kg}kg`)
          .join('\n') +
        (lastWorkout.notes ? `\n_Catatan Coach: "${lastWorkout.notes}"_` : '')
        : '') +
      `\n\nTetap konsisten dan semangat mencapai fitness goals kamu! \n\n*LINEUP GYM PRAMBANAN*\nBe Strong Be Healthy!`
    )

    window.open(`https://wa.me/${phone}?text=${message}`, '_blank')
  }

  const handleConfirmDeleteWorkout = async () => {
    if (!workoutToDelete) return
    try {
      await deleteWorkoutLog.mutateAsync(workoutToDelete.id)
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
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-border/60 bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/20 text-primary font-heading font-bold text-base">
                {currentMember?.full_name?.charAt(0) || 'M'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-heading text-base font-bold text-foreground">
                    {currentMember?.full_name}
                  </h3>
                  <Badge variant="outline" className="border-primary/40 text-primary text-[10px]">
                    {currentMember?.pt_membership_name || 'Member PT'}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  <span>Telp: {currentMember?.phone}</span>
                  <span>•</span>
                  <span className="font-semibold text-accent">
                    Sisa {currentMember?.pt_remaining_sessions} sesi
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleSelectMember('')}
                className="text-xs text-muted-foreground hover:text-foreground gap-1.5 h-8 px-2.5"
                title="Tutup detail member & kembali ke ringkasan"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Overview Hub</span>
              </Button>

              <Button
                size="sm"
                variant={currentMember?.pt_remaining_sessions === 0 ? 'default' : 'outline'}
                onClick={() => setExportPdfOpen(true)}
                className={`flex-1 sm:flex-initial text-xs ${
                  currentMember?.pt_remaining_sessions === 0
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black font-extrabold hover:from-amber-400 hover:to-amber-500 shadow-md shadow-amber-500/20'
                    : 'border-border bg-card hover:bg-muted/50 text-foreground'
                }`}
              >
                <FileDown className="h-3.5 w-3.5 mr-1.5" />
                {currentMember?.pt_remaining_sessions === 0
                  ? '🏆 Laporan Kelulusan PDF'
                  : 'Export PDF'}
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={handleShareWhatsApp}
                className="flex-1 sm:flex-initial text-xs border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
              >
                <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                Kirim Update WA
              </Button>
            </div>
          </div>

          {/* 1. Custom Segmented Tabs (Gaya Dashboard Finance — Full Width di Atas) */}
          <div className="flex gap-2 rounded-xl bg-card p-1.5 border border-border w-full">
            <button
              type="button"
              onClick={() => setActiveTab('workout')}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 px-3 text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'workout'
                  ? 'bg-primary text-black font-bold shadow-sm shadow-primary/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
              }`}
            >
              <Dumbbell className="h-4 w-4" />
              <span>Catatan Sesi</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  activeTab === 'workout' ? 'bg-black/20 text-black' : 'bg-muted text-muted-foreground'
                }`}
              >
                {workoutLogs?.length || 0}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('metrics')}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 px-3 text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'metrics'
                  ? 'bg-primary text-black font-bold shadow-sm shadow-primary/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
              }`}
            >
              <Scale className="h-4 w-4" />
              <span>Body Metrics & Foto</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  activeTab === 'metrics' ? 'bg-black/20 text-black' : 'bg-muted text-muted-foreground'
                }`}
              >
                {bodyMetrics?.length || 0}
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
              <div className="flex flex-wrap items-center gap-2">
                {/* View Mode Segmented Control: Kalender vs List */}
                <div className="flex items-center rounded-lg border border-border/60 bg-card p-0.5 shadow-xs">
                  <button
                    type="button"
                    onClick={() => setWorkoutViewMode('calendar')}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-all ${
                      workoutViewMode === 'calendar'
                        ? 'bg-primary font-bold text-black shadow-xs'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                    }`}
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Kalender Bulanan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWorkoutViewMode('list')}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-all ${
                      workoutViewMode === 'list'
                        ? 'bg-primary font-bold text-black shadow-xs'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                    }`}
                  >
                    <ClipboardList className="h-3.5 w-3.5" />
                    <span>Daftar List</span>
                  </button>
                </div>

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
              </div>
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

          {/* 3. KONTEN TAB: Mengalir vertikal full-width */}
          {activeTab === 'workout' && (
            <div className="space-y-4">
              {logsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-28 rounded-xl bg-card border border-border animate-pulse" />
                  ))}
                </div>
              ) : workoutViewMode === 'calendar' ? (
                <PtWorkoutMonthlyCalendar
                  workoutLogs={workoutLogs || []}
                  onDeleteWorkout={(log) => setWorkoutToDelete(log)}
                  onAddWorkoutClick={() => {
                    const url = selectedMemberId
                      ? `/dashboard/pt/progress/workout?memberId=${selectedMemberId}`
                      : '/dashboard/pt/progress/workout'
                    router.push(url)
                  }}
                  memberName={currentMember?.full_name}
                />
              ) : !workoutLogs || workoutLogs.length === 0 ? (
                <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-card/40 p-6 text-center">
                  <ClipboardList className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm font-medium text-muted-foreground">Belum ada catatan latihan</p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">
                    Klik tombol &quot;+ Catat Latihan Baru&quot; untuk mencatat gerakan, beban, dan repetisi sesi ini.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {workoutLogs.map((log) => {
                    const style = CATEGORY_STYLES[log.category] || CATEGORY_STYLES.Lainnya
                    const formattedDate = new Date(log.created_at).toLocaleDateString('id-ID', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })

                    return (
                      <Card key={log.id} className="bg-card border-border/60 overflow-hidden">
                        <CardContent className="p-4 sm:p-5">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/40 pb-3 mb-3">
                            <div className="flex items-center gap-2.5">
                              <span
                                className={`rounded-md border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${style.border} ${style.bg} ${style.text}`}
                              >
                                {log.category}
                              </span>
                              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                {formattedDate}
                              </span>
                              {log.trainer_name && (
                                <Badge variant="outline" className="border-border/60 bg-muted/40 text-[10px] text-muted-foreground font-medium">
                                  Coach: {log.trainer_name}
                                </Badge>
                              )}
                            </div>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setWorkoutToDelete(log)}
                              className="h-7 w-7 text-muted-foreground hover:text-destructive self-end sm:self-auto"
                              title="Hapus Catatan Latihan"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>

                          {/* Exercise List Chips / Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                            {log.exercises.map((ex, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between rounded-lg border border-border/50 bg-background/50 px-3 py-2 text-xs"
                              >
                                <span className="font-semibold text-foreground">{ex.name}</span>
                                <div className="flex items-center gap-1.5 font-medium">
                                  <span className="text-muted-foreground">
                                    {ex.sets}×{ex.reps}
                                  </span>
                                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-bold text-accent">
                                    {ex.weight_kg}kg
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Notes */}
                          {log.notes && (
                            <div className="mt-3 rounded-lg bg-muted/20 p-2.5 text-xs text-muted-foreground border-l-2 border-primary/50">
                              <span className="font-semibold text-foreground mr-1">Evaluasi:</span>
                              {log.notes}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
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
                    <WeightProgressChart metrics={bodyMetrics || []} />
                  </div>

                  {/* Galeri Perbandingan Foto Before vs After */}
                  <div>
                    <PhotoComparisonGallery metrics={bodyMetrics || []} />
                  </div>

                  {/* Riwayat Catatan Ukuran Tubuh */}
                  {bodyMetrics && bodyMetrics.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-heading text-sm font-semibold text-foreground">
                        Riwayat Pengukuran Fisik
                      </h4>
                      <div className="space-y-2">
                        {bodyMetrics
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
            memberName={currentMember?.full_name || ''}
          />

          {/* Modal Export Laporan PDF Progress PT */}
          <ExportProgressPdfModal
            open={exportPdfOpen}
            onOpenChange={setExportPdfOpen}
            member={currentMember || null}
            workoutLogs={workoutLogs || []}
            bodyMetrics={bodyMetrics || []}
          />

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
