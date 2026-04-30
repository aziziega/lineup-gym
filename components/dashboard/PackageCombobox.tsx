'use client'

import * as React from 'react'
import { useState, useMemo, useRef, useEffect } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { ChevronsUpDown, Check, Search, X } from 'lucide-react'
import type { Membership } from '@/lib/types'
import { formatRupiah } from '@/lib/utils'

interface PackageComboboxProps {
  packages: Membership[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  className?: string
}

export default function PackageCombobox({
  packages,
  value,
  onValueChange,
  placeholder = 'Pilih paket...',
  className,
}: PackageComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [highlightedIndex, setHighlightedIndex] = useState(0)

  // Filter packages based on search
  const filtered = useMemo(() => {
    if (!search.trim()) return packages
    const s = search.toLowerCase()
    return packages.filter(
      (p) => p.name.toLowerCase().includes(s)
    )
  }, [packages, search])

  // Reset highlight when filter changes
  useEffect(() => {
    setHighlightedIndex(0)
  }, [filtered.length])

  // Auto-focus the search input when popover opens
  useEffect(() => {
    if (open) {
      setSearch('')
      setHighlightedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Selected package display name
  const selectedPackage = packages.find((p) => p.id === value)

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((prev) => Math.min(prev + 1, filtered.length - 1))
      scrollToHighlighted(Math.min(highlightedIndex + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((prev) => Math.max(prev - 1, 0))
      scrollToHighlighted(Math.max(highlightedIndex - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[highlightedIndex]) {
        onValueChange(filtered[highlightedIndex].id)
        setOpen(false)
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const scrollToHighlighted = (index: number) => {
    if (listRef.current) {
      const items = listRef.current.querySelectorAll('[data-combobox-item]')
      items[index]?.scrollIntoView({ block: 'nearest' })
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          'flex w-full items-center justify-between gap-1.5 rounded-lg border border-[#2A2A2A] bg-[#111] px-3 py-2 text-sm text-white transition-colors hover:bg-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#FF2A2A]/30',
          !value && 'text-[#555]',
          className
        )}
        render={<button type="button" />}
      >
        <span className="truncate">
          {selectedPackage ? selectedPackage.name : placeholder}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-[#555]" />
      </PopoverTrigger>

      <PopoverContent
        className="w-[--anchor-width] overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#111] p-0 shadow-xl shadow-black/40"
        sideOffset={4}
        align="start"
      >
        {/* Search input */}
        <div className="flex items-center gap-2 border-b border-[#2A2A2A] px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-[#555]" />
          <input
            ref={inputRef}
            placeholder="Cari paket..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-[#555] outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="text-[#555] hover:text-white transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* List */}
        <div
          ref={listRef}
          className="max-h-[200px] overflow-y-auto overscroll-contain py-1"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#2A2A2A #111' }}
        >
          {filtered.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-[#555]">Paket tidak ditemukan</p>
            </div>
          ) : (
            <>
              {filtered.map((p, index) => {
                const isSelected = value === p.id
                const isHighlighted = highlightedIndex === index
                return (
                  <button
                    key={p.id}
                    type="button"
                    data-combobox-item
                    onClick={() => {
                      onValueChange(p.id)
                      setOpen(false)
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
                      isHighlighted && 'bg-[#1A1A1A]',
                      isSelected && 'text-[#FF2A2A]',
                      !isSelected && 'text-white'
                    )}
                  >
                    <Check
                      className={cn(
                        'h-4 w-4 shrink-0 transition-opacity',
                        isSelected
                          ? 'opacity-100 text-[#FF2A2A]'
                          : 'opacity-0'
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{p.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <p className="truncate text-[11px] text-[#555]">{formatRupiah(p.price)}</p>
                        <span className="shrink-0 rounded bg-[#2A2A2A] px-1.5 py-0.5 text-[10px] text-[#FF2A2A]">
                          {p.category === 'pt' ? `${p.total_sessions} Sesi` : `${p.duration_days} Hari`}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
