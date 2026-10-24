'use client'

import { useState, useMemo } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Trash2,
  Dumbbell,
  Sparkles,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { PtProgressLogWithMember } from '@/hooks/usePtProgress'
import type { PtProgressCategory } from '@/lib/types'

const CATEGORY_STYLES: Record<
  PtProgressCategory,
  { border: string; text: string; bg: string; dot: string }
> = {
  Push: {
    border: 'border-amber-500/40',
    text: 'text-amber-400',
    bg: 'bg-amber-500/10',
    dot: 'bg-amber-400',
  },
  Pull: {
    border: 'border-blue-500/40',
    text: 'text-blue-400',
    bg: 'bg-blue-500/10',
    dot: 'bg-blue-400',
  },
  Leg: {
    border: 'border-emerald-500/40',
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    dot: 'bg-emerald-400',
  },
  'Full Body': {
    border: 'border-purple-500/40',
    text: 'text-purple-400',
    bg: 'bg-purple-500/10',
    dot: 'bg-purple-400',
  },
  Cardio: {
    border: 'border-rose-500/40',
    text: 'text-rose-400',
    bg: 'bg-rose-500/10',
    dot: 'bg-rose-400',
  },
  Lainnya: {
    border: 'border-neutral-500/40',
    text: 'text-neutral-300',
    bg: 'bg-neutral-500/10',
    dot: 'bg-neutral-400',
  },
}

const DAYS_OF_WEEK = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]

interface PtWorkoutMonthlyCalendarProps {
  workoutLogs: PtProgressLogWithMember[]
  onDeleteWorkout?: (log: PtProgressLogWithMember) => void
  onAddWorkoutClick?: () => void
  memberName?: string
}

