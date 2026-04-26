'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

interface NativeSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[]
  placeholder?: string
  triggerClassName?: string
}

/**
 * NativeSelect — drop-in replacement for Base UI Select.
 * Uses a real <select> element so it works reliably on desktop (click, scroll, keyboard).
 */
export default function NativeSelect({
  options,
  placeholder,
  value,
  onChange,
  triggerClassName,
  className,
  ...props
}: NativeSelectProps) {
  return (
    <div className={cn('relative', className)}>
      <select
        value={value || ''}
        onChange={onChange}
        className={cn(
          'flex w-full cursor-pointer appearance-none items-center rounded-lg border border-[#2A2A2A] bg-[#111] px-3 py-2 pr-8 text-sm text-white transition-colors outline-none hover:bg-[#1A1A1A] focus:ring-2 focus:ring-[#D4FF00]/30',
          !value && 'text-[#555]',
          triggerClassName
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled className="bg-[#111] text-[#555]">
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-[#111] text-white">
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#555]" />
    </div>
  )
}
