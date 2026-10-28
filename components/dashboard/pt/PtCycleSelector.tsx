'use client'

import React, { useState, useMemo } from 'react'
import { Sparkles, ChevronsUpDown, Check, Calendar, ArrowDownUp } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { PtSubscriptionCycle } from '@/hooks/usePtSessions'

interface PtCycleSelectorProps {
  cycles: PtSubscriptionCycle[]
  selectedCycleId: string
  onSelectCycle: (cycleId: string) => void
  className?: string
  compact?: boolean
}

export function PtCycleSelector({
  cycles,
  selectedCycleId,
  onSelectCycle,
  className = '',
  compact = false,
}: PtCycleSelectorProps) {
  const [open, setOpen] = useState(false)

  // Deklarasikan semua hooks di bagian paling atas tanpa syarat (React Rules of Hooks)
  const sortedCycles = useMemo(() => {
    if (!cycles || cycles.length === 0) return []
    return [...cycles].sort((a, b) => b.cycle_number - a.cycle_number)
  }, [cycles])

  const currentCycle = useMemo(() => {
    if (!cycles || cycles.length === 0) return null
    return cycles.find((c) => c.id === selectedCycleId) || cycles[0] || null
  }, [cycles, selectedCycleId])

  // Early return hanya boleh dieksekusi SETELAH semua hooks dideklarasikan
  if (!cycles || cycles.length <= 1 || !currentCycle) return null

  // Threshold Opsi A: Jika <= 4 siklus, gunakan Chip Horizontal
  const isChipMode = cycles.length <= 4

  if (isChipMode) {
    return (
      <div className={`flex items-center gap-2 overflow-x-auto scrollbar-none ${className}`}>
        <span className="text-[11px] text-muted-foreground font-semibold shrink-0 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Siklus Paket:
        </span>
        <div className="flex items-center gap-1.5">
          {cycles.map((c) => {
            const isSel = c.id === currentCycle?.id
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelectCycle(c.id)}
                className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all border ${
                  isSel
                    ? 'bg-primary text-black border-primary shadow-xs font-bold'
                    : 'bg-muted/30 border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/60'
                }`}
              >
                <span>Siklus {c.cycle_number}</span>
                <span
                  className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                    isSel
                      ? 'bg-black/20 text-black'
                      : c.is_active
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : c.remaining_sessions === 0
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-neutral-500/20 text-neutral-400'
                  }`}
                >
                  {c.is_active ? 'Aktif' : c.remaining_sessions === 0 ? 'Lulus' : 'Selesai'}
                </span>
                <span className="text-[10px] opacity-75">
                  ({c.remaining_sessions}/{c.total_sessions} Sesi)
                </span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // Jika > 4 siklus: Gunakan Smart Dropdown / Popover (Opsi A)
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1.5 shrink-0">
        <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="text-[11px] text-muted-foreground font-semibold">
          Siklus Paket:
        </span>
        <span className="text-[10px] bg-muted/60 text-muted-foreground px-1.5 py-0.5 rounded-full font-medium">
          {cycles.length} Riwayat
        </span>
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={<button type="button" />}
          className="flex w-full sm:w-auto items-center justify-between gap-2.5 rounded-lg border border-border/80 bg-card hover:bg-muted/40 px-2.5 py-1.5 text-xs text-foreground transition-all shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <div className="flex items-center gap-2 truncate">
            <span className="font-bold text-foreground">
              Siklus {currentCycle.cycle_number}
            </span>
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                currentCycle.is_active
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : currentCycle.remaining_sessions === 0
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-neutral-500/20 text-neutral-400 border border-neutral-500/30'
              }`}
            >
              {currentCycle.is_active
                ? 'Aktif'
                : currentCycle.remaining_sessions === 0
                ? 'Lulus'
                : 'Selesai'}
            </span>
            <span className="text-[11px] text-muted-foreground truncate">
              ({currentCycle.remaining_sessions}/{currentCycle.total_sessions} Sesi)
            </span>
          </div>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-60" />
        </PopoverTrigger>

        <PopoverContent
          className="w-[300px] sm:w-[340px] p-0 rounded-xl border border-border bg-card shadow-xl overflow-hidden"
          sideOffset={6}
          align="start"
        >
          {/* Header Popover */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-muted/30">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <ArrowDownUp className="h-3.5 w-3.5 text-primary" />
              <span>Pilih Siklus Paket PT</span>
            </div>
            <span className="text-[10px] text-muted-foreground">
              {cycles.length} Siklus Terdata
            </span>
          </div>

          {/* List Siklus Terurut Terbaru di Atas */}
          <div className="max-h-64 overflow-y-auto divide-y divide-border/30 p-1">
            {sortedCycles.map((c) => {
              const isSel = c.id === currentCycle.id
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onSelectCycle(c.id)
                    setOpen(false)
                  }}
                  className={`w-full text-left p-2 rounded-lg text-xs transition-colors flex items-center justify-between gap-2 ${
                    isSel
                      ? 'bg-primary/10 text-foreground font-semibold border-l-2 border-primary'
                      : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-foreground">
                        Siklus {c.cycle_number}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                          c.is_active
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : c.remaining_sessions === 0
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-neutral-500/20 text-neutral-400'
                        }`}
                      >
                        {c.is_active
                          ? 'Aktif'
                          : c.remaining_sessions === 0
                          ? 'Lulus'
                          : 'Selesai'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span>{c.membership_name || 'Paket PT'}</span>
                      <span>•</span>
                      <span>
                        Sisa {c.remaining_sessions}/{c.total_sessions} Sesi
                      </span>
                    </div>

                    {(c.start_date || c.end_date) && (
                      <div className="flex items-center gap-1 text-[9px] text-muted-foreground/75">
                        <Calendar className="h-2.5 w-2.5" />
                        <span>
                          {c.start_date
                            ? new Date(c.start_date).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '-'}{' '}
                          s/d{' '}
                          {c.end_date
                            ? new Date(c.end_date).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '-'}
                        </span>
                      </div>
                    )}
                  </div>

                  {isSel && (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  )}
                </button>
              )
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
