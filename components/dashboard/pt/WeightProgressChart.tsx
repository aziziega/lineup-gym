'use client'

import { useMemo } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { Card, CardContent } from '@/components/ui/card'
import { Scale, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import type { MemberBodyMetric } from '@/lib/types'

interface WeightProgressChartProps {
  metrics: MemberBodyMetric[]
}

export function WeightProgressChart({ metrics }: WeightProgressChartProps) {
  // Filter only records that have valid weight_kg
  const chartData = useMemo(() => {
    return metrics
      .filter((m) => m.weight_kg !== null && m.weight_kg !== undefined && m.weight_kg > 0)
      .map((m) => {
        const d = new Date(m.recorded_at)
        const dateLabel = `${d.getDate()}/${d.getMonth() + 1}`
        return {
          date: dateLabel,
          fullDate: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
          weight: Number(m.weight_kg),
          phase: m.phase,
        }
      })
  }, [metrics])

  const stats = useMemo(() => {
    if (chartData.length === 0) return null
    const initial = chartData[0].weight
    const current = chartData[chartData.length - 1].weight
    const diff = Number((current - initial).toFixed(1))
    const minWeight = Math.min(...chartData.map((d) => d.weight))
    const maxWeight = Math.max(...chartData.map((d) => d.weight))

    return { initial, current, diff, minWeight, maxWeight }
  }, [chartData])

  if (chartData.length === 0) {
    return (
      <div className="flex h-52 flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-card/40 p-6 text-center">
        <Scale className="h-8 w-8 text-muted-foreground/40 mb-2" />
        <p className="text-sm font-medium text-muted-foreground">Belum ada data berat badan</p>
        <p className="text-xs text-muted-foreground/60 mt-0.5">
          Klik tombol &quot;+ Catat Metrics & Foto&quot; di atas untuk mulai memantau perkembangan fisik.
        </p>
      </div>
    )
  }

  // Domain Y-Axis dinamis agar grafik kelihatan berfluktuasi dengan indah
  const yMin = stats ? Math.floor(stats.minWeight - 2) : 40
  const yMax = stats ? Math.ceil(stats.maxWeight + 2) : 100

  return (
    <div className="space-y-4">
      {/* Stat Cards Ringkasan */}
      {stats && (
        <div className="grid grid-cols-3 gap-2.5">
          <div className="rounded-xl border border-border/50 bg-card p-3">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
              Berat Awal
            </span>
            <div className="text-base sm:text-lg font-bold text-foreground mt-0.5">
              {stats.initial} <span className="text-xs font-normal text-muted-foreground">kg</span>
            </div>
          </div>

          <div className="rounded-xl border border-border/50 bg-card p-3">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
              Berat Terkini
            </span>
            <div className="text-base sm:text-lg font-bold text-accent mt-0.5">
              {stats.current} <span className="text-xs font-normal text-muted-foreground">kg</span>
            </div>
          </div>

          <div className="rounded-xl border border-border/50 bg-card p-3">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
              Perubahan
            </span>
            <div className="flex items-center gap-1 mt-0.5">
              {stats.diff < 0 ? (
                <>
                  <TrendingDown className="h-4 w-4 text-emerald-400" />
                  <span className="text-base sm:text-lg font-bold text-emerald-400">
                    {stats.diff} <span className="text-xs font-normal">kg</span>
                  </span>
                </>
              ) : stats.diff > 0 ? (
                <>
                  <TrendingUp className="h-4 w-4 text-amber-400" />
                  <span className="text-base sm:text-lg font-bold text-amber-400">
                    +{stats.diff} <span className="text-xs font-normal">kg</span>
                  </span>
                </>
              ) : (
                <>
                  <Minus className="h-4 w-4 text-muted-foreground" />
                  <span className="text-base sm:text-lg font-bold text-muted-foreground">0 kg</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recharts LineChart */}
      <Card className="bg-card border-border/60">
        <CardContent className="pt-4 pb-2 px-2 sm:px-4">
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#888', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#333' }}
                />
                <YAxis
                  domain={[yMin, yMax]}
                  tick={{ fill: '#888', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#333' }}
                  tickFormatter={(val) => `${val}kg`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="rounded-lg border border-border bg-popover/95 p-2 shadow-xl backdrop-blur-md">
                          <p className="text-[11px] text-muted-foreground">{data.fullDate}</p>
                          <p className="text-sm font-bold text-accent">
                            {data.weight} kg
                          </p>
                          {data.phase && (
                            <span className="inline-block mt-1 rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary uppercase">
                              {data.phase.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="#D4FF00"
                  strokeWidth={2.5}
                  dot={{ fill: '#D4FF00', stroke: '#18181b', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#D4FF00' }}
                  isAnimationActive={true}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
