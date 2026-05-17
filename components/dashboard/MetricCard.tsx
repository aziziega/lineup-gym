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
  accent?: 'neon' | 'orange' | 'red' | 'yellow' | 'muted' | 'green'
  loading?: boolean
  description?: string
}

const accentColors = {
  neon: 'text-accent',
  orange: 'text-[#FF6B35]',
  red: 'text-[#FF3B3B]',
  yellow: 'text-[#FFD400]',
  muted: 'text-[#F0F0F0]',
  green: 'text-[#10B981]', // Premium Emerald Green
}

export default function MetricCard({
  label,
  value,
  icon: Icon,
  trend,
  trendUp,
  accent = 'neon',
  loading,
  description,
}: MetricCardProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <Skeleton className="mb-3 h-4 w-20 bg-[#2A2A2A]" />
        <Skeleton className="mb-1 h-10 w-24 bg-[#2A2A2A]" />
        <Skeleton className="h-3 w-16 bg-[#2A2A2A]" />
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 transition-colors hover:border-border">
      {/* Label + Icon */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <Icon className="h-4 w-4 text-muted-foreground/60" />
      </div>

      {/* Angka besar */}
      <p className={cn('font-heading text-[36px] leading-none lg:text-[40px]', accentColors[accent])}>
        {value}
      </p>

      {/* Trend or Description */}
      {trend ? (
        <p className={cn('mt-1 text-xs', trendUp ? 'text-primary' : 'text-[#FF6B35]')}>
          {trendUp ? '↑' : '↓'} {trend}
        </p>
      ) : description ? (
        <p className="mt-1 text-[11px] text-muted-foreground font-medium">
          {description}
        </p>
      ) : null}
    </div>
  )
}
