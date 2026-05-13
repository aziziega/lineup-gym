'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { useMembersWithSubscription } from '@/hooks/useMembers'
import { Skeleton } from '@/components/ui/skeleton'

const COLORS = ['#D4FF00', '#FF6B35', '#00D4FF', '#FF3B3B', '#888888']

export default function PackageDonutChart() {
  const { data, isLoading } = useMembersWithSubscription()

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <Skeleton className="mb-4 h-5 w-40 bg-[#2A2A2A]" />
        <Skeleton className="mx-auto h-40 w-40 rounded-full bg-[#2A2A2A]" />
      </div>
    )
  }

  // Hitung distribusi per paket
  const dist = (data || []).reduce<Record<string, number>>((acc, m) => {
    if (m.membership_name) {
      const name = m.membership_name.toUpperCase().trim()
      acc[name] = (acc[name] || 0) + 1
    }
    if (m.pt_membership_name) {
      const name = m.pt_membership_name.toUpperCase().trim()
      acc[name] = (acc[name] || 0) + 1
    }
    return acc
  }, {})

  const chartData = Object.entries(dist).map(([name, value]) => ({ name, value }))
  const totalMembers = chartData.reduce((acc, curr) => acc + curr.value, 0)

  if (chartData.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-xl border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground/60">Belum ada data member</p>
      </div>
    )
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="rounded-lg border border-border bg-background px-3 py-2 text-xs shadow-xl">
        <p className="text-muted-foreground mb-1">{payload[0].name}</p>
        <p className="font-heading text-sm text-foreground">{payload[0].value} Member</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border/50 bg-card p-5 shadow-sm">
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-foreground">Distribusi Paket</h3>
        <p className="text-[11px] text-muted-foreground">Persentase jenis membership aktif</p>
      </div>

      <div className="flex flex-col items-center">
        {/* Chart Container */}
        <div className="relative h-64 w-full max-w-[300px]">
          {/* Middle Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-4xl font-bold text-foreground tracking-tight">{totalMembers}</span>
            <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground mt-1">Total</span>
          </div>

          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={82}
                outerRadius={105}
                paddingAngle={4}
                dataKey="value"
                animationBegin={300}
                animationDuration={1500}
                stroke="none"
              >
                {chartData.map((_, idx) => (
                  <Cell 
                    key={idx} 
                    fill={COLORS[idx % COLORS.length]} 
                    className="outline-none hover:opacity-80 transition-opacity"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend Grid */}
        <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 w-full border-t border-border/30 pt-6 px-2">
          {chartData.map((entry, idx) => (
            <div key={entry.name} className="flex items-center justify-between gap-3 text-[11px]">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                />
                <span className="text-muted-foreground truncate" title={entry.name}>{entry.name}</span>
              </div>
              <span className="font-bold text-foreground shrink-0">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