export default function PtWorkoutMonthlyCalendar({
  workoutLogs,
  onDeleteWorkout,
  onAddWorkoutClick,
  memberName,
}: PtWorkoutMonthlyCalendarProps) {
  const today = useMemo(() => new Date(), [])
  const todayStr = useMemo(() => {
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
      today.getDate()
    ).padStart(2, '0')}`
  }, [today])

  // Navigasi bulan saat ini
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date())
  // Tanggal yang dipilih untuk melihat detail di bawah kalender
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr)

  const currentYear = currentDate.getFullYear()
  const currentMonthIndex = currentDate.getMonth()

  // Ganti bulan sebelumnya / berikutnya
  const handlePrevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const handleGoToToday = () => {
    const now = new Date()
    setCurrentDate(now)
    setSelectedDateStr(
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
        now.getDate()
      ).padStart(2, '0')}`
    )
  }

  // Petakan workout logs berdasarkan tanggal string (YYYY-MM-DD)
  const workoutsByDate = useMemo(() => {
    const map = new Map<string, PtProgressLogWithMember[]>()
    for (const log of workoutLogs) {
      const d = new Date(log.created_at)
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`
      if (!map.has(dateKey)) {
        map.set(dateKey, [])
      }
      map.get(dateKey)!.push(log)
    }
    return map
  }, [workoutLogs])

  // Hitung jumlah sesi latihan pada bulan yang sedang ditampilkan
  const currentMonthSessionCount = useMemo(() => {
    let count = 0
    workoutsByDate.forEach((logs, dateStr) => {
      const [y, m] = dateStr.split('-').map(Number)
      if (y === currentYear && m === currentMonthIndex + 1) {
        count += logs.length
      }
    })
    return count
  }, [workoutsByDate, currentYear, currentMonthIndex])

  // Bangun grid sel kalender (dimulai Senin)
  const calendarCells = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonthIndex, 1)
    // getDay(): 0 (Minggu), 1 (Senin), ..., 6 (Sabtu)
    // Ingin Senin = 0, Selasa = 1, ..., Minggu = 6
    const startDayOffset = (firstDay.getDay() + 6) % 7
    const daysInCurrentMonth = new Date(currentYear, currentMonthIndex + 1, 0).getDate()
    const daysInPrevMonth = new Date(currentYear, currentMonthIndex, 0).getDate()

    const cells: {
      day: number
      dateStr: string
      isCurrentMonth: boolean
      isToday: boolean
      isSelected: boolean
      workouts: PtProgressLogWithMember[]
    }[] = []

    // 1. Hari dari bulan sebelumnya (padding kiri)
    for (let i = startDayOffset - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i
      const prevMonth = currentMonthIndex === 0 ? 12 : currentMonthIndex
      const prevYear = currentMonthIndex === 0 ? currentYear - 1 : currentYear
      const dateStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      cells.push({
        day,
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDateStr,
        workouts: workoutsByDate.get(dateStr) || [],
      })
    }

    // 2. Hari dalam bulan ini
    for (let day = 1; day <= daysInCurrentMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}-${String(
        day
      ).padStart(2, '0')}`
      cells.push({
        day,
        dateStr,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDateStr,
        workouts: workoutsByDate.get(dateStr) || [],
      })
    }

    // 3. Hari bulan berikutnya (padding kanan hingga kelipatan 7)
    const remaining = 7 - (cells.length % 7)
    if (remaining > 0 && remaining < 7) {
      for (let day = 1; day <= remaining; day++) {
        const nextMonth = currentMonthIndex === 11 ? 1 : currentMonthIndex + 2
        const nextYear = currentMonthIndex === 11 ? currentYear + 1 : currentYear
        const dateStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        cells.push({
          day,
          dateStr,
          isCurrentMonth: false,
          isToday: dateStr === todayStr,
          isSelected: dateStr === selectedDateStr,
          workouts: workoutsByDate.get(dateStr) || [],
        })
      }
    }

    return cells
  }, [currentYear, currentMonthIndex, todayStr, selectedDateStr, workoutsByDate])

  // Workouts untuk tanggal yang dipilih
  const selectedDateWorkouts = useMemo(() => {
    return workoutsByDate.get(selectedDateStr) || []
  }, [workoutsByDate, selectedDateStr])

  // Format tanggal terpilih Bahasa Indonesia
  const formattedSelectedDate = useMemo(() => {
    if (!selectedDateStr) return ''
    const [y, m, d] = selectedDateStr.split('-').map(Number)
    const dateObj = new Date(y, m - 1, d)
    return dateObj.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }, [selectedDateStr])

  return (
    <div className="space-y-4">
      {/* 1. Header Kalender & Navigasi Bulan */}
      <Card className="border-border/60 bg-card overflow-hidden shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/40 p-4 bg-muted/10">
          <div>
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-primary" />
              <h3 className="font-heading text-lg font-bold text-foreground">
                {MONTH_NAMES[currentMonthIndex]} {currentYear}
              </h3>
              <Badge variant="outline" className="text-[11px] font-semibold border-primary/30 bg-primary/10 text-primary">
                {currentMonthSessionCount} Sesi Latihan
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Klik tanggal untuk memeriksa detail latihan dan perkembangan {memberName || 'member'}.
            </p>
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGoToToday}
              className="h-8 px-2.5 text-xs font-semibold border-border/60 hover:bg-muted"
            >
              Hari Ini
            </Button>
            <div className="flex items-center rounded-lg border border-border/60 bg-background/60 p-0.5">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevMonth}
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                title="Bulan Sebelumnya"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNextMonth}
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                title="Bulan Berikutnya"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* 2. Grid Hari (Sen - Min) */}
        <div className="p-3 sm:p-4">
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center">
            {DAYS_OF_WEEK.map((day, idx) => (
              <div
                key={day}
                className={`text-[11px] font-bold uppercase tracking-wider py-1 ${
                  idx === 5 || idx === 6 ? 'text-primary/70' : 'text-muted-foreground'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Grid Tanggal Kalender */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {calendarCells.map((cell, idx) => {
              const hasWorkouts = cell.workouts.length > 0
              const isSelected = cell.isSelected
              const isToday = cell.isToday

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedDateStr(cell.dateStr)}
                  className={`group relative flex flex-col items-center sm:items-start justify-between rounded-xl p-1.5 sm:p-2 text-left transition-all min-h-[58px] sm:min-h-[76px] border ${
                    !cell.isCurrentMonth
                      ? 'border-transparent bg-background/30 text-muted-foreground/30 opacity-40 hover:opacity-80'
                      : isSelected
                      ? 'border-primary bg-primary/10 shadow-sm shadow-primary/20 ring-1 ring-primary'
                      : hasWorkouts
                      ? 'border-border/80 bg-card hover:border-primary/50 hover:bg-muted/30 text-foreground'
                      : 'border-border/30 bg-background/50 hover:bg-muted/20 text-muted-foreground'
                  }`}
                >
                  {/* Angka Tanggal & Indikator Hari Ini */}
                  <div className="flex w-full items-center justify-between">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                        isToday
                          ? 'bg-primary font-bold text-black shadow-xs'
                          : isSelected
                          ? 'font-bold text-primary'
                          : 'text-foreground'
                      }`}
                    >
                      {cell.day}
                    </span>

                    {/* Badge Sesi di Desktop */}
                    {hasWorkouts && (
                      <span className="hidden sm:inline-block rounded-md bg-primary/20 px-1.5 py-0.2 text-[10px] font-bold text-primary">
                        {cell.workouts.length} Sesi
                      </span>
                    )}
                  </div>

                  {/* Kategori Latihan Badges (Mobile: Dot, Desktop: Pill) */}
                  <div className="mt-1 flex w-full flex-col gap-1">
                    {/* Mobile: Colorful Dots */}
                    <div className="flex sm:hidden items-center justify-center gap-1 flex-wrap">
                      {cell.workouts.map((w, wIdx) => {
                        const style = CATEGORY_STYLES[w.category] || CATEGORY_STYLES.Lainnya
                        return (
                          <span
                            key={wIdx}
                            className={`h-2 w-2 rounded-full ${style.dot} shadow-xs`}
                            title={w.category}
                          />
                        )
                      })}
                    </div>

                    {/* Desktop: Mini Category Tags */}
                    <div className="hidden sm:flex flex-col gap-1 w-full overflow-hidden">
                      {cell.workouts.slice(0, 2).map((w, wIdx) => {
                        const style = CATEGORY_STYLES[w.category] || CATEGORY_STYLES.Lainnya
                        return (
                          <div
                            key={wIdx}
                            className={`truncate rounded px-1.5 py-0.5 text-[10px] font-semibold border ${style.border} ${style.bg} ${style.text}`}
                          >
                            {w.category}
                          </div>
                        )
                      })}
                      {cell.workouts.length > 2 && (
                        <span className="text-[9px] text-muted-foreground font-semibold pl-1">
                          +{cell.workouts.length - 2} lainnya
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </Card>

      {/* 3. Panel Inline Detail Sesi Latihan Hari Terpilih */}
      <Card className="border-border/60 bg-card overflow-hidden shadow-sm">
        <div className="flex items-center justify-between border-b border-border/40 p-4 bg-muted/15">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <h4 className="font-heading text-sm sm:text-base font-bold text-foreground">
              Detail Latihan: <span className="text-primary">{formattedSelectedDate}</span>
            </h4>
          </div>

          <Badge
            variant="outline"
            className={
              selectedDateWorkouts.length > 0
                ? 'border-primary/40 bg-primary/10 text-primary font-bold text-xs'
                : 'border-border text-muted-foreground text-xs'
            }
          >
            {selectedDateWorkouts.length > 0
              ? `${selectedDateWorkouts.length} Sesi Selesai`
              : 'Tidak Ada Sesi'}
          </Badge>
        </div>

        <CardContent className="p-4 sm:p-5">
          {selectedDateWorkouts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/40 text-muted-foreground mb-2">
                <Dumbbell className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                Tidak ada catatan latihan pada tanggal ini
              </p>
              <p className="text-xs text-muted-foreground max-w-sm mt-0.5">
                Member tidak memiliki jadwal sesi selesai pada {formattedSelectedDate}.
              </p>

              {selectedDateStr === todayStr && onAddWorkoutClick && (
                <Button
                  size="sm"
                  onClick={onAddWorkoutClick}
                  className="mt-4 bg-primary text-black font-bold hover:bg-primary/90 text-xs shadow-sm shadow-primary/20"
                >
                  <Plus className="h-4 w-4 mr-1.5" /> Catat Latihan Hari Ini
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {selectedDateWorkouts.map((log) => {
                const style = CATEGORY_STYLES[log.category] || CATEGORY_STYLES.Lainnya
                const logTime = new Date(log.created_at).toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                })

                return (
                  <div
                    key={log.id}
                    className="rounded-xl border border-border/60 bg-background/50 p-4 transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-border/30 pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`rounded-md border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${style.border} ${style.bg} ${style.text}`}
                        >
                          {log.category} Day
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">
                          Pukul {logTime} WIB
                        </span>
                      </div>

                      {onDeleteWorkout && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDeleteWorkout(log)}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          title="Hapus Catatan Sesi & Kembalikan Kuota"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>

                    {/* Daftar Gerakan Latihan (Thumb Friendly Cards) */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Daftar Gerakan ({log.exercises.length} Gerakan):
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {log.exercises.map((ex, exIdx) => {
                          const isProg =
                            ex.sets_detail &&
                            ex.sets_detail.length > 0 &&
                            ex.sets_detail.some(
                              (s) =>
                                s.weight_kg !== ex.sets_detail![0].weight_kg ||
                                s.reps !== ex.sets_detail![0].reps
                            )

                          return (
                            <div
                              key={exIdx}
                              className="rounded-lg border border-border/50 bg-card p-2.5 text-xs space-y-1.5"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-foreground">{ex.name}</span>
                                {!isProg && (
                                  <div className="flex items-center gap-1.5 font-medium font-mono">
                                    <span className="text-muted-foreground">
                                      {(ex.sets_detail?.length || ex.sets)}×{ex.sets_detail?.[0]?.reps ?? ex.reps}
                                    </span>
                                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-bold text-accent">
                                      {ex.sets_detail?.[0]?.weight_kg ?? ex.weight_kg}kg
                                    </span>
                                  </div>
                                )}
                              </div>
                              {isProg && (
                                <div className="flex flex-wrap gap-1">
                                  {ex.sets_detail!.map((s) => (
                                    <span
                                      key={s.set_number}
                                      className="inline-flex items-center gap-0.5 rounded bg-muted/40 border border-border/40 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground"
                                    >
                                      <strong className="text-primary font-bold">S{s.set_number}:</strong>{' '}
                                      {s.reps}×{s.weight_kg}kg
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Catatan Coach jika ada */}
                    {log.notes && (
                      <div className="rounded-lg border border-border/40 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">Catatan Coach: </span>
                        &ldquo;{log.notes}&rdquo;
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
