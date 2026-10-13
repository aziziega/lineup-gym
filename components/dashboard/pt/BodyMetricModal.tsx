'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateBodyMetric, uploadProgressPhoto } from '@/hooks/usePtProgress'
import { Scale, Camera, Loader2, X, Image as ImageIcon, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import type { BodyMetricPhase } from '@/lib/types'

interface BodyMetricModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  memberId: string
  memberName: string
  onSuccess?: () => void
}

export function BodyMetricModal({
  open,
  onOpenChange,
  memberId,
  memberName,
  onSuccess,
}: BodyMetricModalProps) {
  const [weightKg, setWeightKg] = useState<string>('')
  const [phase, setPhase] = useState<BodyMetricPhase>('day_1')
  const [recordedAt, setRecordedAt] = useState<string>(new Date().toISOString().slice(0, 10))

  // Measurements
  const [perut, setPerut] = useState<string>('')
  const [lengan, setLengan] = useState<string>('')
  const [dada, setDada] = useState<string>('')
  const [paha, setPaha] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  // Photos
  const [photoFrontFile, setPhotoFrontFile] = useState<File | null>(null)
  const [photoFrontPreview, setPhotoFrontPreview] = useState<string | null>(null)

  const [photoSideFile, setPhotoSideFile] = useState<File | null>(null)
  const [photoSidePreview, setPhotoSidePreview] = useState<string | null>(null)

  const [photoBackFile, setPhotoBackFile] = useState<File | null>(null)
  const [photoBackPreview, setPhotoBackPreview] = useState<string | null>(null)

  const [isUploading, setIsUploading] = useState(false)
  const createMetric = useCreateBodyMetric()

  const handlePhotoSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: (file: File | null) => void,
    setPreview: (url: string | null) => void
  ) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFile(file)
    const reader = new FileReader()
    reader.onload = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!memberId) {
      toast.error('Pilih member terlebih dahulu')
      return
    }

    if (!weightKg && !perut && !photoFrontFile) {
      toast.error('Isi minimal berat badan atau unggah foto progress')
      return
    }

    setIsUploading(true)
    try {
      let frontUrl: string | null = null
      let sideUrl: string | null = null
      let backUrl: string | null = null

      if (photoFrontFile) {
        frontUrl = await uploadProgressPhoto(photoFrontFile, memberId, 'front')
      }
      if (photoSideFile) {
        sideUrl = await uploadProgressPhoto(photoSideFile, memberId, 'side')
      }
      if (photoBackFile) {
        backUrl = await uploadProgressPhoto(photoBackFile, memberId, 'back')
      }

      const measurementsObj: Record<string, number> = {}
      if (perut) measurementsObj.perut = parseFloat(perut)
      if (lengan) measurementsObj.lengan = parseFloat(lengan)
      if (dada) measurementsObj.dada = parseFloat(dada)
      if (paha) measurementsObj.paha = parseFloat(paha)

      await createMetric.mutateAsync({
        member_id: memberId,
        weight_kg: weightKg ? parseFloat(weightKg) : null,
        measurements: measurementsObj,
        photo_front_url: frontUrl,
        photo_side_url: sideUrl,
        photo_back_url: backUrl,
        phase,
        notes: notes.trim() || null,
        recorded_at: new Date(recordedAt).toISOString(),
      })

      toast.success(`Data fisik & foto ${memberName} berhasil disimpan!`)
      onOpenChange(false)
      // Reset form
      setWeightKg('')
      setPerut('')
      setLengan('')
      setDada('')
      setPaha('')
      setNotes('')
      setPhotoFrontFile(null)
      setPhotoFrontPreview(null)
      setPhotoSideFile(null)
      setPhotoSidePreview(null)
      setPhotoBackFile(null)
      setPhotoBackPreview(null)
      onSuccess?.()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Gagal menyimpan metrik tubuh')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Catat Body Metrics & Foto Progress</DialogTitle>
              <p className="text-xs text-muted-foreground">
                Member: <span className="font-semibold text-foreground">{memberName}</span>
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {/* Fase / Milestone Foto */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Fase Pencatatan
            </Label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPhase('day_1')}
                className={`flex flex-col items-center justify-center rounded-lg border p-2.5 text-xs font-semibold transition-all ${
                  phase === 'day_1'
                    ? 'border-blue-500/50 bg-blue-500/10 text-blue-400 ring-2 ring-blue-500/30'
                    : 'border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                }`}
              >
                <span>🏁 Day 1 (Awal)</span>
                <span className="text-[10px] text-muted-foreground font-normal">Sesi Perdana PT</span>
              </button>

              <button
                type="button"
                onClick={() => setPhase('progress')}
                className={`flex flex-col items-center justify-center rounded-lg border p-2.5 text-xs font-semibold transition-all ${
                  phase === 'progress'
                    ? 'border-amber-500/50 bg-amber-500/10 text-amber-400 ring-2 ring-amber-500/30'
                    : 'border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                }`}
              >
                <span>⚡ Progress Berkala</span>
                <span className="text-[10px] text-muted-foreground font-normal">Tengah Periode</span>
              </button>

              <button
                type="button"
                onClick={() => setPhase('day_final')}
                className={`flex flex-col items-center justify-center rounded-lg border p-2.5 text-xs font-semibold transition-all ${
                  phase === 'day_final'
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400 ring-2 ring-emerald-500/30'
                    : 'border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                }`}
              >
                <span>🏆 Day Terakhir</span>
                <span className="text-[10px] text-muted-foreground font-normal">Hasil Akhir Lulus</span>
              </button>
            </div>
          </div>

          {/* Berat Badan & Tanggal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Berat Badan (Kg)
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.1"
                  min="20"
                  max="300"
                  placeholder="Contoh: 75.5"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  className="bg-background text-sm font-semibold text-accent pr-10"
                />
                <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-semibold">kg</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Tanggal Pengukuran
              </Label>
              <Input
                type="date"
                value={recordedAt}
                onChange={(e) => setRecordedAt(e.target.value)}
                className="bg-background text-xs"
              />
            </div>
          </div>

          {/* Ukuran Tubuh (Opsional) */}
          <div className="space-y-2 rounded-lg bg-muted/20 p-3 border border-border/50">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Lingkar Tubuh (Opsional, dalam cm)
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <span className="text-[11px] text-muted-foreground">Perut</span>
                <Input
                  type="number"
                  step="0.5"
                  placeholder="cm"
                  value={perut}
                  onChange={(e) => setPerut(e.target.value)}
                  className="h-8 text-xs bg-background mt-1"
                />
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground">Lengan</span>
                <Input
                  type="number"
                  step="0.5"
                  placeholder="cm"
                  value={lengan}
                  onChange={(e) => setLengan(e.target.value)}
                  className="h-8 text-xs bg-background mt-1"
                />
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground">Dada</span>
                <Input
                  type="number"
                  step="0.5"
                  placeholder="cm"
                  value={dada}
                  onChange={(e) => setDada(e.target.value)}
                  className="h-8 text-xs bg-background mt-1"
                />
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground">Paha</span>
                <Input
                  type="number"
                  step="0.5"
                  placeholder="cm"
                  value={paha}
                  onChange={(e) => setPaha(e.target.value)}
                  className="h-8 text-xs bg-background mt-1"
                />
              </div>
            </div>
          </div>

          {/* Upload 3 Foto Progress (Kompresi WebP otomatis) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Upload Foto Fisik (Otomatis Kompres WebP ~100KB)
              </Label>
              <span className="text-[10px] text-emerald-400 font-medium">Zero-Cost Storage</span>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {/* Foto Depan */}
              <div className="flex flex-col items-center">
                <span className="text-[11px] font-semibold text-muted-foreground mb-1">Tampak Depan</span>
                <div className="relative w-full aspect-[3/4] rounded-lg border-2 border-dashed border-border/80 bg-background flex flex-col items-center justify-center overflow-hidden hover:border-primary/50 transition-colors">
                  {photoFrontPreview ? (
                    <>
                      <img
                        src={photoFrontPreview}
                        alt="Foto Depan"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoFrontFile(null)
                          setPhotoFrontPreview(null)
                        }}
                        className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-red-500"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer p-2">
                      <Camera className="h-5 w-5 text-muted-foreground mb-1" />
                      <span className="text-[10px] text-muted-foreground text-center">Pilih Foto</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handlePhotoSelect(e, setPhotoFrontFile, setPhotoFrontPreview)}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Foto Samping */}
              <div className="flex flex-col items-center">
                <span className="text-[11px] font-semibold text-muted-foreground mb-1">Tampak Samping</span>
                <div className="relative w-full aspect-[3/4] rounded-lg border-2 border-dashed border-border/80 bg-background flex flex-col items-center justify-center overflow-hidden hover:border-primary/50 transition-colors">
                  {photoSidePreview ? (
                    <>
                      <img
                        src={photoSidePreview}
                        alt="Foto Samping"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoSideFile(null)
                          setPhotoSidePreview(null)
                        }}
                        className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-red-500"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer p-2">
                      <Camera className="h-5 w-5 text-muted-foreground mb-1" />
                      <span className="text-[10px] text-muted-foreground text-center">Pilih Foto</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handlePhotoSelect(e, setPhotoSideFile, setPhotoSidePreview)}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Foto Belakang */}
              <div className="flex flex-col items-center">
                <span className="text-[11px] font-semibold text-muted-foreground mb-1">Tampak Belakang</span>
                <div className="relative w-full aspect-[3/4] rounded-lg border-2 border-dashed border-border/80 bg-background flex flex-col items-center justify-center overflow-hidden hover:border-primary/50 transition-colors">
                  {photoBackPreview ? (
                    <>
                      <img
                        src={photoBackPreview}
                        alt="Foto Belakang"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoBackFile(null)
                          setPhotoBackPreview(null)
                        }}
                        className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-red-500"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer p-2">
                      <Camera className="h-5 w-5 text-muted-foreground mb-1" />
                      <span className="text-[10px] text-muted-foreground text-center">Pilih Foto</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handlePhotoSelect(e, setPhotoBackFile, setPhotoBackPreview)}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Catatan Tambahan */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Catatan / Kondisi Fisik
            </Label>
            <textarea
              placeholder="Contoh: Otot bahu dan dada mulai kelihatan definisinya, lemak perut samping berkurang."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-border bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isUploading || createMetric.isPending}
              className="bg-emerald-500 hover:bg-emerald-600 text-black font-semibold text-xs"
            >
              {isUploading || createMetric.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Mengompres & Menyimpan...
                </>
              ) : (
                'Simpan Metrics & Foto'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
