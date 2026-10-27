'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Printer,
  FileText,
  Sparkles,
  Camera,
  Award,
  CheckCircle2,
  Image as ImageIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { PtCycleSelector } from '@/components/dashboard/pt/PtCycleSelector'
import type { PtProgressLogWithMember } from '@/hooks/usePtProgress'
import type { MemberBodyMetric } from '@/lib/types'
import type { PtSubscriptionCycle } from '@/hooks/usePtSessions'

interface ExportProgressPdfModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  member: {
    id?: string
    member_id?: string
    full_name: string
    phone?: string
    pt_membership_name?: string
    pt_remaining_sessions?: number
    pt_start_date?: string
    pt_end_date?: string
    pt_total_sessions?: number
  } | null
  workoutLogs: PtProgressLogWithMember[]
  bodyMetrics: MemberBodyMetric[]
  currentCycle?: PtSubscriptionCycle | null
  cycles?: PtSubscriptionCycle[]
  onSelectCycle?: (cycleId: string) => void
}

function escapeHtml(str?: string | number | null): string {
  if (str === null || str === undefined) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function sanitizeImageUrl(url?: string | null): string {
  if (!url) return ''
  const trimmed = String(url).trim()
  if (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('data:image/')
  ) {
    return escapeHtml(trimmed)
  }
  return ''
}

export function ExportProgressPdfModal({
  open,
  onOpenChange,
  member,
  workoutLogs,
  bodyMetrics,
  currentCycle,
  cycles,
  onSelectCycle,
}: ExportProgressPdfModalProps) {
  const [isPrinting, setIsPrinting] = useState(false)
  const [includePhotos, setIncludePhotos] = useState(true)
  const [activePreviewPage, setActivePreviewPage] = useState<'p1' | 'p2'>('p1')

  // 1. Filter sesi latihan berdasarkan siklus yang dipilih (Opsi A + B)
  const activeCycleWorkouts = useMemo(() => {
    if (!workoutLogs || workoutLogs.length === 0) return []

    if (currentCycle) {
      const cycleStart = new Date(currentCycle.created_at).getTime()
      const cycleEnd = currentCycle.next_cycle_created_at
        ? new Date(currentCycle.next_cycle_created_at).getTime()
        : Infinity

      return workoutLogs.filter((w) => {
        // Jika log memiliki subscription_id yang cocok, prioritaskan
        if (w.subscription_id) {
          return w.subscription_id === currentCycle.id
        }
        // Fallback rentang waktu created_at
        const t = new Date(w.created_at).getTime()
        return t >= cycleStart && t < cycleEnd
      })
    }

    // Fallback legacy jika belum ada data cycle: gunakan pt_start_date
    if (member?.pt_start_date) {
      const startIso = member.pt_start_date.slice(0, 10)
      return workoutLogs.filter((w) => {
        const logDate = w.created_at?.slice(0, 10)
        return logDate && logDate >= startIso
      })
    }

    return workoutLogs
  }, [workoutLogs, currentCycle, member?.pt_start_date])

  // 2. Filter metrik fisik berdasarkan siklus yang dipilih (Opsi A + B)
  const activeCycleMetrics = useMemo(() => {
    if (!bodyMetrics || bodyMetrics.length === 0) return []

    if (currentCycle) {
      const cycleStart = new Date(currentCycle.created_at).getTime()
      const cycleEnd = currentCycle.next_cycle_created_at
        ? new Date(currentCycle.next_cycle_created_at).getTime()
        : Infinity

      return bodyMetrics.filter((m) => {
        const t = new Date(m.created_at || m.recorded_at).getTime()
        return t >= cycleStart && t < cycleEnd
      })
    }

    if (member?.pt_start_date) {
      const startIso = member.pt_start_date.slice(0, 10)
      return bodyMetrics.filter((m) => {
        const metricDate = (m.recorded_at || m.created_at)?.slice(0, 10)
        return metricDate && metricDate >= startIso
      })
    }

    return bodyMetrics
  }, [bodyMetrics, currentCycle, member?.pt_start_date])

  // Temukan Baseline Day 1 dan Day Terakhir
  const day1Record = useMemo(() => {
    return (activeCycleMetrics || []).find((m) => m.phase === 'day_1') || activeCycleMetrics?.[0] || null
  }, [activeCycleMetrics])

  const dayFinalRecord = useMemo(() => {
    return (activeCycleMetrics || []).find((m) => m.phase === 'day_final') || null
  }, [activeCycleMetrics])

  const progressRecords = useMemo(() => {
    return (activeCycleMetrics || []).filter((m) => m.phase === 'progress')
  }, [activeCycleMetrics])

  // Member berhak atas mode Kelulusan jika:
  // 1. Memiliki catatan fisik Day Final, ATAU
  // 2. Kuota sesi PT-nya sudah habis (sisa 0 sesi)
  const isRemainingZero = member?.pt_remaining_sessions !== undefined && Number(member.pt_remaining_sessions) <= 0
  const canSelectGraduation = Boolean(dayFinalRecord) || isRemainingZero

  // Mode Laporan: 'graduation' (Day 1 vs Akhir) atau 'milestone' (Day 1 vs Progress Berkala)
  const [userSelectedMode, setUserSelectedMode] = useState<'graduation' | 'milestone'>('milestone')
  const [selectedMetricId, setSelectedMetricId] = useState<string>('')

  // Mode Efektif (Derived): Kelulusan bisa aktif jika user memilih graduation dan canSelectGraduation
  const reportMode: 'graduation' | 'milestone' = useMemo(() => {
    if (userSelectedMode === 'graduation' && canSelectGraduation) {
      return 'graduation'
    }
    return 'milestone'
  }, [userSelectedMode, canSelectGraduation])

  // Sinkronkan default mode dan bersihkan selectedMetricId saat modal dibuka (open) atau saat member berganti
  useEffect(() => {
    if (open) {
      setSelectedMetricId('')
      if (canSelectGraduation) {
        setUserSelectedMode('graduation')
      } else {
        setUserSelectedMode('milestone')
      }
    }
  }, [open, member?.member_id, member?.id, member?.full_name, canSelectGraduation])

  // Record target pembanding berdasarkan mode yang dipilih:
  // Mode graduation STRICTLY hanya mengambil dayFinalRecord (tanpa fallback ke progress berkala)
  const targetRecord = useMemo(() => {
    if (selectedMetricId) {
      const found = (activeCycleMetrics || []).find((m) => m.id === selectedMetricId)
      if (found) return found
    }
    if (reportMode === 'graduation') {
      return dayFinalRecord || null
    } else {
      return progressRecords.length > 0
        ? progressRecords[progressRecords.length - 1]
        : null
    }
  }, [selectedMetricId, reportMode, dayFinalRecord, progressRecords])

  const hasAnyPhotos = useMemo(() => {
    return (activeCycleMetrics || []).some(
      (m) => m.photo_front_url || m.photo_side_url || m.photo_back_url
    )
  }, [activeCycleMetrics])

  const initialMetric = day1Record || activeCycleMetrics?.[0] || null
  const lastMetric = reportMode === 'graduation' ? dayFinalRecord : (targetRecord || null)
  const weightDiff =
    initialMetric?.weight_kg && lastMetric?.weight_kg
      ? Number((lastMetric.weight_kg - initialMetric.weight_kg).toFixed(1))
      : null

  const cleanMemberName = useMemo(() => {
    return (member?.full_name || 'MEMBER')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
  }, [member?.full_name])

  const pdfFileName = `LINEUPGYM_PT_${cleanMemberName || 'MEMBER'}`

  const latestTrainerName = useMemo(() => {
    const logWithTrainer = (activeCycleWorkouts || []).find((w) => w.trainer_name && w.trainer_name.trim())
    return logWithTrainer?.trainer_name?.trim() || null
  }, [activeCycleWorkouts])

  const recentWorkouts = (activeCycleWorkouts || []).slice(0, 10)
  const todayStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  // Format Helper untuk Tanggal
  const formatShortDate = (dStr?: string | null) => {
    if (!dStr) return '-'
    return new Date(dStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const generateHtmlContent = () => {
    const logoUrl = typeof window !== 'undefined' ? `${window.location.origin}/logo.jpg` : '/logo.jpg'
    const day1Front = sanitizeImageUrl(day1Record?.photo_front_url)
    const targetFront = sanitizeImageUrl(targetRecord?.photo_front_url)
    const day1Side = sanitizeImageUrl(day1Record?.photo_side_url)
    const targetSide = sanitizeImageUrl(targetRecord?.photo_side_url)
    const day1Back = sanitizeImageUrl(day1Record?.photo_back_url)
    const targetBack = sanitizeImageUrl(targetRecord?.photo_back_url)

    const hasFront = Boolean(day1Front || targetFront)
    const hasSide = Boolean(day1Side || targetSide)
    const hasBack = Boolean(day1Back || targetBack)
    const activeCount = (hasFront ? 1 : 0) + (hasSide ? 1 : 0) + (hasBack ? 1 : 0)
    const gridClass = activeCount === 1 ? 'photo-grid-1' : activeCount === 2 ? 'photo-grid-2' : 'photo-grid-3'
    const targetTagLabel = reportMode === 'graduation' ? 'Hasil Akhir' : 'Progress'
    const targetTagClass = reportMode === 'graduation' ? 'photo-tag-final' : 'photo-tag-progress'

    const photoCardsHtml = activeCount === 0
      ? '<div style="text-align: center; padding: 40px; color: #64748b; font-size: 11px; border: 1px dashed #cbd5e1; border-radius: 8px;">Belum ada dokumentasi foto yang diunggah untuk sesi ini.</div>'
      : [
          hasFront
            ? `
            <div class="photo-card">
              <div class="photo-card-title">1. Tampak Depan</div>
              <div class="photo-pair">
                <div class="photo-item">
                  <span class="photo-tag-day1">Day 1</span>
                  ${day1Front ? `<img src="${day1Front}" class="photo-img" />` : '<div class="photo-placeholder">Tidak ada foto Day 1</div>'}
                  <span class="photo-date">${formatShortDate(day1Record?.recorded_at)}</span>
                </div>
                <div class="photo-item">
                  <span class="${targetTagClass}">${targetTagLabel}</span>
                  ${targetFront ? `<img src="${targetFront}" class="photo-img" />` : `<div class="photo-placeholder">Belum ada foto ${targetTagLabel}</div>`}
                  <span class="photo-date">${formatShortDate(targetRecord?.recorded_at)}</span>
                </div>
              </div>
            </div>
          `
            : '',
          hasSide
            ? `
            <div class="photo-card">
              <div class="photo-card-title">2. Tampak Samping</div>
              <div class="photo-pair">
                <div class="photo-item">
                  <span class="photo-tag-day1">Day 1</span>
                  ${day1Side ? `<img src="${day1Side}" class="photo-img" />` : '<div class="photo-placeholder">Tidak ada foto Day 1</div>'}
                  <span class="photo-date">${formatShortDate(day1Record?.recorded_at)}</span>
                </div>
                <div class="photo-item">
                  <span class="${targetTagClass}">${targetTagLabel}</span>
                  ${targetSide ? `<img src="${targetSide}" class="photo-img" />` : `<div class="photo-placeholder">Belum ada foto ${targetTagLabel}</div>`}
                  <span class="photo-date">${formatShortDate(targetRecord?.recorded_at)}</span>
                </div>
              </div>
            </div>
          `
            : '',
          hasBack
            ? `
            <div class="photo-card">
              <div class="photo-card-title">3. Tampak Belakang</div>
              <div class="photo-pair">
                <div class="photo-item">
                  <span class="photo-tag-day1">Day 1</span>
                  ${day1Back ? `<img src="${day1Back}" class="photo-img" />` : '<div class="photo-placeholder">Tidak ada foto Day 1</div>'}
                  <span class="photo-date">${formatShortDate(day1Record?.recorded_at)}</span>
                </div>
                <div class="photo-item">
                  <span class="${targetTagClass}">${targetTagLabel}</span>
                  ${targetBack ? `<img src="${targetBack}" class="photo-img" />` : `<div class="photo-placeholder">Belum ada foto ${targetTagLabel}</div>`}
                  <span class="photo-date">${formatShortDate(targetRecord?.recorded_at)}</span>
                </div>
              </div>
            </div>
          `
            : '',
        ]
          .filter(Boolean)
          .join('')

    // Measurements Table Data
    const measureKeys = [
      { key: 'perut', label: 'Lingkar Perut' },
      { key: 'lengan', label: 'Lingkar Lengan' },
      { key: 'dada', label: 'Lingkar Dada' },
      { key: 'paha', label: 'Lingkar Paha' },
      { key: 'pinggul', label: 'Lingkar Pinggul' },
      { key: 'body_fat', label: 'Estimasi Body Fat', unit: '%' },
    ]

    const measureRowsHtml = measureKeys
      .map(({ key, label, unit = 'cm' }) => {
        const initVal = initialMetric?.measurements?.[key]
        const lastVal = lastMetric?.measurements?.[key]
        if (typeof initVal !== 'number' && typeof lastVal !== 'number') return ''
        const diff =
          typeof initVal === 'number' && typeof lastVal === 'number'
            ? Number((lastVal - initVal).toFixed(1))
            : null

        return `
          <tr>
            <td style="font-weight: 600;">${label}</td>
            <td style="text-align: center;">${initVal !== undefined ? `${initVal} ${unit}` : '-'}</td>
            <td style="text-align: center;">${lastVal !== undefined ? `${lastVal} ${unit}` : '-'}</td>
            <td style="text-align: center; font-weight: bold; color: ${diff !== null && diff < 0 ? '#059669' : diff !== null && diff > 0 ? '#d97706' : '#555'
          };">
              ${diff !== null ? (diff > 0 ? `+${diff}` : `${diff}`) + ` ${unit}` : '-'}
            </td>
          </tr>
        `
      })
      .filter(Boolean)
      .join('')

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${escapeHtml(pdfFileName)}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 0;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            }
            body {
              color: #111;
              background: #fff;
              font-size: 10px;
              line-height: 1.35;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            
            /* HALAMAN 1 & 2 PAGE CONTAINERS */
            .page-container {
              position: relative;
              box-sizing: border-box;
              width: 100%;
              min-height: 297mm;
              padding: 10mm 14mm 12mm 14mm;
              background: #fff;
            }
            .page-break {
              page-break-before: always;
              break-before: page;
            }

            /* KOP SURAT RESMI OPSI 1 (SERAGAM) */
            .header {
              display: flex;
              align-items: center;
              gap: 13px;
              border-bottom: 2px solid #111;
              padding-bottom: 8px;
              margin-bottom: 11px;
            }
            .header-logo-col {
              flex-shrink: 0;
            }
            .gym-logo {
              width: 50px;
              height: 50px;
              border-radius: 50%;
              object-fit: cover;
              border: 1.5px solid #111;
              display: block;
            }
            .header-text-col {
              flex: 1;
              min-width: 0;
            }
            .gym-name {
              font-size: 16.5px;
              font-weight: 900;
              letter-spacing: 1px;
              color: #000;
              text-transform: uppercase;
              line-height: 1.1;
            }
            .gym-tagline {
              font-size: 8px;
              color: #475569;
              text-transform: uppercase;
              letter-spacing: 0.6px;
              margin-top: 2px;
              font-weight: 600;
            }
            .doc-title {
              font-size: 10.5px;
              font-weight: 800;
              margin-top: 4px;
              letter-spacing: 0.4px;
              color: #0f172a;
              text-transform: uppercase;
            }

            .grid-2 {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
              margin-bottom: 12px;
            }
            .card {
              border: 1px solid #ddd;
              border-radius: 6px;
              padding: 9px;
              background: #fafafa;
            }
            .card-title {
              font-size: 9.5px;
              font-weight: bold;
              text-transform: uppercase;
              color: #555;
              margin-bottom: 5px;
              border-bottom: 1px solid #eee;
              padding-bottom: 3px;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 2.5px;
              font-size: 10.5px;
            }
            .info-label {
              color: #666;
            }
            .info-value {
              font-weight: 600;
              color: #000;
            }

            .section-title {
              font-size: 10.5px;
              font-weight: bold;
              text-transform: uppercase;
              margin-bottom: 5px;
              color: #222;
              display: flex;
              align-items: center;
              justify-content: space-between;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 12px;
            }
            th {
              background: #f2f2f2;
              border: 1px solid #ccc;
              padding: 5px 7px;
              text-align: left;
              font-size: 9.5px;
              font-weight: bold;
              text-transform: uppercase;
            }
            td {
              border: 1px solid #ddd;
              padding: 5px 7px;
              font-size: 9.5px;
              vertical-align: top;
            }
            tr:nth-child(even) td {
              background: #fcfcfc;
            }

            .badge {
              display: inline-block;
              padding: 1.5px 5px;
              border-radius: 3px;
              font-weight: bold;
              font-size: 8.5px;
              text-transform: uppercase;
            }
            .badge-push { background: #fef3c7; color: #92400e; }
            .badge-pull { background: #dbeafe; color: #1e40af; }
            .badge-leg { background: #d1fae5; color: #065f46; }
            .badge-other { background: #f3f4f6; color: #374151; }

            .ex-grid {
              display: flex;
              flex-direction: column;
              gap: 2.5px;
            }
            .ex-pill {
              display: inline-flex;
              flex-wrap: wrap;
              align-items: baseline;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 3px;
              padding: 1.5px 5px;
              font-size: 8px;
              line-height: 1.3;
            }
            .ex-pill strong {
              color: #0f172a;
              margin-right: 4px;
              font-weight: 700;
            }
            .ex-pill-detail {
              color: #334155;
              font-size: 7.5px;
            }

            .digital-footer {
              border-top: 1px solid #cbd5e1;
              padding-top: 6px;
              margin-top: 16px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 8px;
              color: #64748b;
            }
            .digital-footer strong {
              color: #0f172a;
            }

            /* HALAMAN 2: GALERI TRANSFORMASI BEFORE VS AFTER */
            .transformation-banner {
              background: #f8fafc;
              border: 1px solid #cbd5e1;
              border-radius: 6px;
              padding: 7px 12px;
              margin-bottom: 12px;
              display: flex;
              justify-content: space-between;
              font-size: 10px;
            }
            .photo-grid-1 {
              display: flex;
              justify-content: center;
              max-width: 360px;
              margin: 0 auto 14px auto;
            }
            .photo-grid-2 {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 12px;
              margin-bottom: 14px;
            }
            .photo-grid-3 {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 10px;
              margin-bottom: 14px;
            }
            .photo-card {
              border: 1px solid #d1d5db;
              border-radius: 8px;
              padding: 7px;
              background: #ffffff;
              text-align: center;
            }
            .photo-card-title {
              font-size: 10px;
              font-weight: 800;
              text-transform: uppercase;
              color: #111;
              margin-bottom: 6px;
              border-bottom: 1px solid #f1f5f9;
              padding-bottom: 3px;
            }
            .photo-pair {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 5px;
            }
            .photo-item {
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .photo-tag-day1 {
              font-size: 7.5px;
              font-weight: 800;
              color: #1d4ed8;
              background: #eff6ff;
              border: 1px solid #bfdbfe;
              padding: 1px 4px;
              border-radius: 3px;
              margin-bottom: 3px;
              text-transform: uppercase;
            }
            .photo-tag-final {
              font-size: 7.5px;
              font-weight: 800;
              color: #047857;
              background: #ecfdf5;
              border: 1px solid #a7f3d0;
              padding: 1px 4px;
              border-radius: 3px;
              margin-bottom: 3px;
              text-transform: uppercase;
            }
            .photo-tag-progress {
              font-size: 7.5px;
              font-weight: 800;
              color: #b45309;
              background: #fffbeb;
              border: 1px solid #fde68a;
              padding: 1px 4px;
              border-radius: 3px;
              margin-bottom: 3px;
              text-transform: uppercase;
            }
            .photo-img {
              width: 100%;
              height: 145px;
              object-fit: cover;
              border-radius: 4px;
              border: 1px solid #e2e8f0;
              background: #f1f5f9;
            }
            .photo-placeholder {
              width: 100%;
              height: 145px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              border-radius: 4px;
              border: 1px dashed #cbd5e1;
              background: #f8fafc;
              color: #94a3b8;
              font-size: 8px;
              padding: 4px;
            }
            .photo-date {
              font-size: 8px;
              color: #64748b;
              margin-top: 2px;
            }

            .renewal-box {
              border: 2px dashed #000;
              border-radius: 8px;
              padding: 10px 14px;
              background: #fffbeb;
              margin-top: 10px;
            }
            .renewal-title {
              font-size: 10.5px;
              font-weight: 800;
              color: #92400e;
              text-transform: uppercase;
              margin-bottom: 3px;
            }
            .renewal-desc {
              font-size: 9.5px;
              color: #451a03;
              line-height: 1.45;
            }

            .cert-stamp {
              display: inline-block;
              border: 2px solid #059669;
              color: #059669;
              font-weight: 900;
              font-size: 9px;
              text-transform: uppercase;
              padding: 3px 8px;
              border-radius: 4px;
              letter-spacing: 0.5px;
            }

            @media print {
              html, body {
                width: 210mm;
                height: 100%;
                margin: 0;
                padding: 0;
                background: #fff;
              }
              .page-container {
                padding: 10mm 14mm;
                min-height: 297mm;
                box-sizing: border-box;
              }
            }
          </style>
        </head>
        <body>
          <!-- ================= HALAMAN 1 ================= -->
          <div class="page-container">
            <div class="header">
              <div class="header-logo-col">
                <img src="${logoUrl}" class="gym-logo" alt="LineUp Gym" />
              </div>
              <div class="header-text-col">
                <div class="gym-name">LineUp Gym Prambanan</div>
                <div class="gym-tagline">Be Strong Be Healthy! · Prambanan, Klaten · Telp: 0857-0767-8485</div>
                <div class="doc-title">Laporan Perkembangan &amp; Evaluasi Personal Trainer</div>
              </div>
            </div>

            <div class="grid-2">
              <div class="card">
                <div class="card-title">Data Member & Membership</div>
                <div class="info-row"><span class="info-label">Nama Member:</span><span class="info-value">${escapeHtml(member?.full_name) || '-'}</span></div>
                <div class="info-row"><span class="info-label">Coach / PT:</span><span class="info-value" style="color: #000; font-weight: bold;">${escapeHtml(latestTrainerName) || 'LineUp Gym Team'}</span></div>
                <div class="info-row"><span class="info-label">Paket PT:</span><span class="info-value">${escapeHtml(member?.pt_membership_name) || '-'}</span></div>
                <div class="info-row"><span class="info-label">No. Telepon:</span><span class="info-value">${escapeHtml(member?.phone) || '-'}</span></div>
                <div class="info-row"><span class="info-label">Status Kuota:</span><span class="info-value">${member?.pt_remaining_sessions === 0
        ? 'Program Selesai (0 Sesi)'
        : `${member?.pt_remaining_sessions} Sesi Tersisa`
      }</span></div>
              </div>

              <div class="card">
                <div class="card-title">Ringkasan Berat Badan</div>
                <div class="info-row"><span class="info-label">BB Awal (Day 1):</span><span class="info-value">${initialMetric?.weight_kg ? `${initialMetric.weight_kg} kg` : '-'}</span></div>
                <div class="info-row"><span class="info-label">BB Akhir:</span><span class="info-value">${lastMetric?.weight_kg ? `${lastMetric.weight_kg} kg` : '-'}</span></div>
                <div class="info-row"><span class="info-label">Total Perubahan:</span><span class="info-value" style="color: ${weightDiff !== null && weightDiff < 0 ? '#059669' : '#111'
      };">${weightDiff !== null ? (weightDiff > 0 ? `+${weightDiff} kg` : `${weightDiff} kg`) : '-'}</span></div>
                <div class="info-row"><span class="info-label">Tanggal Cetak:</span><span class="info-value">${todayStr}</span></div>
              </div>
            </div>

            ${measureRowsHtml
        ? `
              <div class="section-title">
                <span>Perubahan Ukuran Lingkar Tubuh</span>
                <span style="font-size: 8.5px; color: #666; font-weight: normal;">Perbandingan Awal vs Akhir</span>
              </div>
              <table style="margin-bottom: 12px;">
                <thead>
                  <tr>
                    <th>Titik Pengukuran</th>
                    <th style="width: 80px; text-align: center;">Awal (Day 1)</th>
                    <th style="width: 80px; text-align: center;">Hasil Akhir</th>
                    <th style="width: 80px; text-align: center;">Selisih</th>
                  </tr>
                </thead>
                <tbody>
                  ${measureRowsHtml}
                </tbody>
              </table>
            `
        : ''
      }

            <div class="section-title">
              <span>Riwayat Sesi Latihan (${recentWorkouts.length} Sesi Terakhir)</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th style="width: 25px; text-align: center;">No</th>
                  <th style="width: 70px;">Tanggal</th>
                  <th style="width: 55px;">Fokus</th>
                  <th style="width: 80px;">Coach</th>
                  <th>Daftar Gerakan & Beban</th>
                  <th style="width: 120px;">Catatan Coach</th>
                </tr>
              </thead>
              <tbody>
                ${recentWorkouts.length === 0
        ? '<tr><td colspan="6" style="text-align: center; padding: 12px; color: #777;">Belum ada riwayat sesi latihan tercatat</td></tr>'
        : recentWorkouts
          .map((w, i) => {
            const d = new Date(w.created_at).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
            })
            const exListHtml = (w.exercises || [])
              .map((e) => {
                const isProg =
                  e.sets_detail &&
                  e.sets_detail.length > 0 &&
                  e.sets_detail.some(
                    (s) =>
                      s.weight_kg !== e.sets_detail![0].weight_kg ||
                      s.reps !== e.sets_detail![0].reps
                  )

                let notation = ''
                if (isProg && e.sets_detail) {
                  notation = e.sets_detail
                    .map((s) => {
                      const wt = s.weight_kg > 0 ? `${s.weight_kg} kg` : 'Bodyweight'
                      return `${wt} (${s.reps} reps)`
                    })
                    .join(' → ')
                } else {
                  const totalSets = e.sets_detail?.length || e.sets || 1
                  const reps = e.sets_detail?.[0]?.reps ?? e.reps
                  const weight = e.sets_detail?.[0]?.weight_kg ?? e.weight_kg
                  const wtLabel = weight > 0 ? `${weight} kg` : 'Bodyweight'
                  notation = `${totalSets} Set × ${reps} reps (${wtLabel})`
                }

                return `<span class="ex-pill"><strong>${escapeHtml(e.name)}:</strong> <span class="ex-pill-detail">${escapeHtml(notation)}</span></span>`
              })
              .join('')

            const isAttendance = (w as any).is_attendance_only || (w.exercises || []).length === 0
            const badgeClass =
              w.category === 'Push'
                ? 'badge-push'
                : w.category === 'Pull'
                  ? 'badge-pull'
                  : w.category === 'Leg'
                    ? 'badge-leg'
                    : 'badge-other'
            const categoryLabel = isAttendance ? 'Sesi Selesai' : w.category
            return `
                          <tr>
                            <td style="text-align: center;">${i + 1}</td>
                            <td>${d}</td>
                            <td><span class="badge ${badgeClass}">${escapeHtml(categoryLabel)}</span></td>
                            <td style="font-weight: 600; color: #111;">${escapeHtml(w.trainer_name) || '-'}</td>
                            <td><div class="ex-grid">${exListHtml || '<span style="color:#059669; font-size:9px; font-weight:600;">✓ Sesi Selesai (Absensi Kehadiran)</span>'}</div></td>
                            <td>${w.notes ? '<em>"' + escapeHtml(w.notes) + '"</em>' : '-'}</td>
                          </tr>
                        `
          })
          .join('')
      }
              </tbody>
            </table>

            <div class="digital-footer">
              <span>LINEUP GYM PRAMBANAN · Official PT Progress &amp; Evaluation Report</span>
              <span>Coach: <strong>${escapeHtml(latestTrainerName) || 'LineUp Gym Team'}</strong> · Dicetak: ${todayStr}</span>
            </div>
          </div>

          <!-- ================= HALAMAN 2: FOTO TRANSFORMASI / EVALUASI BERKALA (OPSI A + FLEKSIBEL) ================= -->
          ${includePhotos
        ? `
            <div class="page-container page-break">
              <div class="header">
                <div class="header-logo-col">
                  <img src="${logoUrl}" class="gym-logo" alt="LineUp Gym" />
                </div>
                <div class="header-text-col">
                  <div class="gym-name">LineUp Gym Prambanan</div>
                  <div class="gym-tagline">Be Strong Be Healthy! · Prambanan, Klaten · Telp: 0857-0767-8485</div>
                  <div class="doc-title">${
                    reportMode === 'graduation'
                      ? 'DOKUMENTASI RESMI TRANSFORMASI FISIK (BEFORE vs AFTER)'
                      : 'DOKUMENTASI EVALUASI &amp; PROGRESS FISIK'
                  }</div>
                </div>
              </div>

              <div class="transformation-banner">
                <div>Member: <strong>${escapeHtml(member?.full_name) || '-'}</strong> (${escapeHtml(member?.pt_membership_name) || 'Personal Trainer'})</div>
                <div>Status Program: ${
                  reportMode === 'graduation'
                    ? '<span class="cert-stamp">✓ Lulus / Selesai</span>'
                    : `<span class="cert-stamp" style="border-color: #2563eb; color: #2563eb;">⚡ Evaluasi Berkala (${member?.pt_remaining_sessions ?? 0} Sesi Tersisa)</span>`
                }</div>
              </div>

              <div class="${gridClass}">
                ${photoCardsHtml}
              </div>

              <!-- Rekomendasi Coach / Closing Renewal / Milestone Motivation -->
              ${
                reportMode === 'graduation'
                  ? `
                    <div class="renewal-box">
                      <div class="renewal-title">🏆 Evaluasi Kelulusan &amp; Rekomendasi Coach:</div>
                      <div class="renewal-desc">
                        Selamat atas konsistensi dan kerja keras Kak <strong>${escapeHtml(member?.full_name) || 'Member'}</strong> selama menyelesaikan program Personal Trainer di Line Up Gym! 
                        Dokumentasi transformasi di atas membuktikan hasil nyata dari disiplin latihan dan pengaturan nutrisi. 
                        Untuk mempertahankan hasil (*muscle retention*) dan melangkah ke fase berikutnya, coach menyarankan melanjutkan ke <strong>Program PT Lanjutan / Maintenance Fase 2</strong>.
                      </div>
                    </div>
                  `
                  : `
                    <div class="renewal-box" style="border-color: #2563eb; background: #eff6ff;">
                      <div class="renewal-title" style="color: #1d4ed8;">⚡ Evaluasi Perkembangan &amp; Feedback Coach:</div>
                      <div class="renewal-desc" style="color: #1e3a8a;">
                        Perkembangan latihan Kak <strong>${escapeHtml(member?.full_name) || 'Member'}</strong> berjalan on-track! Terlihat perubahan postur dan adaptasi beban yang semakin baik.
                        Masih ada <strong>${member?.pt_remaining_sessions ?? 0} sesi tersisa</strong> untuk memaksimalkan target komposisi tubuh. Pertahankan intensitas dan konsistensi pola makan!
                      </div>
                    </div>
                  `
              }

              <div class="digital-footer" style="margin-top: 20px;">
                <span>LINEUP GYM PRAMBANAN · ${
                  reportMode === 'graduation'
                    ? 'Official Physical Transformation Certificate'
                    : 'Official Progress Evaluation Certificate'
                }</span>
                <span>Coach: <strong>${escapeHtml(latestTrainerName) || 'LineUp Gym Team'}</strong> · Dicetak: ${todayStr}</span>
              </div>
            </div>
          `
        : ''
      }

          <script>
            function waitForImagesAndPrint() {
              document.title = ${JSON.stringify(pdfFileName)};
              var images = document.images;
              var total = images.length;
              if (total === 0) {
                setTimeout(function() { window.print(); }, 250);
                return;
              }
              var loaded = 0;
              function check() {
                loaded++;
                if (loaded >= total) {
                  setTimeout(function() { window.print(); }, 400);
                }
              }
              for (var i = 0; i < total; i++) {
                if (images[i].complete) {
                  check();
                } else {
                  images[i].addEventListener('load', check);
                  images[i].addEventListener('error', check);
                }
              }
            }
            window.addEventListener('load', waitForImagesAndPrint);
            // Fallback timeout
            setTimeout(function() { window.print(); }, 2500);
          </script>
        </body>
      </html>
    `
    return htmlContent
  }

  const handlePrintPdf = () => {
    setIsPrinting(true)
    const html = generateHtmlContent()
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const blobUrl = URL.createObjectURL(blob)

    const printWindow = window.open(blobUrl, '_blank')
    if (!printWindow) {
      alert(
        'Pop-up terblokir oleh browser. Harap izinkan pop-up untuk mencetak / menyimpan PDF.'
      )
      setIsPrinting(false)
      URL.revokeObjectURL(blobUrl)
      return
    }

    setTimeout(() => {
      URL.revokeObjectURL(blobUrl)
    }, 60000)
    setIsPrinting(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-hidden flex flex-col p-0 border-border bg-card text-foreground">
        <DialogHeader className="p-4 pb-3 border-b border-border/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:pr-10">
          <div className="flex flex-col gap-1">
            <DialogTitle className="font-heading text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary shrink-0" />
              <span>LAPORAN PT</span>
              {member?.pt_remaining_sessions === 0 && (
                <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] shrink-0">
                  Program Selesai
                </Badge>
              )}
            </DialogTitle>
            <p className="text-xs text-muted-foreground truncate max-w-sm">
              {member?.full_name} · {member?.pt_membership_name || 'Member PT'}
            </p>
          </div>

          {/* Tab Selector Pratinjau (Hal 1 vs Hal 2) */}
          <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/60 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActivePreviewPage('p1')}
              className={`text-xs px-2.5 py-1 rounded-md font-semibold transition-all ${activePreviewPage === 'p1'
                  ? 'bg-primary text-black font-bold'
                  : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              Halaman 1: Metrik
            </button>
            <button
              type="button"
              onClick={() => setActivePreviewPage('p2')}
              disabled={!includePhotos}
              className={`text-xs px-2.5 py-1 rounded-md font-semibold transition-all ${activePreviewPage === 'p2'
                  ? 'bg-primary text-black font-bold'
                  : 'text-muted-foreground hover:text-foreground disabled:opacity-40'
                }`}
            >
              Halaman 2: Foto
            </button>
          </div>
        </DialogHeader>

        {/* Cycle Selector Bar: Pilih Siklus Paket (Opsi A Smart Switcher) */}
        {cycles && cycles.length > 1 && (
          <div className="border-b border-border/40 px-4 py-2 bg-muted/20 text-xs">
            <PtCycleSelector
              cycles={cycles}
              selectedCycleId={currentCycle?.id || ''}
              onSelectCycle={(cycleId) => onSelectCycle && onSelectCycle(cycleId)}
            />
          </div>
        )}

        {/* Mode Selector Bar: Kelulusan vs Evaluasi Berkala (Bagian 1 Opsi A) */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 px-4 py-2 bg-muted/15 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-muted-foreground">Mode Laporan:</span>
            <div className="flex items-center rounded-lg border border-border/60 bg-card p-0.5">
              <button
                type="button"
                disabled={!canSelectGraduation}
                onClick={() => {
                  setUserSelectedMode('graduation')
                  setSelectedMetricId('')
                }}
                className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-all ${
                  !canSelectGraduation
                    ? 'opacity-40 cursor-not-allowed text-muted-foreground'
                    : reportMode === 'graduation'
                      ? 'bg-amber-500 text-black shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                }`}
                title={!canSelectGraduation ? 'Member belum menyelesaikan kuota sesi PT atau belum memiliki catatan Day Terakhir' : undefined}
              >
                🏆 Kelulusan (Day 1 vs Akhir)
              </button>
              <button
                type="button"
                onClick={() => {
                  setUserSelectedMode('milestone')
                  setSelectedMetricId('')
                }}
                className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-all ${
                  reportMode === 'milestone'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                ⚡ Evaluasi Berkala (Day 1 vs Progress)
              </button>
            </div>
          </div>

          {reportMode === 'milestone' && progressRecords.length > 1 && (
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground text-[11px]">Sesi:</span>
              <select
                value={selectedMetricId}
                onChange={(e) => setSelectedMetricId(e.target.value)}
                className="rounded-md border border-border/60 bg-card px-2 py-1 text-[11px] font-semibold text-foreground outline-none focus:border-primary"
              >
                <option value="">Progress Terbaru ({formatShortDate(targetRecord?.recorded_at)})</option>
                {progressRecords.map((rec, i) => (
                  <option key={rec.id} value={rec.id}>
                    Progress #{i + 1} ({formatShortDate(rec.recorded_at)}){rec.weight_kg ? ` · ${rec.weight_kg}kg` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Paper Sheet Preview */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-muted/20">
          <div className="mx-auto max-w-xl rounded-xl border border-border/70 bg-background p-6 shadow-md text-foreground space-y-4 text-xs">
            {activePreviewPage === 'p1' ? (
              <>
                {/* Header Document (Kop Surat Resmi Opsi 1) */}
                <div className="flex items-center gap-3 border-b-2 border-border/80 pb-3">
                  <img
                    src="/logo.jpg"
                    alt="Line Up Gym"
                    className="h-11 w-11 rounded-full object-cover border border-border shadow-2xs shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h2 className="font-heading text-sm font-extrabold tracking-wider text-primary uppercase leading-tight">
                      LINEUP GYM PRAMBANAN
                    </h2>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      Be Strong Be Healthy! · Prambanan, Klaten
                    </p>
                    <p className="text-[11px] font-bold text-foreground uppercase pt-0.5">
                      Laporan Perkembangan &amp; Evaluasi Personal Trainer
                    </p>
                  </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border/50 bg-card/60 p-2.5 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block border-b border-border/40 pb-0.5">
                      Data Member
                    </span>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nama:</span>
                      <span className="font-semibold text-foreground">
                        {member?.full_name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Coach / PT:</span>
                      <span className="font-semibold text-accent">
                        {latestTrainerName || 'LineUp Gym Team'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Paket PT:</span>
                      <span className="font-medium text-foreground">
                        {member?.pt_membership_name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sisa Kuota:</span>
                      <span className="font-bold text-accent">
                        {member?.pt_remaining_sessions === 0
                          ? 'Selesai (0 Sesi)'
                          : `${member?.pt_remaining_sessions} Sesi`}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border/50 bg-card/60 p-2.5 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block border-b border-border/40 pb-0.5">
                      Ringkasan Fisik
                    </span>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">BB Awal:</span>
                      <span className="font-semibold">
                        {initialMetric?.weight_kg
                          ? `${initialMetric.weight_kg} kg`
                          : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">BB Terkini:</span>
                      <span className="font-semibold text-accent">
                        {lastMetric?.weight_kg
                          ? `${lastMetric.weight_kg} kg`
                          : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Selisih:</span>
                      <span className="font-bold text-emerald-400">
                        {weightDiff !== null
                          ? weightDiff > 0
                            ? `+${weightDiff} kg`
                            : `${weightDiff} kg`
                          : '-'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Riwayat Sesi Ringkas */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold uppercase tracking-wider text-muted-foreground">
                      Riwayat Latihan ({recentWorkouts.length} Sesi Terakhir)
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Dicetak: {todayStr}
                    </span>
                  </div>

                  <div className="rounded-lg border border-border/50 overflow-hidden">
                    <table className="w-full text-[10px] text-left">
                      <thead className="bg-muted/40 border-b border-border/50 text-muted-foreground">
                        <tr>
                          <th className="p-2">Tgl</th>
                          <th className="p-2">Fokus</th>
                          <th className="p-2">Coach</th>
                          <th className="p-2">Gerakan & Beban</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {recentWorkouts.length === 0 ? (
                          <tr>
                            <td
                              colSpan={4}
                              className="p-4 text-center text-muted-foreground"
                            >
                              Belum ada riwayat sesi tercatat
                            </td>
                          </tr>
                        ) : (
                          recentWorkouts.slice(0, 5).map((w, idx) => (
                            <tr key={idx} className="hover:bg-muted/10">
                              <td className="p-2 whitespace-nowrap font-medium text-foreground">
                                {new Date(w.created_at).toLocaleDateString(
                                  'id-ID',
                                  {
                                    day: 'numeric',
                                    month: 'short',
                                  }
                                )}
                              </td>
                              <td className="p-2 font-bold text-primary">
                                {(w as any).is_attendance_only || (w.exercises || []).length === 0 ? 'Sesi Selesai' : w.category}
                              </td>
                              <td className="p-2 font-medium text-foreground whitespace-nowrap">
                                {w.trainer_name || '-'}
                              </td>
                              <td className="p-2 text-muted-foreground">
                                {(w.exercises || []).length === 0 ? (
                                  <span className="text-[10px] text-emerald-400 font-medium">✓ Sesi Selesai (Absensi Kehadiran)</span>
                                ) : (
                                  <div className="flex flex-col gap-1">
                                    {(w.exercises || []).map((e, eIdx) => {
                                      const isProg =
                                        e.sets_detail &&
                                        e.sets_detail.length > 0 &&
                                        e.sets_detail.some(
                                          (s) =>
                                            s.weight_kg !== e.sets_detail![0].weight_kg ||
                                            s.reps !== e.sets_detail![0].reps
                                        )

                                      const totalSets = e.sets_detail?.length || e.sets || 1
                                      const reps = e.sets_detail?.[0]?.reps ?? e.reps
                                      const weight = e.sets_detail?.[0]?.weight_kg ?? e.weight_kg
                                      const wtLabel = weight > 0 ? `${weight} kg` : 'Bodyweight'

                                      const notation =
                                        isProg && e.sets_detail
                                          ? e.sets_detail
                                              .map((s) => {
                                                const wt = s.weight_kg > 0 ? `${s.weight_kg} kg` : 'Bodyweight'
                                                return `${wt} (${s.reps} reps)`
                                              })
                                              .join(' → ')
                                          : `${totalSets} Set × ${reps} reps (${wtLabel})`

                                      return (
                                        <span
                                          key={eIdx}
                                          className="inline-flex flex-wrap items-baseline gap-1 rounded bg-muted/60 border border-border/50 px-2 py-0.5 text-[9px]"
                                        >
                                          <strong className="text-foreground">{e.name}:</strong>
                                          <span className="text-muted-foreground">
                                            {notation}
                                          </span>
                                        </span>
                                      )
                                    })}
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Digital Verification Footer */}
                  <div className="flex items-center justify-between border-t border-border/40 pt-2 text-[9px] text-muted-foreground">
                    <span>LINEUP GYM PRAMBANAN · Official PT Report</span>
                    <span>
                      Coach: <strong className="text-foreground">{latestTrainerName || 'LineUp Gym Team'}</strong> · Dicetak: {todayStr}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Halaman 2: Galeri Transformasi / Progress (Kop Surat Resmi Opsi 1) */}
                <div className="flex items-center gap-3 border-b-2 border-border/80 pb-3">
                  <img
                    src="/logo.jpg"
                    alt="Line Up Gym"
                    className="h-11 w-11 rounded-full object-cover border border-border shadow-2xs shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h2 className="font-heading text-sm font-extrabold tracking-wider text-primary uppercase leading-tight">
                      LINEUP GYM PRAMBANAN
                    </h2>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      Be Strong Be Healthy! · Prambanan, Klaten
                    </p>
                    <p className="text-[11px] font-bold text-emerald-400 uppercase pt-0.5">
                      {reportMode === 'graduation'
                        ? 'Galeri Transformasi Before vs After'
                        : `Dokumentasi Progress Evaluasi Fisik · Sisa ${member?.pt_remaining_sessions ?? 0} Sesi`}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center pt-1">
                  {/* Depan */}
                  {(day1Record?.photo_front_url || targetRecord?.photo_front_url) && (
                    <div className="rounded-lg border border-border/60 bg-muted/20 p-2 space-y-1">
                      <span className="text-[10px] font-bold text-foreground block">
                        1. Tampak Depan
                      </span>
                      <div className="grid grid-cols-2 gap-1 text-[9px]">
                        <div className="rounded bg-background p-1 border border-border/40">
                          <span className="text-blue-400 font-bold block text-[8px]">
                            Day 1
                          </span>
                          {day1Record?.photo_front_url ? (
                            <span className="text-[8px] text-emerald-400 font-medium">✓ Ada</span>
                          ) : (
                            <span className="text-[8px] text-muted-foreground">-</span>
                          )}
                        </div>
                        <div className="rounded bg-background p-1 border border-border/40">
                          <span className="text-emerald-400 font-bold block text-[8px]">
                            {reportMode === 'graduation' ? 'Akhir' : 'Progress'}
                          </span>
                          {targetRecord?.photo_front_url ? (
                            <span className="text-[8px] text-emerald-400 font-medium">✓ Ada</span>
                          ) : (
                            <span className="text-[8px] text-muted-foreground">-</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Samping */}
                  {(day1Record?.photo_side_url || targetRecord?.photo_side_url) && (
                    <div className="rounded-lg border border-border/60 bg-muted/20 p-2 space-y-1">
                      <span className="text-[10px] font-bold text-foreground block">
                        2. Tampak Samping
                      </span>
                      <div className="grid grid-cols-2 gap-1 text-[9px]">
                        <div className="rounded bg-background p-1 border border-border/40">
                          <span className="text-blue-400 font-bold block text-[8px]">
                            Day 1
                          </span>
                          {day1Record?.photo_side_url ? (
                            <span className="text-[8px] text-emerald-400 font-medium">✓ Ada</span>
                          ) : (
                            <span className="text-[8px] text-muted-foreground">-</span>
                          )}
                        </div>
                        <div className="rounded bg-background p-1 border border-border/40">
                          <span className="text-emerald-400 font-bold block text-[8px]">
                            {reportMode === 'graduation' ? 'Akhir' : 'Progress'}
                          </span>
                          {targetRecord?.photo_side_url ? (
                            <span className="text-[8px] text-emerald-400 font-medium">✓ Ada</span>
                          ) : (
                            <span className="text-[8px] text-muted-foreground">-</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Belakang */}
                  {(day1Record?.photo_back_url || targetRecord?.photo_back_url) && (
                    <div className="rounded-lg border border-border/60 bg-muted/20 p-2 space-y-1">
                      <span className="text-[10px] font-bold text-foreground block">
                        3. Tampak Belakang
                      </span>
                      <div className="grid grid-cols-2 gap-1 text-[9px]">
                        <div className="rounded bg-background p-1 border border-border/40">
                          <span className="text-blue-400 font-bold block text-[8px]">
                            Day 1
                          </span>
                          {day1Record?.photo_back_url ? (
                            <span className="text-[8px] text-emerald-400 font-medium">✓ Ada</span>
                          ) : (
                            <span className="text-[8px] text-muted-foreground">-</span>
                          )}
                        </div>
                        <div className="rounded bg-background p-1 border border-border/40">
                          <span className="text-emerald-400 font-bold block text-[8px]">
                            {reportMode === 'graduation' ? 'Akhir' : 'Progress'}
                          </span>
                          {targetRecord?.photo_back_url ? (
                            <span className="text-[8px] text-emerald-400 font-medium">✓ Ada</span>
                          ) : (
                            <span className="text-[8px] text-muted-foreground">-</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Box Rekomendasi Renewal */}
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 space-y-1 text-[11px] text-amber-200">
                  <span className="font-bold flex items-center gap-1.5 text-amber-300">
                    <Sparkles className="h-3.5 w-3.5" />
                    Rekomendasi Coach untuk Fase Selanjutnya:
                  </span>
                  <p className="text-amber-200/80 leading-relaxed text-[10px]">
                    Hasil evaluasi menunjukkan perubahan positif pada komposisi fisik
                    dan postur Kak <strong>{member?.full_name}</strong>. Disarankan melanjutkan
                    ke paket perpanjangan PT berikutnya untuk fase pemeliharaan / peningkatan beban.
                  </p>
                </div>

                {/* Digital Verification Footer */}
                <div className="flex items-center justify-between border-t border-border/40 pt-2 text-[9px] text-muted-foreground">
                  <span>LINEUP GYM PRAMBANAN · Official Certificate</span>
                  <span>
                    Coach: <strong className="text-foreground">{latestTrainerName || 'LineUp Gym Team'}</strong> · Dicetak: {todayStr}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-3 bg-card">
          {/* Toggle Checkbox Sertakan Foto */}
          <label className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground hover:text-foreground">
            <input
              type="checkbox"
              checked={includePhotos}
              onChange={(e) => {
                setIncludePhotos(e.target.checked)
                if (!e.target.checked) setActivePreviewPage('p1')
              }}
              className="rounded border-border text-primary focus:ring-primary h-4 w-4"
            />
            <span>Sertakan Galeri Foto Transformasi (Halaman 2)</span>
          </label>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-border text-xs"
            >
              Tutup
            </Button>

            <Button
              type="button"
              onClick={handlePrintPdf}
              disabled={isPrinting}
              className="bg-primary text-black hover:bg-primary/90 text-xs font-bold gap-1.5 shadow-md shadow-primary/20"
            >
              <Printer className="h-4 w-4" />
              <span>
                {includePhotos ? 'Cetak PDF (2 Halaman)' : 'Cetak PDF (1 Halaman)'}
              </span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
