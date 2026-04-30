'use client'

import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  trend?: string
  trendUp?: boolean
  accent?: 'neon' | 'orange' | 'red' | 'muted'
  loading?: boolean
}

const accentColors = {
  neon: 'text-[#D4FF00]',
  orange: 'text-[#FF6B35]',
  red: 'text-[#FF3B3B]',
  muted: 'text-[#F0F0F0]',
}

export default function MetricCard({
  label,
  value,
  icon: Icon,
  trend,
  trendUp,
  accent = 'neon',
  loading,
}: MetricCardProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
        <Skeleton className="mb-3 h-4 w-20 bg-[#2A2A2A]" />
        <Skeleton className="mb-1 h-10 w-24 bg-[#2A2A2A]" />
        <Skeleton className="h-3 w-16 bg-[#2A2A2A]" />
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[#2A2A2A]/50 bg-[#1A1A1A] p-4 transition-colors hover:border-[#2A2A2A]">
      {/* Label + Icon */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-[#888]">
          {label}
        </span>
        <Icon className="h-4 w-4 text-[#555]" />
      </div>

      {/* Angka besar */}
      <p className={cn('font-heading text-[36px] leading-none lg:text-[40px]', accentColors[accent])}>
        {value}
      </p>

      {/* Trend */}
      {trend && (
        <p className={cn('mt-1 text-xs', trendUp ? 'text-[#FF2A2A]' : 'text-[#FF6B35]')}>
          {trendUp ? 'â†‘' : 'â†“'} {trend}
        </p>
      )}
    </div>
  )
}
