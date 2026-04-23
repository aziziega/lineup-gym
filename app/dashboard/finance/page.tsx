'use client'

import { useState, useMemo, useEffect } from 'react'
import { usePayments, useCurrentMonthRevenue, useCreatePayment, useUpdatePayment, useDeletePayment } from '@/hooks/usePayments'
import { useMonthlyRevenue } from '@/hooks/usePayments'
import { useMembers, useMembersWithSubscription } from '@/hooks/useMembers'
import { useActiveMemberships } from '@/hooks/useMemberships'
import { useRenewSubscription } from '@/hooks/useSubscriptions'
import { formatRupiah, formatTanggal, hitungEndDate } from '@/lib/utils'
import MetricCard from '@/components/dashboard/MetricCard'
import MemberCombobox from '@/components/dashboard/MemberCombobox'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Wallet, TrendingUp, Hash, Calculator, Plus, Download, Search, MoreVertical, Edit2, Trash2 } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { toast } from 'sonner'

export default function FinancePage() {
  const { data: payments, isLoading } = usePayments()
  const { data: currentMonth } = useCurrentMonthRevenue()
  const { data: monthlyRevenue } = useMonthlyRevenue()
  const { data: members } = useMembers()
  const { data: membersWithSub } = useMembersWithSubscription()
  const { data: memberships } = useActiveMemberships()
  const renewSub = useRenewSubscription()
  const updatePayment = useUpdatePayment()
  const deletePayment = useDeletePayment()

  const [addOpen, setAddOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [filterMethod, setFilterMethod] = useState<string>('all')
  // Form
  const [fMember, setFMember] = useState('')
  const [fMembership, setFMembership] = useState('')
  const [fMethod, setFMethod] = useState<'cash' | 'transfer' | 'qris'>('cash')
  const [fNotes, setFNotes] = useState('')

  // Edit Form
  const [editOpen, setEditOpen] = useState(false)
  const [editData, setEditData] = useState<any>(null)
  
  // Delete Dialog
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string>('')

  useEffect(() => {
    if (fMember && membersWithSub && memberships) {
      const activeData = membersWithSub.find((m) => m.member_id === fMember)
      if (activeData && activeData.membership_name) {
        const pkg = memberships.find((p) => p.name === activeData.membership_name)
        if (pkg) {
          setFMembership(pkg.id)
        }
      } else {
        setFMembership('')
      }
    }
  }, [fMember, membersWithSub, memberships])

  // Filter: hanya tampilkan member yang belum bayar (expired / belum pernah langganan)
  const payableMembers = useMemo(() => {
    if (!members) return []
    if (!membersWithSub) return members // Kalau data subscription belum load, tampilkan semua

    // Set ID member yang masih aktif (active, expiring_soon, critical)
    const activeMemberIds = new Set(
      membersWithSub
        .filter((m) => m.status === 'active' || m.status === 'expiring_soon' || m.status === 'critical')
        .map((m) => m.member_id)
    )

    // Kembalikan member yang TIDAK ada di set aktif
    return members.filter((m) => !activeMemberIds.has(m.id))
  }, [members, membersWithSub])

  // Buat map status untuk ditampilkan di combobox
  const memberStatusMap = useMemo(() => {
    const map = new Map<string, string>()
    if (!membersWithSub) return map
    for (const m of membersWithSub) {
      if (m.status === 'expired') {
        map.set(m.member_id, `Expired ${m.days_remaining ? Math.abs(m.days_remaining) + ' hari lalu' : ''}`)
      }
    }
    // Member yang tidak ada di membersWithSub = belum pernah berlangganan
    if (members) {
      for (const m of members) {
        if (!membersWithSub.find((s) => s.member_id === m.id)) {
          map.set(m.id, 'Belum pernah daftar')
        }
      }
    }
    return map
  }, [members, membersWithSub])



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

  // Filter payments
  const filtered = useMemo(() => {
    let list = payments || []
    if (search) {
      const s = search.toLowerCase()
      list = list.filter((p: any) => p.members?.full_name?.toLowerCase().includes(s))
    }
    if (filterMethod !== 'all') {
      list = list.filter((p: any) => p.payment_method === filterMethod)
    }
    return list
  }, [payments, search, filterMethod])

  // Chart data
  const chartData = (monthlyRevenue || []).map((d) => ({
    name: d.month_label,
    revenue: Number(d.total),
  }))

  const handleAddPayment = async () => {
    if (!fMember || !fMembership) {
      toast.error('Pilih member dan paket')
      return
    }
    const pkg = memberships?.find((m) => m.id === fMembership)
    if (!pkg) return

    const startDate = new Date().toISOString().split('T')[0]
    const endDate = hitungEndDate(startDate, pkg.duration_days).toISOString().split('T')[0]

    try {
      await renewSub.mutateAsync({
        memberId: fMember,
        membershipId: fMembership,
        startDate,
        endDate,
        amount: pkg.price,
        paymentMethod: fMethod,
        membershipType: pkg.name,
      })
      toast.success('Pembayaran berhasil dicatat!')
      setAddOpen(false)
      setFMember('')
      setFMembership('')
      setFNotes('')
    } catch {
      toast.error('Gagal mencatat pembayaran')
    }
  }

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

  const exportCSV = () => {
    const rows = [
      ['Nama', 'Paket', 'Metode', 'Jumlah', 'Tanggal'],
      ...(filtered || []).map((p: any) => [
        p.members?.full_name ?? '',
        p.membership_type,
        p.payment_method,
        p.amount,
        p.paid_at,
      ]),
    ]
    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `finance_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const selectedPkg = memberships?.find((m) => m.id === fMembership)

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="rounded-lg border border-[#2A2A2A] bg-[#111] px-3 py-2 text-xs">
        <p className="text-[#888]">{label}</p>
        <p className="font-heading text-base text-[#D4FF00]">{formatRupiah(payload[0].value)}</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Revenue Bulan Ini" value={formatRupiah(currentMonth?.total ?? 0)} icon={Wallet} accent="neon" />
        <MetricCard label="Revenue YTD" value={formatRupiah(ytdRevenue)} icon={TrendingUp} accent="neon" />
        <MetricCard label="Transaksi Bulan Ini" value={currentMonth?.count ?? 0} icon={Hash} accent="muted" />
        <MetricCard label="Rata-rata / Transaksi" value={formatRupiah(avgPerTx)} icon={Calculator} accent="muted" />
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="rounded-xl border border-[#2A2A2A]/50 bg-[#1A1A1A] p-4">
          <h3 className="mb-4 text-sm font-semibold text-white">Revenue Bulanan</h3>
          <div className="h-48 lg:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                <XAxis dataKey="name" tick={{ fill: '#888', fontSize: 11 }} />
                <YAxis tick={{ fill: '#888', fontSize: 11 }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}jt`} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="revenue" stroke="#D4FF00" strokeWidth={2} dot={{ fill: '#D4FF00', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Transaction list */}
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#555]" />
            <Input
              placeholder="Cari nama member..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-[#2A2A2A] bg-[#1A1A1A] pl-9 text-sm text-white placeholder:text-[#555]"
            />
          </div>
          <div className="flex gap-2">
            <Select value={filterMethod} onValueChange={(v) => v && setFilterMethod(v)}>
              <SelectTrigger className="w-28 border-[#2A2A2A] bg-[#1A1A1A] text-xs text-white">
                <SelectValue placeholder="Metode">
                  {(val: any) => {
                    if (!val || val === 'all') return 'Semua'
                    return val.charAt(0).toUpperCase() + val.slice(1)
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="border-[#2A2A2A] bg-[#1A1A1A]">
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
                <SelectItem value="qris">QRIS</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={exportCSV} className="border-[#2A2A2A] text-xs text-[#888]">
              <Download className="mr-1 h-3.5 w-3.5" /> CSV
            </Button>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger render={<Button size="sm" className="bg-[#D4FF00] text-xs font-bold text-black hover:bg-[#c5ef00]" />}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Bayar
              </DialogTrigger>
              <DialogContent className="border-[#2A2A2A] bg-[#1A1A1A] text-white sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="font-heading text-xl">Tambah Pembayaran</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-[#888]">Pilih Member *</Label>
                    <MemberCombobox
                      members={payableMembers}
                      value={fMember}
                      onValueChange={setFMember}
                      placeholder="Cari & pilih member..."
                      statusMap={memberStatusMap}
                      emptyMessage={payableMembers.length === 0 ? 'Semua member sudah aktif 🎉' : undefined}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-[#888]">Paket *</Label>
                    <Select value={fMembership} onValueChange={(v) => v && setFMembership(v)}>
                      <SelectTrigger className="border-[#2A2A2A] bg-[#111] text-white">
                        <SelectValue placeholder="Pilih paket">
                          {(val: any) => val && memberships ? memberships.find((p) => p.id === val)?.name : "Pilih paket"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="border-[#2A2A2A] bg-[#111]">
                        {memberships?.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} — {formatRupiah(p.price)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedPkg && (
                      <p className="mt-1 text-xs text-[#D4FF00]">Jumlah: {formatRupiah(selectedPkg.price)}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-[#888]">Metode Bayar</Label>
                    <Select value={fMethod} onValueChange={(v) => v && setFMethod(v as 'cash' | 'transfer' | 'qris')}>
                      <SelectTrigger className="border-[#2A2A2A] bg-[#111] text-white">
                        <SelectValue>
                          {(val: any) => val ? val.charAt(0).toUpperCase() + val.slice(1) : "Pilih metode"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="border-[#2A2A2A] bg-[#111]">
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="transfer">Transfer</SelectItem>
                        <SelectItem value="qris">QRIS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-[#888]">Catatan</Label>
                    <Input value={fNotes} onChange={(e) => setFNotes(e.target.value)} className="border-[#2A2A2A] bg-[#111] text-white" />
                  </div>
                  <Button onClick={handleAddPayment} disabled={renewSub.isPending} className="w-full bg-[#D4FF00] font-bold text-black hover:bg-[#c5ef00]">
                    {renewSub.isPending ? 'Memproses...' : 'Simpan Pembayaran'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
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
            <p className="text-sm text-[#555]">Belum ada transaksi</p>
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-[#888] hover:bg-[#2A2A2A] hover:text-white">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36 border-[#2A2A2A] bg-[#1A1A1A]">
                      <DropdownMenuItem
                        onClick={() => {
                          setEditData(p)
                          setEditOpen(true)
                        }}
                        className="flex cursor-pointer items-center text-sm text-white hover:bg-[#2A2A2A]"
                      >
                        <Edit2 className="mr-2 h-3.5 w-3.5" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setDeleteId(p.id)
                          setDeleteOpen(true)
                        }}
                        className="flex cursor-pointer items-center text-sm text-red-500 hover:bg-[#2A2A2A] hover:text-red-400"
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" /> Hapus
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
                <Select value={editData.payment_method} onValueChange={(v) => v && setEditData({ ...editData, payment_method: v })}>
                  <SelectTrigger className="border-[#2A2A2A] bg-[#111] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-[#2A2A2A] bg-[#111]">
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                    <SelectItem value="qris">QRIS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-[#888]">Catatan</Label>
                <Input value={editData.notes || ''} onChange={(e) => setEditData({ ...editData, notes: e.target.value })} className="border-[#2A2A2A] bg-[#111] text-white" />
              </div>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setEditOpen(false)} className="border-[#2A2A2A] text-[#888]">Batal</Button>
                <Button onClick={handleEditSave} disabled={updatePayment.isPending} className="bg-[#D4FF00] font-bold text-black hover:bg-[#c5ef00]">
                  {updatePayment.isPending ? 'Menyimpan...' : 'Simpan Edit'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="border-[#2A2A2A] bg-[#1A1A1A] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Data Pembayaran?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#888]">
              Perhatian: Menghapus data pembayaran akan mengurangi total pendapatan pelaporan keuangan. Ini tidak otomatis mengubah masa aktif member.
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
    </div>
  )
}
