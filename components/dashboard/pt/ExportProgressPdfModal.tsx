'use client'

import { useState, useMemo } from 'react'
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
  Download,
} from 'lucide-react'
import { toast } from 'sonner'
import type { PtProgressLogWithMember } from '@/hooks/usePtProgress'
import type { MemberBodyMetric } from '@/lib/types'

interface ExportProgressPdfModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  member: {
    full_name: string
    phone?: string
    pt_membership_name?: string
    pt_remaining_sessions?: number
  } | null
  workoutLogs: PtProgressLogWithMember[]
  bodyMetrics: MemberBodyMetric[]
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
}: ExportProgressPdfModalProps) {
  const [isPrinting, setIsPrinting] = useState(false)
  const [includePhotos, setIncludePhotos] = useState(true)
  const [activePreviewPage, setActivePreviewPage] = useState<'p1' | 'p2'>('p1')

  const initialMetric = bodyMetrics?.[0]
  const lastMetric = bodyMetrics?.[bodyMetrics.length - 1]
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

  // Cari Foto Baseline Day 1 dan Day Terakhir
  const { day1Record, dayFinalRecord, hasAnyPhotos } = useMemo(() => {
    const withPhotos = (bodyMetrics || []).filter(
      (m) => m.photo_front_url || m.photo_side_url || m.photo_back_url
    )
    const day1 =
      withPhotos.find((m) => m.phase === 'day_1') || withPhotos[0] || null
    const dayFinal =
      withPhotos.find((m) => m.phase === 'day_final') ||
      (withPhotos.length > 1 ? withPhotos[withPhotos.length - 1] : null)

    return {
      day1Record: day1,
      dayFinalRecord: dayFinal,
      hasAnyPhotos: withPhotos.length > 0,
    }
  }, [bodyMetrics])

  const recentWorkouts = (workoutLogs || []).slice(0, 10)
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

    const day1Front = sanitizeImageUrl(day1Record?.photo_front_url)
    const finalFront = sanitizeImageUrl(dayFinalRecord?.photo_front_url)
    const day1Side = sanitizeImageUrl(day1Record?.photo_side_url)
    const finalSide = sanitizeImageUrl(dayFinalRecord?.photo_side_url)
    const day1Back = sanitizeImageUrl(day1Record?.photo_back_url)
    const finalBack = sanitizeImageUrl(dayFinalRecord?.photo_back_url)

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
              margin: 10mm 14mm;
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
              font-size: 10.5px;
              line-height: 1.4;
            }
            
            /* HALAMAN 1 & 2 PAGE CONTAINERS */
            .page-container {
              position: relative;
              min-height: 270mm;
            }
            .page-break {
              page-break-before: always;
              break-before: page;
            }

            .header {
              text-align: center;
              border-bottom: 2px solid #111;
              padding-bottom: 8px;
              margin-bottom: 12px;
            }
            .gym-name {
              font-size: 19px;
              font-weight: 900;
              letter-spacing: 1.5px;
              color: #000;
              text-transform: uppercase;
            }
            .gym-tagline {
              font-size: 9.5px;
              color: #555;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-top: 1px;
            }
            .doc-title {
              font-size: 12.5px;
              font-weight: 800;
              margin-top: 6px;
              text-decoration: underline;
              letter-spacing: 0.5px;
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

            .footer-sign {
              display: flex;
              justify-content: space-between;
              margin-top: 18px;
              padding: 0 40px;
            }
            .sign-box {
              text-align: center;
              width: 140px;
            }
            .sign-line {
              border-bottom: 1px solid #333;
              margin-top: 40px;
              margin-bottom: 4px;
            }
            .sign-role {
              font-size: 9.5px;
              color: #666;
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
              body {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <!-- ================= HALAMAN 1 ================= -->
          <div class="page-container">
            <div class="header">
              <div class="gym-name">LineUp Gym Prambanan</div>
              <div class="gym-tagline">Be Strong Be Healthy!</div>
              <div class="doc-title">Laporan Perkembangan & Evaluasi Personal Trainer</div>
            </div>

            <div class="grid-2">
              <div class="card">
                <div class="card-title">Data Member & Membership</div>
                <div class="info-row"><span class="info-label">Nama Member:</span><span class="info-value">${escapeHtml(member?.full_name) || '-'}</span></div>
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
                  <th style="width: 75px;">Tanggal</th>
                  <th style="width: 60px;">Fokus</th>
                  <th>Daftar Gerakan & Beban</th>
                  <th style="width: 130px;">Catatan Coach</th>
                </tr>
              </thead>
              <tbody>
                ${recentWorkouts.length === 0
        ? '<tr><td colspan="5" style="text-align: center; padding: 12px; color: #777;">Belum ada riwayat sesi latihan tercatat</td></tr>'
        : recentWorkouts
          .map((w, i) => {
            const d = new Date(w.created_at).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
            })
            const exList = (w.exercises || [])
              .slice(0, 4)
              .map((e) => `• <strong>${escapeHtml(e.name)}</strong>: ${e.sets}×${e.reps} @ ${e.weight_kg}kg`)
              .join('<br>')
            const badgeClass =
              w.category === 'Push'
                ? 'badge-push'
                : w.category === 'Pull'
                  ? 'badge-pull'
                  : w.category === 'Leg'
                    ? 'badge-leg'
                    : 'badge-other'
            return `
                          <tr>
                            <td style="text-align: center;">${i + 1}</td>
                            <td>${d}</td>
                            <td><span class="badge ${badgeClass}">${escapeHtml(w.category)}</span></td>
                            <td>${exList || '-'}</td>
                            <td>${w.notes ? '<em>"' + escapeHtml(w.notes) + '"</em>' : '-'}</td>
                          </tr>
                        `
          })
          .join('')
      }
              </tbody>
            </table>

            <div class="footer-sign">
              <div class="sign-box">
                <div>Member</div>
                <div class="sign-line"></div>
                <div class="sign-role">${escapeHtml(member?.full_name) || 'Member'}</div>
              </div>
              <div class="sign-box">
                <div>Coach / Personal Trainer</div>
                <div class="sign-line"></div>
                <div class="sign-role">LineUp Gym Team</div>
              </div>
            </div>
          </div>

          <!-- ================= HALAMAN 2: FOTO TRANSFORMASI (OPSI A) ================= -->
          ${includePhotos
        ? `
            <div class="page-container page-break">
              <div class="header">
                <div class="gym-name">LineUp Gym Prambanan</div>
                <div class="gym-tagline">Be Strong Be Healthy!</div>
                <div class="doc-title">GALERI TRANSFORMASI FISIK (BEFORE vs AFTER)</div>
              </div>

              <div class="transformation-banner">
                <div>Member: <strong>${escapeHtml(member?.full_name) || '-'}</strong> (${escapeHtml(member?.pt_membership_name) || 'Personal Trainer'})</div>
                <div>Status Program: <span class="cert-stamp">✓ Lulus / Selesai</span></div>
              </div>

              <div class="photo-grid-3">
                <!-- 1. DEPAN -->
                <div class="photo-card">
                  <div class="photo-card-title">1. Tampak Depan</div>
                  <div class="photo-pair">
                    <div class="photo-item">
                      <span class="photo-tag-day1">Day 1</span>
                      ${day1Front
          ? `<img src="${day1Front}" class="photo-img" />`
          : '<div class="photo-placeholder">Tidak ada foto Day 1</div>'
        }
                      <span class="photo-date">${formatShortDate(day1Record?.recorded_at)}</span>
                    </div>
                    <div class="photo-item">
                      <span class="photo-tag-final">Hasil Akhir</span>
                      ${finalFront
          ? `<img src="${finalFront}" class="photo-img" />`
          : '<div class="photo-placeholder">Belum ada foto akhir</div>'
        }
                      <span class="photo-date">${formatShortDate(dayFinalRecord?.recorded_at)}</span>
                    </div>
                  </div>
                </div>

                <!-- 2. SAMPING -->
                <div class="photo-card">
                  <div class="photo-card-title">2. Tampak Samping</div>
                  <div class="photo-pair">
                    <div class="photo-item">
                      <span class="photo-tag-day1">Day 1</span>
                      ${day1Side
          ? `<img src="${day1Side}" class="photo-img" />`
          : '<div class="photo-placeholder">Tidak ada foto Day 1</div>'
        }
                      <span class="photo-date">${formatShortDate(day1Record?.recorded_at)}</span>
                    </div>
                    <div class="photo-item">
                      <span class="photo-tag-final">Hasil Akhir</span>
                      ${finalSide
          ? `<img src="${finalSide}" class="photo-img" />`
          : '<div class="photo-placeholder">Belum ada foto akhir</div>'
        }
                      <span class="photo-date">${formatShortDate(dayFinalRecord?.recorded_at)}</span>
                    </div>
                  </div>
                </div>

                <!-- 3. BELAKANG -->
                <div class="photo-card">
                  <div class="photo-card-title">3. Tampak Belakang</div>
                  <div class="photo-pair">
                    <div class="photo-item">
                      <span class="photo-tag-day1">Day 1</span>
                      ${day1Back
          ? `<img src="${day1Back}" class="photo-img" />`
          : '<div class="photo-placeholder">Tidak ada foto Day 1</div>'
        }
                      <span class="photo-date">${formatShortDate(day1Record?.recorded_at)}</span>
                    </div>
                    <div class="photo-item">
                      <span class="photo-tag-final">Hasil Akhir</span>
                      ${finalBack
          ? `<img src="${finalBack}" class="photo-img" />`
          : '<div class="photo-placeholder">Belum ada foto akhir</div>'
        }
                      <span class="photo-date">${formatShortDate(dayFinalRecord?.recorded_at)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Rekomendasi Program Lanjutan Coach (Peluang Closing Renewal) -->
              <div class="renewal-box">
                <div class="renewal-title">🏆 Evaluasi Kelulusan & Rekomendasi Coach:</div>
                <div class="renewal-desc">
                  Selamat atas konsistensi dan kerja keras Kak <strong>${escapeHtml(member?.full_name) || 'Member'}</strong> selama menyelesaikan program Personal Trainer di Line Up Gym! 
                  Dokumentasi transformasi di atas membuktikan hasil nyata dari disiplin latihan dan pengaturan nutrisi. 
                  Untuk mempertahankan hasil (*muscle retention*) dan melangkah ke fase berikutnya, coach menyarankan melanjutkan ke <strong>Program PT Lanjutan / Maintenance Fase 2</strong>.
                </div>
              </div>

              <div class="footer-sign" style="margin-top: 25px;">
                <div class="sign-box">
                  <div>Head Trainer</div>
                  <div class="sign-line"></div>
                  <div class="sign-role">LineUp Gym Management</div>
                </div>
                <div class="sign-box">
                  <div>Personal Trainer</div>
                  <div class="sign-line"></div>
                  <div class="sign-role">LineUp Gym Team</div>
                </div>
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

  const handleDownloadHtml = () => {
    const html = generateHtmlContent()
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${pdfFileName}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    toast.success(`Dokumen ${pdfFileName}.html siap diunduh!`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-hidden flex flex-col p-0 border-border bg-card text-foreground">
        <DialogHeader className="p-4 pb-3 border-b border-border/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <DialogTitle className="font-heading text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <span>Laporan Kelulusan & Perkembangan PT</span>
              {member?.pt_remaining_sessions === 0 && (
                <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">
                  Program Selesai
                </Badge>
              )}
            </DialogTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Target File:</span>
              <code className="px-1.5 py-0.5 rounded bg-muted/60 text-primary font-mono text-[11px] font-semibold border border-primary/20">
                {pdfFileName}.pdf
              </code>
            </div>
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

        {/* Paper Sheet Preview */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-muted/20">
          <div className="mx-auto max-w-xl rounded-xl border border-border/70 bg-background p-6 shadow-md text-foreground space-y-4 text-xs">
            {activePreviewPage === 'p1' ? (
              <>
                {/* Header Document */}
                <div className="text-center border-b-2 border-border/60 pb-3 space-y-0.5">
                  <h2 className="font-heading text-base font-extrabold tracking-wider text-primary">
                    LINEUP GYM PRAMBANAN
                  </h2>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Be Strong Be Healthy!
                  </p>
                  <p className="text-xs font-bold underline pt-1 text-foreground">
                    LAPORAN PERKEMBANGAN PERSONAL TRAINER
                  </p>
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
                          <th className="p-2">Gerakan & Beban</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {recentWorkouts.length === 0 ? (
                          <tr>
                            <td
                              colSpan={3}
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
                                {w.category}
                              </td>
                              <td className="p-2 text-muted-foreground">
                                {(w.exercises || [])
                                  .slice(0, 3)
                                  .map(
                                    (e) =>
                                      `${e.name} (${e.sets}×${e.reps} @ ${e.weight_kg}kg)`
                                  )
                                  .join(', ')}
                                {(w.exercises || []).length > 3 && '...'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Halaman 2: Galeri Transformasi */}
                <div className="text-center border-b-2 border-border/60 pb-3 space-y-0.5">
                  <div className="flex items-center justify-center gap-1.5 text-emerald-400">
                    <Award className="h-4 w-4" />
                    <span className="font-heading text-sm font-extrabold uppercase">
                      Galeri Transformasi Before vs After
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Dokumentasi Resmi Kelulusan & Perkembangan Fisik Member
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                  {/* Depan */}
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-2 space-y-1">
                    <span className="text-[10px] font-bold text-foreground block">
                      Tampak Depan
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
                          Akhir
                        </span>
                        {dayFinalRecord?.photo_front_url ? (
                          <span className="text-[8px] text-emerald-400 font-medium">✓ Ada</span>
                        ) : (
                          <span className="text-[8px] text-muted-foreground">-</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Samping */}
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-2 space-y-1">
                    <span className="text-[10px] font-bold text-foreground block">
                      Tampak Samping
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
                          Akhir
                        </span>
                        {dayFinalRecord?.photo_side_url ? (
                          <span className="text-[8px] text-emerald-400 font-medium">✓ Ada</span>
                        ) : (
                          <span className="text-[8px] text-muted-foreground">-</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Belakang */}
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-2 space-y-1">
                    <span className="text-[10px] font-bold text-foreground block">
                      Tampak Belakang
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
                          Akhir
                        </span>
                        {dayFinalRecord?.photo_back_url ? (
                          <span className="text-[8px] text-emerald-400 font-medium">✓ Ada</span>
                        ) : (
                          <span className="text-[8px] text-muted-foreground">-</span>
                        )}
                      </div>
                    </div>
                  </div>
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
              variant="outline"
              onClick={handleDownloadHtml}
              className="border-border/80 text-xs gap-1.5 hover:bg-muted"
              title="Unduh file laporan format HTML offline"
            >
              <Download className="h-4 w-4 text-muted-foreground" />
              <span>Unduh File (.html)</span>
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
