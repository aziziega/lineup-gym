'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
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
import { Camera, Eye, ArrowRight, Sparkles, X, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRemoveBodyMetricPhoto } from '@/hooks/usePtProgress'
import type { MemberBodyMetric } from '@/lib/types'

interface PhotoComparisonGalleryProps {
  metrics: MemberBodyMetric[]
}

interface DeletePhotoTarget {
  metricId: string
  angle: 'front' | 'side' | 'back'
  phaseLabel: string
  memberId: string
}

export function PhotoComparisonGallery({ metrics }: PhotoComparisonGalleryProps) {
  const [selectedAngle, setSelectedAngle] = useState<'front' | 'side' | 'back'>('front')
  const [zoomImage, setZoomImage] = useState<{
    url: string
    title: string
    deleteInfo?: DeletePhotoTarget
  } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeletePhotoTarget | null>(null)

  const removePhotoMutation = useRemoveBodyMetricPhoto()

  // Ambil record yang memiliki minimal salah satu foto
  const recordsWithPhotos = metrics.filter(
    (m) => m.photo_front_url || m.photo_side_url || m.photo_back_url
  )

  // Cari Day 1 dan Day Terakhir (khusus phase day_final, tanpa fallback keliru ke foto progress berkala)
  const day1Record =
    recordsWithPhotos.find((m) => m.phase === 'day_1') || recordsWithPhotos[0]
  const dayFinalRecord =
    recordsWithPhotos.find((m) => m.phase === 'day_final') || null

  const getPhotoUrl = (metric: MemberBodyMetric | null | undefined, angle: 'front' | 'side' | 'back') => {
    if (!metric) return null
    if (angle === 'front') return metric.photo_front_url
    if (angle === 'side') return metric.photo_side_url
    if (angle === 'back') return metric.photo_back_url
    return null
  }

  const day1Photo = getPhotoUrl(day1Record, selectedAngle)
  const dayFinalPhoto = getPhotoUrl(dayFinalRecord, selectedAngle)

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await removePhotoMutation.mutateAsync({
        metricId: deleteTarget.metricId,
        angle: deleteTarget.angle,
        memberId: deleteTarget.memberId,
      })
      toast.success(`Foto ${deleteTarget.phaseLabel} berhasil dihapus!`)
      if (zoomImage && zoomImage.deleteInfo?.metricId === deleteTarget.metricId) {
        setZoomImage(null)
      }
      setDeleteTarget(null)
    } catch {
      toast.error('Gagal menghapus foto')
    }
  }

  if (recordsWithPhotos.length === 0) {
    return (
      <div className="flex h-52 flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-card/40 p-6 text-center">
        <Camera className="h-8 w-8 text-muted-foreground/40 mb-2" />
        <p className="text-sm font-medium text-muted-foreground">Belum ada foto progress</p>
        <p className="text-xs text-muted-foreground/60 mt-0.5">
          Unggah foto Day 1 dan Day Terakhir saat mencatat body metrics.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Angle Selector Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-card p-1">
          <button
            type="button"
            onClick={() => setSelectedAngle('front')}
            className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
              selectedAngle === 'front'
                ? 'bg-primary text-black font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Tampak Depan
          </button>
          <button
            type="button"
            onClick={() => setSelectedAngle('side')}
            className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
              selectedAngle === 'side'
                ? 'bg-primary text-black font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Tampak Samping
          </button>
          <button
            type="button"
            onClick={() => setSelectedAngle('back')}
            className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
              selectedAngle === 'back'
                ? 'bg-primary text-black font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Tampak Belakang
          </button>
        </div>

        <span className="text-[11px] text-muted-foreground hidden sm:inline">
          {recordsWithPhotos.length} rekaman foto
        </span>
      </div>

      {/* Side-by-Side Before vs After Showcase */}
      <Card className="bg-card border-border/60 overflow-hidden">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h4 className="font-heading text-sm text-foreground">
                Perbandingan Sebelum vs Sesudah (Before & After)
              </h4>
            </div>
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">
              Sudut: {selectedAngle === 'front' ? 'Depan' : selectedAngle === 'side' ? 'Samping' : 'Belakang'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative">
            {/* Day 1 (Before) */}
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-between w-full mb-1.5 px-1">
                <span className="text-xs font-bold text-blue-400 flex items-center gap-1">
                  🏁 DAY 1 (AWAL)
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {day1Record
                    ? new Date(day1Record.recorded_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '-'}
                  {day1Record?.weight_kg && ` · ${day1Record.weight_kg} kg`}
                </span>
              </div>

              <div
                className={`relative w-full aspect-[3/4] max-h-[360px] rounded-xl border border-border/80 bg-background/50 overflow-hidden group ${
                  day1Photo ? 'hover:border-primary/60' : ''
                }`}
              >
                {day1Photo ? (
                  <>
                    <img
                      src={day1Photo}
                      alt="Day 1"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 cursor-pointer"
                      onClick={() =>
                        setZoomImage({
                          url: day1Photo,
                          title: `Day 1 (Awal) - ${day1Record?.weight_kg || ''} kg`,
                          deleteInfo: day1Record
                            ? {
                                metricId: day1Record.id,
                                angle: selectedAngle,
                                phaseLabel: 'Day 1 (Awal)',
                                memberId: day1Record.member_id,
                              }
                            : undefined,
                        })
                      }
                    />

                    {/* Desktop Hover Overlay (layaknya /dashboard/settings) */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 hidden sm:flex transition-opacity items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setZoomImage({
                            url: day1Photo,
                            title: `Day 1 (Awal) - ${day1Record?.weight_kg || ''} kg`,
                            deleteInfo: day1Record
                              ? {
                                  metricId: day1Record.id,
                                  angle: selectedAngle,
                                  phaseLabel: 'Day 1 (Awal)',
                                  memberId: day1Record.member_id,
                                }
                              : undefined,
                          })
                        }
                        className="px-3 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" /> Lihat
                      </button>
                      {day1Record && (
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteTarget({
                              metricId: day1Record.id,
                              angle: selectedAngle,
                              phaseLabel: 'Day 1 (Awal)',
                              memberId: day1Record.member_id,
                            })
                          }
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Hapus
                        </button>
                      )}
                    </div>

                    {/* Mobile Delete Button (selalu terlihat di HP) */}
                    {day1Record && (
                      <div className="sm:hidden absolute top-2 right-2 flex items-center gap-1.5 z-10">
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteTarget({
                              metricId: day1Record.id,
                              angle: selectedAngle,
                              phaseLabel: 'Day 1 (Awal)',
                              memberId: day1Record.member_id,
                            })
                          }
                          className="h-7 px-2.5 bg-red-600/90 hover:bg-red-700 active:scale-95 text-white rounded-md text-[10px] font-bold flex items-center gap-1 shadow-md transition-all cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3" /> Hapus
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
                    <Camera className="h-6 w-6 mb-1 opacity-40" />
                    <span className="text-xs">Foto sudut ini belum ada</span>
                  </div>
                )}
              </div>
            </div>

            {/* Day Final (After) */}
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-between w-full mb-1.5 px-1">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  🏆 DAY TERAKHIR (HASIL)
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {dayFinalRecord
                    ? new Date(dayFinalRecord.recorded_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'Belum Dicatat'}
                  {dayFinalRecord?.weight_kg && ` · ${dayFinalRecord.weight_kg} kg`}
                </span>
              </div>

              <div
                className={`relative w-full aspect-[3/4] max-h-[360px] rounded-xl border border-border/80 bg-background/50 overflow-hidden group ${
                  dayFinalPhoto ? 'hover:border-primary/60' : ''
                }`}
              >
                {dayFinalPhoto ? (
                  <>
                    <img
                      src={dayFinalPhoto}
                      alt="Day Terakhir"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 cursor-pointer"
                      onClick={() =>
                        setZoomImage({
                          url: dayFinalPhoto,
                          title: `Day Terakhir (Hasil) - ${dayFinalRecord?.weight_kg || ''} kg`,
                          deleteInfo: dayFinalRecord
                            ? {
                                metricId: dayFinalRecord.id,
                                angle: selectedAngle,
                                phaseLabel: 'Day Terakhir (Hasil)',
                                memberId: dayFinalRecord.member_id,
                              }
                            : undefined,
                        })
                      }
                    />

                    {/* Desktop Hover Overlay (layaknya /dashboard/settings) */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 hidden sm:flex transition-opacity items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setZoomImage({
                            url: dayFinalPhoto,
                            title: `Day Terakhir (Hasil) - ${dayFinalRecord?.weight_kg || ''} kg`,
                            deleteInfo: dayFinalRecord
                              ? {
                                  metricId: dayFinalRecord.id,
                                  angle: selectedAngle,
                                  phaseLabel: 'Day Terakhir (Hasil)',
                                  memberId: dayFinalRecord.member_id,
                                }
                              : undefined,
                          })
                        }
                        className="px-3 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" /> Lihat
                      </button>
                      {dayFinalRecord && (
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteTarget({
                              metricId: dayFinalRecord.id,
                              angle: selectedAngle,
                              phaseLabel: 'Day Terakhir (Hasil)',
                              memberId: dayFinalRecord.member_id,
                            })
                          }
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Hapus
                        </button>
                      )}
                    </div>

                    {/* Mobile Delete Button (selalu terlihat di HP) */}
                    {dayFinalRecord && (
                      <div className="sm:hidden absolute top-2 right-2 flex items-center gap-1.5 z-10">
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteTarget({
                              metricId: dayFinalRecord.id,
                              angle: selectedAngle,
                              phaseLabel: 'Day Terakhir (Hasil)',
                              memberId: dayFinalRecord.member_id,
                            })
                          }
                          className="h-7 px-2.5 bg-red-600/90 hover:bg-red-700 active:scale-95 text-white rounded-md text-[10px] font-bold flex items-center gap-1 shadow-md transition-all cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3" /> Hapus
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
                    <Camera className="h-6 w-6 mb-1 opacity-40" />
                    <span className="text-xs">Foto hasil akhir belum diunggah</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lightbox Zoom Dialog */}
      <Dialog open={!!zoomImage} onOpenChange={() => setZoomImage(null)}>
        <DialogContent
          showCloseButton={false}
          className="max-w-3xl p-3 sm:p-4 bg-black/95 border-neutral-800 text-white rounded-2xl shadow-2xl overflow-hidden"
        >
          <div className="relative flex flex-col items-center">
            {zoomImage && (
              <>
                <div className="w-full flex items-center justify-between pb-3 pt-1 px-1 gap-2">
                  <span className="text-sm font-bold text-white tracking-wide truncate">
                    {zoomImage.title}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    {zoomImage.deleteInfo && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setDeleteTarget(zoomImage.deleteInfo!)
                        }}
                        className="h-8 px-2.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white gap-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Hapus Foto
                      </Button>
                    )}
                    <button
                      type="button"
                      onClick={() => setZoomImage(null)}
                      aria-label="Tutup preview foto"
                      className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 backdrop-blur-md border border-white/20 text-white shadow-lg flex items-center justify-center transition-all cursor-pointer shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="relative w-full flex items-center justify-center rounded-xl overflow-hidden bg-black/60">
                  <img
                    src={zoomImage.url}
                    alt="Preview"
                    className="max-h-[75vh] w-auto max-w-full object-contain rounded-xl shadow-inner"
                  />
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Konfirmasi Hapus Foto (AlertDialog) */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent className="border-border bg-card text-foreground">
          <AlertDialogHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 mb-2 mx-auto">
              <Trash2 className="h-6 w-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-center font-heading text-lg">
              Hapus Foto {deleteTarget?.phaseLabel}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-xs text-muted-foreground space-y-2">
              <p>
                Foto tampak{' '}
                <span className="font-semibold text-foreground">
                  {deleteTarget?.angle === 'front'
                    ? 'depan'
                    : deleteTarget?.angle === 'side'
                    ? 'samping'
                    : 'belakang'}
                </span>{' '}
                pada {deleteTarget?.phaseLabel} akan dihapus dari data member.
              </p>
              <p className="rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-primary font-medium text-left">
                💡 Data catatan fisik lainnya (berat badan &amp; lingkar tubuh) tetap aman tersimpan.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2 sm:justify-center">
            <AlertDialogCancel className="border-border text-muted-foreground hover:bg-muted">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={removePhotoMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold"
            >
              {removePhotoMutation.isPending ? 'Menghapus...' : 'Ya, Hapus Foto'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
