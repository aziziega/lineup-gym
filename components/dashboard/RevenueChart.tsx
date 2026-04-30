'use client'

import { useState, FormEvent } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useMonthlyRevenue } from '@/hooks/usePayments'
import { formatRupiah } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export default function RevenueChart() {
  const { data, isLoading } = useMonthlyRevenue()
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar')
  const [monthCount, setMonthCount] = useState<number>(6)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [customMonth, setCustomMonth] = useState('12')

  if (isLoading) {
    return (
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
        <Skeleton className="mb-4 h-5 w-40 bg-[#2A2A2A]" />
        <Skeleton className="h-48 w-full bg-[#2A2A2A]" />
      </div>
    )
  }

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const currentYear = new Date().getFullYear()

  const chartData = months.map((monthName, index) => {
    const record = (data || []).find((d: any) => {
      if (!d.month) return false
      const dateObj = new Date(d.month)
      return dateObj.getFullYear() === currentYear && dateObj.getMonth() === index
    })
    return {
      name: monthName,
      revenue: record ? Number(record.total) : 0,
    }
  })

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="rounded-lg border border-[#2A2A2A] bg-[#111] px-3 py-2 text-xs">
        <p className="text-[#888]">{label}</p>
        <p className="font-heading text-base text-[#D4FF00]">{formatRupiah(payload[0].value)}</p>
      </div>
    )
  }

  const handleCustomSubmit = (e: FormEvent) => {
    e.preventDefault()
    const val = parseInt(customMonth, 10)
    if (!isNaN(val) && val > 0) {
      setMonthCount(val)
      setIsModalOpen(false)
    }
  }

  return (
    <>
      <div className="rounded-xl border border-[#2A2A2A]/50 bg-[#1A1A1A] p-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white">Revenue Overview</h3>
          </div>

          <div className="flex gap-1 rounded-lg bg-[#111] p-0.5 self-start sm:self-auto">
            <button
              onClick={() => setChartType('bar')}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${chartType === 'bar' ? 'bg-[#D4FF00] text-black' : 'text-[#888] hover:text-white'
                }`}
            >
              Bar
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${chartType === 'line' ? 'bg-[#D4FF00] text-black' : 'text-[#888] hover:text-white'
                }`}
            >
              Line
            </button>
          </div>
        </div>

        <div className="h-48 lg:h-64">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'bar' ? (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                <XAxis dataKey="name" tick={{ fill: '#888', fontSize: 11 }} />
                <YAxis tick={{ fill: '#888', fontSize: 11 }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}jt`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" fill="#D4FF00" radius={[4, 4, 0, 0]} animationBegin={200} />
              </BarChart>
            ) : (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                <XAxis dataKey="name" tick={{ fill: '#888', fontSize: 11 }} />
                <YAxis tick={{ fill: '#888', fontSize: 11 }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}jt`} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="revenue" stroke="#D4FF00" strokeWidth={2} dot={{ fill: '#D4FF00', r: 4 }} animationBegin={200} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md bg-[#1A1A1A] border-[#2A2A2A] text-white">
          <DialogHeader>
            <DialogTitle>Kustomisasi Rentang Waktu</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCustomSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="customMonth" className="text-sm font-medium text-[#888]">
                Jumlah Bulan
              </label>
              <div className="relative">
                <input
                  id="customMonth"
                  type="number"
                  min="1"
                  max="120"
                  value={customMonth}
                  onChange={(e) => setCustomMonth(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-[#2A2A2A] bg-[#111] px-3 py-2 text-sm text-white placeholder:text-[#555] focus:outline-none focus:ring-1 focus:ring-[#FF2A2A]"
                  placeholder="Contoh: 12"
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-[#555]">Masukkan berapa bulan ke belakang yang ingin ditampilkan.</p>
            </div>
            <DialogFooter className="border-t border-[#2A2A2A] bg-transparent pt-4 sm:justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="border-[#2A2A2A] bg-transparent text-white hover:bg-[#2A2A2A] hover:text-white"
              >
                Batal
              </Button>
              <Button
                type="submit"
                className="bg-[#FF2A2A] text-black hover:bg-[#FF2A2A]/90"
              >
                Terapkan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
