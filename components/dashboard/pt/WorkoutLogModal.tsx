'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreatePtProgressLog } from '@/hooks/usePtProgress'
import { Plus, Trash2, Dumbbell, Sparkles, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { PtProgressCategory, ExerciseItem } from '@/lib/types'

const CATEGORIES: { label: PtProgressCategory; color: string; presets: string[] }[] = [
  {
    label: 'Push',
    color: 'border-amber-500/40 text-amber-400 bg-amber-500/10 hover:bg-amber-500/20',
    presets: ['Bench Press', 'Incline DB Press', 'Overhead Press', 'Lateral Raise', 'Tricep Pushdown', 'Dips'],
  },
  {
    label: 'Pull',
    color: 'border-blue-500/40 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20',
    presets: ['Lat Pulldown', 'Barbell Row', 'Seated Cable Row', 'Bicep Curl', 'Hammer Curl', 'Face Pull'],
  },
  {
    label: 'Leg',
    color: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20',
    presets: ['Barbell Squat', 'Leg Press', 'Romanian Deadlift', 'Leg Extension', 'Leg Curl', 'Calf Raise'],
  },
  {
    label: 'Full Body',
    color: 'border-purple-500/40 text-purple-400 bg-purple-500/10 hover:bg-purple-500/20',
    presets: ['Deadlift', 'Clean & Press', 'Kettlebell Swing', 'Thruster', 'Pull-up', 'Push-up'],
  },
  {
    label: 'Cardio',
    color: 'border-rose-500/40 text-rose-400 bg-rose-500/10 hover:bg-rose-500/20',
    presets: ['Treadmill HIIT', 'Rowing Machine', 'Assault Bike', 'Jump Rope', 'Stair Climber'],
  },
  {
    label: 'Lainnya',
    color: 'border-neutral-500/40 text-neutral-300 bg-neutral-500/10 hover:bg-neutral-500/20',
    presets: ['Core / Plank', 'Hanging Leg Raise', 'Stretching & Mobility'],
  },
]

interface WorkoutLogModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  memberId: string
  memberName: string
  sessionId?: string | null
  sessionCreatedAt?: string | null
  onSuccess?: () => void
}

