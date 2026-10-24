'use client'

import { useState, useEffect, useMemo, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { usePtActiveMembers, usePtSessionsByWeek } from '@/hooks/usePtSessions'
import { useCreatePtProgressLog } from '@/hooks/usePtProgress'
import { usePtExercisePresets, useCreatePtExercisePreset, useDeletePtExercisePreset } from '@/hooks/usePtExercisePresets'
import MemberCombobox from '@/components/dashboard/MemberCombobox'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  ArrowLeft,
  Plus,
  Trash2,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  Loader2,
  Clock,
  Send,
  Flame,
  Minus,
  MessageCircle,
  HelpCircle,
  AlertCircle,
  Zap,
  Search,
  X,
  CalendarClock,
  Award,
  FileText,
} from 'lucide-react'
import { toast } from 'sonner'
import type { PtProgressCategory, ExerciseItem, SetDetail } from '@/lib/types'

const CATEGORIES: { label: PtProgressCategory; color: string; border: string; bg: string; presets: string[] }[] = [
  {
    label: 'Push',
    color: 'text-amber-400',
    border: 'border-amber-500/40',
    bg: 'bg-amber-500/10',
    presets: ['Bench Press', 'Incline DB Press', 'Overhead Press', 'Lateral Raise', 'Tricep Pushdown', 'Dips'],
  },
  {
    label: 'Pull',
    color: 'text-blue-400',
    border: 'border-blue-500/40',
    bg: 'bg-blue-500/10',
    presets: ['Lat Pulldown', 'Barbell Row', 'Seated Cable Row', 'Bicep Curl', 'Hammer Curl', 'Face Pull'],
  },
  {
    label: 'Leg',
    color: 'text-emerald-400',
    border: 'border-emerald-500/40',
    bg: 'bg-emerald-500/10',
    presets: ['Barbell Squat', 'Leg Press', 'Romanian Deadlift', 'Leg Extension', 'Leg Curl', 'Calf Raise'],
  },
  {
    label: 'Full Body',
    color: 'text-purple-400',
    border: 'border-purple-500/40',
    bg: 'bg-purple-500/10',
    presets: ['Deadlift', 'Clean & Press', 'Kettlebell Swing', 'Thruster', 'Pull-up', 'Push-up'],
  },
  {
    label: 'Cardio',
    color: 'text-rose-400',
    border: 'border-rose-500/40',
    bg: 'bg-rose-500/10',
    presets: ['Treadmill HIIT', 'Rowing Machine', 'Assault Bike', 'Jump Rope', 'Stair Climber'],
  },
  {
    label: 'Lainnya',
    color: 'text-neutral-300',
    border: 'border-neutral-500/40',
    bg: 'bg-neutral-500/10',
    presets: ['Core / Plank', 'Hanging Leg Raise', 'Stretching & Mobility'],
  },
]

// Database Katalog Gerakan Lengkap untuk Tap Cepat
const EXERCISE_CATALOG = [
  // Dada (Chest)
  { name: 'Flat Bench Press', category: 'Dada', defaultWeight: 40, defaultSets: 4, defaultReps: 10 },
  { name: 'Incline Dumbbell Press', category: 'Dada', defaultWeight: 20, defaultSets: 3, defaultReps: 10 },
  { name: 'Decline Bench Press', category: 'Dada', defaultWeight: 35, defaultSets: 3, defaultReps: 12 },
  { name: 'Cable Chest Flyes', category: 'Dada', defaultWeight: 15, defaultSets: 3, defaultReps: 12 },
  { name: 'Dips (Chest Focus)', category: 'Dada', defaultWeight: 0, defaultSets: 3, defaultReps: 10 },
  { name: 'Push-Up', category: 'Dada', defaultWeight: 0, defaultSets: 3, defaultReps: 15 },
  { name: 'Pec Deck Fly Machine', category: 'Dada', defaultWeight: 35, defaultSets: 3, defaultReps: 12 },

  // Punggung (Back)
  { name: 'Lat Pulldown', category: 'Punggung', defaultWeight: 40, defaultSets: 4, defaultReps: 10 },
  { name: 'Barbell Bent-Over Row', category: 'Punggung', defaultWeight: 40, defaultSets: 3, defaultReps: 10 },
  { name: 'Seated Cable Row', category: 'Punggung', defaultWeight: 35, defaultSets: 3, defaultReps: 12 },
  { name: 'Conventional Deadlift', category: 'Punggung', defaultWeight: 60, defaultSets: 3, defaultReps: 6 },
  { name: 'T-Bar Row', category: 'Punggung', defaultWeight: 35, defaultSets: 3, defaultReps: 10 },
  { name: 'Pull-Up', category: 'Punggung', defaultWeight: 0, defaultSets: 3, defaultReps: 8 },
  { name: 'Single-Arm Dumbbell Row', category: 'Punggung', defaultWeight: 18, defaultSets: 3, defaultReps: 10 },
  { name: 'Face Pull', category: 'Punggung', defaultWeight: 20, defaultSets: 3, defaultReps: 15 },

  // Kaki (Legs)
  { name: 'Barbell Back Squat', category: 'Kaki', defaultWeight: 50, defaultSets: 4, defaultReps: 8 },
  { name: 'Leg Press', category: 'Kaki', defaultWeight: 80, defaultSets: 3, defaultReps: 10 },
  { name: 'Romanian Deadlift (RDL)', category: 'Kaki', defaultWeight: 40, defaultSets: 3, defaultReps: 10 },
  { name: 'Leg Extension', category: 'Kaki', defaultWeight: 35, defaultSets: 3, defaultReps: 12 },
  { name: 'Lying Leg Curl', category: 'Kaki', defaultWeight: 30, defaultSets: 3, defaultReps: 12 },
  { name: 'Bulgarian Split Squat', category: 'Kaki', defaultWeight: 12, defaultSets: 3, defaultReps: 10 },
  { name: 'Standing Calf Raise', category: 'Kaki', defaultWeight: 40, defaultSets: 4, defaultReps: 15 },
  { name: 'Hip Thrust', category: 'Kaki', defaultWeight: 50, defaultSets: 3, defaultReps: 10 },

  // Bahu (Shoulders)
  { name: 'Overhead Barbell Press', category: 'Bahu', defaultWeight: 30, defaultSets: 4, defaultReps: 8 },
  { name: 'Dumbbell Shoulder Press', category: 'Bahu', defaultWeight: 16, defaultSets: 3, defaultReps: 10 },
  { name: 'Dumbbell Lateral Raise', category: 'Bahu', defaultWeight: 8, defaultSets: 4, defaultReps: 12 },
  { name: 'Cable Lateral Raise', category: 'Bahu', defaultWeight: 5, defaultSets: 3, defaultReps: 12 },
  { name: 'Front Dumbbell Raise', category: 'Bahu', defaultWeight: 8, defaultSets: 3, defaultReps: 12 },
  { name: 'Reverse Pec Deck (Rear Delt)', category: 'Bahu', defaultWeight: 25, defaultSets: 3, defaultReps: 15 },

  // Lengan (Arms)
  { name: 'Barbell Bicep Curl', category: 'Lengan', defaultWeight: 20, defaultSets: 3, defaultReps: 10 },
  { name: 'Dumbbell Hammer Curl', category: 'Lengan', defaultWeight: 12, defaultSets: 3, defaultReps: 10 },
  { name: 'Incline Dumbbell Curl', category: 'Lengan', defaultWeight: 10, defaultSets: 3, defaultReps: 12 },
  { name: 'Tricep Rope Pushdown', category: 'Lengan', defaultWeight: 25, defaultSets: 3, defaultReps: 12 },
  { name: 'Skull Crusher (EZ Bar)', category: 'Lengan', defaultWeight: 20, defaultSets: 3, defaultReps: 10 },
  { name: 'Overhead Dumbbell Tricep Extension', category: 'Lengan', defaultWeight: 18, defaultSets: 3, defaultReps: 10 },

  // Core / Perut
  { name: 'Hanging Leg Raise', category: 'Core', defaultWeight: 0, defaultSets: 3, defaultReps: 12 },
  { name: 'Plank Hold (Detik)', category: 'Core', defaultWeight: 0, defaultSets: 3, defaultReps: 60 },
  { name: 'Cable Woodchopper', category: 'Core', defaultWeight: 15, defaultSets: 3, defaultReps: 12 },
  { name: 'Ab Wheel Rollout', category: 'Core', defaultWeight: 0, defaultSets: 3, defaultReps: 10 },

  // Cardio & Conditioning
  { name: 'Treadmill Incline Walk / HIIT', category: 'Cardio', defaultWeight: 0, defaultSets: 1, defaultReps: 15 },
  { name: 'Assault Bike Sprint', category: 'Cardio', defaultWeight: 0, defaultSets: 3, defaultReps: 10 },
  { name: 'Rowing Machine', category: 'Cardio', defaultWeight: 0, defaultSets: 3, defaultReps: 500 },
  { name: 'Battle Rope', category: 'Cardio', defaultWeight: 0, defaultSets: 3, defaultReps: 30 },
]

