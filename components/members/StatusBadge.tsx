'use client'

import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: 'active' | 'expiring_soon' | 'critical' | 'expired'
}

const statusConfig = {
  active: {
    label: 'Aktif',
    className: 'bg-green-500/10 text-green-500 border-green-500/30',
  },
  expiring_soon: {
    label: 'Segera',
    className: 'bg-amber-400/10 text-amber-400 border-amber-400/30',
  },
  critical: {
    label: 'Kritis',
    className: 'bg-orange-500/15 text-orange-500 border-orange-500/30 animate-pulse-critical',
  },
  expired: {
    label: 'Expired',
    className: 'bg-red-500/10 text-red-500 border-red-500/30',
  },
}

export default function StatusBadge({ status }: { status?: string }) {
  const config = statusConfig[status as keyof typeof statusConfig]

  if (!config) {
    return (
      <span className="inline-flex items-center rounded-full border border-border bg-[#2A2A2A]/50 px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
        {status ? status : 'Tidak Aktif'}
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
        config.className
      )}
    >
      {config.label}
    </span>
  )
}
