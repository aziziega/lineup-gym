'use client'

import * as React from 'react'
import { useState, useMemo, useRef, useEffect } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { ChevronsUpDown, Check, Search, X } from 'lucide-react'

interface MemberOption {
  id: string
  full_name: string
  phone?: string
}

interface MemberComboboxProps {
  members: MemberOption[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  className?: string
  /** Map of member ID => status label (e.g. 'Expired 5 hari lalu') */
  statusMap?: Map<string, string>
  /** Custom message when member list is empty */
  emptyMessage?: string
}

export default function MemberCombobox({
  members,
  value,
  onValueChange,
  placeholder = 'Pilih member...',
  className,
  statusMap,
  emptyMessage,
}: MemberComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [highlightedIndex, setHighlightedIndex] = useState(0)

  // Filter members based on search
  const filtered = useMemo(() => {
    if (!search.trim()) return members
    const s = search.toLowerCase()
    return members.filter(
      (m) =>
        m.full_name.toLowerCase().includes(s) ||
        (m.phone && m.phone.includes(s))
    )
  }, [members, search])

  // Reset highlight when filter changes
  useEffect(() => {
    setHighlightedIndex(0)
  }, [filtered.length])

  // Auto-focus the search input when popover opens
  useEffect(() => {
    if (open) {
      setSearch('')
      setHighlightedIndex(0)
      // Small delay to wait for popover to render
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Selected member display name
  const selectedMember = members.find((m) => m.id === value)

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
          'flex w-full items-center justify-between gap-1.5 rounded-lg border border-[#2A2A2A] bg-[#111] px-3 py-2 text-sm text-white transition-colors hover:bg-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#D4FF00]/30',
          !value && 'text-[#555]',
          className
        )}
        render={<button type="button" />}
      >
        <span className="truncate">
          {selectedMember ? selectedMember.full_name : placeholder}
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
            placeholder="Cari nama member..."
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

        {/* Member list */}
        <div
          ref={listRef}
          className="max-h-[200px] overflow-y-auto overscroll-contain py-1"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#2A2A2A #111' }}
        >
          {filtered.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-[#555]">{emptyMessage || 'Member tidak ditemukan'}</p>
              {!emptyMessage && <p className="mt-1 text-xs text-[#444]">Coba kata kunci lain</p>}
            </div>
          ) : (
            <>
              <div className="px-3 py-1">
                <span className="text-[10px] font-medium uppercase tracking-wider text-[#444]">
                  {filtered.length} member ditemukan
                </span>
              </div>
              {filtered.map((m, index) => {
                const isSelected = value === m.id
                const isHighlighted = highlightedIndex === index
                return (
                  <button
                    key={m.id}
                    type="button"
                    data-combobox-item
                    onClick={() => {
                      onValueChange(m.id)
                      setOpen(false)
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
                      isHighlighted && 'bg-[#1A1A1A]',
                      isSelected && 'text-[#D4FF00]',
                      !isSelected && 'text-white'
                    )}
                  >
                    <Check
                      className={cn(
                        'h-4 w-4 shrink-0 transition-opacity',
                        isSelected
                          ? 'opacity-100 text-[#D4FF00]'
                          : 'opacity-0'
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{m.full_name}</p>
                      <div className="flex items-center gap-1.5">
                        {m.phone && (
                          <p className="truncate text-[11px] text-[#555]">{m.phone}</p>
                        )}
                        {statusMap?.get(m.id) && (
                          <span className="shrink-0 rounded bg-[#2A2A2A] px-1.5 py-0.5 text-[10px] text-[#D4FF00]">
                            {statusMap.get(m.id)}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </>
          )}
        </div>

        {/* Quick count footer */}
        {members.length > 10 && (
          <div className="border-t border-[#2A2A2A] px-3 py-1.5">
            <p className="text-[10px] text-[#444]">
              Total {members.length} member · Ketik untuk mencari
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
