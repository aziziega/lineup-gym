'use client'

import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: 'active' | 'expiring_soon' | 'critical' | 'expired'
}

const statusConfig = {
  active: {
    label: 'Aktif',
    className: 'bg-[#D4FF00]/10 text-[#D4FF00] border-[#D4FF00]/30',
  },
  expiring_soon: {
    label: 'Segera',
    className: 'bg-[#FF6B35]/10 text-[#FF6B35] border-[#FF6B35]/30',
  },
  critical: {
    label: 'Kritis',
    className: 'bg-[#FF0000]/15 text-[#FF3333] border-[#FF3333]/30 animate-pulse-critical',
  },
  expired: {
    label: 'Expired',
    className: 'bg-[#FF3B3B]/10 text-[#FF4444] border-[#FF4444]/30',
  },
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status]

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