export function WorkoutLogModal({
  open,
  onOpenChange,
  memberId,
  memberName,
  sessionId,
  sessionCreatedAt,
  onSuccess,
}: WorkoutLogModalProps) {
  const [category, setCategory] = useState<PtProgressCategory>('Push')
  const [notes, setNotes] = useState('')
  const [exercises, setExercises] = useState<ExerciseItem[]>([
    { name: 'Bench Press', sets: 4, reps: 12, weight_kg: 40 },
  ])

  const createLog = useCreatePtProgressLog()

  const currentCategoryData = CATEGORIES.find((c) => c.label === category) || CATEGORIES[0]

  const handleAddExercise = (presetName = '') => {
    setExercises((prev) => [
      ...prev,
      { name: presetName || '', sets: 3, reps: 10, weight_kg: 20 },
    ])
  }

  const handleRemoveExercise = (index: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== index))
  }

  const handleExerciseChange = (index: number, field: keyof ExerciseItem, value: any) => {
    setExercises((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!memberId) {
      toast.error('Pilih member terlebih dahulu')
      return
    }

    const validExercises = exercises.filter((ex) => ex.name.trim() !== '')
    if (validExercises.length === 0) {
      toast.error('Tambahkan minimal 1 jenis latihan')
      return
    }

    try {
      await createLog.mutateAsync({
        member_id: memberId,
        category,
        exercises: validExercises,
        notes: notes.trim() || null,
        pt_session_id: sessionId || null,
      })

      toast.success(`Daftar gerakan ${category} untuk ${memberName} berhasil disimpan!`)
      onOpenChange(false)
      setNotes('')
      onSuccess?.()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Gagal menyimpan catatan latihan')
    }
  }

  const formattedSessionDate = sessionCreatedAt
    ? new Date(sessionCreatedAt).toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Dumbbell className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                {sessionId ? 'Tambah Daftar Gerakan' : 'Catat Latihan Sesi PT'}
              </DialogTitle>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <span>
                  Member: <strong className="font-semibold text-foreground">{memberName}</strong>
                </span>
                {formattedSessionDate && (
                  <span className="rounded bg-primary/10 px-1.5 py-0.2 font-medium text-primary text-[11px]">
                    Sesi: {formattedSessionDate}
                  </span>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {/* Pilih Kategori Sesi */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Kategori Latihan
            </Label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.label
                return (
                  <button
                    key={cat.label}
                    type="button"
                    onClick={() => {
                      setCategory(cat.label)
                      if (exercises.length === 1 && exercises[0].name === 'Bench Press') {
                        setExercises([{ name: cat.presets[0] || '', sets: 3, reps: 10, weight_kg: 20 }])
                      }
                    }}
                    className={`flex flex-col items-center justify-center rounded-lg border py-2 px-1 text-xs font-semibold transition-all ${
                      isSelected
                        ? `${cat.color} ring-2 ring-primary/40 shadow-sm`
                        : 'border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                    }`}
                  >
                    {cat.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Quick Suggestions / Preset Chips */}
          <div className="space-y-1.5 rounded-lg bg-muted/20 p-2.5 border border-border/40">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <Sparkles className="h-3 w-3 text-primary" />
              <span>Saran Gerakan ({category}):</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {currentCategoryData.presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleAddExercise(preset)}
                  className="rounded-md border border-border/50 bg-background/60 px-2 py-0.5 text-[11px] text-foreground/80 hover:border-primary/50 hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  + {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Exercise List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Daftar Gerakan Latihan
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleAddExercise('')}
                className="h-7 text-xs border-dashed border-primary/50 text-primary hover:bg-primary/10"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Tambah Gerakan
              </Button>
            </div>

            <div className="space-y-2">
              {exercises.map((ex, index) => (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-2 rounded-lg border border-border/60 bg-card p-2.5"
                >
                  <div className="flex-1 w-full sm:w-auto">
                    <Input
                      placeholder="Nama Latihan (misal: Lat Pulldown)"
                      value={ex.name}
                      onChange={(e) => handleExerciseChange(index, 'name', e.target.value)}
                      className="h-8 text-xs bg-background"
                      required
                    />
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="flex items-center gap-1 flex-1 sm:flex-initial">
                      <Input
                        type="number"
                        min="1"
                        max="20"
                        placeholder="Set"
                        value={ex.sets}
                        onChange={(e) => handleExerciseChange(index, 'sets', parseInt(e.target.value) || 1)}
                        className="h-8 w-14 text-center text-xs bg-background"
                      />
                      <span className="text-[11px] text-muted-foreground">sets</span>
                    </div>

                    <div className="flex items-center gap-1 flex-1 sm:flex-initial">
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        placeholder="Reps"
                        value={ex.reps}
                        onChange={(e) => handleExerciseChange(index, 'reps', parseInt(e.target.value) || 1)}
                        className="h-8 w-14 text-center text-xs bg-background"
                      />
                      <span className="text-[11px] text-muted-foreground">reps</span>
                    </div>

                    <div className="flex items-center gap-1 flex-1 sm:flex-initial">
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        placeholder="Kg"
                        value={ex.weight_kg}
                        onChange={(e) => handleExerciseChange(index, 'weight_kg', parseFloat(e.target.value) || 0)}
                        className="h-8 w-16 text-center text-xs bg-background font-semibold text-accent"
                      />
                      <span className="text-[11px] text-muted-foreground">kg</span>
                    </div>

                    {exercises.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveExercise(index)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Catatan Sesi */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Catatan Trainer (Evaluasi & Saran)
            </Label>
            <textarea
              placeholder="Contoh: Form sudah stabil, tempo terkontrol baik. Minggu depan target naikkan beban 2.5kg."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
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
              disabled={createLog.isPending}
              className="bg-primary text-black font-semibold hover:bg-primary/90 text-xs"
            >
              {createLog.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Menyimpan...
                </>
              ) : (
                'Simpan Catatan Latihan'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
