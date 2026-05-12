'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { GYM_ID } from '@/lib/constants'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, AreaChart, Area
} from 'recharts'
import { Loader2, Users, BarChart2, LineChart as LineIcon } from 'lucide-react'

const daysShort = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

export default function TrafficChart() {
  const [chartType, setChartType] = useState<'line' | 'bar'>('bar')
  const supabase = createClient()

  const { data: chartData, isLoading } = useQuery({
    queryKey: ['dashboard', 'traffic-stats-v2'],
    queryFn: async () => {
      // Ambil data 7 hari terakhir
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
      sevenDaysAgo.setHours(0, 0, 0, 0)

      const { data, error } = await supabase
        .from('attendance_logs')
        .select('check_in_at')
        .eq('gym_id', GYM_ID)
        .gte('check_in_at', sevenDaysAgo.toISOString())

      if (error) throw error

      // Define type for day data
      interface DayData {
        date: string
        dayName: string
        count: number
        isToday: boolean
      }

      // Mapping data ke 7 hari terakhir secara berurutan
      const last7Days: DayData[] = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        // Gunakan toLocaleDateString('sv-SE') agar konsisten dengan waktu lokal (WIB)
        const dateStr = d.toLocaleDateString('sv-SE')
        
        last7Days.push({
          date: dateStr,
          dayName: daysShort[d.getDay()],
          count: 0,
          isToday: i === 0
        })
      }

      data?.forEach(log => {
        // Gunakan toLocaleDateString('sv-SE') untuk mendapatkan format YYYY-MM-DD sesuai waktu lokal (WIB)
        const logDate = new Date(log.check_in_at).toLocaleDateString('sv-SE')
        const day = last7Days.find(d => d.date === logDate)
        if (day) day.count++
      })

      return last7Days
    }
  })

  if (isLoading) {
    return (
      <div className="flex h-[320px] items-center justify-center rounded-xl border border-border/50 bg-card">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border/50 bg-card p-5 shadow-sm">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Tren Kunjungan 7 Hari Terakhir
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">Memantau fluktuasi kehadiran member & visitor</p>
        </div>

        {/* Toggle Switch */}
        <div className="flex items-center gap-1 rounded-lg bg-background p-1 border border-border/50">
          <button
            onClick={() => setChartType('line')}
            className={`p-1.5 rounded-md transition-all ${chartType === 'line' ? 'bg-primary text-black shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <LineIcon className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setChartType('bar')}
            className={`p-1.5 rounded-md transition-all ${chartType === 'bar' ? 'bg-primary text-black shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <BarChart2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'line' ? (
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D4FF00" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#D4FF00" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1A1A1A" />
              <XAxis
                dataKey="dayName"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#666', fontSize: 11 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#666', fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0A0A0A',
                  border: '1px solid #1A1A1A',
                  borderRadius: '12px',
                  fontSize: '12px',
                  color: '#fff'
                }}
                itemStyle={{ color: '#D4FF00' }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#D4FF00"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorCount)"
                animationDuration={1500}
                dot={(props: any) => {
                  const { cx, cy, payload } = props
                  if (payload.isToday) {
                    return (
                      <circle
                        key={`dot-${payload.date}`}
                        cx={cx}
                        cy={cy}
                        r={6}
                        fill="#FF2A2A"
                        stroke="#0A0A0A"
                        strokeWidth={2}
                      />
                    )
                  }
                  return <circle key={`dot-${payload.date}`} cx={cx} cy={cy} r={4} fill="#D4FF00" stroke="#0A0A0A" strokeWidth={1} />
                }}
                activeDot={{ r: 8, fill: '#FF2A2A', stroke: '#0A0A0A', strokeWidth: 2 }}
              />
            </AreaChart>
          ) : (
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1A1A1A" />
              <XAxis
                dataKey="dayName"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#666', fontSize: 11 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#666', fontSize: 11 }}
              />
              <Tooltip
                cursor={{ fill: 'rgba(212, 255, 0, 0.05)' }}
                contentStyle={{
                  backgroundColor: '#0A0A0A',
                  border: '1px solid #1A1A1A',
                  borderRadius: '12px',
                  fontSize: '12px'
                }}
                itemStyle={{ color: '#D4FF00' }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={24}>
                {chartData?.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isToday ? '#FF2A2A' : '#D4FF00'}
                    fillOpacity={entry.isToday ? 1 : 0.7}
                  />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      <div className="mt-6 flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/30 pt-4">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#D4FF00' }} /> Normal
          </span>
          <span className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#FF2A2A' }} /> Hari Ini
          </span>
        </div>
        <span className="italic">Data real-time dari database</span>
      </div>
    </div>
  )
}
