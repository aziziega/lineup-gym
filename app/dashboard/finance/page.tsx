'use client'

import { useState, useMemo, useEffect } from 'react'
import { usePayments, useCurrentMonthRevenue, useUpdatePayment, useDeletePayment, useCreatePayment } from '@/hooks/usePayments'
import { useMonthlyRevenue } from '@/hooks/usePayments'
import { useMembers, useMembersWithSubscription } from '@/hooks/useMembers'
import { useActiveMemberships } from '@/hooks/useMemberships'
import { formatRupiah, formatTanggal } from '@/lib/utils'
import MetricCard from '@/components/dashboard/MetricCard'
import ExportFinanceModal from '@/components/dashboard/ExportFinanceModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import NativeSelect from '@/components/dashboard/NativeSelect'
import { Wallet, TrendingUp, Calculator, Plus, Download, Search, Edit2, Trash2, Receipt, CalendarDays } from 'lucide-react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { useExpenses, useCurrentMonthExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense } from '@/hooks/useExpenses'
import { toast } from 'sonner'

export default function FinancePage() {
  const { data: payments, isLoading } = usePayments()
  const { data: currentMonth } = useCurrentMonthRevenue()
  const { data: monthlyRevenue } = useMonthlyRevenue()
  const updatePayment = useUpdatePayment()
  const deletePayment = useDeletePayment()

  // Expenses hooks
  const { data: expenses, isLoading: expLoading } = useExpenses()
  const { data: currentMonthExp } = useCurrentMonthExpenses()
  const createExpense = useCreateExpense()
  const updateExpense = useUpdateExpense()
  const deleteExpense = useDeleteExpense()
  const createPayment = useCreatePayment()

  // Search & Filter for Expenses
  const [searchExp, setSearchExp] = useState('')
  const [filterExpCategory, setFilterExpCategory] = useState<string>('all')

  // Income Form
  const [incOpen, setIncOpen] = useState(false)
  const [incAmount, setIncAmount] = useState('')
  const [incDesc, setIncDesc] = useState('')
  const [incDate, setIncDate] = useState(new Date().toISOString().split('T')[0])
  const [incMethod, setIncMethod] = useState<'cash' | 'transfer' | 'qris'>('cash')

  const [search, setSearch] = useState('')
  const [filterMethod, setFilterMethod] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<'income' | 'expenses'>('income')
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar')
  const [customModalOpen, setCustomModalOpen] = useState(false)
  const [customMonth, setCustomMonth] = useState('12')

  // Date filter (default: today)
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])

  // Edit Form (Payment)
  const [editOpen, setEditOpen] = useState(false)
  const [editData, setEditData] = useState<any>(null)

  // Delete Dialog (Payment)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string>('')

  // Expenses Form
  const [expOpen, setExpOpen] = useState(false)
  const [expCategory, setExpCategory] = useState('operasional')
  const [expAmount, setExpAmount] = useState('')
  const [expDesc, setExpDesc] = useState('')
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0])

  // Export Modal State
  const [exportOpen, setExportOpen] = useState(false)

  // Edit Form (Expense)
  const [editExpOpen, setEditExpOpen] = useState(false)
  const [editExpData, setEditExpData] = useState<any>(null)

  // Delete Dialog (Expense)
  const [deleteExpOpen, setDeleteExpOpen] = useState(false)
  const [deleteExpId, setDeleteExpId] = useState<string>('')

  // YTD
  const ytdRevenue = useMemo(() => {
    const year = new Date().getFullYear()
    return (monthlyRevenue || [])
      .filter((r) => new Date(r.month).getFullYear() === year)
      .reduce((sum, r) => sum + Number(r.total), 0)
  }, [monthlyRevenue])

  const avgPerTx = currentMonth && currentMonth.count > 0
    ? currentMonth.total / currentMonth.count
    : 0

  const netProfit = (currentMonth?.total || 0) - (currentMonthExp?.total || 0)

  // Filter payments by selectedDate + search + method
  const filtered = useMemo(() => {
    let list = payments || []
    // Filter by selected date
    list = list.filter((p: any) => {
      const paidDate = p.paid_at?.split('T')[0]
      return paidDate === selectedDate
    })
    if (search) {
      const s = search.toLowerCase()
      list = list.filter((p: any) => p.members?.full_name?.toLowerCase().includes(s))
    }
    if (filterMethod !== 'all') {
      list = list.filter((p: any) => p.payment_method === filterMethod)
    }
    return list
  }, [payments, search, filterMethod, selectedDate])

  // Filter expenses by selectedDate + search + category
  const filteredExpenses = useMemo(() => {
    let list = expenses || []

    // Filter by date
    list = list.filter((e: any) => {
      const expDate = e.expense_date?.split('T')[0]
      return expDate === selectedDate
    })

    // Filter by search
    if (searchExp) {
      const s = searchExp.toLowerCase()
      list = list.filter((e: any) => e.description?.toLowerCase().includes(s))
    }

    // Filter by category
    if (filterExpCategory !== 'all') {
      list = list.filter((e: any) => e.category === filterExpCategory)
    }

    return list
  }, [expenses, selectedDate, searchExp, filterExpCategory])

  // Chart data (income + expenses aggregated by month for full current year)
  const chartData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const currentYear = new Date().getFullYear()

    const expMap: Record<number, number> = {}
    for (const e of expenses || []) {
      if (!e.expense_date) continue
      const dObj = new Date(e.expense_date)
      if (dObj.getFullYear() === currentYear) {
        const mIdx = dObj.getMonth()
        expMap[mIdx] = (expMap[mIdx] || 0) + Number(e.amount)
      }
    }

    const incMap: Record<number, number> = {}
    for (const d of monthlyRevenue || []) {
      if (!d.month) continue
      const dObj = new Date(d.month)
      if (dObj.getFullYear() === currentYear) {
        const mIdx = dObj.getMonth()
        incMap[mIdx] = (incMap[mIdx] || 0) + Number(d.total)
      }
    }

    return months.map((monthName, index) => ({
      name: monthName,
      pemasukan: incMap[index] || 0,
      pengeluaran: expMap[index] || 0,
    }))
  }, [monthlyRevenue, expenses])

  // Selected date formatted for display
  const selectedDateFormatted = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }).format(new Date(selectedDate + 'T00:00:00'))

  const handleEditSave = async () => {
    if (!editData) return
    try {
      await updatePayment.mutateAsync({
        id: editData.id,
        data: {
          amount: editData.amount,
          payment_method: editData.payment_method,
          notes: editData.notes,
        }
      })
      toast.success('Pembayaran berhasil di-update!')
      setEditOpen(false)
    } catch {
      toast.error('Gagal meng-update pembayaran')
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteId) return
    try {
      await deletePayment.mutateAsync(deleteId)
      toast.success('Pembayaran berhasil dihapus')
      setDeleteOpen(false)
      setDeleteId('')
    } catch {
      toast.error('Gagal menghapus pembayaran')
    }
  }

  const handleAddIncome = async () => {
    if (!incAmount || !incDesc) return
    try {
      await createPayment.mutateAsync({
        member_id: null,
        amount: Number(incAmount),
        payment_method: incMethod,
        membership_type: 'Pemasukan Lainnya',
        notes: incDesc,
        paid_at: incDate,
      })
      toast.success('Pemasukan tambahan berhasil dicatat!')
      setIncOpen(false)
      setIncAmount('')
      setIncDesc('')
      setIncDate(new Date().toISOString().split('T')[0])
    } catch {
      toast.error('Gagal mencatat pemasukan tambahan')
    }
  }

  const handleAddExpense = async () => {
    if (!expAmount || isNaN(Number(expAmount))) return
    try {
      await createExpense.mutateAsync({
        category: expCategory,
        amount: Number(expAmount),
        expense_date: expDate,
        description: expDesc
      })
      toast.success('Pengeluaran berhasil dicatat!')
      setExpOpen(false)
      setExpAmount('')
      setExpDesc('')
    } catch {
      toast.error('Gagal mencatat pengeluaran')
    }
  }

  const handleEditExpenseSave = async () => {
    if (!editExpData) return
    try {
      await updateExpense.mutateAsync({
        id: editExpData.id,
        data: {
          category: editExpData.category,
          amount: editExpData.amount,
          description: editExpData.description,
          expense_date: editExpData.expense_date,
        }
      })
      toast.success('Pengeluaran berhasil di-update!')
      setEditExpOpen(false)
    } catch {
      toast.error('Gagal meng-update pengeluaran')
    }
  }

  const handleDeleteExpenseConfirm = async () => {
    if (!deleteExpId) return
    try {
      await deleteExpense.mutateAsync(deleteExpId)
      toast.success('Pengeluaran berhasil dihapus')
      setDeleteExpOpen(false)
      setDeleteExpId('')
    } catch {
      toast.error('Gagal menghapus pengeluaran')
    }
  }



  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="rounded-lg border border-[#2A2A2A] bg-[#111] px-3 py-2 text-xs">
        <p className="mb-1 text-[#888]">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} style={{ color: entry.color }} className="font-heading text-sm">
            {entry.name === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran'}: {formatRupiah(entry.value)}
          </p>
        ))}
      </div>
    )
  }

  const categoryLabels: Record<string, string> = {
    operasional: 'Operasional',
    maintenance: 'Maintenance',
    gaji: 'Gaji Staff / PT',
    marketing: 'Marketing',
    lainnya: 'Lainnya',
  }

  return (
    <div className="space-y-5">
      {/* Date Header + Date Picker */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-heading text-lg text-white">Laporan Keuangan</h2>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-[#888]" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-lg border border-[#2A2A2A] bg-[#111] px-3 py-1.5 text-sm text-white [color-scheme:dark]"
          />
        </div>
      </div>
      <p className="-mt-3 text-xs text-[#888]">{selectedDateFormatted}</p>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Revenue Bulan Ini" value={formatRupiah(currentMonth?.total ?? 0)} icon={Wallet} accent="neon" />
        <MetricCard label="Pengeluaran Bulan Ini" value={formatRupiah(currentMonthExp?.total ?? 0)} icon={Receipt} accent="red" />
        <MetricCard label="Profit Bersih (Net)" value={formatRupiah(netProfit)} icon={TrendingUp} accent="neon" />
        <MetricCard label="Rata-rata / Transaksi" value={formatRupiah(avgPerTx)} icon={Calculator} accent="muted" />
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-[#2A2A2A]/50 bg-[#1A1A1A] p-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white">Revenue Lineup GYM</h3>
            <div className="ml-2 flex gap-1 rounded-lg bg-[#111] p-0.5">
            </div>
          </div>
          <div className="flex gap-1 rounded-lg bg-[#111] p-0.5 self-start sm:self-auto">
            <button onClick={() => setChartType('bar')} className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${chartType === 'bar' ? 'bg-[#FF2A2A] text-black' : 'text-[#888] hover:text-white'}`}>Bar</button>
            <button onClick={() => setChartType('line')} className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${chartType === 'line' ? 'bg-[#FF2A2A] text-black' : 'text-[#888] hover:text-white'}`}>Line</button>
          </div>
        </div>
        {chartData.length > 0 ? (
          <div className="h-48 lg:h-64">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                  <XAxis dataKey="name" tick={{ fill: '#888', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#888', fontSize: 11 }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}jt`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="pemasukan" fill="#D4FF00" radius={[4, 4, 0, 0]} animationBegin={200} />
                  <Bar dataKey="pengeluaran" fill="#EF4444" radius={[4, 4, 0, 0]} animationBegin={200} />
                </BarChart>
              ) : (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                  <XAxis dataKey="name" tick={{ fill: '#888', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#888', fontSize: 11 }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}jt`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="pemasukan" stroke="#D4FF00" strokeWidth={2} dot={{ fill: '#D4FF00', r: 4 }} animationBegin={200} />
                  <Line type="monotone" dataKey="pengeluaran" stroke="#EF4444" strokeWidth={2} dot={{ fill: '#EF4444', r: 4 }} animationBegin={200} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-48 items-center justify-center">
            <p className="text-sm text-[#555]">Belum ada data revenue</p>
          </div>
        )}
      </div>

      {/* Custom Month Dialog */}
      <Dialog open={customModalOpen} onOpenChange={setCustomModalOpen}>
        <DialogContent className="sm:max-w-md border-[#2A2A2A] bg-[#1A1A1A] text-white">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Kustomisasi Rentang Waktu</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); const val = parseInt(customMonth, 10); if (!isNaN(val) && val > 0) { setCustomModalOpen(false); } }} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm text-[#888]">Jumlah Bulan</Label>
              <Input type="number" min="1" max="120" value={customMonth} onChange={(e) => setCustomMonth(e.target.value)} className="border-[#2A2A2A] bg-[#111] text-white" autoFocus />
              <p className="text-[11px] text-[#555]">Masukkan berapa bulan ke belakang yang ingin ditampilkan.</p>
            </div>
            <DialogFooter className="border-t border-[#2A2A2A] bg-transparent pt-4 sm:justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCustomModalOpen(false)} className="border-[#2A2A2A] text-white hover:bg-[#2A2A2A]">Batal</Button>
              <Button type="submit" className="bg-[#FF2A2A] text-black hover:bg-[#FF2A2A]/90">Terapkan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Tabs Custom */}
      <div className="flex gap-2 rounded-xl bg-[#1A1A1A] p-1 border border-[#2A2A2A]">
        <button
          onClick={() => setActiveTab('income')}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${activeTab === 'income' ? 'bg-[#D4FF00] text-black' : 'text-[#888] hover:text-white'
            }`}
        >
          Pemasukan
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${activeTab === 'expenses' ? 'bg-[#FF2A2A] text-black' : 'text-[#888] hover:text-white'
            }`}
        >
          Pengeluaran
        </button>
      </div>

      {activeTab === 'income' && (
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-semibold text-white">Pemasukan <span className="text-[10px] font-normal text-[#555]">(otomatis dari pendaftaran member)</span></h3>
            <div className="flex gap-2">
              <div className="relative flex-1 sm:w-48 sm:flex-none">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#555]" />
                <Input
                  placeholder="Cari nama..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="border-[#2A2A2A] bg-[#1A1A1A] pl-9 text-sm text-white placeholder:text-[#555]"
                />
              </div>
              <NativeSelect
                value={filterMethod}
                onChange={(e) => setFilterMethod(e.target.value)}
                options={[
                  { value: 'all', label: 'Semua' },
                  { value: 'cash', label: 'Cash' },
                  { value: 'transfer', label: 'Transfer' },
                  { value: 'qris', label: 'QRIS' },
                ]}
                triggerClassName="w-28 text-xs"
              />
              <Button size="sm" variant="outline" onClick={() => setExportOpen(true)} className="border-[#2A2A2A] text-xs text-[#888]">
                <Download className="mr-1 h-3.5 w-3.5" /> Export Excel
              </Button>

              <Dialog open={incOpen} onOpenChange={setIncOpen}>
                <DialogTrigger render={<Button size="sm" className="bg-[#D4FF00] text-xs font-bold text-black hover:bg-[#c5ef00]" />}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> Catat Pemasukan
                </DialogTrigger>
                <DialogContent className="border-[#2A2A2A] bg-[#1A1A1A] text-white sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="font-heading text-xl">Catat Pemasukan Tambahan</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 pt-4">
                    <div>
                      <Label className="text-xs text-[#888]">Keterangan (Contoh: Jualan Air)</Label>
                      <Input value={incDesc} onChange={(e) => setIncDesc(e.target.value)} className="border-[#2A2A2A] bg-[#111] text-white" />
                    </div>
                    <div>
                      <Label className="text-xs text-[#888]">Nominal Pemasukan (Rp)</Label>
                      <Input type="number" value={incAmount} onChange={(e) => setIncAmount(e.target.value)} className="border-[#2A2A2A] bg-[#111] text-white" />
                    </div>
                    <div>
                      <Label className="text-xs text-[#888]">Metode Bayar</Label>
                      <NativeSelect
                        value={incMethod}
                        onChange={(e) => setIncMethod(e.target.value as 'cash' | 'transfer' | 'qris')}
                        options={[
                          { value: 'cash', label: 'Cash' },
                          { value: 'transfer', label: 'Transfer' },
                          { value: 'qris', label: 'QRIS' },
                        ]}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-[#888]">Tanggal</Label>
                      <Input type="date" value={incDate} onChange={(e) => setIncDate(e.target.value)} className="border-[#2A2A2A] bg-[#111] text-white" />
                    </div>
                    <Button onClick={handleAddIncome} disabled={createPayment.isPending} className="mt-2 w-full bg-[#D4FF00] font-bold text-black hover:bg-[#c5ef00]">
                      {createPayment.isPending ? 'Menyimpan...' : 'Simpan Pemasukan'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <ExportFinanceModal
                isOpen={exportOpen}
                onOpenChange={setExportOpen}
                payments={payments || []}
                expenses={expenses || []}
              />
            </div>
          </div>

          {/* Transaction cards */}
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] py-12 text-center">
              <p className="text-sm text-[#555]">Tidak ada transaksi pada tanggal ini</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {filtered.slice(0, 20).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between rounded-xl border border-[#2A2A2A]/50 bg-[#1A1A1A] px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{p.members?.full_name ?? 'Unknown'}</p>
                    <div className="flex items-center gap-2 text-[11px] text-[#888]">
                      <span>{p.membership_type}</span>
                      <span className="rounded bg-[#2A2A2A] px-1.5 py-0.5 text-[10px] uppercase">{p.payment_method}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <p className="font-heading text-lg text-[#D4FF00]">{formatRupiah(Number(p.amount))}</p>
                      <p className="text-[10px] text-[#555]">{formatTanggal(p.paid_at)}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditData(p); setEditOpen(true); }} className="h-7 w-7 text-[#888] hover:bg-[#2A2A2A] hover:text-white">
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => { setDeleteId(p.id); setDeleteOpen(true); }} className="h-7 w-7 text-[#888] hover:bg-[#2A2A2A] hover:text-red-400">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )
      }

      {
        activeTab === 'expenses' && (
          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Pengeluaran</h3>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1 sm:w-48 sm:flex-none">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#555]" />
                  <Input
                    placeholder="Cari keterangan..."
                    value={searchExp}
                    onChange={(e) => setSearchExp(e.target.value)}
                    className="border-[#2A2A2A] bg-[#1A1A1A] pl-9 text-sm text-white placeholder:text-[#555]"
                  />
                </div>
                <NativeSelect
                  value={filterExpCategory}
                  onChange={(e) => setFilterExpCategory(e.target.value)}
                  options={[
                    { value: 'all', label: 'Semua Kategori' },
                    { value: 'operasional', label: 'Operasional' },
                    { value: 'maintenance', label: 'Maintenance' },
                    { value: 'gaji', label: 'Gaji Staff / PT' },
                    { value: 'marketing', label: 'Marketing' },
                    { value: 'lainnya', label: 'Lainnya' },
                  ]}
                  triggerClassName="w-32 text-xs"
                />
                <Dialog open={expOpen} onOpenChange={setExpOpen}>
                  <DialogTrigger render={<Button size="sm" className="bg-[#FF2A2A] text-xs font-bold text-black hover:bg-[#E60000]" />}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> Catat Pengeluaran
                  </DialogTrigger>
                  <DialogContent className="border-[#2A2A2A] bg-[#1A1A1A] text-white sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="font-heading text-xl">Catat Pengeluaran</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs text-[#888]">Kategori</Label>
                        <NativeSelect
                          value={expCategory}
                          onChange={(e) => setExpCategory(e.target.value)}
                          options={[
                            { value: 'operasional', label: 'Operasional (Listrik, Air)' },
                            { value: 'maintenance', label: 'Maintenance Alat' },
                            { value: 'gaji', label: 'Gaji Staff / PT' },
                            { value: 'marketing', label: 'Marketing & Iklan' },
                            { value: 'lainnya', label: 'Lainnya' },
                          ]}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-[#888]">Nominal (Rp)</Label>
                        <Input type="number" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} className="border-[#2A2A2A] bg-[#111] text-white" />
                      </div>
                      <div>
                        <Label className="text-xs text-[#888]">Keterangan</Label>
                        <Input value={expDesc} onChange={(e) => setExpDesc(e.target.value)} className="border-[#2A2A2A] bg-[#111] text-white" />
                      </div>
                      <div>
                        <Label className="text-xs text-[#888]">Tanggal Pengeluaran</Label>
                        <Input type="date" value={expDate} onChange={(e) => setExpDate(e.target.value)} className="border-[#2A2A2A] bg-[#111] text-white" />
                      </div>
                      <Button onClick={handleAddExpense} disabled={createExpense.isPending} className="w-full bg-[#FF2A2A] font-bold text-black hover:bg-[#E60000]">
                        {createExpense.isPending ? 'Menyimpan...' : 'Simpan Pengeluaran'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {expLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 animate-pulse rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]" />
                ))}
              </div>
            ) : filteredExpenses.length === 0 ? (
              <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] py-12 text-center">
                <p className="text-sm text-[#555]">Tidak ada pengeluaran pada tanggal ini</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {filteredExpenses.map((e: any) => (
                  <div key={e.id} className="flex items-center justify-between rounded-xl border border-[#2A2A2A]/50 bg-[#1A1A1A] px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{categoryLabels[e.category] || e.category}</p>
                      <p className="text-[11px] text-[#888]">{e.description || '-'}</p>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <p className="font-heading text-lg text-red-400">{formatRupiah(Number(e.amount))}</p>
                        <p className="text-[10px] text-[#555]">{formatTanggal(e.expense_date)}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditExpData(e); setEditExpOpen(true); }} className="h-7 w-7 text-[#888] hover:bg-[#2A2A2A] hover:text-white">
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { setDeleteExpId(e.id); setDeleteExpOpen(true); }} className="h-7 w-7 text-[#888] hover:bg-[#2A2A2A] hover:text-red-400">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      }

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="border-[#2A2A2A] bg-[#1A1A1A] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Edit Pembayaran</DialogTitle>
          </DialogHeader>
          {editData && (
            <div className="space-y-3 pt-4">
              <div>
                <Label className="text-xs text-[#888]">Nama Member</Label>
                <Input value={editData.members?.full_name || ''} disabled className="border-[#2A2A2A] bg-[#111] text-white opacity-50" />
              </div>
              <div>
                <Label className="text-xs text-[#888]">Nominal Pembayaran</Label>
                <Input type="number" value={editData.amount} onChange={(e) => setEditData({ ...editData, amount: e.target.value })} className="border-[#2A2A2A] bg-[#111] text-white" />
              </div>
              <div>
                <Label className="text-xs text-[#888]">Metode Bayar</Label>
                <NativeSelect
                  value={editData.payment_method}
                  onChange={(e) => setEditData({ ...editData, payment_method: e.target.value })}
                  options={[
                    { value: 'cash', label: 'Cash' },
                    { value: 'transfer', label: 'Transfer' },
                    { value: 'qris', label: 'QRIS' },
                  ]}
                />
              </div>
              <div>
                <Label className="text-xs text-[#888]">Catatan</Label>
                <Input value={editData.notes || ''} onChange={(e) => setEditData({ ...editData, notes: e.target.value })} className="border-[#2A2A2A] bg-[#111] text-white" />
              </div>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setEditOpen(false)} className="border-[#2A2A2A] text-[#888]">Batal</Button>
                <Button onClick={handleEditSave} disabled={updatePayment.isPending} className="bg-[#FF2A2A] font-bold text-black hover:bg-[#E60000]">
                  {updatePayment.isPending ? 'Menyimpan...' : 'Simpan Edit'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Payment Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="border-[#2A2A2A] bg-[#1A1A1A] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Data Pembayaran?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#888]">
              Perhatian: Menghapus data pembayaran akan mengurangi total pendapatan pelaporan keuangan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePayment.isPending} onClick={() => setDeleteOpen(false)} className="border-[#2A2A2A] text-[#888]">Batal</AlertDialogCancel>
            <AlertDialogAction disabled={deletePayment.isPending} onClick={handleDeleteConfirm} className="bg-red-500 text-white hover:bg-red-600">
              {deletePayment.isPending ? 'Menghapus...' : 'Ya, Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Expense Dialog */}
      <AlertDialog open={deleteExpOpen} onOpenChange={setDeleteExpOpen}>
        <AlertDialogContent className="border-[#2A2A2A] bg-[#1A1A1A] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Pengeluaran?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#888]">
              Data pengeluaran ini akan dihapus dari sistem.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteExpense.isPending} onClick={() => setDeleteExpOpen(false)} className="border-[#2A2A2A] text-[#888]">Batal</AlertDialogCancel>
            <AlertDialogAction disabled={deleteExpense.isPending} onClick={handleDeleteExpenseConfirm} className="bg-red-500 text-white hover:bg-red-600">
              {deleteExpense.isPending ? 'Menghapus...' : 'Ya, Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog Expense */}
      <Dialog open={editExpOpen} onOpenChange={setEditExpOpen}>
        <DialogContent className="border-[#2A2A2A] bg-[#1A1A1A] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Edit Pengeluaran</DialogTitle>
          </DialogHeader>
          {editExpData && (
            <div className="space-y-3 pt-4">
              <div>
                <Label className="text-xs text-[#888]">Kategori</Label>
                <NativeSelect
                  value={editExpData.category}
                  onChange={(e) => setEditExpData({ ...editExpData, category: e.target.value })}
                  options={[
                    { value: 'operasional', label: 'Operasional' },
                    { value: 'maintenance', label: 'Maintenance' },
                    { value: 'gaji', label: 'Gaji Staff / PT' },
                    { value: 'marketing', label: 'Marketing' },
                    { value: 'lainnya', label: 'Lainnya' },
                  ]}
                />
              </div>
              <div>
                <Label className="text-xs text-[#888]">Nominal Pengeluaran</Label>
                <Input type="number" value={editExpData.amount} onChange={(e) => setEditExpData({ ...editExpData, amount: e.target.value })} className="border-[#2A2A2A] bg-[#111] text-white" />
              </div>
              <div>
                <Label className="text-xs text-[#888]">Keterangan</Label>
                <Input value={editExpData.description || ''} onChange={(e) => setEditExpData({ ...editExpData, description: e.target.value })} className="border-[#2A2A2A] bg-[#111] text-white" />
              </div>
              <div>
                <Label className="text-xs text-[#888]">Tanggal Pengeluaran</Label>
                <Input type="date" value={editExpData.expense_date ? editExpData.expense_date.split('T')[0] : ''} onChange={(e) => setEditExpData({ ...editExpData, expense_date: e.target.value })} className="border-[#2A2A2A] bg-[#111] text-white" />
              </div>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setEditExpOpen(false)} className="border-[#2A2A2A] text-[#888] hover:bg-[#2A2A2A] hover:text-white">Batal</Button>
                <Button onClick={handleEditExpenseSave} disabled={updateExpense.isPending} className="bg-[#FF2A2A] font-bold text-black hover:bg-[#E60000]">
                  {updateExpense.isPending ? 'Menyimpan...' : 'Simpan Edit'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div >
  )
}
