'use client'

import { useState, useMemo } from 'react'
import {
  Users,
  Dumbbell,
  Zap,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock,
  ArrowRight,
  Play,
  Search,
  ChevronRight,
  ChevronLeft,
  Calendar,
  RotateCcw,
  User,
  Plus,
  Flame,
  Phone,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import MemberCombobox from '@/components/dashboard/MemberCombobox'
import type { PtSession } from '@/hooks/usePtSessions'
import { useLatestPtProgressLogs } from '@/hooks/usePtProgress'

function formatLastWorkoutDate(dateStr?: string): string {
  if (!dateStr) return ''
  const target = new Date(dateStr)
  const now = new Date()

  const targetDateOnly = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime()
  const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const diffDays = Math.round((nowDateOnly - targetDateOnly) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Hari ini'
  if (diffDays === 1) return 'Kemarin'
  if (diffDays < 7) return `${diffDays} hr lalu`

  return target.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

interface PtProgressEmptyDashboardProps {
  ptMembers: any[]
  todaySessions?: PtSession[]
  selectedAgendaDate?: string
  onChangeAgendaDate?: (date: string) => void
  pendingSessions?: PtSession[]
  onSelectMember: (memberId: string) => void
  onStartWorkout: (memberId: string, sessionId?: string) => void
  isLoading?: boolean
}

type PtStatusFilter = 'all' | 'active' | 'expiring_soon' | 'critical'

const FILTER_OPTIONS: { value: PtStatusFilter; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'active', label: 'Aktif' },
  { value: 'expiring_soon', label: 'Segera (3-4)' },
  { value: 'critical', label: 'Kritis (1-2)' },
]

const getMemberStatus = (remaining: number): 'active' | 'expiring_soon' | 'critical' | 'expired' => {
  if (remaining <= 0) return 'expired'
  if (remaining <= 2) return 'critical'
  if (remaining <= 4) return 'expiring_soon'
  return 'active'
}

export default function PtProgressEmptyDashboard({
  ptMembers,
  todaySessions = [],
  selectedAgendaDate,
  onChangeAgendaDate,
  pendingSessions = [],
  onSelectMember,
  onStartWorkout,
  isLoading = false,
}: PtProgressEmptyDashboardProps) {
  const [searchMember, setSearchMember] = useState('')
  const [statusFilter, setStatusFilter] = useState<PtStatusFilter>('all')
  const { data: latestLogsMap } = useLatestPtProgressLogs()

  // 1. Data kalkulasi statistik
  const totalActiveMembers = useMemo(() => {
    return (ptMembers || []).filter((m) => (Number(m.pt_remaining_sessions) || 0) > 0).length
  }, [ptMembers])
  const totalRemainingSessions = useMemo(() => {
    return (ptMembers || []).reduce((acc, m) => acc + (Number(m.pt_remaining_sessions) || 0), 0)
  }, [ptMembers])


  // Hitung jumlah member per kategori status
  const statusCounts = useMemo(() => {
    const counts = { all: (ptMembers || []).length, active: 0, expiring_soon: 0, critical: 0 }
    for (const m of ptMembers || []) {
      const remaining = Number(m.pt_remaining_sessions) || 0
      if (remaining > 0) {
        counts.active += 1
      }
      const st = getMemberStatus(remaining)
      if (st === 'expiring_soon' || st === 'critical') {
        counts[st] = (counts[st] || 0) + 1
      }
    }
    return counts
  }, [ptMembers])

  // Opsi data untuk MemberCombobox selector
  const memberOptions = useMemo(
    () =>
      (ptMembers || []).map((m) => ({
        id: m.member_id,
        full_name: m.full_name || 'Member PT',
        phone: m.phone,
      })),
    [ptMembers]
  )

  const statusMap = useMemo(() => {
    const map = new Map<string, string>()
    ;(ptMembers || []).forEach((m) => {
      const remaining = Number(m.pt_remaining_sessions) || 0
      map.set(m.member_id, `${remaining} sesi`)
    })
    return map
  }, [ptMembers])

  // 2. Data tanggal & navigasi agenda
  const todayStr = useMemo(() => new Date().toLocaleDateString('sv-SE'), [])
  const activeAgendaDate = selectedAgendaDate || todayStr

  const isToday = activeAgendaDate === todayStr

  const isYesterday = useMemo(() => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    return activeAgendaDate === yesterday.toLocaleDateString('sv-SE')
  }, [activeAgendaDate])

  const isTomorrow = useMemo(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return activeAgendaDate === tomorrow.toLocaleDateString('sv-SE')
  }, [activeAgendaDate])

  const dateRelationLabel = useMemo(() => {
    if (isToday) return 'Hari Ini'
    if (isYesterday) return 'Kemarin'
    if (isTomorrow) return 'Besok'
    if (activeAgendaDate < todayStr) return 'Riwayat'
    return 'Mendatang'
  }, [isToday, isYesterday, isTomorrow, activeAgendaDate, todayStr])

  const formattedActiveDate = useMemo(() => {
    const d = new Date(activeAgendaDate)
    return d.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }, [activeAgendaDate])

  const handleNavigateDate = (deltaDays: number) => {
    const current = new Date(activeAgendaDate)
    current.setDate(current.getDate() + deltaDays)
    const nextStr = current.toLocaleDateString('sv-SE')
    onChangeAgendaDate?.(nextStr)
  }

  const handleResetToToday = () => {
    onChangeAgendaDate?.(todayStr)
  }

  const agendaTitle = useMemo(() => {
    if (isToday) return 'Agenda Sesi Latihan Hari Ini'
    if (activeAgendaDate < todayStr) return 'Riwayat Sesi Latihan'
    return 'Jadwal Sesi Mendatang'
  }, [isToday, activeAgendaDate, todayStr])

  // 3. Sesi agenda yang selesai vs belum
  const completedTodayCount = todaySessions.filter((s) => s.is_completed).length

  const [page, setPage] = useState(1)
  const PER_PAGE = 9

  // 4. Filter direktori member & urutkan sisa sesi terbanyak
  const filteredMembers = useMemo(() => {
    let list = [...(ptMembers || [])]

    // Filter Status Kategori (Semua, Aktif, Segera, Kritis, Sesi Habis)
    if (statusFilter !== 'all') {
      list = list.filter((m) => {
        const remaining = Number(m.pt_remaining_sessions) || 0
        if (statusFilter === 'active') return remaining > 0
        return getMemberStatus(remaining) === statusFilter
      })
    }

    // Filter Pencarian Teks
    if (searchMember.trim()) {
      const q = searchMember.toLowerCase().trim()
      list = list.filter(
        (m) =>
          m.full_name?.toLowerCase().includes(q) ||
          m.phone?.includes(q) ||
          m.pt_membership_name?.toLowerCase().includes(q)
      )
    }

    // Urutkan berdasarkan sisa sesi terbanyak (Descending)
    list.sort((a, b) => {
      const remainingA = Number(a.pt_remaining_sessions) || 0
      const remainingB = Number(b.pt_remaining_sessions) || 0
      if (remainingB !== remainingA) {
        return remainingB - remainingA
      }
      return (a.full_name || '').localeCompare(b.full_name || '')
    })

    return list
  }, [ptMembers, statusFilter, searchMember])

  const totalPages = Math.ceil(filteredMembers.length / PER_PAGE)
  const paginatedMembers = useMemo(() => {
    return filteredMembers.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  }, [filteredMembers, page])

  // ── SKELETON LOADING STATE (OPSI 1) ──
  if (isLoading) {
    return (
      <div className="space-y-6">

        {/* SKELETON: ACTION BAR BUKA PROFIL MEMBER */}
        <Card className="border-border/60 bg-card overflow-hidden shadow-xs">
          <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3.5">
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-56 bg-muted/80" />
              <Skeleton className="h-3 w-80 bg-muted/50" />
            </div>
            <Skeleton className="h-9 w-full md:w-80 rounded-md bg-muted/70 shrink-0" />
          </CardContent>
        </Card>

        {/* 2. SKELETON: AGENDA SESI HARI INI */}
        <Card className="border-border/60 bg-card overflow-hidden shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 border-b border-border/40 p-4 bg-muted/10">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-8 w-8 rounded-lg bg-muted/70 shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-44 bg-muted/80" />
                <Skeleton className="h-3 w-28 bg-muted/50 sm:hidden" />
              </div>
            </div>
            <Skeleton className="h-8 w-36 rounded-lg bg-muted/70" />
          </div>
          <CardContent className="p-4 sm:p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl border border-border/50 bg-card/60 p-3 sm:p-3.5"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-11 w-12 rounded-xl bg-muted/70 shrink-0" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-32 bg-muted/80" />
                      <Skeleton className="h-3 w-24 bg-muted/50" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-18 rounded-lg bg-muted/70 shrink-0" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 3. SKELETON: QUICK MEMBER DIRECTORY */}
        <div className="space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-full bg-muted/70" />
                <Skeleton className="h-5 w-44 bg-muted/80" />
                <Skeleton className="h-4 w-16 rounded-full bg-muted/60" />
              </div>
              <Skeleton className="h-3 w-64 bg-muted/50" />
            </div>
            <Skeleton className="h-8 w-full sm:w-64 rounded-md bg-muted/70" />
          </div>

          {/* Badges placeholder */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-7 w-20 rounded-lg bg-muted/70 shrink-0" />
            ))}
          </div>

          {/* Grid 9 Kartu Member Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
              <Card key={i} className="border-border/60 bg-card overflow-hidden shadow-xs">
                <CardContent className="p-4 space-y-3.5">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <Skeleton className="h-11 w-11 rounded-xl bg-muted/70 shrink-0" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-28 bg-muted/80" />
                        <Skeleton className="h-3 w-20 bg-muted/50" />
                      </div>
                    </div>
                    <Skeleton className="h-5 w-20 rounded-full bg-muted/70 shrink-0" />
                  </div>
                  <div className="rounded-xl bg-muted/20 border border-border/40 p-2.5 space-y-2">
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <Skeleton className="h-3 w-20 bg-muted/70" />
                        <Skeleton className="h-3 w-16 bg-muted/70" />
                      </div>
                      <Skeleton className="h-1.5 w-full rounded-full bg-muted/50" />
                    </div>
                    <div className="flex justify-between pt-1 border-t border-border/30">
                      <Skeleton className="h-3 w-14 bg-muted/60" />
                      <Skeleton className="h-3 w-24 bg-muted/60" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1 border-t border-border/30">
                    <Skeleton className="h-8 flex-1 rounded-md bg-muted/70" />
                    <Skeleton className="h-8 w-8 rounded-md bg-muted/70" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* ── ACTION BAR: CARI & BUKA PROFIL MEMBER PT (VISUAL OPSI 1) ── */}
      <Card className="border-border/70 bg-gradient-to-r from-card via-card/95 to-card/90 overflow-hidden shadow-xs hover:border-primary/40 transition-colors">
        <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                <User className="h-4 w-4" />
              </div>
              <h3 className="font-heading text-sm sm:text-base font-bold text-foreground">
                Buka Profil & Perkembangan Member
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Pilih member untuk melihat riwayat latihan per sesi, grafik berat badan, lingkar tubuh, dan foto before-after.
            </p>
          </div>

          <div className="w-full md:w-80 shrink-0">
            <MemberCombobox
              members={memberOptions}
              value=""
              onValueChange={onSelectMember}
              placeholder="Cari & Pilih Member PT..."
              statusMap={statusMap}
              emptyMessage="Tidak ada member PT aktif"
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── BANNER DETEKSI SESI TERLEWAT / PENDING ── */}
      {pendingSessions && pendingSessions.length > 0 && (
        <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-4 transition-all">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 shrink-0 mt-0.5 sm:mt-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-heading text-sm font-bold text-amber-300">
                    Perhatian: Ada {pendingSessions.length} Sesi Terjadwal Belum Diselesaikan
                  </h4>
                  <Badge variant="outline" className="border-amber-500/40 bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                    Tertunda
                  </Badge>
                </div>
                <p className="text-xs text-amber-200/80 mt-0.5 leading-relaxed">
                  Terdapat sesi di hari sebelumnya yang belum dicatat atau diselesaikan latihannya oleh pelatih.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onChangeAgendaDate?.(pendingSessions[0].session_date)}
                className="h-8 px-3 text-xs font-bold border-amber-500/40 text-amber-300 hover:bg-amber-500/20 hover:text-amber-200 gap-1.5"
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>Lihat Jadwal Terlewat ({new Date(pendingSessions[0].session_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })})</span>
              </Button>
            </div>
          </div>

          {/* Mini preview 3 sesi tertunda teratas */}
          <div className="mt-3 pt-3 border-t border-amber-500/20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {pendingSessions.slice(0, 3).map((sess) => (
              <div
                key={sess.id}
                className="flex items-center justify-between rounded-lg bg-black/25 border border-amber-500/25 px-2.5 py-1.5 text-xs text-amber-200/95"
              >
                <div className="truncate mr-2">
                  <span className="font-semibold text-foreground">{sess.member_name}</span>
                  <span className="text-muted-foreground ml-1.5 text-[11px]">
                    • {new Date(sess.session_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} ({sess.session_time?.slice(0, 5)})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onStartWorkout(sess.member_id, sess.id)}
                  className="text-[11px] font-bold text-primary hover:underline shrink-0"
                >
                  Latihan &rarr;
                </button>
              </div>
            ))}
            {pendingSessions.length > 3 && (
              <div className="flex items-center text-xs text-amber-300/80 italic px-1 self-center">
                + {pendingSessions.length - 3} sesi lainnya...
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── BAGIAN 2: AGENDA SESI LATIHAN DENGAN NAVIGASI TANGGAL ── */}
      <Card className="border-border/60 bg-card overflow-hidden shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/40 p-4 bg-muted/10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
              <CalendarClock className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-heading text-sm sm:text-base font-bold text-foreground">
                  {agendaTitle}
                </h3>
                <Badge
                  variant="outline"
                  className={`text-[10px] font-semibold uppercase tracking-wider ${
                    isToday
                      ? 'border-primary/40 bg-primary/10 text-primary'
                      : activeAgendaDate < todayStr
                      ? 'border-neutral-500/40 bg-neutral-500/10 text-muted-foreground'
                      : 'border-blue-500/40 bg-blue-500/10 text-blue-400'
                  }`}
                >
                  {dateRelationLabel}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formattedActiveDate}
              </p>
            </div>
          </div>

          {/* Stepper Navigasi Geser Tanggal & Action Button */}
          <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
            {/* Stepper Geser Tanggal (< Hari Ini >) */}
            <div className="flex items-center rounded-lg border border-border/70 bg-background/80 p-0.5 shadow-2xs">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleNavigateDate(-1)}
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                title="Hari Sebelumnya"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {!isToday ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleResetToToday}
                  className="h-7 px-2 text-[11px] font-bold text-primary hover:text-primary hover:bg-primary/10 gap-1"
                  title="Kembali ke Hari Ini"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Hari Ini</span>
                </Button>
              ) : (
                <span className="px-2 text-[11px] font-semibold text-muted-foreground select-none">
                  Hari Ini
                </span>
              )}

              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleNavigateDate(1)}
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                title="Hari Berikutnya"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {isLoading ? (
              <Skeleton className="h-8 w-24 rounded-lg" />
            ) : todaySessions.length > 0 ? (
              <Badge variant="outline" className="text-xs font-semibold border-primary/30 bg-primary/5 text-primary h-8 flex items-center">
                {completedTodayCount}/{todaySessions.length} Selesai
              </Badge>
            ) : null}

            <Button
              size="sm"
              variant="outline"
              onClick={() => onStartWorkout('')}
              className="h-8 px-3 text-xs font-semibold gap-1.5 border-border/60 hover:bg-muted"
            >
              <Zap className="h-3.5 w-3.5 text-accent" />
              <span>Sesi Walk-In Baru</span>
            </Button>
          </div>
        </div>

        <CardContent className="p-4 sm:p-5">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl border border-border/60 p-3 sm:p-3.5 bg-card/50 animate-pulse"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Skeleton className="h-10 w-12 rounded-xl" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-44" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-20 rounded-lg ml-2" />
                </div>
              ))}
            </div>
          ) : todaySessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted/30 text-muted-foreground mb-2">
                <Clock className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                {isToday
                  ? 'Tidak ada jadwal sesi PT terjadwal untuk hari ini'
                  : `Tidak ada jadwal sesi PT untuk ${dateRelationLabel.toLowerCase()} (${formattedActiveDate})`}
              </p>
              <p className="text-xs text-muted-foreground max-w-sm mt-0.5">
                {isToday
                  ? 'Semua member belum memiliki booking jadwal hari ini. Anda tetap bisa langsung mencatat latihan dadakan (Walk-In).'
                  : 'Belum ada booking jadwal sesi pada tanggal ini. Anda tetap bisa mencatat sesi latihan baru jika diperlukan.'}
              </p>
              <Button
                size="sm"
                onClick={() => onStartWorkout('')}
                className="mt-3.5 h-8 px-3.5 text-xs font-bold bg-primary text-black hover:bg-primary/90 shadow-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Catat Latihan Walk-In
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {todaySessions.map((session) => {
                const isCompleted = session.is_completed
                const timeFormatted = session.session_time?.slice(0, 5) || '--:--'

                return (
                  <div
                    key={session.id}
                    className={`flex items-center justify-between rounded-xl border p-3 sm:p-3.5 transition-all ${isCompleted
                        ? 'border-border/40 bg-muted/10 opacity-75'
                        : 'border-border/70 bg-card/80 hover:border-primary/50 shadow-xs'
                      }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex flex-col items-center justify-center rounded-xl px-2.5 py-1.5 font-mono shrink-0 border ${isCompleted
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                            : 'border-primary/30 bg-primary/10 text-primary'
                          }`}
                      >
                        <span className="text-xs font-bold">{timeFormatted}</span>
                        <span className="text-[9px] uppercase tracking-wider font-semibold">WIB</span>
                      </div>

                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-semibold text-sm text-foreground truncate">
                            {session.member_name}
                          </p>
                          {isCompleted ? (
                            <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                              <CheckCircle2 className="h-2.5 w-2.5" /> Selesai
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                              Terjadwal
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="truncate">{session.pt_membership_name || 'Paket PT'}</span>
                          <span>•</span>
                          <span className="font-semibold text-accent">
                            Sisa {session.remaining_sessions ?? 0} sesi
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 pl-2">
                      {!isCompleted ? (
                        <Button
                          size="sm"
                          onClick={() => onStartWorkout(session.member_id, session.id)}
                          className="h-8 px-3 text-xs font-bold bg-primary text-black hover:bg-primary/90 shadow-xs active:scale-95 transition-all"
                        >
                          <Play className="h-3 w-3 mr-1 fill-black" /> Latihan
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onSelectMember(session.member_id)}
                          className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                          title="Lihat riwayat progress"
                        >
                          <span>Progress</span>
                          <ChevronRight className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── BAGIAN 3: QUICK MEMBER CARD DIRECTORY ── */}
      <div className="space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Users className="h-4 w-4 text-primary" />
              <h3 className="font-heading text-base font-bold text-foreground">
                Direktori Member PT Aktif
              </h3>
              {isLoading ? (
                <>
                  <Skeleton className="h-5 w-20 rounded" />
                  <Skeleton className="h-5 w-28 rounded" />
                  <Skeleton className="h-5 w-24 rounded" />
                </>
              ) : (
                <>
                  <Badge variant="outline" className="text-[11px] font-semibold border-primary/30 bg-primary/5 text-primary">
                    {totalActiveMembers} Member
                  </Badge>
                  <Badge variant="outline" className="text-[11px] font-semibold border-accent/40 bg-accent/10 text-accent gap-1">
                    <Zap className="h-3 w-3" />
                    <span>{totalRemainingSessions} Sesi Tersimpan</span>
                  </Badge>
                  <Badge
                    variant="outline"
                    onClick={() => {
                      setStatusFilter(statusFilter === 'critical' ? 'all' : 'critical')
                      setPage(1)
                    }}
                    className={`text-[11px] font-semibold gap-1 cursor-pointer transition-all ${
                      statusCounts.critical > 0
                        ? statusFilter === 'critical'
                          ? 'border-amber-500 bg-amber-500/25 text-amber-300 ring-1 ring-amber-500/50'
                          : 'border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                        : 'border-border/60 bg-muted/20 text-muted-foreground'
                    }`}
                    title="Klik untuk filter member kritis"
                  >
                    <AlertTriangle className="h-3 w-3" />
                    <span>{statusCounts.critical} Kritis (≤ 2 Sesi)</span>
                  </Badge>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pilih member di bawah untuk langsung membuka kalender latihan &amp; grafik transformasi fisik.
            </p>
          </div>

          {/* Pencarian cepat member */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              value={searchMember}
              onChange={(e) => {
                setSearchMember(e.target.value)
                setPage(1)
              }}
              placeholder="Cari nama atau no. HP..."
              className="h-8 pl-8 text-xs bg-card border-border/60"
            />
          </div>
        </div>

        {/* Status Filter Pill Bar (Sesuai Desain Halaman Member) */}
        <div className="flex w-full items-center gap-1 overflow-x-auto pb-1 scrollbar-hide">
          {FILTER_OPTIONS.map((opt) => {
            const isActive = statusFilter === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setStatusFilter(opt.value)
                  setPage(1)
                }}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors border ${
                  isActive
                    ? 'bg-primary text-foreground border-[#FF2A2A]'
                    : 'bg-card text-muted-foreground hover:bg-[#2A2A2A] hover:text-foreground border-border'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>

        {/* Grid Kartu Member */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-border/60 bg-card p-4 space-y-3 animate-pulse"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-5 w-16 rounded-md" />
                </div>
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                  <Skeleton className="h-1.5 w-full rounded-full" />
                </div>
                <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-7 w-20 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/80 bg-card/40 p-8 text-center space-y-1">
            <p className="text-sm font-semibold text-foreground">Member tidak ditemukan</p>
            <p className="text-xs text-muted-foreground">
              {searchMember.trim()
                ? `Tidak ada member PT yang sesuai dengan pencarian "${searchMember}".`
                : `Tidak ada member PT dengan kategori status "${FILTER_OPTIONS.find((f) => f.value === statusFilter)?.label}".`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {paginatedMembers.map((member) => {
              const remaining = Number(member.pt_remaining_sessions) || 0
              const rawTotal = Number(member.pt_total_sessions) || 0
              const totalSessions = Math.max(rawTotal, remaining)
              const completedSessions = Math.max(0, totalSessions - remaining)
              const pct = totalSessions > 0 ? Math.min(100, Math.round((completedSessions / totalSessions) * 100)) : 0
              const lastLog = latestLogsMap?.[member.member_id]

              const initials =
                member.full_name
                  ?.split(' ')
                  .map((n: string) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2) || 'PT'

              // Styling sisa sesi
              const isCritical = remaining <= 2 && remaining > 0
              const isExhausted = remaining === 0

              return (
                <Card
                  key={member.member_id}
                  className="group relative border-border/60 bg-card overflow-hidden shadow-xs transition-all hover:border-primary/50 hover:shadow-md hover:shadow-primary/5"
                >
                  <CardContent className="p-4 space-y-3.5">
                    {/* Header Member: Avatar + Nama + Status */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-heading font-extrabold text-primary text-sm group-hover:bg-primary group-hover:text-black transition-colors">
                          {initials}
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <p className="font-heading text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                            {member.full_name}
                          </p>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3 shrink-0" />
                            <span className="truncate">{member.phone || '-'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Badge Sisa Sesi */}
                      <div className="shrink-0">
                        {isExhausted ? (
                          <Badge variant="outline" className="border-rose-500/40 bg-rose-500/10 text-rose-400 text-[10px] font-bold">
                            Habis (0)
                          </Badge>
                        ) : isCritical ? (
                          <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-400 text-[10px] font-bold">
                            Sisa {remaining} Sesi ⚠️
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                            Sisa {remaining} Sesi
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* ── KOMBINASI OPSI 1 (PROGRESS BAR) & OPSI 3 (LOG TERAKHIR) ── */}
                    <div className="rounded-xl bg-muted/20 border border-border/40 p-2.5 space-y-2 text-xs">
                      {/* Opsi 1: Progress Bar Kuota Sesi */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground font-medium flex items-center gap-1">
                            <Dumbbell className="h-3 w-3 text-primary" />
                            <span>Progres Kuota</span>
                          </span>
                          <span className="font-semibold text-foreground">
                            {totalSessions > 0 ? (
                              <>
                                <span className="text-primary font-bold">{completedSessions}</span>
                                <span className="text-muted-foreground">/{totalSessions}</span>
                                <span className="text-muted-foreground/70 ml-1">({pct}%)</span>
                              </>
                            ) : (
                              <span className="text-accent font-bold">Sisa {remaining} Sesi</span>
                            )}
                          </span>
                        </div>

                        {/* Horizontal Progress Bar */}
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                            style={{ width: `${Math.max(4, pct)}%` }}
                          />
                        </div>
                      </div>

                      {/* Opsi 3: Info Sesi Latihan Terakhir */}
                      <div className="flex items-center justify-between pt-1.5 border-t border-border/30 text-[11px]">
                        <span className="text-muted-foreground/80 flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground/70" />
                          <span>Terakhir:</span>
                        </span>
                        {lastLog ? (
                          <div className="flex items-center gap-1.5 font-medium truncate">
                            <span className="text-accent font-semibold">{formatLastWorkoutDate(lastLog.created_at)}</span>
                            <span className="text-muted-foreground/40">•</span>
                            <span className="font-bold text-foreground truncate">{lastLog.category}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/50 italic text-[10px]">
                            Belum ada sesi
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons: Lihat Progress vs Catat Latihan */}
                    <div className="flex items-center gap-2 pt-1 border-t border-border/30">
                      <Button
                        size="sm"
                        onClick={() => onSelectMember(member.member_id)}
                        className="flex-1 h-8 px-3 text-xs font-bold bg-primary/10 text-primary border border-primary/30 hover:bg-primary hover:text-black transition-all shadow-xs"
                      >
                        <span>Lihat Progress</span>
                        <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onStartWorkout(member.member_id)}
                        className="h-8 px-2.5 text-xs font-semibold border-border/60 hover:bg-muted text-accent"
                        title="Langsung mulai catat latihan live untuk member ini"
                      >
                        <Zap className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Pagination Controls — Sesuai Desain Halaman Member */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-3">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="border-border text-xs text-muted-foreground hover:text-foreground"
            >
              Sebelumnya
            </Button>
            <span className="text-xs text-muted-foreground font-medium px-2">
              {page} / {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="border-border text-xs text-muted-foreground hover:text-foreground"
            >
              Selanjutnya
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
