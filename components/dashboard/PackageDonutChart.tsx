'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { useMembersWithSubscription } from '@/hooks/useMembers'
import { Skeleton } from '@/components/ui/skeleton'

const COLORS = ['#D4FF00', '#FF6B35', '#00D4FF', '#FF3B3B', '#888888']

export default function PackageDonutChart() {
  const { data, isLoading } = useMembersWithSubscription()

  if (isLoading) {
    return (
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
        <Skeleton className="mb-4 h-5 w-40 bg-[#2A2A2A]" />
        <Skeleton className="mx-auto h-40 w-40 rounded-full bg-[#2A2A2A]" />
      </div>
    )
  }

  // Hitung distribusi per paket
  const dist = (data || []).reduce<Record<string, number>>((acc, m) => {
    if (m.membership_name) {
      acc[m.membership_name] = (acc[m.membership_name] || 0) + 1
    }
    if (m.pt_membership_name) {
      acc[m.pt_membership_name] = (acc[m.pt_membership_name] || 0) + 1
    }
    return acc
  }, {})

  const chartData = Object.entries(dist).map(([name, value]) => ({ name, value }))

  if (chartData.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
        <p className="text-sm text-[#555]">Belum ada data member</p>
      </div>
    )
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="rounded-lg border border-[#2A2A2A] bg-[#111] px-3 py-2 text-xs">
        <p className="text-[#888]">{payload[0].name}</p>
        <p className="font-heading text-base text-white">{payload[0].value} member</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[#2A2A2A]/50 bg-[#1A1A1A] p-4">
      <h3 className="mb-4 text-sm font-semibold text-white">Distribusi Paket</h3>

      <div className="flex flex-col items-center gap-4 sm:flex-row">
        <div className="h-40 w-40 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={3}
                dataKey="value"
                animationBegin={300}
              >
                {chartData.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="space-y-2">
          {chartData.map((entry, idx) => (
            <div key={entry.name} className="flex items-center gap-2 text-xs">
              <div
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: COLORS[idx % COLORS.length] }}
              />
              <span className="text-[#888]">{entry.name}</span>
              <span className="font-semibold text-white">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