const MUSCLE_GROUPS = ['Semua', 'Dada', 'Punggung', 'Kaki', 'Bahu', 'Lengan', 'Core', 'Cardio']

function LiveWorkoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialMemberId = searchParams.get('memberId') || ''
  const initialSessionId = searchParams.get('sessionId') || null

  const [selectedMemberId, setSelectedMemberId] = useState<string>(initialMemberId)

  // Sinkronkan pilihan member ke URL browser secara halus tanpa reload
  const handleMemberChange = (newMemberId: string) => {
    setSelectedMemberId(newMemberId)
    const params = new URLSearchParams(searchParams.toString())
    if (newMemberId && newMemberId.trim() !== '') {
      params.set('memberId', newMemberId)
    } else {
      params.delete('memberId')
    }
    const query = params.toString()
    router.replace(`/dashboard/pt/progress/workout${query ? `?${query}` : ''}`, { scroll: false })
  }

  const [category, setCategory] = useState<PtProgressCategory>('Push')
  const [exercises, setExercises] = useState<ExerciseItem[]>([])
  const [notes, setNotes] = useState('')
  const [exitDialogOpen, setExitDialogOpen] = useState(false)
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false)
  const [resetDraftDialogOpen, setResetDraftDialogOpen] = useState(false)

  const [trainerName, setTrainerName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('lineup_last_trainer_name') || ''
    }
    return ''
  })

  // Struk / Laporan@ Sesi Latihan state
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [receiptData, setReceiptData] = useState<{
    memberName: string
    memberPhone?: string
    trainerName?: string
    category: string
    duration: string
    exercises: ExerciseItem[]
    notes?: string
    remainingSessions: number
    dateStr: string
  } | null>(null)

  // Custom Preset Modal state
  const [addPresetModalOpen, setAddPresetModalOpen] = useState(false)
  const [newPresetName, setNewPresetName] = useState('')
  const [newPresetCategory, setNewPresetCategory] = useState<PtProgressCategory>('Push')
  const [presetToDelete, setPresetToDelete] = useState<{ id: string; name: string } | null>(null)

  // Catalog Picker Modal state
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [catalogSearch, setCatalogSearch] = useState('')
  const [catalogMuscle, setCatalogMuscle] = useState<string>('Semua')

  // Stopwatch state
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [isTimerRunning, setIsTimerRunning] = useState(true)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Draft restored indicator
  const [draftRestored, setDraftRestored] = useState(false)

  const { data: ptMembers, isLoading: membersLoading } = usePtActiveMembers()
  const { data: customPresets } = usePtExercisePresets()
  const createPresetMutation = useCreatePtExercisePreset()
  const deletePresetMutation = useDeletePtExercisePreset()
  const createLog = useCreatePtProgressLog()

  const activeCustomPresets = useMemo(() => {
    return (customPresets || []).filter((p) => p.category === category)
  }, [customPresets, category])

  const handleCreatePreset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPresetName.trim()) {
      toast.error('Masukkan nama gerakan')
      return
    }
    try {
      await createPresetMutation.mutateAsync({
        name: newPresetName,
        category: newPresetCategory,
      })
      toast.success(`Preset "${newPresetName}" berhasil ditambahkan!`)
      setNewPresetName('')
      setAddPresetModalOpen(false)
    } catch (err: any) {
      toast.error('Gagal menambah preset: ' + err.message)
    }
  }

  const handleDeletePreset = async () => {
    if (!presetToDelete) return
    try {
      await deletePresetMutation.mutateAsync(presetToDelete.id)
      toast.success(`Preset "${presetToDelete.name}" dihapus`)
      setPresetToDelete(null)
    } catch (err: any) {
      toast.error('Gagal menghapus preset: ' + err.message)
    }
  }

  // Rentang 1 Minggu Berjalan (Senin s/d Minggu)
  const { startOfWeek, endOfWeek } = useMemo(() => {
    const now = new Date()
    const monday = new Date(now)
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    return {
      startOfWeek: monday.toLocaleDateString('sv-SE'),
      endOfWeek: sunday.toLocaleDateString('sv-SE'),
    }
  }, [])

  const todayStr = useMemo(() => new Date().toLocaleDateString('sv-SE'), [])
  const { data: weekSessions } = usePtSessionsByWeek(startOfWeek, endOfWeek)

  const formatSessionDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    })
  }

  // Map of memberId => session hari ini yang belum selesai
  const scheduledSessionsTodayMap = useMemo(() => {
    const map = new Map<string, any>()
      ; (weekSessions || []).forEach((s) => {
        if (s.session_date === todayStr && !s.is_completed && !map.has(s.member_id)) {
          map.set(s.member_id, s)
        }
      })
    return map
  }, [weekSessions, todayStr])

  // Map of memberId => session berikutnya di minggu ini yang belum selesai (upcoming)
  const upcomingSessionsMap = useMemo(() => {
    const map = new Map<string, any>()
      ; (weekSessions || []).forEach((s) => {
        if (s.session_date > todayStr && !s.is_completed && !map.has(s.member_id)) {
          map.set(s.member_id, s)
        }
      })
    return map
  }, [weekSessions, todayStr])

  // Map of memberId => session hari ini yang SUDAH selesai
  const completedTodayMap = useMemo(() => {
    const map = new Map<string, any>()
      ; (weekSessions || []).forEach((s) => {
        if (s.session_date === todayStr && s.is_completed && !map.has(s.member_id)) {
          map.set(s.member_id, s)
        }
      })
    return map
  }, [weekSessions, todayStr])

  const scheduledSessionToday = selectedMemberId ? scheduledSessionsTodayMap.get(selectedMemberId) : null
  const upcomingSessionThisWeek = selectedMemberId ? upcomingSessionsMap.get(selectedMemberId) : null

  const currentMember = useMemo(
    () => (ptMembers || []).find((m) => m.member_id === selectedMemberId),
    [ptMembers, selectedMemberId]
  )

  // Smart Grouping: Prioritaskan member yang terjadwal hari ini, disusul jadwal minggu ini
  const memberOptions = useMemo(() => {
    const scheduledToday: Array<{ id: string; full_name: string; phone?: string }> = []
    const upcomingWeek: Array<{ id: string; full_name: string; phone?: string }> = []
    const walkIns: Array<{ id: string; full_name: string; phone?: string }> = []

      ; (ptMembers || []).forEach((m) => {
        const opt = {
          id: m.member_id,
          full_name: m.full_name,
          phone: m.phone,
        }
        if (scheduledSessionsTodayMap.has(m.member_id)) {
          scheduledToday.push(opt)
        } else if (upcomingSessionsMap.has(m.member_id)) {
          upcomingWeek.push(opt)
        } else {
          walkIns.push(opt)
        }
      })

    // Urutkan jadwal hari ini berdasarkan jam
    scheduledToday.sort((a, b) => {
      const sessA = scheduledSessionsTodayMap.get(a.id)?.session_time || ''
      const sessB = scheduledSessionsTodayMap.get(b.id)?.session_time || ''
      return sessA.localeCompare(sessB)
    })

    // Urutkan jadwal minggu ini berdasarkan tanggal dan jam
    upcomingWeek.sort((a, b) => {
      const sA = upcomingSessionsMap.get(a.id)
      const sB = upcomingSessionsMap.get(b.id)
      const keyA = `${sA?.session_date || ''} ${sA?.session_time || ''}`
      const keyB = `${sB?.session_date || ''} ${sB?.session_time || ''}`
      return keyA.localeCompare(keyB)
    })

    return [...scheduledToday, ...upcomingWeek, ...walkIns]
  }, [ptMembers, scheduledSessionsTodayMap, upcomingSessionsMap])

  const statusMap = useMemo(() => {
    const map = new Map<string, string>()
      ; (ptMembers || []).forEach((m) => {
        const todaySched = scheduledSessionsTodayMap.get(m.member_id)
        const upSched = upcomingSessionsMap.get(m.member_id)
        const compSched = completedTodayMap.get(m.member_id)

        if (todaySched) {
          map.set(
            m.member_id,
            `🔥 Hari Ini: ${formatSessionDate(todayStr)} (${todaySched.session_time?.slice(0, 5)}) · Sisa ${m.pt_remaining_sessions} sesi`
          )
        } else if (upSched) {
          map.set(
            m.member_id,
            `📅 Jadwal: ${formatSessionDate(upSched.session_date)} (${upSched.session_time?.slice(0, 5)}) · Sisa ${m.pt_remaining_sessions} sesi`
          )
        } else if (compSched) {
          map.set(
            m.member_id,
            `✅ Selesai Hari Ini (${compSched.session_time?.slice(0, 5)}) · Sisa ${m.pt_remaining_sessions} sesi`
          )
        } else {
          map.set(
            m.member_id,
            `${m.pt_membership_name} · Sisa ${m.pt_remaining_sessions} sesi`
          )
        }
      })
    return map
  }, [ptMembers, scheduledSessionsTodayMap, upcomingSessionsMap, completedTodayMap, todayStr])

  // Filter Catalog
  const filteredCatalog = useMemo(() => {
    return EXERCISE_CATALOG.filter((item) => {
      const matchMuscle = catalogMuscle === 'Semua' || item.category === catalogMuscle
      const matchSearch =
        !catalogSearch.trim() || item.name.toLowerCase().includes(catalogSearch.toLowerCase())
      return matchMuscle && matchSearch
    })
  }, [catalogMuscle, catalogSearch])

  // Timer Effect
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => prev + 1)
      }, 1000)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isTimerRunning])

  // Format Timer mm:ss
  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60)
    const secs = totalSec % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // LocalStorage Auto-Draft Key
  const draftStorageKey = useMemo(
    () => `pt_live_workout_draft_${selectedMemberId || 'anonymous'}`,
    [selectedMemberId]
  )

  // Batas kedaluwarsa draf: 12 jam (dalam ms)
  const DRAFT_MAX_AGE_MS = 12 * 60 * 60 * 1000

  // Load Draft from LocalStorage on mount or when member changes
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const saved = localStorage.getItem(draftStorageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        const isExpired = !parsed.updatedAt || Date.now() - parsed.updatedAt > DRAFT_MAX_AGE_MS

        if (isExpired) {
          // Draf kadaluarsa (> 12 jam) -> otomatis bersihkan agar sesi hari ini mulai fresh
          localStorage.removeItem(draftStorageKey)
          setExercises([])
          setNotes('')
          setTimerSeconds(0)
          setDraftRestored(false)
        } else if (parsed.exercises && parsed.exercises.length > 0) {
          const normalized = (parsed.exercises as ExerciseItem[]).map((ex) => {
            if (!ex.sets_detail || ex.sets_detail.length === 0) {
              const count = Math.max(1, ex.sets || 1)
              return {
                ...ex,
                sets_detail: Array.from({ length: count }, (_, i) => ({
                  set_number: i + 1,
                  reps: ex.reps || 10,
                  weight_kg: ex.weight_kg || 20,
                })),
              }
            }
            return ex
          })
          setExercises(normalized)
          if (parsed.trainerName !== undefined) {
            setTrainerName(parsed.trainerName)
          } else {
            const remembered = localStorage.getItem('lineup_last_trainer_name')
            if (remembered) setTrainerName(remembered)
          }
          if (parsed.category) setCategory(parsed.category)
          if (parsed.notes) setNotes(parsed.notes)
          if (parsed.timerSeconds) setTimerSeconds(parsed.timerSeconds)
          setDraftRestored(true)
        } else {
          setExercises([])
          setNotes('')
          setTimerSeconds(0)
          setDraftRestored(false)
          if (parsed.trainerName !== undefined) {
            setTrainerName(parsed.trainerName)
          }
        }
      } else {
        // Member baru tidak memiliki draf aktif -> reset bersih memori state dari member sebelumnya
        setExercises([])
        setNotes('')
        setTimerSeconds(0)
        setDraftRestored(false)
      }
    } catch (e) {
      console.warn('Gagal memuat draft latihan:', e)
      setExercises([])
      setNotes('')
      setTimerSeconds(0)
      setDraftRestored(false)
    }
  }, [draftStorageKey])

  // Save Draft on changes
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!selectedMemberId) return

    // Jika tidak ada latihan, notes kosong, dan timer 0, hapus draf dari localStorage
    if (exercises.length === 0 && !notes.trim() && timerSeconds === 0) {
      try {
        localStorage.removeItem(draftStorageKey)
      } catch (e) {
        console.warn('Gagal menghapus draf kosong:', e)
      }
      return
    }

    const timeout = setTimeout(() => {
      try {
        localStorage.setItem(
          draftStorageKey,
          JSON.stringify({
            trainerName,
            category,
            exercises,
            notes,
            timerSeconds,
            updatedAt: Date.now(),
          })
        )
      } catch (e) {
        console.warn('Gagal menyimpan draft:', e)
      }
    }, 400)

    return () => clearTimeout(timeout)
  }, [draftStorageKey, selectedMemberId, trainerName, category, exercises, notes, timerSeconds])

  // Add exercise from chip preset or empty
  const handleAddExercise = (presetName = '') => {
    if (presetName) {
      const isAlreadyAdded = exercises.some(
        (ex) => ex.name.trim().toLowerCase() === presetName.trim().toLowerCase()
      )
      if (isAlreadyAdded) {
        toast.warning(`Gerakan "${presetName}" sudah dipilih di daftar latihan!`)
        return
      }
    }
    const defaultSets = 3
    const defaultReps = 10
    const defaultWeight = 20
    const setsDetail: SetDetail[] = Array.from({ length: defaultSets }, (_, i) => ({
      set_number: i + 1,
      reps: defaultReps,
      weight_kg: defaultWeight,
    }))

    setExercises((prev) => [
      ...prev,
      {
        name: presetName || 'Gerakan Baru',
        sets: defaultSets,
        reps: defaultReps,
        weight_kg: defaultWeight,
        sets_detail: setsDetail,
      },
    ])
  }

  // Select from Catalog
  const handleSelectCatalogExercise = (item: (typeof EXERCISE_CATALOG)[0]) => {
    const isAlreadyAdded = exercises.some(
      (ex) => ex.name.trim().toLowerCase() === item.name.trim().toLowerCase()
    )
    if (isAlreadyAdded) {
      toast.warning(`Gerakan "${item.name}" sudah dipilih di daftar latihan!`)
      return
    }

    const setsDetail: SetDetail[] = Array.from({ length: item.defaultSets }, (_, i) => ({
      set_number: i + 1,
      reps: item.defaultReps,
      weight_kg: item.defaultWeight,
    }))

    setExercises((prev) => [
      ...prev,
      {
        name: item.name,
        sets: item.defaultSets,
        reps: item.defaultReps,
        weight_kg: item.defaultWeight,
        sets_detail: setsDetail,
      },
    ])
    toast.success(`${item.name} ditambahkan!`)
    setCatalogOpen(false)
  }

  // Delete exercise directly (bisa sampai kosong)
  const handleDeleteExercise = (index: number) => {
    const removed = exercises[index]?.name || 'Gerakan'
    setExercises((prev) => prev.filter((_, i) => i !== index))
    toast.info(`${removed} dihapus dari sesi`)
  }

  const handleExerciseChange = (index: number, field: keyof ExerciseItem, value: any) => {
    setExercises((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  // Tambah set baru (auto-copy beban & reps dari set sebelumnya)
  const handleAddSet = (exerciseIndex: number) => {
    setExercises((prev) => {
      const next = [...prev]
      const ex = { ...next[exerciseIndex] }
      const currentSets =
        ex.sets_detail && ex.sets_detail.length > 0
          ? [...ex.sets_detail]
          : Array.from({ length: Math.max(1, ex.sets || 1) }, (_, i) => ({
              set_number: i + 1,
              reps: ex.reps || 10,
              weight_kg: ex.weight_kg || 20,
            }))

      const lastSet = currentSets[currentSets.length - 1]
      const newSet: SetDetail = {
        set_number: currentSets.length + 1,
        reps: lastSet ? lastSet.reps : 10,
        weight_kg: lastSet ? lastSet.weight_kg : 20,
      }

      currentSets.push(newSet)
      ex.sets_detail = currentSets
      ex.sets = currentSets.length
      next[exerciseIndex] = ex
      return next
    })
  }

  // Hapus set tertentu (minimal 1 set tetap ada)
  const handleDeleteSet = (exerciseIndex: number, setIndex: number) => {
    setExercises((prev) => {
      const next = [...prev]
      const ex = { ...next[exerciseIndex] }
      const currentSets =
        ex.sets_detail && ex.sets_detail.length > 0
          ? [...ex.sets_detail]
          : Array.from({ length: Math.max(1, ex.sets || 1) }, (_, i) => ({
              set_number: i + 1,
              reps: ex.reps || 10,
              weight_kg: ex.weight_kg || 20,
            }))

      if (currentSets.length <= 1) {
        toast.info('Minimal 1 set untuk setiap gerakan')
        return prev
      }

      const filtered = currentSets.filter((_, idx) => idx !== setIndex)
      const reindexed = filtered.map((s, idx) => ({ ...s, set_number: idx + 1 }))
      ex.sets_detail = reindexed
      ex.sets = reindexed.length
      next[exerciseIndex] = ex
      return next
    })
  }

  // Ubah reps atau beban per set secara langsung
  const handleSetDetailChange = (
    exerciseIndex: number,
    setIndex: number,
    field: 'reps' | 'weight_kg',
    value: number
  ) => {
    setExercises((prev) => {
      const next = [...prev]
      const ex = { ...next[exerciseIndex] }
      const currentSets =
        ex.sets_detail && ex.sets_detail.length > 0
          ? [...ex.sets_detail]
          : Array.from({ length: Math.max(1, ex.sets || 1) }, (_, i) => ({
              set_number: i + 1,
              reps: ex.reps || 10,
              weight_kg: ex.weight_kg || 20,
            }))

      if (!currentSets[setIndex]) return prev

      currentSets[setIndex] = {
        ...currentSets[setIndex],
        [field]: Math.max(0, value),
      }

      ex.sets_detail = currentSets
      if (setIndex === currentSets.length - 1) {
        if (field === 'reps') ex.reps = currentSets[setIndex].reps
        if (field === 'weight_kg') ex.weight_kg = currentSets[setIndex].weight_kg
      }
      next[exerciseIndex] = ex
      return next
    })
  }

  // Penyesuaian cepat nilai stepper per set
  const adjustSetValue = (
    exerciseIndex: number,
    setIndex: number,
    field: 'reps' | 'weight_kg',
    delta: number
  ) => {
    setExercises((prev) => {
      const next = [...prev]
      const ex = { ...next[exerciseIndex] }
      const currentSets =
        ex.sets_detail && ex.sets_detail.length > 0
          ? [...ex.sets_detail]
          : Array.from({ length: Math.max(1, ex.sets || 1) }, (_, i) => ({
              set_number: i + 1,
              reps: ex.reps || 10,
              weight_kg: ex.weight_kg || 20,
            }))

      if (!currentSets[setIndex]) return prev

      const currentVal = Number(currentSets[setIndex][field]) || 0
      const updated = Math.max(0, Number((currentVal + delta).toFixed(1)))

      currentSets[setIndex] = {
        ...currentSets[setIndex],
        [field]: updated,
      }

      ex.sets_detail = currentSets
      if (setIndex === currentSets.length - 1) {
        if (field === 'reps') ex.reps = currentSets[setIndex].reps
        if (field === 'weight_kg') ex.weight_kg = currentSets[setIndex].weight_kg
      }
      next[exerciseIndex] = ex
      return next
    })
  }

  // Clear draft (Reset bersih 100% tanpa menyisakan gerakan default)
  const handleClearDraft = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(draftStorageKey)
    }
    setExercises([])
    setNotes('')
    setTimerSeconds(0)
    setDraftRestored(false)
    setResetDraftDialogOpen(false)
    toast.info('Draf latihan berhasil di-reset bersih')
  }

  // Trigger modal konfirmasi selesaikan sesi
  const handleInitiateSubmit = () => {
    if (!selectedMemberId || selectedMemberId.trim() === '') {
      toast.error('Pilih member terlebih dahulu di bagian atas!')
      return
    }

    if (exercises.length === 0) {
      toast.error('Daftar gerakan latihan masih kosong')
      return
    }

    const validExercises = exercises.filter((ex) => ex.name.trim() !== '')
    if (validExercises.length === 0) {
      toast.error('Harap masukkan minimal 1 gerakan latihan yang valid')
      return
    }

    // Cek apakah ada gerakan dengan nama duplikat persis
    const names = validExercises.map((ex) => ex.name.trim().toLowerCase())
    const duplicateNames = names.filter((name, index) => names.indexOf(name) !== index)
    if (duplicateNames.length > 0) {
      toast.warning('Terdapat gerakan dengan nama yang sama di daftar latihan. Mohon bedakan namanya atau gabungkan set-nya!')
      return
    }

    setSubmitConfirmOpen(true)
  }

  // Eksekusi simpan sesi ke database & buka laporan latihan
  const handleSaveWorkoutExecute = async () => {
    if (!selectedMemberId || selectedMemberId.trim() === '') {
      toast.error('Gagal: Member belum dipilih!')
      return
    }

    // Normalisasi: Pastikan data root (sets, reps, weight_kg) selalu sinkron dengan sets_detail[0]
    const validExercises = exercises
      .filter((ex) => ex.name.trim() !== '')
      .map((ex) => {
        const details = ex.sets_detail || []
        const totalSets = details.length || ex.sets || 1
        const reps = details[0]?.reps ?? ex.reps ?? 10
        const weight = details[0]?.weight_kg ?? ex.weight_kg ?? 0
        return {
          ...ex,
          sets: totalSets,
          reps: reps,
          weight_kg: weight,
          sets_detail: details.length > 0 ? details : Array.from({ length: totalSets }, (_, i) => ({
            set_number: i + 1,
            reps: reps,
            weight_kg: weight,
          })),
        }
      })
    if (validExercises.length === 0) return

    try {
      await createLog.mutateAsync({
        member_id: selectedMemberId,
        category,
        exercises: validExercises,
        notes: notes.trim() || null,
        pt_session_id: initialSessionId || scheduledSessionToday?.id || null,
        trainer_name: trainerName.trim() || null,
      })

      // Clean local storage draft & simpan trainer name terakhir
      if (typeof window !== 'undefined') {
        localStorage.removeItem(draftStorageKey)
        if (trainerName.trim()) {
          localStorage.setItem('lineup_last_trainer_name', trainerName.trim())
        }
      }

      const memberName = currentMember?.full_name || 'Member'
      const phone = currentMember?.phone
      const newRemaining = Math.max(0, (currentMember?.pt_remaining_sessions || 1) - 1)
      const durationFormatted = formatTimer(timerSeconds)
      const dateFormatted = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })

      // Tutup modal konfirmasi
      setSubmitConfirmOpen(false)

      // Buka modal struk laporan sesi latihan
      setReceiptData({
        memberName,
        memberPhone: phone,
        trainerName: trainerName.trim() || undefined,
        category,
        duration: durationFormatted,
        exercises: validExercises,
        notes: notes.trim(),
        remainingSessions: newRemaining,
        dateStr: dateFormatted,
      })
      setReceiptOpen(true)
      toast.success(`Sesi latihan ${memberName} berhasil diselesaikan & disimpan!`)
    } catch (err: any) {
      toast.error(`Gagal menyimpan latihan: ${err.message || 'Terjadi kesalahan'}`)
    }
  }

  const currentCategoryData = CATEGORIES.find((c) => c.label === category) || CATEGORIES[0]
  const totalSetsCount = exercises.reduce(
    (acc, curr) => acc + (curr.sets_detail?.length || Number(curr.sets) || 0),
    0
  )

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Top Navigation Bar: Anti-tersenggol dengan back alert */}
      <header className="sticky top-0 z-30 flex h-14 sm:h-16 items-center justify-between border-b border-border/40 bg-background/95 px-3.5 sm:px-6 lg:px-8 backdrop-blur-md w-full">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setExitDialogOpen(true)}
            className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hover:text-foreground shrink-0"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-heading text-base sm:text-lg text-foreground whitespace-nowrap">Live Workout</span>
              <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary shrink-0">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                LIVE
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate max-w-[140px] xs:max-w-[200px] sm:max-w-none">Catat sesi live langsung dari HP/TAB/IPAD</p>
          </div>
        </div>

        {/* Stopwatch Sesi */}
        <div className="flex items-center gap-1.5 sm:gap-2 rounded-xl border border-border/50 bg-card px-2.5 sm:px-3 py-1 sm:py-1.5 shrink-0">
          <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
          <span className="font-mono text-xs sm:text-sm font-bold text-foreground">
            {formatTimer(timerSeconds)}
          </span>
          <button
            onClick={() => setIsTimerRunning(!isTimerRunning)}
            className="text-muted-foreground hover:text-foreground"
            title={isTimerRunning ? 'Pause' : 'Start'}
          >
            {isTimerRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 text-primary" />}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pt-6 space-y-5">
        {/* Banner Auto-Draft Restored */}
        {draftRestored && (
          <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/10 px-3.5 py-2.5 text-xs text-primary">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 shrink-0" />
              <span>Draf sesi latihan sebelumnya otomatis dipulihkan.</span>
            </div>
            <button
              type="button"
              onClick={() => setResetDraftDialogOpen(true)}
              className="text-[11px] font-bold underline hover:opacity-80"
            >
              Reset
            </button>
          </div>
        )}

        {/* Pilih Member Card */}
        <Card className="border-border/50 bg-card">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Member yang Dilatih
              </span>
              {currentMember && (
                <Badge variant="outline" className="border-primary/40 bg-primary/5 text-primary text-[10px]">
                  Sisa {currentMember.pt_remaining_sessions} Sesi
                </Badge>
              )}
            </div>

            {membersLoading ? (
              <div className="h-10 w-full rounded-md border border-border/50 bg-muted/20 animate-pulse flex items-center px-3">
                <Skeleton className="h-4 w-48" />
              </div>
            ) : (
              <MemberCombobox
                members={memberOptions}
                value={selectedMemberId}
                onValueChange={handleMemberChange}
                placeholder="Pilih Member PT yang sedang latihan..."
                statusMap={statusMap}
                className="w-full"
              />
            )}

            {!selectedMemberId && (
              <p className="text-[11px] font-medium text-amber-400/90 flex items-center gap-1.5 pt-0.5">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                Pilih member PT terlebih dahulu agar latihan dapat tercatat dan memotong kuota yang benar.
              </p>
            )}

            {currentMember && (
              <div className="space-y-2 pt-1 border-t border-border/30">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Paket: <strong className="text-foreground">{currentMember.pt_membership_name}</strong></span>
                  <span>No. HP: <strong className="text-foreground">{currentMember.phone}</strong></span>
                </div>

                {/* Final Session Alert Banner (Sisa 1 Sesi) */}
                {currentMember.pt_remaining_sessions === 1 && (
                  <div className="flex items-center gap-2.5 rounded-lg border border-amber-500/50 bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent p-2.5 text-xs text-amber-200">
                    <Award className="h-5 w-5 shrink-0 text-amber-400 animate-pulse" />
                    <div>
                      <span className="font-bold text-amber-300">
                        🏆 Sesi Terakhir Program PT (Sisa 1 Sesi)!
                      </span>
                      <p className="text-[11px] text-amber-200/90 mt-0.5">
                        Ini adalah sesi penutupan paket untuk Kak <strong>{currentMember.full_name}</strong>. Pastikan mendokumentasikan Foto Evaluasi Akhir (Day Terakhir) & siapkan Laporan Kelulusan PDF setelah sesi ini.
                      </p>
                    </div>
                  </div>
                )}

                {scheduledSessionToday ? (
                  <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                    <CalendarClock className="h-4 w-4 shrink-0 text-amber-400" />
                    <span>
                      Terjadwal hari ini (<strong>{formatSessionDate(todayStr)} · {scheduledSessionToday.session_time?.slice(0, 5)} WIB</strong>). Sesi di jadwal akan otomatis ditandai <strong>✓ Selesai</strong> & kuota dipotong saat Anda menyimpan latihan.
                    </span>
                  </div>
                ) : upcomingSessionThisWeek ? (
                  <div className="flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs text-blue-300">
                    <CalendarClock className="h-4 w-4 shrink-0 text-blue-400" />
                    <span>
                      Member ini memiliki jadwal di hari <strong>{formatSessionDate(upcomingSessionThisWeek.session_date)} ({upcomingSessionThisWeek.session_time?.slice(0, 5)} WIB)</strong>. Sesi hari ini akan dicatat sebagai <strong>Walk-in / ganti hari</strong>.
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-300">
                    <Sparkles className="h-4 w-4 shrink-0 text-sky-400" />
                    <span>
                      Sesi <strong>Walk-in (Dadakan)</strong>. Sesi baru & pemotongan 1 kuota akan dicatat otomatis di sistem hari ini.
                    </span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Input Nama Personal Trainer (Coach) */}
        <Card className="border-border/50 bg-card">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="trainer-name-input" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Dumbbell className="h-3.5 w-3.5 text-primary" />
                Personal Trainer / Coach
              </label>
              <span className="text-[10px] text-muted-foreground/70">Tercantum di laporan, WA & PDF</span>
            </div>
            <Input
              id="trainer-name-input"
              value={trainerName}
              onChange={(e) => {
                const val = e.target.value
                setTrainerName(val)
                if (typeof window !== 'undefined') {
                  localStorage.setItem('lineup_last_trainer_name', val)
                }
              }}
              placeholder="Ketik nama Coach (contoh: Coach Budi / Coach Randy)"
              className="bg-background/80 border-border/60 text-sm font-medium placeholder:text-muted-foreground/50 h-10"
            />
          </CardContent>
        </Card>

        {/* Sticky Container Kategori & Preset (Mempertahankan 100% Tampilan Asli) */}
        <div className="sticky top-14 sm:top-16 z-20 bg-background/95 backdrop-blur-md pt-3 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 space-y-3">
          {/* Kategori Latihan (Horizontal Chips) */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Fokus Kategori Latihan
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {CATEGORIES.map((c) => {
                const active = category === c.label
                return (
                  <button
                    key={c.label}
                    type="button"
                    onClick={() => setCategory(c.label)}
                    className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold transition-all ${active
                      ? `${c.bg} ${c.border} ${c.color} border shadow-sm`
                      : 'border border-border/40 bg-card text-muted-foreground hover:bg-muted/50'
                      }`}
                  >
                    {c.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Quick Exercise Chips (1-Tap Add dari Kategori Aktif) */}
          <div className="rounded-xl border border-border/40 bg-card/60 p-3 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium">Preset Cepat {category}:</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setNewPresetCategory(category)
                    setAddPresetModalOpen(true)
                  }}
                  className="text-[11px] font-bold text-accent hover:underline flex items-center gap-1 bg-accent/10 px-2 py-0.5 rounded-md active:scale-95 transition-all"
                >
                  <Plus className="h-3 w-3" />
                  <span>+ Tambah Preset</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCatalogOpen(true)}
                  className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                >
                  <Zap className="h-3 w-3" />
                  <span>Katalog</span>
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {/* Presets bawaan sistem */}
              {currentCategoryData.presets.map((preset) => {
                const isSelected = exercises.some(
                  (ex) => ex.name.trim().toLowerCase() === preset.trim().toLowerCase()
                )
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleAddExercise(preset)}
                    className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all active:scale-95 ${
                      isSelected
                        ? 'border-primary/60 bg-primary/15 text-primary font-bold shadow-xs'
                        : 'border-border/50 bg-background/80 text-foreground hover:border-primary/50 hover:bg-primary/10'
                    }`}
                    title={isSelected ? `${preset} sudah dipilih` : `Tambah ${preset}`}
                  >
                    {isSelected ? (
                      <CheckCircle2 className="h-3 w-3 text-primary" />
                    ) : (
                      <Plus className="h-3 w-3 text-primary" />
                    )}
                    <span>{preset}</span>
                  </button>
                )
              })}

              {/* Presets Kustom Gym dari Supabase Database */}
              {activeCustomPresets.map((custom) => {
                const isSelected = exercises.some(
                  (ex) => ex.name.trim().toLowerCase() === custom.name.trim().toLowerCase()
                )
                return (
                  <div
                    key={custom.id}
                    className={`inline-flex items-center rounded-lg border pr-1 transition-all ${
                      isSelected
                        ? 'border-accent bg-accent/20'
                        : 'border-accent/40 bg-accent/10 hover:border-accent'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleAddExercise(custom.name)}
                      className="flex items-center gap-1 pl-2.5 py-1.5 text-xs text-accent font-semibold active:scale-95"
                      title={isSelected ? `${custom.name} sudah dipilih` : `Tambah ${custom.name}`}
                    >
                      {isSelected ? (
                        <CheckCircle2 className="h-3 w-3 text-accent" />
                      ) : (
                        <Plus className="h-3 w-3 text-accent" />
                      )}
                      <span>{custom.name}</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setPresetToDelete({ id: custom.id, name: custom.name })
                      }}
                      className="p-1 text-accent/60 hover:text-red-400 transition-colors"
                      title="Hapus Preset"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Daftar Gerakan Latihan (Thumb-Friendly Exercise Cards) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Daftar Gerakan ({exercises.length} Gerakan · {totalSetsCount} Total Set)
            </label>
            {exercises.length > 0 && (
              <button
                type="button"
                onClick={() => setResetDraftDialogOpen(true)}
                className="flex items-center gap-1 text-xs font-semibold text-rose-400 transition-colors hover:text-rose-300 hover:underline"
                title="Kosongkan semua gerakan latihan"
              >
                <Trash2 className="h-3 w-3" />
                <span>Reset Semua</span>
              </button>
            )}
          </div>

          {exercises.length === 0 ? (
            <Card className="border-dashed border-border/70 bg-card/40 p-8 text-center">
              <div className="flex flex-col items-center gap-2.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Dumbbell className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <p className="font-heading text-sm font-semibold text-foreground">Daftar Gerakan Kosong</p>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    Belum ada gerakan yang ditambahkan. Ketuk tombol &ldquo;Pilih Cepat dari Katalog&rdquo; di bawah atau &ldquo;+ Ketik Manual&rdquo; untuk memulai latihan.
                  </p>
                </div>
              </div>
            </Card>
          ) : (
            exercises.map((exercise, idx) => (
              <Card
                key={idx}
                className="border-border/50 bg-card overflow-hidden shadow-sm transition-all focus-within:border-primary/40"
              >
                <div className="flex items-center justify-between border-b border-border/30 bg-muted/20 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[11px] font-bold text-primary">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={exercise.name}
                      onChange={(e) => handleExerciseChange(idx, 'name', e.target.value)}
                      placeholder="Nama Gerakan..."
                      className="bg-transparent font-semibold text-sm text-foreground outline-none focus:text-primary w-48 sm:w-64"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteExercise(idx)}
                    className="rounded p-1 text-muted-foreground hover:bg-red-500/10 hover:text-red-400 active:scale-90 transition-transform"
                    title="Hapus Gerakan"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <CardContent className="p-3.5 sm:p-4 space-y-3">
                  {/* Progresif Sets List: Set 1, Set 2, Set 3... */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-0.5">
                      <span>Progresif Set ({exercise.sets_detail?.length || exercise.sets} Set)</span>
                      <span className="text-[10px] text-muted-foreground/70 font-normal lowercase">
                        reps × beban (kg)
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {(
                        exercise.sets_detail ||
                        Array.from({ length: Math.max(1, exercise.sets || 1) }, (_, i) => ({
                          set_number: i + 1,
                          reps: exercise.reps || 10,
                          weight_kg: exercise.weight_kg || 20,
                        }))
                      ).map((set, sIdx) => (
                        <div
                          key={sIdx}
                          className="flex items-center justify-between gap-1.5 sm:gap-2 rounded-xl border border-border/50 bg-background/70 p-2 transition-all hover:border-primary/40"
                        >
                          {/* Set Badge */}
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-xs font-black text-primary">
                              S{set.set_number}
                            </span>
                          </div>

                          {/* Reps Stepper */}
                          <div className="flex items-center gap-0.5 sm:gap-1 bg-card rounded-lg border border-border/60 px-1 py-1">
                            <button
                              type="button"
                              onClick={() => adjustSetValue(idx, sIdx, 'reps', -1)}
                              className="flex h-6 w-6 items-center justify-center rounded bg-muted/60 text-foreground hover:bg-muted active:scale-90"
                              title="Kurangi Rep"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <div className="flex items-center justify-center min-w-[40px] px-0.5 text-center">
                              <span className="font-mono text-xs sm:text-sm font-bold text-foreground">
                                {set.reps}
                              </span>
                              <span className="text-[10px] text-muted-foreground ml-0.5">r</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => adjustSetValue(idx, sIdx, 'reps', 1)}
                              className="flex h-6 w-6 items-center justify-center rounded bg-muted/60 text-foreground hover:bg-muted active:scale-90"
                              title="Tambah Rep"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>

                          {/* Weight Stepper */}
                          <div className="flex items-center gap-0.5 sm:gap-1 bg-card rounded-lg border border-border/60 px-1 py-1">
                            <button
                              type="button"
                              onClick={() => adjustSetValue(idx, sIdx, 'weight_kg', -2.5)}
                              className="flex h-6 w-6 items-center justify-center rounded bg-muted/60 text-foreground hover:bg-muted active:scale-90"
                              title="Kurang 2.5 kg"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <div className="flex items-center justify-center min-w-[50px] px-0.5">
                              <input
                                type="number"
                                step="0.5"
                                value={set.weight_kg}
                                onChange={(e) =>
                                  handleSetDetailChange(
                                    idx,
                                    sIdx,
                                    'weight_kg',
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="w-10 text-center font-mono text-xs sm:text-sm font-bold text-accent bg-transparent outline-none focus:bg-primary/10 rounded"
                              />
                              <span className="text-[10px] font-bold text-muted-foreground ml-0.5">kg</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => adjustSetValue(idx, sIdx, 'weight_kg', 2.5)}
                              className="flex h-6 w-6 items-center justify-center rounded bg-primary/20 text-primary hover:bg-primary/30 active:scale-90"
                              title="Tambah 2.5 kg"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>

                          {/* Quick +5kg Button (Desktop/Tablet) */}
                          <button
                            type="button"
                            onClick={() => adjustSetValue(idx, sIdx, 'weight_kg', 5)}
                            className="hidden sm:flex rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] font-extrabold text-primary hover:bg-primary/20 active:scale-95"
                            title="Tambah 5.0 kg"
                          >
                            +5kg
                          </button>

                          {/* Delete Set Button */}
                          {(exercise.sets_detail?.length || 1) > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteSet(idx, sIdx)}
                              className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground/60 hover:text-red-400 hover:bg-red-500/10 active:scale-90 shrink-0"
                              title={`Hapus Set ${set.set_number}`}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Button Tambah Set Cepat */}
                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => handleAddSet(idx)}
                        className="flex items-center gap-1.5 rounded-lg border border-dashed border-primary/50 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 active:scale-95 transition-all"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>+ Tambah Set (S{(exercise.sets_detail?.length || exercise.sets) + 1})</span>
                      </button>

                      <span className="text-[10px] text-muted-foreground italic">
                        Auto-copy dari set sebelumnya
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )))}

          {/* Action Buttons: Tap Cepat dari Katalog ATAU Ketik Manual */}
          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <Button
              type="button"
              onClick={() => setCatalogOpen(true)}
              className="flex-1 h-14 sm:h-12 gap-2.5 rounded-2xl sm:rounded-xl bg-primary text-black font-extrabold text-sm sm:text-xs shadow-lg shadow-primary/25 hover:bg-primary/90 active:scale-[0.98] transition-all"
            >
              <Zap className="h-5 w-5 sm:h-4 sm:w-4 fill-black shrink-0" />
              <span>Pilih Cepat dari Katalog Gerakan</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => handleAddExercise()}
              className="h-11 sm:h-12 px-4 gap-1.5 rounded-xl border-dashed border-border/70 text-xs font-semibold text-muted-foreground hover:text-foreground active:scale-[0.99]"
            >
              <Plus className="h-4 w-4" />
              <span>+ Ketik Manual</span>
            </Button>
          </div>
        </div>

        {/* Catatan Pelatih / Evaluasi Form */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Catatan Coach (Opsional)
          </label>
          <textarea
            value={notes}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
            placeholder="Evaluasi form latihan, saran recovery, atau target beban untuk sesi selanjutnya..."
            rows={3}
            className="w-full rounded-xl border border-border/50 bg-card p-3 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary"
          />
        </div>
      </main>

      {/* Sticky Bottom Bar: Ramah Jempol di HP & Pas di Desktop */}
      <footer className="fixed bottom-0 left-0 right-0 lg:left-60 z-30 border-t border-border/40 bg-background/95 px-4 lg:px-8 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <div className="hidden sm:flex flex-col text-xs text-muted-foreground">
            <span>Total Gerakan: <strong className="text-foreground">{exercises.length}</strong></span>
            <span>Total Sets: <strong className="text-foreground">{totalSetsCount}</strong></span>
          </div>

          <Button
            type="button"
            onClick={handleInitiateSubmit}
            disabled={!selectedMemberId || exercises.length === 0 || createLog.isPending}
            className={`flex-1 h-12 gap-2 rounded-xl text-sm font-bold shadow-lg transition-all ${
              !selectedMemberId || exercises.length === 0
                ? 'opacity-50 cursor-not-allowed bg-muted text-muted-foreground shadow-none'
                : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20 active:scale-[0.99]'
            }`}
          >
            {createLog.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Menyimpan Latihan...</span>
              </>
            ) : !selectedMemberId ? (
              <>
                <AlertCircle className="h-5 w-5 text-amber-400" />
                <span>Pilih Member Terlebih Dahulu</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5" />
                <span>Selesaikan & Simpan Sesi</span>
              </>
            )}
          </Button>
        </div>
      </footer>

      {/* Modal Dialog: Katalog Gerakan Cepat (1-Tap Add) */}
      <Dialog open={catalogOpen} onOpenChange={setCatalogOpen}>
        <DialogContent className="border-border bg-card text-foreground max-w-lg max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2 border-b border-border/40">
            <DialogTitle className="font-heading text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary fill-primary" />
              Katalog Gerakan Cepat
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Tap gerakan yang diinginkan untuk langsung menambahkannya ke sesi live.
            </p>

            {/* Search Input */}
            <div className="relative mt-2">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder="Cari gerakan (misal: bench, squat, curl)..."
                className="pl-9 pr-8 text-xs bg-background border-border/60"
                autoFocus
              />
              {catalogSearch && (
                <button
                  type="button"
                  onClick={() => setCatalogSearch('')}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Muscle Filter Tabs */}
            <div className="flex gap-1.5 overflow-x-auto pt-2 pb-1 scrollbar-none">
              {MUSCLE_GROUPS.map((mg) => {
                const active = catalogMuscle === mg
                return (
                  <button
                    key={mg}
                    type="button"
                    onClick={() => setCatalogMuscle(mg)}
                    className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${active
                      ? 'bg-primary text-black font-bold'
                      : 'border border-border/40 bg-muted/20 text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    {mg}
                  </button>
                )
              })}
            </div>
          </DialogHeader>

          {/* List of Catalog Exercises */}
          <div className="flex-1 overflow-y-auto p-4 space-y-1.5 max-h-[50vh]">
            {filteredCatalog.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                Tidak ada gerakan yang cocok dengan &quot;{catalogSearch}&quot;.
              </div>
            ) : (
              filteredCatalog.map((item) => {
                const isSelected = exercises.some(
                  (ex) => ex.name.trim().toLowerCase() === item.name.trim().toLowerCase()
                )
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => handleSelectCatalogExercise(item)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all text-left group ${
                      isSelected
                        ? 'border-primary/50 bg-primary/10 text-primary'
                        : 'border-border/40 bg-background/50 hover:border-primary/50 hover:bg-primary/5 active:scale-[0.99]'
                    }`}
                  >
                    <div>
                      <span
                        className={`text-xs font-semibold transition-colors ${
                          isSelected ? 'text-primary font-bold' : 'text-foreground group-hover:text-primary'
                        }`}
                      >
                        {item.name}
                      </span>
                      <span className="ml-2 text-[10px] text-muted-foreground/70 font-mono">
                        ({item.category})
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="font-mono bg-muted/40 px-1.5 py-0.5 rounded">
                        {item.defaultSets}×{item.defaultReps} | {item.defaultWeight}kg
                      </span>
                      {isSelected ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <Plus className="h-3.5 w-3.5 text-primary" />
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Tambah Preset Gerakan Kustom Baru */}
      <Dialog open={addPresetModalOpen} onOpenChange={setAddPresetModalOpen}>
        <DialogContent className="border-border bg-card text-foreground max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              Tambah Preset Gerakan
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Preset ini tersimpan di database dan otomatis muncul di semua HP pelatih gym.
            </p>
          </DialogHeader>

          <form onSubmit={handleCreatePreset} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Nama Gerakan Latihan
              </label>
              <Input
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="misal: Smith Machine Incline Press"
                className="text-xs bg-background border-border/60"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Kategori Latihan
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.label}
                    type="button"
                    onClick={() => setNewPresetCategory(c.label)}
                    className={`rounded-lg py-1.5 text-[11px] font-bold border transition-all ${newPresetCategory === c.label
                      ? 'border-primary bg-primary text-black'
                      : 'border-border/40 bg-muted/20 text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setAddPresetModalOpen(false)}
                className="text-xs text-muted-foreground"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createPresetMutation.isPending || !newPresetName.trim()}
                className="text-xs font-bold bg-primary text-black hover:bg-primary/90"
              >
                {createPresetMutation.isPending ? 'Menyimpan...' : 'Simpan Preset (✓)'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* AlertDialog: Konfirmasi Hapus Preset Gerakan Kustom */}
      <AlertDialog
        open={presetToDelete !== null}
        onOpenChange={(open) => !open && setPresetToDelete(null)}
      >
        <AlertDialogContent className="border-border bg-card text-foreground max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading text-lg">Hapus Preset Gerakan?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Apakah Anda yakin ingin menghapus preset gerakan{' '}
              <strong className="text-foreground">&quot;{presetToDelete?.name}&quot;</strong>{' '}
              dari daftar preset cepat gym?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-xs">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePreset}
              className="bg-red-500 hover:bg-red-600 text-xs font-semibold text-white"
            >
              Hapus Preset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog: Konfirmasi Keluar dari Sesi Latihan */}
      <AlertDialog open={exitDialogOpen} onOpenChange={setExitDialogOpen}>
        <AlertDialogContent className="border-border bg-card text-foreground max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading text-lg">Keluar dari Sesi Latihan?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Sesi sedang berlangsung. Jangan khawatir, draf set dan beban kamu tetap tersimpan otomatis di perangkat ini dan bisa dilanjutkan kapan saja.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-xs">Tetap Latihan</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const targetUrl = selectedMemberId
                  ? `/dashboard/pt/progress?memberId=${selectedMemberId}`
                  : '/dashboard/pt/progress'
                router.push(targetUrl)
              }}
              className="bg-red-500 hover:bg-red-600 text-xs font-semibold text-white"
            >
              Keluar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog: Konfirmasi Submit Selesai & Simpan Sesi */}
      <AlertDialog open={submitConfirmOpen} onOpenChange={setSubmitConfirmOpen}>
        <AlertDialogContent className="border-border bg-card text-foreground max-w-sm">
          <AlertDialogHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-2 mx-auto">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <AlertDialogTitle className="text-center font-heading text-lg">Selesaikan Sesi Latihan?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground space-y-2.5">
              <div className="rounded-xl border border-border/60 bg-background/60 p-3 space-y-1.5 text-left text-foreground">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Member:</span>
                  <span className="font-semibold text-foreground">{currentMember?.full_name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Fokus Latihan:</span>
                  <span className="font-semibold text-primary">{category} Day</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Durasi:</span>
                  <span className="font-mono text-accent font-bold">{formatTimer(timerSeconds)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Gerakan:</span>
                  <span className="font-medium text-foreground">{exercises.length} Gerakan ({totalSetsCount} Sets)</span>
                </div>
                {trainerName.trim() && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Coach / PT:</span>
                    <span className="font-semibold text-accent">{trainerName.trim()}</span>
                  </div>
                )}
              </div>
              <p className="text-center text-[11px] text-muted-foreground">
                1 kuota sesi PT akan otomatis dipotong dan hasil latihan akan disimpan ke riwayat member.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2">
            <AlertDialogCancel className="border-border text-xs">Lanjut Latihan</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSaveWorkoutExecute}
              disabled={createLog.isPending}
              className="bg-primary text-black hover:bg-primary/90 text-xs font-bold"
            >
              {createLog.isPending ? 'Menyimpan...' : 'Ya, Selesaikan & Simpan'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog: Konfirmasi Reset Draf Latihan Bersih */}
      <AlertDialog open={resetDraftDialogOpen} onOpenChange={setResetDraftDialogOpen}>
        <AlertDialogContent className="border-border bg-card text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading text-lg text-rose-400 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Reset & Kosongkan Draf?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Tindakan ini akan mengosongkan seluruh daftar gerakan ({exercises.length} gerakan), catatan latihan, timer sesi, dan menghapus cache draf tersimpan di perangkat.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2">
            <AlertDialogCancel className="border-border text-xs">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearDraft}
              className="bg-rose-600 text-white hover:bg-rose-700 text-xs font-bold"
            >
              Ya, Reset Bersih
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog: Laporan / Struk Sesi Latihan Live */}
      <Dialog
        open={receiptOpen}
        onOpenChange={(open) => {
          if (!open) {
            setReceiptOpen(false)
            const targetUrl = selectedMemberId
              ? `/dashboard/pt/progress?memberId=${selectedMemberId}`
              : '/dashboard/pt/progress'
            router.push(targetUrl)
          }
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto border-border bg-card text-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Laporan Sesi Latihan</DialogTitle>
          </DialogHeader>
          {receiptData && (
            <div className="space-y-4">
              {/* Receipt Preview */}
              <div className="rounded-xl border border-border bg-background p-4 space-y-3">
                <div className="text-center border-b border-dashed border-[#333] pb-3">
                  <p className="font-heading text-sm font-bold text-primary">LINEUP GYM PRAMBANAN</p>
                  <p className="text-[10px] text-muted-foreground/60">Be Strong Be Healthy!</p>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Member</span>
                    <span className="text-foreground font-medium">{receiptData.memberName}</span>
                  </div>
                  {receiptData.trainerName && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Coach / Trainer</span>
                      <span className="text-accent font-semibold">{receiptData.trainerName}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fokus Latihan</span>
                    <span className="text-primary font-bold">{receiptData.category} Day</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Durasi Sesi</span>
                    <span className="text-accent font-mono font-bold">{receiptData.duration}</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-[#333] pt-2 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Daftar Latihan</span>
                    <span className="text-foreground font-medium">
                      {receiptData.exercises.length} Gerakan ·{' '}
                      {receiptData.exercises.reduce(
                        (a, c) => a + (c.sets_detail?.length || Number(c.sets || 0)),
                        0
                      )}{' '}
                      Sets
                    </span>
                  </div>
                  <div className="space-y-1.5 rounded-lg bg-card/60 p-2.5 border border-border/40 max-h-48 overflow-y-auto">
                    {receiptData.exercises.map((ex, i) => {
                      const isProgressive =
                        ex.sets_detail &&
                        ex.sets_detail.length > 0 &&
                        ex.sets_detail.some(
                          (s) =>
                            s.weight_kg !== ex.sets_detail![0].weight_kg ||
                            s.reps !== ex.sets_detail![0].reps
                        )

                      return (
                        <div key={i} className="py-1 border-b border-border/30 last:border-none">
                          <div className="flex justify-between items-center text-[11px] font-medium">
                            <span className="text-foreground">{ex.name}</span>
                            {!isProgressive && (
                              <span className="text-muted-foreground font-mono">
                                {ex.sets}×{ex.reps} |{' '}
                                <strong className="text-accent">{ex.weight_kg}kg</strong>
                              </span>
                            )}
                          </div>
                          {isProgressive && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {ex.sets_detail!.map((s) => (
                                <span
                                  key={s.set_number}
                                  className="inline-flex items-center gap-0.5 rounded bg-muted/40 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground border border-border/40"
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
                  {receiptData.notes && (
                    <div className="text-[11px] text-muted-foreground italic bg-muted/20 p-2 rounded border-l-2 border-primary/50">
                      &quot;{receiptData.notes}&quot;
                    </div>
                  )}
                </div>

                <div className="border-t border-dashed border-[#333] pt-2 space-y-1.5 text-xs">
                  <div className="flex justify-between items-center text-sm font-bold">
                    <span className="text-muted-foreground">Sisa Kuota PT</span>
                    <span className="text-accent font-heading text-base font-bold">
                      {receiptData.remainingSessions} Sesi Tersisa
                    </span>
                  </div>
                </div>

                <div className="border-t border-dashed border-[#333] pt-2 text-center">
                  <p className="text-[10px] text-muted-foreground/60">
                    {receiptData.dateStr}{' '}
                    {receiptData.trainerName ? `· Coach ${receiptData.trainerName}` : ''} — Terima kasih!
                  </p>
                </div>

                {/* Celebration Card Saat Sisa Sesi = 0 (Program Tuntas) */}
                {receiptData.remainingSessions === 0 && (
                  <div className="rounded-xl border border-amber-500/50 bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent p-3 text-center space-y-2">
                    <div className="flex items-center justify-center gap-1.5 font-bold text-amber-300 text-xs">
                      <Award className="h-4 w-4" />
                      <span>PROGRAM PT TUNTAS 100%!</span>
                    </div>
                    <p className="text-[11px] text-amber-200/90 leading-relaxed">
                      Selamat untuk Kak <strong>{receiptData.memberName}</strong>! Seluruh kuota sesi
                      paket telah selesai. Buka Laporan Kelulusan PDF (2 Halaman) sekarang.
                    </p>
                    <Button
                      type="button"
                      onClick={() => {
                        setReceiptOpen(false)
                        const targetUrl = selectedMemberId
                          ? `/dashboard/pt/progress?memberId=${selectedMemberId}&tab=metrics&exportPdf=true`
                          : '/dashboard/pt/progress'
                        router.push(targetUrl)
                      }}
                      className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-black font-extrabold hover:from-amber-400 hover:to-amber-500 text-xs shadow-md shadow-amber-500/20"
                    >
                      <FileText className="mr-1.5 h-4 w-4" /> Buka Laporan Kelulusan PDF (2 Halaman)
                    </Button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setReceiptOpen(false)
                    const targetUrl = selectedMemberId
                      ? `/dashboard/pt/progress?memberId=${selectedMemberId}`
                      : '/dashboard/pt/progress'
                    router.push(targetUrl)
                  }}
                  className="flex-1 border-border text-muted-foreground hover:bg-[#2A2A2A] hover:text-foreground"
                >
                  Lewati
                </Button>
                <Button
                  onClick={() => {
                    const phone = receiptData.memberPhone?.replace(/[^0-9]/g, '').replace(/^0/, '62')
                    const list = receiptData.exercises
                      .map((e) => {
                        const isProgressive =
                          e.sets_detail &&
                          e.sets_detail.length > 0 &&
                          e.sets_detail.some(
                            (s) =>
                              s.weight_kg !== e.sets_detail![0].weight_kg ||
                              s.reps !== e.sets_detail![0].reps
                          )

                        if (isProgressive && e.sets_detail) {
                          const setsLines = e.sets_detail
                            .map((s, idx) => `  ↳ Set ${idx + 1}: ${s.reps} reps | ${s.weight_kg}kg`)
                            .join('\n')
                          return `• *${e.name}* (${e.sets_detail.length} set):\n${setsLines}`
                        } else {
                          const totalSets = e.sets_detail?.length || e.sets || 1
                          const reps = e.sets_detail?.[0]?.reps ?? e.reps
                          const weight = e.sets_detail?.[0]?.weight_kg ?? e.weight_kg
                          return `• *${e.name}*: ${totalSets} set × ${reps} reps | ${weight}kg`
                        }
                      })
                      .join('\n')

                    const graduationClosing =
                      receiptData.remainingSessions === 0
                        ? `*SELAMAT KELULUSAN PROGRAM PT!* Seluruh kuota sesi paket kamu telah selesai 100%. Untuk mempertahankan progres & mencapai target berikutnya, tanyakan ke Coach untuk rekomendasi perpanjangan paket (renewal) ya!\n`
                        : `Sisa Kuota PT Kamu: *${receiptData.remainingSessions} sesi*\nTetap semangat dan konsisten latihannya!\n`

                    const message = encodeURIComponent(
                      `Halo Kak *${receiptData.memberName}*! \n\n` +
                        `Sesi latihan PT kamu di *Line Up Gym* baru saja selesai:\n` +
                        (receiptData.trainerName ? `• Coach: *${receiptData.trainerName}*\n` : '') +
                        `• Fokus: *${receiptData.category} Day*\n` +
                        `• Durasi: *${receiptData.duration}*\n\n` +
                        `*Daftar Latihan:*\n${list}\n\n` +
                        (receiptData.notes ? `_Catatan Coach: "${receiptData.notes}"_\n\n` : '') +
                        `${graduationClosing}\n` +
                        `*LINEUP GYM PRAMBANAN*\nBe Strong Be Healthy!`
                    )
                    if (phone) {
                      window.open(`https://wa.me/${phone}?text=${message}`, '_blank')
                    } else {
                      toast.info('Nomor WhatsApp member tidak ditemukan')
                    }
                    setReceiptOpen(false)
                    const targetUrl = selectedMemberId
                      ? `/dashboard/pt/progress?memberId=${selectedMemberId}`
                      : '/dashboard/pt/progress'
                    router.push(targetUrl)
                  }}
                  className="flex-1 bg-[#25D366] font-bold text-foreground hover:bg-[#1DA851]"
                >
                  <MessageCircle className="mr-1.5 h-4 w-4" /> Kirim ke WA
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function LiveWorkoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[70vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <LiveWorkoutContent />
    </Suspense>
  )
}
