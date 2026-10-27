'use client'

import { useState, useMemo, useRef, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { usePtActiveMembers, usePtMemberCycles } from '@/hooks/usePtSessions'
import {
  useMemberBodyMetrics,
  useCreateBodyMetric,
  useRemoveBodyMetricPhoto,
  uploadProgressPhoto,
} from '@/hooks/usePtProgress'
import MemberCombobox from '@/components/dashboard/MemberCombobox'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  Scale,
  Camera,
  ArrowLeft,
  Sparkles,
  Loader2,
  X,
  Image as ImageIcon,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Minus,
  MessageCircle,
  AlertCircle,
  HelpCircle,
  Flame,
  Award,
  ChevronRight,
  RotateCcw,
  Calendar,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import type { BodyMetricPhase, BodyMeasurements } from '@/lib/types'

interface PhotoSlotState {
  file: File | null
  preview: string | null
}

function MetricsFormContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialMemberId = searchParams.get('memberId') || ''

  const [selectedMemberId, setSelectedMemberId] = useState<string>(initialMemberId)

  // Form State
  const [phase, setPhase] = useState<BodyMetricPhase>('progress')
  const [recordedAt, setRecordedAt] = useState<string>(
    new Date().toLocaleDateString('sv-SE')
  )
  const [weightKg, setWeightKg] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  // 6 Parameter Pengukuran (4 Standar + 2 Tambahan)
  const [perut, setPerut] = useState<string>('')
  const [lengan, setLengan] = useState<string>('')
  const [dada, setDada] = useState<string>('')
  const [paha, setPaha] = useState<string>('')
  const [pinggul, setPinggul] = useState<string>('')
  const [bodyFat, setBodyFat] = useState<string>('')

  // Foto 3 Sudut (Depan, Samping, Belakang) - File Baru
  const [frontPhoto, setFrontPhoto] = useState<PhotoSlotState>({ file: null, preview: null })
  const [sidePhoto, setSidePhoto] = useState<PhotoSlotState>({ file: null, preview: null })
  const [backPhoto, setBackPhoto] = useState<PhotoSlotState>({ file: null, preview: null })

  // Foto Tersimpan dari Database (untuk Day 1 & Day Terakhir yang sudah ada)
  const [existingPhotos, setExistingPhotos] = useState<{
    front: string | null
    side: string | null
    back: string | null
  }>({ front: null, side: null, back: null })
  const [existingRecordId, setExistingRecordId] = useState<string | null>(null)

  // Hidden File Inputs Refs (Direct Camera & Gallery)
  const frontCamRef = useRef<HTMLInputElement>(null)
  const frontFileRef = useRef<HTMLInputElement>(null)
  const sideCamRef = useRef<HTMLInputElement>(null)
  const sideFileRef = useRef<HTMLInputElement>(null)
  const backCamRef = useRef<HTMLInputElement>(null)
  const backFileRef = useRef<HTMLInputElement>(null)

  // Status & Dialogs
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStep, setUploadStep] = useState<string>('')
  const [confirmResetOpen, setConfirmResetOpen] = useState(false)
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false)
  const [photoToDelete, setPhotoToDelete] = useState<'front' | 'side' | 'back' | null>(null)
  const [pendingPhase, setPendingPhase] = useState<BodyMetricPhase | null>(null)

  // Pembersihan menyeluruh seluruh state form untuk mencegah kebocoran data lintas member (vuln-0007, vuln-0002)
  const resetAllFormState = useCallback(() => {
    // 1. Cabut URL blob preview foto baru agar tidak bocor di browser memory
    setFrontPhoto((prev) => {
      if (prev.preview && prev.file) URL.revokeObjectURL(prev.preview)
      return { file: null, preview: null }
    })
    setSidePhoto((prev) => {
      if (prev.preview && prev.file) URL.revokeObjectURL(prev.preview)
      return { file: null, preview: null }
    })
    setBackPhoto((prev) => {
      if (prev.preview && prev.file) URL.revokeObjectURL(prev.preview)
      return { file: null, preview: null }
    })

    // 2. Kosongkan referensi foto lama & record ID tersimpan
    setExistingPhotos({ front: null, side: null, back: null })
    setExistingRecordId(null)
    setPhotoToDelete(null)
    setPendingPhase(null)

    // 3. Reset seluruh field input fisik & kembalikan fase ke default 'progress'
    setWeightKg('')
    setPerut('')
    setLengan('')
    setDada('')
    setPaha('')
    setPinggul('')
    setBodyFat('')
    setNotes('')
    setRecordedAt(new Date().toLocaleDateString('sv-SE'))
    setPhase('progress')
  }, [])

  // Sinkronkan pilihan member ke URL browser secara halus tanpa reload,
  // sambil mereset total state form lama agar tidak terbawa ke member baru (vuln-0007)
  const handleMemberChange = (newMemberId: string) => {
    resetAllFormState()
    setSelectedMemberId(newMemberId)
    const params = new URLSearchParams(searchParams.toString())
    if (newMemberId && newMemberId.trim() !== '') {
      params.set('memberId', newMemberId)
    } else {
      params.delete('memberId')
    }
    const query = params.toString()
    router.replace(`/dashboard/pt/progress/metrics${query ? `?${query}` : ''}`, {
      scroll: false,
    })
  }

  // Sinkronkan state jika URL param memberId berubah (misal dari tombol back/forward browser)
  useEffect(() => {
    const urlMemberId = searchParams.get('memberId') || ''
    if (urlMemberId !== selectedMemberId) {
      resetAllFormState()
      setSelectedMemberId(urlMemberId)
    }
  }, [searchParams, selectedMemberId, resetAllFormState])

  // Post-submission Celebration Dialog state
  const [successDialogOpen, setSuccessDialogOpen] = useState(false)
  const [summaryData, setSummaryData] = useState<{
    memberName: string
    memberPhone?: string
    recordedAt: string
    phase: BodyMetricPhase
    weightKg: number | null
    prevWeightKg: number | null
    measurements: Record<string, number>
    prevMeasurements: Record<string, number>
    notes: string | null
    frontPreview: string | null
    day1FrontUrl: string | null
  } | null>(null)

  // Queries & Mutations
  const { data: ptMembers, isLoading: membersLoading } = usePtActiveMembers()
  const { data: historicalMetrics, isLoading: historyLoading } =
    useMemberBodyMetrics(selectedMemberId || undefined)
  const { data: memberCycles } = usePtMemberCycles(selectedMemberId || undefined)
  const createMetric = useCreateBodyMetric()
  const removePhoto = useRemoveBodyMetricPhoto()

  // Ambil member yang sedang dipilih
  const currentMember = useMemo(
    () => (ptMembers || []).find((m) => m.member_id === selectedMemberId),
    [ptMembers, selectedMemberId]
  )

  // Siklus aktif saat ini (prioritas is_active atau cycle paling baru)
  const activeCycle = useMemo(() => {
    if (!memberCycles || memberCycles.length === 0) return null
    return memberCycles.find((c) => c.is_active) || memberCycles[0] || null
  }, [memberCycles])

  // Filter metrik fisik khusus untuk siklus aktif saat ini (Opsi A + B)
  const activeCycleMetrics = useMemo(() => {
    if (!historicalMetrics || historicalMetrics.length === 0) return []
    if (!activeCycle) return historicalMetrics

    const cycleStart = new Date(activeCycle.created_at).getTime()
    const cycleEnd = activeCycle.next_cycle_created_at
      ? new Date(activeCycle.next_cycle_created_at).getTime()
      : Infinity

    return historicalMetrics.filter((m) => {
      const t = new Date(m.created_at || m.recorded_at).getTime()
      return t >= cycleStart && t < cycleEnd
    })
  }, [historicalMetrics, activeCycle])

  // Metrik pengukuran terakhir secara historis lintas seluruh siklus (untuk smart-prefill helper)
  const mostRecentHistoricalMetric = useMemo(() => {
    if (!historicalMetrics || historicalMetrics.length === 0) return null
    return historicalMetrics[historicalMetrics.length - 1]
  }, [historicalMetrics])

  // Helper untuk menyalin ukuran terakhir dari siklus sebelumnya ke Day 1 siklus baru
  const handleCopyPreviousMeasurements = () => {
    if (!mostRecentHistoricalMetric) return
    if (mostRecentHistoricalMetric.weight_kg) {
      setWeightKg(String(mostRecentHistoricalMetric.weight_kg))
    }
    const m = mostRecentHistoricalMetric.measurements || {}
    if (m.perut !== undefined) setPerut(String(m.perut))
    if (m.lengan !== undefined) setLengan(String(m.lengan))
    if (m.dada !== undefined) setDada(String(m.dada))
    if (m.paha !== undefined) setPaha(String(m.paha))
    if (m.pinggul !== undefined) setPinggul(String(m.pinggul))
    if (m.body_fat !== undefined) setBodyFat(String(m.body_fat))
    toast.success('Ukuran tubuh dari siklus sebelumnya berhasil disalin sebagai acuan awal!')
  }

  const memberOptions = useMemo(() => {
    return (ptMembers || []).map((m) => ({
      id: m.member_id,
      full_name: m.full_name,
      phone: m.phone,
    }))
  }, [ptMembers])

  const statusMap = useMemo(() => {
    const map = new Map<string, string>()
      ; (ptMembers || []).forEach((m) => {
        map.set(
          m.member_id,
          `${m.pt_remaining_sessions} sesi sisa (${m.pt_membership_name})`
        )
      })
    return map
  }, [ptMembers])

  // Cari Baseline Day 1, Day Terakhir, dan Evaluasi Berkala KHUSUS SIKLUS AKTIF
  const { day1Metric, dayFinalMetric, progressMetrics, lastMetric, totalRecordCount } = useMemo(() => {
    if (!activeCycleMetrics || activeCycleMetrics.length === 0) {
      return {
        day1Metric: null,
        dayFinalMetric: null,
        progressMetrics: [],
        lastMetric: null,
        totalRecordCount: 0,
      }
    }
    const day1 = activeCycleMetrics.find((m) => m.phase === 'day_1') || null
    const dayFinal = activeCycleMetrics.find((m) => m.phase === 'day_final') || null
    const prog = activeCycleMetrics.filter((m) => m.phase === 'progress')
    const last = activeCycleMetrics[activeCycleMetrics.length - 1]
    return {
      day1Metric: day1,
      dayFinalMetric: dayFinal,
      progressMetrics: prog,
      lastMetric: last,
      totalRecordCount: activeCycleMetrics.length,
    }
  }, [activeCycleMetrics])

  // Logika State-Aware Milestone Switching
  const executePhaseChange = (newPhase: BodyMetricPhase) => {
    setPhase(newPhase)
    setPendingPhase(null)

    // Bersihkan preview file lokal baru yang belum diunggah
    if (frontPhoto.preview && frontPhoto.file) URL.revokeObjectURL(frontPhoto.preview)
    if (sidePhoto.preview && sidePhoto.file) URL.revokeObjectURL(sidePhoto.preview)
    if (backPhoto.preview && backPhoto.file) URL.revokeObjectURL(backPhoto.preview)
    setFrontPhoto({ file: null, preview: null })
    setSidePhoto({ file: null, preview: null })
    setBackPhoto({ file: null, preview: null })

    if (newPhase === 'day_1') {
      if (day1Metric) {
        // 1. DAY 1 SUDAH TERSIMPAN: Muat data & foto Day 1 yang sudah ada
        setExistingRecordId(day1Metric.id)
        setWeightKg(day1Metric.weight_kg ? String(day1Metric.weight_kg) : '')
        setRecordedAt(
          day1Metric.recorded_at
            ? day1Metric.recorded_at.split('T')[0]
            : new Date().toLocaleDateString('sv-SE')
        )
        setPerut(
          day1Metric.measurements?.perut !== undefined
            ? String(day1Metric.measurements.perut)
            : ''
        )
        setLengan(
          day1Metric.measurements?.lengan !== undefined
            ? String(day1Metric.measurements.lengan)
            : ''
        )
        setDada(
          day1Metric.measurements?.dada !== undefined
            ? String(day1Metric.measurements.dada)
            : ''
        )
        setPaha(
          day1Metric.measurements?.paha !== undefined
            ? String(day1Metric.measurements.paha)
            : ''
        )
        setPinggul(
          day1Metric.measurements?.pinggul !== undefined
            ? String(day1Metric.measurements.pinggul)
            : ''
        )
        setBodyFat(
          day1Metric.measurements?.body_fat !== undefined
            ? String(day1Metric.measurements.body_fat)
            : ''
        )
        setNotes(day1Metric.notes || '')
        setExistingPhotos({
          front: day1Metric.photo_front_url || null,
          side: day1Metric.photo_side_url || null,
          back: day1Metric.photo_back_url || null,
        })
        toast.info('Memuat data Day 1 (Awal) yang tersimpan')
      } else {
        // DAY 1 BELUM ADA: Form bersih siap catat perdana
        setExistingRecordId(null)
        setWeightKg('')
        setRecordedAt(new Date().toLocaleDateString('sv-SE'))
        setPerut('')
        setLengan('')
        setDada('')
        setPaha('')
        setPinggul('')
        setBodyFat('')
        setNotes('')
        setExistingPhotos({ front: null, side: null, back: null })
      }
    } else if (newPhase === 'day_final') {
      if (dayFinalMetric) {
        // 2. DAY TERAKHIR SUDAH TERSIMPAN: Muat data & foto kelulusan
        setExistingRecordId(dayFinalMetric.id)
        setWeightKg(dayFinalMetric.weight_kg ? String(dayFinalMetric.weight_kg) : '')
        setRecordedAt(
          dayFinalMetric.recorded_at
            ? dayFinalMetric.recorded_at.split('T')[0]
            : new Date().toLocaleDateString('sv-SE')
        )
        setPerut(
          dayFinalMetric.measurements?.perut !== undefined
            ? String(dayFinalMetric.measurements.perut)
            : ''
        )
        setLengan(
          dayFinalMetric.measurements?.lengan !== undefined
            ? String(dayFinalMetric.measurements.lengan)
            : ''
        )
        setDada(
          dayFinalMetric.measurements?.dada !== undefined
            ? String(dayFinalMetric.measurements.dada)
            : ''
        )
        setPaha(
          dayFinalMetric.measurements?.paha !== undefined
            ? String(dayFinalMetric.measurements.paha)
            : ''
        )
        setPinggul(
          dayFinalMetric.measurements?.pinggul !== undefined
            ? String(dayFinalMetric.measurements.pinggul)
            : ''
        )
        setBodyFat(
          dayFinalMetric.measurements?.body_fat !== undefined
            ? String(dayFinalMetric.measurements.body_fat)
            : ''
        )
        setNotes(dayFinalMetric.notes || '')
        setExistingPhotos({
          front: dayFinalMetric.photo_front_url || null,
          side: dayFinalMetric.photo_side_url || null,
          back: dayFinalMetric.photo_back_url || null,
        })
        toast.info('Memuat data Day Terakhir (Kelulusan) yang tersimpan')
      } else {
        // DAY TERAKHIR BELUM ADA: Form bersih siap catat kelulusan
        setExistingRecordId(null)
        setWeightKg('')
        setRecordedAt(new Date().toLocaleDateString('sv-SE'))
        setPerut('')
        setLengan('')
        setDada('')
        setPaha('')
        setPinggul('')
        setBodyFat('')
        setNotes('')
        setExistingPhotos({ front: null, side: null, back: null })
      }
    } else {
      // 3. PROGRESS BERKALA: SELALU FORM BERSIH UNTUK INPUT HARI INI
      setExistingRecordId(null)
      setWeightKg('')
      setRecordedAt(new Date().toLocaleDateString('sv-SE'))
      setPerut('')
      setLengan('')
      setDada('')
      setPaha('')
      setPinggul('')
      setBodyFat('')
      setNotes('')
      setExistingPhotos({ front: null, side: null, back: null })
    }
  }

  // Handle Photo Select
  const handlePhotoSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<PhotoSlotState>>
  ) => {
    const file = e.target.files?.[0]
    if (!file) return

    setter({
      file,
      preview: URL.createObjectURL(file),
    })
    // Reset value agar bisa memilih file yang sama jika dihapus lalu dipilih ulang
    e.target.value = ''
  }

  // Handle Remove Photo Confirmation (vuln-0001)
  const handleConfirmDeletePhoto = async () => {
    if (!photoToDelete) return

    const angle = photoToDelete
    const isExistingStoredPhoto = Boolean(existingPhotos[angle])
    const label =
      angle === 'front'
        ? 'Tampak Depan'
        : angle === 'side'
        ? 'Tampak Samping'
        : 'Tampak Belakang'

    // 1. Reset file baru & preview lokal
    if (angle === 'front') {
      if (frontPhoto.preview) URL.revokeObjectURL(frontPhoto.preview)
      setFrontPhoto({ file: null, preview: null })
      setExistingPhotos((prev) => ({ ...prev, front: null }))
    } else if (angle === 'side') {
      if (sidePhoto.preview) URL.revokeObjectURL(sidePhoto.preview)
      setSidePhoto({ file: null, preview: null })
      setExistingPhotos((prev) => ({ ...prev, side: null }))
    } else if (angle === 'back') {
      if (backPhoto.preview) URL.revokeObjectURL(backPhoto.preview)
      setBackPhoto({ file: null, preview: null })
      setExistingPhotos((prev) => ({ ...prev, back: null }))
    }

    setPhotoToDelete(null)

    // 2. Jika foto merupakan foto yang sudah tersimpan di database, hapus langsung dari DB & storage fisik
    if (isExistingStoredPhoto && existingRecordId && selectedMemberId) {
      // Security Guard (vuln-0002): Pastikan existingRecordId benar-benar terdaftar sebagai milik selectedMemberId aktif
      const isOwned = (historicalMetrics || []).some(
        (m) => m.id === existingRecordId && m.member_id === selectedMemberId
      )
      if (!isOwned) {
        toast.error('Operasi dibatalkan: ID metrik tidak valid untuk member ini')
        return
      }

      try {
        await removePhoto.mutateAsync({
          metricId: existingRecordId,
          angle,
          memberId: selectedMemberId,
        })
        toast.success(`Foto ${label} berhasil dihapus permanen dari server`)
      } catch (err: any) {
        console.error('Gagal menghapus foto dari server:', err)
        toast.error(`Gagal menghapus foto dari server: ${err.message || 'Unknown error'}`)
      }
    } else {
      toast.info(`Foto ${label} dibatalkan`)
    }
  }

  // Live Delta Calculations
  const numericWeight = parseFloat(weightKg) || null
  const weightDeltaVsLast = useMemo(() => {
    if (numericWeight === null || !lastMetric?.weight_kg) return null
    return +(numericWeight - lastMetric.weight_kg).toFixed(1)
  }, [numericWeight, lastMetric])

  const weightDeltaVsDay1 = useMemo(() => {
    if (numericWeight === null || !day1Metric?.weight_kg) return null
    return +(numericWeight - day1Metric.weight_kg).toFixed(1)
  }, [numericWeight, day1Metric])

  // Helper live delta untuk measurements
  const getMeasurementDelta = (valStr: string, key: string) => {
    const val = parseFloat(valStr)
    if (isNaN(val)) return null
    const prev = lastMetric?.measurements?.[key]
    if (typeof prev !== 'number') return null
    return +(val - prev).toFixed(1)
  }

  // Cek apakah form sudah terisi data
  const isFormDirty = useMemo(() => {
    return (
      Boolean(weightKg) ||
      Boolean(perut) ||
      Boolean(lengan) ||
      Boolean(dada) ||
      Boolean(paha) ||
      Boolean(pinggul) ||
      Boolean(bodyFat) ||
      Boolean(frontPhoto.file) ||
      Boolean(sidePhoto.file) ||
      Boolean(backPhoto.file) ||
      Boolean(notes.trim())
    )
  }, [
    weightKg,
    perut,
    lengan,
    dada,
    paha,
    pinggul,
    bodyFat,
    frontPhoto.file,
    sidePhoto.file,
    backPhoto.file,
    notes,
  ])

  // Trigger pergantian fase dengan proteksi dirty form (vuln-0003)
  const handlePhaseChangeClick = (newPhase: BodyMetricPhase) => {
    if (newPhase === phase) return
    if (isFormDirty) {
      setPendingPhase(newPhase)
    } else {
      executePhaseChange(newPhase)
    }
  }

  // Reset form
  const handleResetForm = () => {
    resetAllFormState()
    setConfirmResetOpen(false)
  }

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedMemberId) {
      toast.error('Pilih member terlebih dahulu')
      return
    }

    if (!weightKg || !weightKg.trim()) {
      toast.error('Mohon isi Berat Badan (Kg) terlebih dahulu')
      return
    }

    const parsedWeight = parseFloat(weightKg)
    if (isNaN(parsedWeight) || parsedWeight <= 0) {
      toast.error('Mohon masukkan angka Berat Badan (Kg) yang valid')
      return
    }

    setIsUploading(true)
    try {
      let frontUrl: string | null = existingPhotos.front
      let sideUrl: string | null = existingPhotos.side
      let backUrl: string | null = existingPhotos.back

      if (frontPhoto.file) {
        setUploadStep('Mengompresi & mengunggah Foto Depan (WebP)...')
        frontUrl = await uploadProgressPhoto(
          frontPhoto.file,
          selectedMemberId,
          'front'
        )
      }

      if (sidePhoto.file) {
        setUploadStep('Mengompresi & mengunggah Foto Samping (WebP)...')
        sideUrl = await uploadProgressPhoto(
          sidePhoto.file,
          selectedMemberId,
          'side'
        )
      }

      if (backPhoto.file) {
        setUploadStep('Mengompresi & mengunggah Foto Belakang (WebP)...')
        backUrl = await uploadProgressPhoto(
          backPhoto.file,
          selectedMemberId,
          'back'
        )
      }

      setUploadStep('Menyimpan metrik fisik member ke database...')

      const measurementsObj: Record<string, number> = {}
      if (perut) measurementsObj.perut = parseFloat(perut)
      if (lengan) measurementsObj.lengan = parseFloat(lengan)
      if (dada) measurementsObj.dada = parseFloat(dada)
      if (paha) measurementsObj.paha = parseFloat(paha)
      if (pinggul) measurementsObj.pinggul = parseFloat(pinggul)
      if (bodyFat) measurementsObj.body_fat = parseFloat(bodyFat)

      // Security Guard (vuln-0007): Pastikan existingRecordId benar-benar terdaftar sebagai milik selectedMemberId aktif
      let verifiedRecordId: string | undefined = undefined
      if (existingRecordId) {
        const isOwned = (historicalMetrics || []).some(
          (m) => m.id === existingRecordId && m.member_id === selectedMemberId
        )
        if (isOwned) {
          verifiedRecordId = existingRecordId
        } else {
          console.warn('[Security Guard] Stale existingRecordId diabaikan:', existingRecordId)
        }
      }

      const savedMetric = await createMetric.mutateAsync({
        ...(verifiedRecordId ? { id: verifiedRecordId } : {}),
        member_id: selectedMemberId,
        weight_kg: weightKg ? parseFloat(weightKg) : null,
        measurements: measurementsObj as BodyMeasurements,
        photo_front_url: frontUrl,
        photo_side_url: sideUrl,
        photo_back_url: backUrl,
        phase,
        notes: notes.trim() || null,
        recorded_at: new Date(recordedAt).toISOString(),
      })

      // Jika fase Day 1 atau Day Terakhir, perbarui state existingPhotos dan existingRecordId
      if (phase === 'day_1' || phase === 'day_final') {
        if (savedMetric?.id) {
          setExistingRecordId(savedMetric.id)
        }
        setExistingPhotos({
          front: frontUrl,
          side: sideUrl,
          back: backUrl,
        })
      }

      toast.success(
        `Data metrik & foto ${currentMember?.full_name || 'member'} berhasil disimpan!`
      )

      // Siapkan data untuk Celebration Summary Dialog
      setSummaryData({
        memberName: currentMember?.full_name || 'Member',
        memberPhone: currentMember?.phone,
        recordedAt,
        phase,
        weightKg: weightKg ? parseFloat(weightKg) : null,
        prevWeightKg: lastMetric?.weight_kg || null,
        measurements: measurementsObj,
        prevMeasurements: (lastMetric?.measurements as Record<string, number>) || {},
        notes: notes.trim() || null,
        frontPreview: frontPhoto.preview || frontUrl,
        day1FrontUrl: day1Metric?.photo_front_url || null,
      })

      setSuccessDialogOpen(true)
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Gagal menyimpan metrik tubuh')
    } finally {
      setIsUploading(false)
      setUploadStep('')
    }
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Top Navigation Bar: Sticky full-width persis seperti /workout */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/40 bg-background/95 px-4 lg:px-8 py-3.5 backdrop-blur-md w-full">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (isFormDirty) {
                setExitConfirmOpen(true)
              } else {
                router.push(
                  selectedMemberId
                    ? `/dashboard/pt/progress?memberId=${selectedMemberId}&tab=metrics`
                    : '/dashboard/pt/progress'
                )
              }
            }}
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading text-lg font-bold text-foreground">Body Metrics & Foto</span>
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                EVALUASI
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">Catat ukuran tubuh & foto progres fisik member</p>
          </div>
        </div>

        {isFormDirty && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmResetOpen(true)}
            className="h-8 text-xs text-muted-foreground hover:text-destructive"
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset Form
          </Button>
        )}
      </header>

      <main className="mx-auto max-w-4xl px-4 pt-6 space-y-6">

        {/* 1. Pilih Member Card */}
        <Card className="border-border/50 bg-card shadow-sm">
          <CardContent className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Pilih Member PT
              </span>
              {currentMember && (
                <Badge
                  variant="outline"
                  className="border-primary/40 bg-primary/5 text-[10px] font-bold text-primary"
                >
                  Sisa {currentMember.pt_remaining_sessions} Sesi · {currentMember.pt_membership_name}
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
                placeholder="Ketik nama member yang akan dievaluasi..."
                statusMap={statusMap}
                className="w-full"
              />
            )}

            {!selectedMemberId && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
                <span>
                  Pilih member terlebih dahulu agar riwayat evaluasi dan baseline foto
                  Day 1 dapat ditampilkan.
                </span>
              </div>
            )}

            {/* Historical Baseline Snapshot Bar */}
            {selectedMemberId && (
              historyLoading ? (
                <div className="mt-3 rounded-xl border border-border/40 bg-muted/20 p-3 flex items-center justify-between gap-3 animate-pulse">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-7 w-7 rounded-lg" />
                    <div className="space-y-1">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-7 w-24 rounded-md" />
                    <Skeleton className="h-7 w-24 rounded-md" />
                  </div>
                </div>
              ) : (
                <div className="mt-3 rounded-xl border border-border/40 bg-muted/20 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                        <Scale className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-[11px] text-muted-foreground">
                          Rekor Pengukuran:
                        </span>
                        <p className="font-bold text-foreground">
                          {totalRecordCount > 0 ? (
                            <span>
                              {totalRecordCount} kali evaluasi tercatat
                            </span>
                          ) : (
                            <span className="text-blue-400">Belum ada data (Sesi Perdana)</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {day1Metric?.weight_kg && (
                      <div className="border-l border-border/50 pl-3">
                        <span className="text-[10px] text-muted-foreground">
                          BB Awal (Day 1):
                        </span>
                        <p className="font-bold text-blue-400">
                          {day1Metric.weight_kg} kg
                        </p>
                      </div>
                    )}

                    {lastMetric?.weight_kg && (
                      <div className="border-l border-border/50 pl-3">
                        <span className="text-[10px] text-muted-foreground">
                          BB Terakhir ({new Date(lastMetric.recorded_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}):
                        </span>
                        <p className="font-bold text-foreground">
                          {lastMetric.weight_kg} kg
                        </p>
                      </div>
                    )}

                    {day1Metric?.weight_kg && lastMetric?.weight_kg && (
                      <div className="border-l border-border/50 pl-3">
                        <span className="text-[10px] text-muted-foreground">
                          Total Penurunan:
                        </span>
                        <p className="font-extrabold text-emerald-400 flex items-center gap-1">
                          <TrendingDown className="h-3.5 w-3.5" />
                          {Math.abs(lastMetric.weight_kg - day1Metric.weight_kg).toFixed(1)} kg
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 2. Fase / Milestone Pencatatan */}
          <Card className="border-border/50 bg-card shadow-sm">
            <CardContent className="p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Fase Pencatatan
                </Label>
                <span className="text-[11px] text-muted-foreground">
                  Tentukan tonggak evaluasi member
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => handlePhaseChangeClick('day_1')}
                  className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${phase === 'day_1'
                    ? 'border-blue-500 bg-blue-500/10 text-blue-400 ring-2 ring-blue-500/20'
                    : 'border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                    }`}
                >
                  <div className="flex items-center justify-between w-full font-bold text-xs">
                    <span>🏁 Day 1 (Awal)</span>
                    {day1Metric && (
                      <span className="rounded-full bg-blue-500/20 text-blue-300 text-[9px] px-1.5 py-0 font-bold border border-blue-500/30">
                        ✓ Tersimpan
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground mt-0.5">
                    {day1Metric
                      ? 'Klik untuk melihat / mengubah data Day 1'
                      : 'Sesi perdana / patokan awal program PT'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePhaseChangeClick('progress')}
                  className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${phase === 'progress'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-400 ring-2 ring-amber-500/20'
                    : 'border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                    }`}
                >
                  <div className="flex items-center justify-between w-full font-bold text-xs">
                    <span>⚡ Progress Berkala</span>
                    {progressMetrics.length > 0 ? (
                      <span className="rounded-full bg-amber-500/20 text-amber-300 text-[9px] px-1.5 py-0 font-bold border border-amber-500/30">
                        {progressMetrics.length} Catatan
                      </span>
                    ) : (
                      <span className="text-[9px] text-muted-foreground/80 font-normal">
                        Slot Baru
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground mt-0.5">
                    Evaluasi mingguan / tengah periode program
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePhaseChangeClick('day_final')}
                  className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${phase === 'day_final'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 ring-2 ring-emerald-500/20'
                    : 'border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                    }`}
                >
                  <div className="flex items-center justify-between w-full font-bold text-xs">
                    <span>🏆 Day Terakhir</span>
                    {dayFinalMetric ? (
                      <span className="rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] px-1.5 py-0 font-bold border border-emerald-500/30">
                        ✓ Lulus
                      </span>
                    ) : currentMember && currentMember.pt_remaining_sessions <= 1 ? (
                      <span className="rounded-full bg-amber-500/20 text-amber-300 text-[9px] px-1.5 py-0 font-bold border border-amber-500/30">
                        Sesi Penutupan
                      </span>
                    ) : null}
                  </div>
                  <span className="text-[11px] text-muted-foreground mt-0.5">
                    {dayFinalMetric
                      ? 'Klik untuk melihat / mengubah data kelulusan'
                      : 'Hasil akhir lulus / evaluasi penutupan paket'}
                  </span>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* 3. Berat Badan & Tanggal Evaluasi */}
          <Card className="border-border/50 bg-card shadow-sm">
            <CardContent className="p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Berat Badan & Tanggal
                </Label>
                <span className="text-[11px] text-muted-foreground">
                  Input angka timbangan & tanggal
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Berat Badan Input + Live Delta */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">
                      Berat Badan (Kg) <span className="text-destructive">*</span>
                    </span>
                    {/* LIVE DELTA BADGE */}
                    {weightDeltaVsLast !== null && (
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold flex items-center gap-1 ${weightDeltaVsLast < 0
                          ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                          : weightDeltaVsLast > 0
                            ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                            : 'border-border bg-muted/30 text-muted-foreground'
                          }`}
                      >
                        {weightDeltaVsLast < 0 ? (
                          <>
                            <TrendingDown className="h-3 w-3" />
                            {weightDeltaVsLast} kg vs sesi lalu
                          </>
                        ) : weightDeltaVsLast > 0 ? (
                          <>
                            <TrendingUp className="h-3 w-3" />
                            +{weightDeltaVsLast} kg vs sesi lalu
                          </>
                        ) : (
                          <>
                            <Minus className="h-3 w-3" /> Sama dengan sesi lalu
                          </>
                        )}
                      </Badge>
                    )}
                  </div>

                  <div className="relative">
                    <Input
                      type="number"
                      step="0.1"
                      min="20"
                      max="300"
                      placeholder="Contoh: 75.5"
                      value={weightKg}
                      onChange={(e) => setWeightKg(e.target.value)}
                      className="bg-background text-base font-bold text-accent pr-12 h-11"
                    />
                    <span className="absolute right-3.5 top-3 text-xs text-muted-foreground font-semibold">
                      kg
                    </span>
                  </div>

                  {weightDeltaVsDay1 !== null && (
                    <p className="text-[11px] text-muted-foreground">
                      Total perubahan dari Day 1:{' '}
                      <span
                        className={`font-semibold ${weightDeltaVsDay1 < 0 ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                      >
                        {weightDeltaVsDay1 > 0 ? `+${weightDeltaVsDay1}` : weightDeltaVsDay1} kg
                      </span>
                    </p>
                  )}
                </div>

                {/* Tanggal Pengukuran */}
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-foreground">
                    Tanggal Pengukuran
                  </span>
                  <div className="relative">
                    <Input
                      type="date"
                      value={recordedAt}
                      onChange={(e) => setRecordedAt(e.target.value)}
                      className="bg-background text-sm h-11"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Default tanggal hari ini, bisa disesuaikan jika data kemarin
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 4. Ukuran Lingkar Tubuh (6 Titik - Opsi 4A) */}
          <Card className="border-border/50 bg-card shadow-sm">
            <CardContent className="p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Ukuran Lingkar Tubuh (Opsional)
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    4 titik standar + Lingkar Pinggul & Estimasi Body Fat (%)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {phase === 'day_1' && !day1Metric && mostRecentHistoricalMetric && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleCopyPreviousMeasurements}
                      className="text-xs border-primary/40 text-primary hover:bg-primary/10 gap-1.5 h-7 px-2.5 font-semibold"
                      title="Salin ukuran terakhir dari siklus sebelumnya sebagai acuan awal"
                    >
                      <Sparkles className="h-3 w-3" />
                      <span>Salin Ukuran Terakhir ({mostRecentHistoricalMetric.weight_kg ? `${mostRecentHistoricalMetric.weight_kg}kg` : 'Lalu'})</span>
                    </Button>
                  )}
                  <Badge variant="outline" className="text-[10px] text-muted-foreground">
                    Satuan cm & %
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                {/* 1. Lingkar Perut */}
                <div className="rounded-xl border border-border/40 bg-muted/10 p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">
                      Perut / Pinggang
                    </span>
                    {getMeasurementDelta(perut, 'perut') !== null && (
                      <span
                        className={`text-[10px] font-bold ${(getMeasurementDelta(perut, 'perut') ?? 0) <= 0
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                          }`}
                      >
                        {(getMeasurementDelta(perut, 'perut') ?? 0) > 0 ? '+' : ''}
                        {getMeasurementDelta(perut, 'perut')} cm
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.5"
                      placeholder={
                        lastMetric?.measurements?.perut
                          ? `Lalu: ${lastMetric.measurements.perut}`
                          : 'cm'
                      }
                      value={perut}
                      onChange={(e) => setPerut(e.target.value)}
                      className="bg-background text-xs font-medium pr-8"
                    />
                    <span className="absolute right-2.5 top-2.5 text-[11px] text-muted-foreground">
                      cm
                    </span>
                  </div>
                </div>

                {/* 2. Lingkar Lengan */}
                <div className="rounded-xl border border-border/40 bg-muted/10 p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">
                      Lengan (Biceps)
                    </span>
                    {getMeasurementDelta(lengan, 'lengan') !== null && (
                      <span
                        className={`text-[10px] font-bold ${(getMeasurementDelta(lengan, 'lengan') ?? 0) > 0
                          ? 'text-emerald-400'
                          : 'text-blue-400'
                          }`}
                      >
                        {(getMeasurementDelta(lengan, 'lengan') ?? 0) > 0 ? '+' : ''}
                        {getMeasurementDelta(lengan, 'lengan')} cm
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.5"
                      placeholder={
                        lastMetric?.measurements?.lengan
                          ? `Lalu: ${lastMetric.measurements.lengan}`
                          : 'cm'
                      }
                      value={lengan}
                      onChange={(e) => setLengan(e.target.value)}
                      className="bg-background text-xs font-medium pr-8"
                    />
                    <span className="absolute right-2.5 top-2.5 text-[11px] text-muted-foreground">
                      cm
                    </span>
                  </div>
                </div>

                {/* 3. Lingkar Dada */}
                <div className="rounded-xl border border-border/40 bg-muted/10 p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">
                      Dada (Chest)
                    </span>
                    {getMeasurementDelta(dada, 'dada') !== null && (
                      <span className="text-[10px] font-bold text-muted-foreground">
                        {(getMeasurementDelta(dada, 'dada') ?? 0) > 0 ? '+' : ''}
                        {getMeasurementDelta(dada, 'dada')} cm
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.5"
                      placeholder={
                        lastMetric?.measurements?.dada
                          ? `Lalu: ${lastMetric.measurements.dada}`
                          : 'cm'
                      }
                      value={dada}
                      onChange={(e) => setDada(e.target.value)}
                      className="bg-background text-xs font-medium pr-8"
                    />
                    <span className="absolute right-2.5 top-2.5 text-[11px] text-muted-foreground">
                      cm
                    </span>
                  </div>
                </div>

                {/* 4. Lingkar Paha */}
                <div className="rounded-xl border border-border/40 bg-muted/10 p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">
                      Paha (Thighs)
                    </span>
                    {getMeasurementDelta(paha, 'paha') !== null && (
                      <span className="text-[10px] font-bold text-muted-foreground">
                        {(getMeasurementDelta(paha, 'paha') ?? 0) > 0 ? '+' : ''}
                        {getMeasurementDelta(paha, 'paha')} cm
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.5"
                      placeholder={
                        lastMetric?.measurements?.paha
                          ? `Lalu: ${lastMetric.measurements.paha}`
                          : 'cm'
                      }
                      value={paha}
                      onChange={(e) => setPaha(e.target.value)}
                      className="bg-background text-xs font-medium pr-8"
                    />
                    <span className="absolute right-2.5 top-2.5 text-[11px] text-muted-foreground">
                      cm
                    </span>
                  </div>
                </div>

                {/* 5. Lingkar Pinggul (Opsi 4A) */}
                <div className="rounded-xl border border-border/40 bg-muted/10 p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">
                      Pinggul (Hips)
                    </span>
                    {getMeasurementDelta(pinggul, 'pinggul') !== null && (
                      <span className="text-[10px] font-bold text-muted-foreground">
                        {(getMeasurementDelta(pinggul, 'pinggul') ?? 0) > 0 ? '+' : ''}
                        {getMeasurementDelta(pinggul, 'pinggul')} cm
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.5"
                      placeholder={
                        lastMetric?.measurements?.pinggul
                          ? `Lalu: ${lastMetric.measurements.pinggul}`
                          : 'cm'
                      }
                      value={pinggul}
                      onChange={(e) => setPinggul(e.target.value)}
                      className="bg-background text-xs font-medium pr-8"
                    />
                    <span className="absolute right-2.5 top-2.5 text-[11px] text-muted-foreground">
                      cm
                    </span>
                  </div>
                </div>

                {/* 6. Estimasi Body Fat (%) (Opsi 4A) */}
                <div className="rounded-xl border border-border/40 bg-muted/10 p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">
                      Body Fat %
                    </span>
                    {getMeasurementDelta(bodyFat, 'body_fat') !== null && (
                      <span
                        className={`text-[10px] font-bold ${(getMeasurementDelta(bodyFat, 'body_fat') ?? 0) <= 0
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                          }`}
                      >
                        {(getMeasurementDelta(bodyFat, 'body_fat') ?? 0) > 0 ? '+' : ''}
                        {getMeasurementDelta(bodyFat, 'body_fat')}%
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.1"
                      min="3"
                      max="60"
                      placeholder={
                        lastMetric?.measurements?.body_fat
                          ? `Lalu: ${lastMetric.measurements.body_fat}%`
                          : 'Contoh: 18.5'
                      }
                      value={bodyFat}
                      onChange={(e) => setBodyFat(e.target.value)}
                      className="bg-background text-xs font-medium pr-8"
                    />
                    <span className="absolute right-2.5 top-2.5 text-[11px] text-muted-foreground">
                      %
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 5. Foto Dokumentasi (Depan, Samping, Belakang - Opsi 2A) */}
          <Card className="border-border/50 bg-card shadow-sm">
            <CardContent className="p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Foto Progress Fisik (3 Sudut)
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Buka kamera langsung di HP atau pilih dari galeri. Otomatis dikompresi ke WebP hemat kuota.
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="border-blue-500/40 bg-blue-500/10 text-[10px] font-bold text-blue-400 self-start sm:self-auto"
                >
                  📸 Mobile Camera Ready
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* SLOT 1: FOTO DEPAN (FRONT) */}
                <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-3 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">
                        1. Tampak Depan
                      </span>
                      {frontPhoto.file ? (
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-none text-[9px] px-1.5 py-0">
                          Foto Baru Siap
                        </Badge>
                      ) : existingPhotos.front ? (
                        <Badge className="bg-blue-500/20 text-blue-400 border-none text-[9px] px-1.5 py-0">
                          ✓ Tersimpan
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Pose tegak, pandangan lurus ke depan
                    </p>
                  </div>

                  {/* Frame Tampilan Foto */}
                  {phase === 'day_1' ? (
                    // Single Frame untuk Day 1 (Awal)
                    <div className="relative rounded-lg border border-border bg-background flex flex-col items-center justify-center min-h-[145px] overflow-hidden">
                      {frontPhoto.preview ? (
                        <>
                          <Image
                            src={frontPhoto.preview}
                            alt="Preview Depan Baru"
                            fill
                            unoptimized
                            className="object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => setPhotoToDelete('front')}
                            title="Batalkan foto baru"
                            className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-destructive/90 text-white flex items-center justify-center hover:bg-destructive shadow-sm"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          <span className="absolute bottom-1 left-1 rounded bg-emerald-600/90 px-1 py-0.5 text-[9px] font-bold text-white">
                            Foto Baru
                          </span>
                        </>
                      ) : existingPhotos.front ? (
                        <>
                          <Image
                            src={existingPhotos.front}
                            alt="Foto Day 1 Tersimpan"
                            fill
                            unoptimized
                            className="object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => setPhotoToDelete('front')}
                            title="Hapus foto Day 1 tersimpan"
                            className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-destructive/90 text-white flex items-center justify-center hover:bg-destructive shadow-sm"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          <span className="absolute bottom-1 left-1 rounded bg-blue-600/90 px-1 py-0.5 text-[9px] font-bold text-white">
                            Day 1 (Tersimpan)
                          </span>
                        </>
                      ) : (
                        <div className="p-3 text-center text-muted-foreground/60">
                          <Camera className="mx-auto h-7 w-7 mb-1.5 text-muted-foreground/40" />
                          <span className="text-[10px] font-semibold block text-foreground">
                            Slot Day 1 (Awal)
                          </span>
                          <span className="text-[9px] text-muted-foreground">
                            Ambil foto patokan awal member
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    // 2 Kolom untuk Progress Berkala & Day Terakhir: Acuan Day 1 vs Slot Hari Ini
                    <div className="grid grid-cols-2 gap-2 min-h-[145px]">
                      {/* Kolom 1: Acuan Pose Day 1 */}
                      <div className="relative rounded-lg border border-dashed border-border/80 bg-background/50 flex flex-col items-center justify-center overflow-hidden">
                        {day1Metric?.photo_front_url ? (
                          <>
                            <Image
                              src={day1Metric.photo_front_url}
                              alt="Acuan Pose Day 1"
                              fill
                              unoptimized
                              className="object-cover"
                            />
                            <span className="absolute bottom-1 left-1 rounded bg-black/75 px-1 py-0.5 text-[9px] font-bold text-white">
                              Acuan Day 1
                            </span>
                          </>
                        ) : (
                          <div className="p-2 text-center">
                            <ImageIcon className="mx-auto h-5 w-5 text-muted-foreground/40 mb-1" />
                            <span className="text-[9px] text-muted-foreground/70 leading-tight block">
                              Belum ada foto Day 1
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Kolom 2: Slot Foto Hari Ini / Hasil Akhir */}
                      <div className="relative rounded-lg border border-border bg-background flex flex-col items-center justify-center overflow-hidden">
                        {frontPhoto.preview ? (
                          <>
                            <Image
                              src={frontPhoto.preview}
                              alt="Preview Depan Baru"
                              fill
                              unoptimized
                              className="object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => setPhotoToDelete('front')}
                              title="Hapus foto baru"
                              className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-destructive/90 text-white flex items-center justify-center hover:bg-destructive shadow-sm"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                            <span className="absolute bottom-1 left-1 rounded bg-emerald-600/90 px-1 py-0.5 text-[9px] font-bold text-white">
                              {phase === 'day_final' ? 'Hasil Akhir' : 'Progress'}
                            </span>
                          </>
                        ) : existingPhotos.front ? (
                          <>
                            <Image
                              src={existingPhotos.front}
                              alt="Foto Tersimpan"
                              fill
                              unoptimized
                              className="object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => setPhotoToDelete('front')}
                              title="Hapus foto tersimpan"
                              className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-destructive/90 text-white flex items-center justify-center hover:bg-destructive shadow-sm"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                            <span className="absolute bottom-1 left-1 rounded bg-blue-600/90 px-1 py-0.5 text-[9px] font-bold text-white">
                              Tersimpan
                            </span>
                          </>
                        ) : (
                          <div className="p-2 text-center text-muted-foreground/60">
                            <Camera className="mx-auto h-6 w-6 mb-1 text-muted-foreground/40" />
                            <span className="text-[9px] font-semibold text-foreground block">
                              {phase === 'day_final' ? 'Slot Akhir' : 'Slot Hari Ini'}
                            </span>
                            <span className="text-[8px] text-muted-foreground">
                              Siap difoto
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <input
                      ref={frontCamRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => handlePhotoSelect(e, setFrontPhoto)}
                      className="hidden"
                    />
                    <input
                      ref={frontFileRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhotoSelect(e, setFrontPhoto)}
                      className="hidden"
                    />
                    {frontPhoto.preview || existingPhotos.front ? (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => frontCamRef.current?.click()}
                          className="h-8 text-[11px] font-medium border-border/80 hover:bg-muted"
                        >
                          <Camera className="mr-1 h-3.5 w-3.5" /> Ganti Foto
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => setPhotoToDelete('front')}
                          className="h-8 text-[11px] font-bold bg-destructive/85 hover:bg-destructive text-white shadow-xs"
                        >
                          <Trash2 className="mr-1 h-3.5 w-3.5" /> Hapus Foto
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => frontCamRef.current?.click()}
                          className="h-8 text-[11px] font-bold border-border/80 hover:bg-primary/10 hover:text-primary"
                        >
                          <Camera className="mr-1 h-3.5 w-3.5" /> Kamera
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => frontFileRef.current?.click()}
                          className="h-8 text-[11px] font-semibold border-border/80 hover:bg-muted"
                        >
                          <ImageIcon className="mr-1 h-3.5 w-3.5" /> Galeri
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* SLOT 2: FOTO SAMPING (SIDE) */}
                <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-3 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">
                        2. Tampak Samping
                      </span>
                      {sidePhoto.file ? (
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-none text-[9px] px-1.5 py-0">
                          Foto Baru Siap
                        </Badge>
                      ) : existingPhotos.side ? (
                        <Badge className="bg-blue-500/20 text-blue-400 border-none text-[9px] px-1.5 py-0">
                          ✓ Tersimpan
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Profil samping 90°, lengan relaks
                    </p>
                  </div>

                  {/* Frame Tampilan Foto */}
                  {phase === 'day_1' ? (
                    // Single Frame untuk Day 1 (Awal)
                    <div className="relative rounded-lg border border-border bg-background flex flex-col items-center justify-center min-h-[145px] overflow-hidden">
                      {sidePhoto.preview ? (
                        <>
                          <Image
                            src={sidePhoto.preview}
                            alt="Preview Samping Baru"
                            fill
                            unoptimized
                            className="object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => setPhotoToDelete('side')}
                            title="Batalkan foto baru"
                            className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-destructive/90 text-white flex items-center justify-center hover:bg-destructive shadow-sm"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          <span className="absolute bottom-1 left-1 rounded bg-emerald-600/90 px-1 py-0.5 text-[9px] font-bold text-white">
                            Foto Baru
                          </span>
                        </>
                      ) : existingPhotos.side ? (
                        <>
                          <Image
                            src={existingPhotos.side}
                            alt="Foto Samping Day 1 Tersimpan"
                            fill
                            unoptimized
                            className="object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => setPhotoToDelete('side')}
                            title="Hapus foto Samping Day 1"
                            className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-destructive/90 text-white flex items-center justify-center hover:bg-destructive shadow-sm"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          <span className="absolute bottom-1 left-1 rounded bg-blue-600/90 px-1 py-0.5 text-[9px] font-bold text-white">
                            Day 1 (Tersimpan)
                          </span>
                        </>
                      ) : (
                        <div className="p-3 text-center text-muted-foreground/60">
                          <Camera className="mx-auto h-7 w-7 mb-1.5 text-muted-foreground/40" />
                          <span className="text-[10px] font-semibold block text-foreground">
                            Slot Day 1 (Awal)
                          </span>
                          <span className="text-[9px] text-muted-foreground">
                            Ambil foto samping awal member
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    // 2 Kolom untuk Progress & Day Terakhir
                    <div className="grid grid-cols-2 gap-2 min-h-[145px]">
                      {/* Kolom 1: Acuan Pose Day 1 */}
                      <div className="relative rounded-lg border border-dashed border-border/80 bg-background/50 flex flex-col items-center justify-center overflow-hidden">
                        {day1Metric?.photo_side_url ? (
                          <>
                            <Image
                              src={day1Metric.photo_side_url}
                              alt="Acuan Pose Samping Day 1"
                              fill
                              unoptimized
                              className="object-cover"
                            />
                            <span className="absolute bottom-1 left-1 rounded bg-black/75 px-1 py-0.5 text-[9px] font-bold text-white">
                              Acuan Day 1
                            </span>
                          </>
                        ) : (
                          <div className="p-2 text-center">
                            <ImageIcon className="mx-auto h-5 w-5 text-muted-foreground/40 mb-1" />
                            <span className="text-[9px] text-muted-foreground/70 leading-tight block">
                              Belum ada foto Day 1
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Kolom 2: Slot Foto Hari Ini / Hasil Akhir */}
                      <div className="relative rounded-lg border border-border bg-background flex flex-col items-center justify-center overflow-hidden">
                        {sidePhoto.preview ? (
                          <>
                            <Image
                              src={sidePhoto.preview}
                              alt="Preview Samping Baru"
                              fill
                              unoptimized
                              className="object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => setPhotoToDelete('side')}
                              title="Hapus foto baru"
                              className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-destructive/90 text-white flex items-center justify-center hover:bg-destructive shadow-sm"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                            <span className="absolute bottom-1 left-1 rounded bg-emerald-600/90 px-1 py-0.5 text-[9px] font-bold text-white">
                              {phase === 'day_final' ? 'Hasil Akhir' : 'Progress'}
                            </span>
                          </>
                        ) : existingPhotos.side ? (
                          <>
                            <Image
                              src={existingPhotos.side}
                              alt="Foto Samping Tersimpan"
                              fill
                              unoptimized
                              className="object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => setPhotoToDelete('side')}
                              title="Hapus foto tersimpan"
                              className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-destructive/90 text-white flex items-center justify-center hover:bg-destructive shadow-sm"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                            <span className="absolute bottom-1 left-1 rounded bg-blue-600/90 px-1 py-0.5 text-[9px] font-bold text-white">
                              Tersimpan
                            </span>
                          </>
                        ) : (
                          <div className="p-2 text-center text-muted-foreground/60">
                            <Camera className="mx-auto h-6 w-6 mb-1 text-muted-foreground/40" />
                            <span className="text-[9px] font-semibold text-foreground block">
                              {phase === 'day_final' ? 'Slot Akhir' : 'Slot Hari Ini'}
                            </span>
                            <span className="text-[8px] text-muted-foreground">
                              Siap difoto
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <input
                      ref={sideCamRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => handlePhotoSelect(e, setSidePhoto)}
                      className="hidden"
                    />
                    <input
                      ref={sideFileRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhotoSelect(e, setSidePhoto)}
                      className="hidden"
                    />
                    {sidePhoto.preview || existingPhotos.side ? (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => sideCamRef.current?.click()}
                          className="h-8 text-[11px] font-medium border-border/80 hover:bg-muted"
                        >
                          <Camera className="mr-1 h-3.5 w-3.5" /> Ganti Foto
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => setPhotoToDelete('side')}
                          className="h-8 text-[11px] font-bold bg-destructive/85 hover:bg-destructive text-white shadow-xs"
                        >
                          <Trash2 className="mr-1 h-3.5 w-3.5" /> Hapus Foto
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => sideCamRef.current?.click()}
                          className="h-8 text-[11px] font-bold border-border/80 hover:bg-primary/10 hover:text-primary"
                        >
                          <Camera className="mr-1 h-3.5 w-3.5" /> Kamera
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => sideFileRef.current?.click()}
                          className="h-8 text-[11px] font-semibold border-border/80 hover:bg-muted"
                        >
                          <ImageIcon className="mr-1 h-3.5 w-3.5" /> Galeri
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* SLOT 3: FOTO BELAKANG (BACK) */}
                <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-3 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">
                        3. Tampak Belakang
                      </span>
                      {backPhoto.file ? (
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-none text-[9px] px-1.5 py-0">
                          Foto Baru Siap
                        </Badge>
                      ) : existingPhotos.back ? (
                        <Badge className="bg-blue-500/20 text-blue-400 border-none text-[9px] px-1.5 py-0">
                          ✓ Tersimpan
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Menghadap belakang, postur bahu tegap
                    </p>
                  </div>

                  {/* Frame Tampilan Foto */}
                  {phase === 'day_1' ? (
                    // Single Frame untuk Day 1 (Awal)
                    <div className="relative rounded-lg border border-border bg-background flex flex-col items-center justify-center min-h-[145px] overflow-hidden">
                      {backPhoto.preview ? (
                        <>
                          <Image
                            src={backPhoto.preview}
                            alt="Preview Belakang Baru"
                            fill
                            unoptimized
                            className="object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => setPhotoToDelete('back')}
                            title="Batalkan foto baru"
                            className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-destructive/90 text-white flex items-center justify-center hover:bg-destructive shadow-sm"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          <span className="absolute bottom-1 left-1 rounded bg-emerald-600/90 px-1 py-0.5 text-[9px] font-bold text-white">
                            Foto Baru
                          </span>
                        </>
                      ) : existingPhotos.back ? (
                        <>
                          <Image
                            src={existingPhotos.back}
                            alt="Foto Belakang Day 1 Tersimpan"
                            fill
                            unoptimized
                            className="object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => setPhotoToDelete('back')}
                            title="Hapus foto Belakang Day 1"
                            className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-destructive/90 text-white flex items-center justify-center hover:bg-destructive shadow-sm"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          <span className="absolute bottom-1 left-1 rounded bg-blue-600/90 px-1 py-0.5 text-[9px] font-bold text-white">
                            Day 1 (Tersimpan)
                          </span>
                        </>
                      ) : (
                        <div className="p-3 text-center text-muted-foreground/60">
                          <Camera className="mx-auto h-7 w-7 mb-1.5 text-muted-foreground/40" />
                          <span className="text-[10px] font-semibold block text-foreground">
                            Slot Day 1 (Awal)
                          </span>
                          <span className="text-[9px] text-muted-foreground">
                            Ambil foto belakang awal member
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    // 2 Kolom untuk Progress & Day Terakhir
                    <div className="grid grid-cols-2 gap-2 min-h-[145px]">
                      {/* Kolom 1: Acuan Pose Day 1 */}
                      <div className="relative rounded-lg border border-dashed border-border/80 bg-background/50 flex flex-col items-center justify-center overflow-hidden">
                        {day1Metric?.photo_back_url ? (
                          <>
                            <Image
                              src={day1Metric.photo_back_url}
                              alt="Acuan Pose Belakang Day 1"
                              fill
                              unoptimized
                              className="object-cover"
                            />
                            <span className="absolute bottom-1 left-1 rounded bg-black/75 px-1 py-0.5 text-[9px] font-bold text-white">
                              Acuan Day 1
                            </span>
                          </>
                        ) : (
                          <div className="p-2 text-center">
                            <ImageIcon className="mx-auto h-5 w-5 text-muted-foreground/40 mb-1" />
                            <span className="text-[9px] text-muted-foreground/70 leading-tight block">
                              Belum ada foto Day 1
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Kolom 2: Slot Foto Hari Ini / Hasil Akhir */}
                      <div className="relative rounded-lg border border-border bg-background flex flex-col items-center justify-center overflow-hidden">
                        {backPhoto.preview ? (
                          <>
                            <Image
                              src={backPhoto.preview}
                              alt="Preview Belakang Baru"
                              fill
                              unoptimized
                              className="object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => setPhotoToDelete('back')}
                              title="Hapus foto baru"
                              className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-destructive/90 text-white flex items-center justify-center hover:bg-destructive shadow-sm"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                            <span className="absolute bottom-1 left-1 rounded bg-emerald-600/90 px-1 py-0.5 text-[9px] font-bold text-white">
                              {phase === 'day_final' ? 'Hasil Akhir' : 'Progress'}
                            </span>
                          </>
                        ) : existingPhotos.back ? (
                          <>
                            <Image
                              src={existingPhotos.back}
                              alt="Foto Belakang Tersimpan"
                              fill
                              unoptimized
                              className="object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => setPhotoToDelete('back')}
                              title="Hapus foto tersimpan"
                              className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-destructive/90 text-white flex items-center justify-center hover:bg-destructive shadow-sm"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                            <span className="absolute bottom-1 left-1 rounded bg-blue-600/90 px-1 py-0.5 text-[9px] font-bold text-white">
                              Tersimpan
                            </span>
                          </>
                        ) : (
                          <div className="p-2 text-center text-muted-foreground/60">
                            <Camera className="mx-auto h-6 w-6 mb-1 text-muted-foreground/40" />
                            <span className="text-[9px] font-semibold text-foreground block">
                              {phase === 'day_final' ? 'Slot Akhir' : 'Slot Hari Ini'}
                            </span>
                            <span className="text-[8px] text-muted-foreground">
                              Siap difoto
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <input
                      ref={backCamRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => handlePhotoSelect(e, setBackPhoto)}
                      className="hidden"
                    />
                    <input
                      ref={backFileRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhotoSelect(e, setBackPhoto)}
                      className="hidden"
                    />
                    {backPhoto.preview || existingPhotos.back ? (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => backCamRef.current?.click()}
                          className="h-8 text-[11px] font-medium border-border/80 hover:bg-muted"
                        >
                          <Camera className="mr-1 h-3.5 w-3.5" /> Ganti Foto
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => setPhotoToDelete('back')}
                          className="h-8 text-[11px] font-bold bg-destructive/85 hover:bg-destructive text-white shadow-xs"
                        >
                          <Trash2 className="mr-1 h-3.5 w-3.5" /> Hapus Foto
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => backCamRef.current?.click()}
                          className="h-8 text-[11px] font-bold border-border/80 hover:bg-primary/10 hover:text-primary"
                        >
                          <Camera className="mr-1 h-3.5 w-3.5" /> Kamera
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => backFileRef.current?.click()}
                          className="h-8 text-[11px] font-semibold border-border/80 hover:bg-muted"
                        >
                          <ImageIcon className="mr-1 h-3.5 w-3.5" /> Galeri
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 6. Catatan & Feedback Evaluasi Coach */}
          <Card className="border-border/50 bg-card shadow-sm">
            <CardContent className="p-4 sm:p-5 space-y-3">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Catatan Evaluasi & Rekomendasi Coach
              </Label>
              <textarea
                rows={3}
                placeholder="Contoh: Penurunan lingkar pinggang terlihat nyata, komposisi otot bahu membaik. Saran: tingkatkan asupan hidrasi & pertahankan defisit kalori moderat."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-xl border border-border/60 bg-background p-3 text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </CardContent>
          </Card>

          {/* Action Button Bar */}
          <div className="sticky bottom-4 z-20 flex items-center justify-end gap-3 rounded-2xl border border-border/80 bg-background/95 p-3.5 shadow-xl backdrop-blur-md">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (isFormDirty) {
                  setExitConfirmOpen(true)
                } else {
                  router.push(
                    selectedMemberId
                      ? `/dashboard/pt/progress?memberId=${selectedMemberId}&tab=metrics`
                      : '/dashboard/pt/progress'
                  )
                }
              }}
              className="h-10 text-xs font-semibold"
            >
              Batal
            </Button>

            <Button
              type="submit"
              disabled={isUploading || !selectedMemberId}
              className="h-10 px-6 bg-emerald-500 text-black font-extrabold hover:bg-emerald-600 text-xs shadow-md shadow-emerald-500/20 active:scale-[0.98] transition-all"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {uploadStep || 'Menyimpan Metrik...'}
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Simpan Metrik & Foto Progress
                </>
              )}
            </Button>
          </div>
        </form>
      </main>

      {/* MODAL 1: Konfirmasi Reset Form */}
      <AlertDialog open={confirmResetOpen} onOpenChange={setConfirmResetOpen}>
        <AlertDialogContent className="border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold">
              Reset Isian Form?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Semua angka berat badan, ukuran lingkar tubuh, dan foto yang telah Anda
              pilih akan dikosongkan kembali.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetForm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-bold"
            >
              Ya, Kosongkan Form
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* MODAL 1.5: Konfirmasi Pergantian Fase saat Form Dirty (vuln-0003) */}
      <AlertDialog open={!!pendingPhase} onOpenChange={(open) => !open && setPendingPhase(null)}>
        <AlertDialogContent className="border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold">
              Ganti Fase Evaluasi?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Anda memiliki angka timbangan, ukuran fisik, atau foto yang belum disimpan. Beralih ke fase lain akan mengosongkan perubahan yang sedang Anda isi saat ini.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingPhase) executePhaseChange(pendingPhase)
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-bold"
            >
              Ya, Ganti Fase
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* MODAL 2: Konfirmasi Keluar Jika Ada Data Belum Disimpan */}
      <AlertDialog open={exitConfirmOpen} onOpenChange={setExitConfirmOpen}>
        <AlertDialogContent className="border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold">
              Tinggalkan Halaman?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Anda memiliki data evaluasi atau foto yang belum disimpan. Jika keluar
              sekarang, perubahan akan hilang.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Lanjut Mengisi</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setExitConfirmOpen(false)
                router.push(
                  selectedMemberId
                    ? `/dashboard/pt/progress?memberId=${selectedMemberId}&tab=metrics`
                    : '/dashboard/pt/progress'
                )
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-bold"
            >
              Keluar Tanpa Simpan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* MODAL 3: Post-Submission Celebration & WhatsApp Share (Opsi 5A) */}
      <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <div className="flex flex-col items-center text-center space-y-2 pt-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 ring-8 ring-emerald-500/10">
                <Award className="h-6 w-6" />
              </div>
              <DialogTitle className="text-lg font-black text-foreground">
                Evaluasi Fisik Berhasil Disimpan! 🎉
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Data metrik & foto progress untuk{' '}
                <span className="font-bold text-foreground">
                  {summaryData?.memberName}
                </span>{' '}
                telah tercatat rapi di sistem.
              </p>
            </div>
          </DialogHeader>

          {summaryData && (
            <div className="space-y-4 pt-2">
              {/* Ringkasan Perubahan */}
              <div className="rounded-xl border border-border/50 bg-muted/20 p-3.5 space-y-2.5 text-xs">
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <span className="text-muted-foreground">Fase Milestone</span>
                  <Badge
                    variant="outline"
                    className="border-primary/40 bg-primary/10 text-primary text-[10px] font-bold capitalize"
                  >
                    {summaryData.phase === 'day_1'
                      ? '🏁 Day 1 (Awal)'
                      : summaryData.phase === 'day_final'
                        ? '🏆 Day Terakhir'
                        : '⚡ Progress Berkala'}
                  </Badge>
                </div>

                {summaryData.weightKg && (
                  <div className="flex items-center justify-between border-b border-border/40 pb-2">
                    <span className="text-muted-foreground">Berat Badan Baru</span>
                    <div className="flex items-center gap-1.5 font-bold text-foreground">
                      <span>{summaryData.weightKg} kg</span>
                      {summaryData.prevWeightKg && (
                        <span
                          className={`text-[11px] font-semibold ${summaryData.weightKg < summaryData.prevWeightKg
                            ? 'text-emerald-400'
                            : 'text-amber-400'
                            }`}
                        >
                          (
                          {summaryData.weightKg < summaryData.prevWeightKg
                            ? `${(summaryData.weightKg - summaryData.prevWeightKg).toFixed(1)} kg`
                            : `+${(summaryData.weightKg - summaryData.prevWeightKg).toFixed(1)} kg`}
                          )
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Lingkar tubuh highlights */}
                {Object.keys(summaryData.measurements).length > 0 && (
                  <div className="space-y-1 pt-1">
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      Pengukuran Lingkar Tubuh:
                    </span>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                      {Object.entries(summaryData.measurements).map(([k, v]) => (
                        <div key={k} className="flex justify-between text-muted-foreground">
                          <span className="capitalize">{k}:</span>
                          <span className="font-semibold text-foreground">
                            {v} {k === 'body_fat' ? '%' : 'cm'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {summaryData.notes && (
                  <div className="pt-1 text-[11px] text-muted-foreground border-t border-border/30">
                    <span className="font-semibold text-foreground">Catatan Coach: </span>
                    <span className="italic">&ldquo;{summaryData.notes}&rdquo;</span>
                  </div>
                )}
              </div>

              {/* Tombol Khusus Laporan Kelulusan PDF jika fase Day Terakhir */}
              {summaryData.phase === 'day_final' && (
                <Button
                  type="button"
                  onClick={() => {
                    setSuccessDialogOpen(false)
                    router.push(
                      `/dashboard/pt/progress?memberId=${selectedMemberId}&tab=metrics&exportPdf=true`
                    )
                  }}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-black font-extrabold hover:from-amber-400 hover:to-amber-500 text-xs h-10 shadow-md shadow-amber-500/20"
                >
                  <Award className="mr-1.5 h-4 w-4" /> Buka Laporan Kelulusan PDF (2 Halaman)
                </Button>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <Button
                  type="button"
                  onClick={() => {
                    if (!summaryData.memberPhone) {
                      toast.info('Nomor WhatsApp member tidak ditemukan di profil')
                      return
                    }

                    const phone = summaryData.memberPhone
                      .replace(/[^0-9]/g, '')
                      .replace(/^0/, '62')

                    const measurementsList = Object.entries(summaryData.measurements)
                      .map(([k, v]) => `• *${k.charAt(0).toUpperCase() + k.slice(1)}*: ${v}${k === 'body_fat' ? '%' : ' cm'}`)
                      .join('\n')

                    const weightChangeStr =
                      summaryData.weightKg && summaryData.prevWeightKg
                        ? ` (${(summaryData.weightKg - summaryData.prevWeightKg).toFixed(1)} kg dibanding sesi lalu)`
                        : ''

                    const phaseLabel =
                      summaryData.phase === 'day_1'
                        ? 'Day 1 (Awal Program)'
                        : summaryData.phase === 'day_final'
                          ? 'Evaluasi Akhir Kelulusan'
                          : 'Progress Berkala'

                    const message = encodeURIComponent(
                      `Halo Kak *${summaryData.memberName}*! \n\n` +
                      `Berikut laporan evaluasi fisik terbaru kamu di *Line Up Gym*:\n` +
                      `Tanggal: *${new Date(summaryData.recordedAt).toLocaleDateString('id-ID', { dateStyle: 'full' })}*\n` +
                      `Fase: *${phaseLabel}*\n\n` +
                      (summaryData.weightKg
                        ? `*Berat Badan:* *${summaryData.weightKg} kg*${weightChangeStr}\n\n`
                        : '') +
                      (measurementsList
                        ? `*Ukuran Tubuh:*\n${measurementsList}\n\n`
                        : '') +
                      (summaryData.notes
                        ? `_Catatan Coach:_ "${summaryData.notes}"\n\n`
                        : '') +
                      `Terus konsisten latihannya Kak! Hasil tidak akan mengkhianati usaha \n\n` +
                      `*LINEUP GYM PRAMBANAN*\nBe Strong Be Healthy!`
                    )

                    window.open(`https://wa.me/${phone}?text=${message}`, '_blank')
                    setSuccessDialogOpen(false)
                    router.push(
                      `/dashboard/pt/progress?memberId=${selectedMemberId}&tab=metrics`
                    )
                  }}
                  className="flex-1 bg-[#25D366] font-bold text-foreground hover:bg-[#1DA851] text-xs h-10"
                >
                  <MessageCircle className="mr-1.5 h-4 w-4" /> Kirim ke WhatsApp
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSuccessDialogOpen(false)
                    router.push(
                      `/dashboard/pt/progress?memberId=${selectedMemberId}&tab=metrics`
                    )
                  }}
                  className="text-xs h-10 font-semibold"
                >
                  Kembali ke Dashboard
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Konfirmasi Hapus Foto Slot */}
      <AlertDialog
        open={!!photoToDelete}
        onOpenChange={(open) => !open && setPhotoToDelete(null)}
      >
        <AlertDialogContent className="border-border bg-card text-foreground">
          <AlertDialogHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 mb-2 mx-auto">
              <Trash2 className="h-6 w-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-center font-heading text-lg">
              Hapus Foto{' '}
              {photoToDelete === 'front'
                ? 'Tampak Depan'
                : photoToDelete === 'side'
                  ? 'Tampak Samping'
                  : 'Tampak Belakang'}
              ?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-xs text-muted-foreground">
              {photoToDelete && existingPhotos[photoToDelete]
                ? 'Foto ini tersimpan di sistem. Menghapus foto ini akan menghapusnya secara permanen dari database dan penyimpanan server.'
                : 'Foto yang baru Anda pilih / ambil akan dibatalkan dari slot ini dan tidak akan diunggah ke profil member.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2 sm:justify-center">
            <AlertDialogCancel className="border-border text-muted-foreground hover:bg-muted">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeletePhoto}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold"
            >
              Ya, Hapus Foto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default function MetricsFormPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[70vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
        </div>
      }
    >
      <MetricsFormContent />
    </Suspense>
  )
}
