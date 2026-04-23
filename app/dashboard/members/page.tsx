'use client'

import { useState, useMemo } from 'react'
import { useMembersWithSubscription, useCreateMember, useDeleteMember } from '@/hooks/useMembers'
import { useActiveMemberships } from '@/hooks/useMemberships'
import { useCheckIn } from '@/hooks/useAttendance'
import { useRenewSubscription } from '@/hooks/useSubscriptions'
import { formatRupiah, formatTanggal, hitungEndDate } from '@/lib/utils'
import StatusBadge from '@/components/members/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, Plus, UserCheck, RotateCcw, Trash2, Download } from 'lucide-react'
import { toast } from 'sonner'
import type { ActiveSubscriptionView } from '@/lib/types'

export default function MembersPage() {
  const { data: members, isLoading } = useMembersWithSubscription()
  const { data: memberships } = useActiveMemberships()
  const createMember = useCreateMember()
  const deleteMember = useDeleteMember()
  const checkIn = useCheckIn()
  const renewSub = useRenewSubscription()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const PER_PAGE = 10

  // Dialog states
  const [addOpen, setAddOpen] = useState(false)
  const [renewOpen, setRenewOpen] = useState(false)
  const [renewMember, setRenewMember] = useState<ActiveSubscriptionView | null>(null)

  // Add form
  const [formName, setFormName] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formEmergency, setFormEmergency] = useState('')
  const [formMembership, setFormMembership] = useState('')
  const [formPayMethod, setFormPayMethod] = useState<'cash' | 'transfer' | 'qris'>('cash')
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().split('T')[0])
  const [formNotes, setFormNotes] = useState('')

  // Renew form
  const [renewMembershipId, setRenewMembershipId] = useState('')
  const [renewPayMethod, setRenewPayMethod] = useState<'cash' | 'transfer' | 'qris'>('cash')

  // Filter & search
  const filtered = useMemo(() => {
    let list = members || []
    if (search) {
      const s = search.toLowerCase()
      list = list.filter((m) => m.full_name.toLowerCase().includes(s) || m.phone.includes(s))
    }
    if (statusFilter !== 'all') {
      list = list.filter((m) => m.status === statusFilter)
    }
    return list
  }, [members, search, statusFilter])

  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const handleAddMember = async () => {
    if (!formName || !formPhone || !formMembership) {
      toast.error('Nama, No. HP, dan Paket wajib diisi')
      return
    }

    const selectedPkg = memberships?.find((m) => m.id === formMembership)
    if (!selectedPkg) return

    try {
      await createMember.mutateAsync({
        member: {
          gym_id: 'lineup-gym-01',
          full_name: formName,
          phone: formPhone,
          email: formEmail || null,
          emergency_contact: formEmergency || null,
          photo_url: null,
          notes: formNotes || null,
        },
        subscription: formMembership ? {
          membership_id: formMembership,
          start_date: formStartDate,
          end_date: hitungEndDate(formStartDate, selectedPkg?.duration_days ?? 0).toISOString().split('T')[0],
        } : undefined,
        payment: formMembership && selectedPkg ? {
          paymentMethod: formPayMethod,
          amount: selectedPkg.price,
          membershipType: selectedPkg.name,
          notes: 'Pembayaran Member Baru'
        } : undefined,
      })
      toast.success(`${formName} berhasil ditambahkan!`)
      resetForm()
      setAddOpen(false)
    } catch {
      toast.error('Gagal menambahkan member')
    }
  }

  const handleRenew = async () => {
    if (!renewMember || !renewMembershipId) return
    const pkg = memberships?.find((m) => m.id === renewMembershipId)
    if (!pkg) return

    const startDate = new Date().toISOString().split('T')[0]
    const endDate = hitungEndDate(startDate, pkg.duration_days).toISOString().split('T')[0]

    try {
      await renewSub.mutateAsync({
        memberId: renewMember.member_id,
        membershipId: renewMembershipId,
        startDate,
        endDate,
        amount: pkg.price,
        paymentMethod: renewPayMethod,
        membershipType: pkg.name,
      })
      toast.success(`Membership ${renewMember.full_name} berhasil diperpanjang!`)
      setRenewOpen(false)
      setRenewMember(null)
    } catch {
      toast.error('Gagal memperpanjang membership')
    }
  }

  const handleQuickCheckIn = async (memberId: string, memberName: string) => {
    try {
      await checkIn.mutateAsync(memberId)
      toast.success(`${memberName} berhasil check-in!`)
    } catch {
      toast.error('Gagal check-in')
    }
  }

  const handleDelete = async (id: string, name: string) => {
    try {
      await deleteMember.mutateAsync(id)
      toast.success(`${name} berhasil dihapus`)
    } catch {
      toast.error('Gagal menghapus member')
    }
  }

  const exportCSV = () => {
    const rows = [
      ['Nama', 'Telepon', 'Email', 'Paket', 'Mulai', 'Expired', 'Status'],
      ...(filtered || []).map((m) => [
        m.full_name,
        m.phone,
        m.email ?? '',
        m.membership_name,
        m.start_date,
        m.end_date,
        m.status,
      ]),
    ]
    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `members_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const resetForm = () => {
    setFormName('')
    setFormPhone('')
    setFormEmail('')
    setFormEmergency('')
    setFormMembership('')
    setFormStartDate(new Date().toISOString().split('T')[0])
    setFormNotes('')
  }

  const selectedPkg = memberships?.find((m) => m.id === formMembership)

  return (
    <div className="space-y-4">
      {/* Mobile header: search + actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#555]" />
          <Input
            placeholder="Cari nama atau HP..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="border-[#2A2A2A] bg-[#1A1A1A] pl-9 text-sm text-white placeholder:text-[#555]"
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={(v) => { if (v) { setStatusFilter(v); setPage(1); } }}>
            <SelectTrigger className="w-28 border-[#2A2A2A] bg-[#1A1A1A] text-xs text-white">
              <SelectValue placeholder="Status">
                {(val: any) => {
                  if (!val || val === 'all') return 'Semua'
                  const labels: any = { active: 'Aktif', expiring_soon: 'Segera', critical: 'Kritis', expired: 'Expired' }
                  return labels[val] || val
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="border-[#2A2A2A] bg-[#1A1A1A]">
              <SelectItem value="all">Semua</SelectItem>
              <SelectItem value="active">Aktif</SelectItem>
              <SelectItem value="expiring_soon">Segera</SelectItem>
              <SelectItem value="critical">Kritis</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>

          <Button size="sm" variant="outline" onClick={exportCSV} className="border-[#2A2A2A] text-xs text-[#888]">
            <Download className="mr-1 h-3.5 w-3.5" /> CSV
          </Button>

          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger render={<Button size="sm" className="bg-[#D4FF00] text-xs font-bold text-black hover:bg-[#c5ef00]" />}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Tambah
            </DialogTrigger>
            <DialogContent className="max-h-[90dvh] overflow-y-auto border-[#2A2A2A] bg-[#1A1A1A] text-white sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-heading text-xl">Tambah Member Baru</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-[#888]">Nama Lengkap *</Label>
                  <Input value={formName} onChange={(e) => setFormName(e.target.value)} className="border-[#2A2A2A] bg-[#111] text-white" />
                </div>
                <div>
                  <Label className="text-xs text-[#888]">No. HP *</Label>
                  <Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} className="border-[#2A2A2A] bg-[#111] text-white" />
                </div>
                <div>
                  <Label className="text-xs text-[#888]">Email</Label>
                  <Input value={formEmail} onChange={(e) => setFormEmail(e.target.value)} className="border-[#2A2A2A] bg-[#111] text-white" />
                </div>
                <div>
                  <Label className="text-xs text-[#888]">Kontak Darurat</Label>
                  <Input value={formEmergency} onChange={(e) => setFormEmergency(e.target.value)} className="border-[#2A2A2A] bg-[#111] text-white" />
                </div>
                <div>
                  <Label className="text-xs text-[#888]">Paket Membership *</Label>
                  <Select value={formMembership || null} onValueChange={(v) => v && setFormMembership(v)}>
                    <SelectTrigger className="border-[#2A2A2A] bg-[#111] text-white">
                      <SelectValue placeholder="Pilih paket">
                        {(val: any) => val && memberships ? memberships.find((p) => p.id === val)?.name : "Pilih paket"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="border-[#2A2A2A] bg-[#111]">
                      {memberships?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} — {formatRupiah(p.price)} ({p.duration_days} hari)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedPkg && (
                    <div className="mt-2 space-y-3">
                      <p className="text-xs text-[#D4FF00]">
                        Berlaku sampai: {formatTanggal(hitungEndDate(formStartDate, selectedPkg.duration_days).toISOString())}
                      </p>
                      <div>
                        <Label className="text-xs text-[#888]">Metode Bayar (Wajib)</Label>
                        <Select value={formPayMethod} onValueChange={(v) => v && setFormPayMethod(v as 'cash' | 'transfer' | 'qris')}>
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
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-[#888]">Tanggal Mulai</Label>
                  <Input type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} className="border-[#2A2A2A] bg-[#111] text-white" />
                </div>
                <div>
                  <Label className="text-xs text-[#888]">Catatan</Label>
                  <Input value={formNotes} onChange={(e) => setFormNotes(e.target.value)} className="border-[#2A2A2A] bg-[#111] text-white" />
                </div>
                <Button
                  onClick={handleAddMember}
                  disabled={createMember.isPending}
                  className="w-full bg-[#D4FF00] font-bold text-black hover:bg-[#c5ef00]"
                >
                  {createMember.isPending ? 'Menyimpan...' : 'Simpan Member'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Mobile: card list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]" />
          ))}
        </div>
      ) : paginated.length === 0 ? (
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] py-12 text-center">
          <p className="text-sm text-[#555]">Tidak ada data member</p>
        </div>
      ) : (
        <div className="space-y-2">
          {paginated.map((m, idx) => {
            const initials = m.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
            const num = (page - 1) * PER_PAGE + idx + 1

            return (
              <div key={m.member_id} className="rounded-xl border border-[#2A2A2A]/50 bg-[#1A1A1A] p-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#D4FF00]/10 font-heading text-lg text-[#D4FF00]">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{num}. {m.full_name}</p>
                        <p className="text-[11px] text-[#888]">{m.phone}</p>
                      </div>
                      <StatusBadge status={m.status} />
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-[#555]">
                      <span>{m.membership_name}</span>
                      <span>Exp: {formatTanggal(m.end_date)}</span>
                      <span>Sisa {m.days_remaining} hari</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-2 flex gap-1.5 border-t border-[#2A2A2A]/50 pt-2">
                  {m.status !== 'expired' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleQuickCheckIn(m.member_id, m.full_name)}
                      className="h-7 flex-1 text-[11px] text-[#D4FF00] hover:bg-[#D4FF00]/10"
                    >
                      <UserCheck className="mr-1 h-3 w-3" /> Check-In
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setRenewMember(m); setRenewOpen(true) }}
                    className="h-7 flex-1 text-[11px] text-[#FF6B35] hover:bg-[#FF6B35]/10"
                  >
                    <RotateCcw className="mr-1 h-3 w-3" /> Perpanjang
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger render={<Button size="sm" variant="ghost" className="h-7 text-[11px] text-red-400 hover:bg-red-500/10" />}>
                      <Trash2 className="h-3 w-3" />
                    </AlertDialogTrigger>
                    <AlertDialogContent className="border-[#2A2A2A] bg-[#1A1A1A] text-white">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Hapus {m.full_name}?</AlertDialogTitle>
                        <AlertDialogDescription className="text-[#888]">
                          Data member tidak bisa dikembalikan setelah dihapus.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="border-[#2A2A2A] text-[#888]">Batal</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(m.member_id, m.full_name)}
                          className="bg-red-500 text-white hover:bg-red-600"
                        >
                          Hapus
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="border-[#2A2A2A] text-xs text-[#888]"
          >
            Sebelumnya
          </Button>
          <span className="text-xs text-[#888]">
            {page} / {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="border-[#2A2A2A] text-xs text-[#888]"
          >
            Selanjutnya
          </Button>
        </div>
      )}

      {/* Renew Dialog */}
      <Dialog open={renewOpen} onOpenChange={setRenewOpen}>
        <DialogContent className="border-[#2A2A2A] bg-[#1A1A1A] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Perpanjang Membership</DialogTitle>
          </DialogHeader>
          {renewMember && (
            <div className="space-y-3">
              <p className="text-sm text-[#888]">Member: <span className="text-white">{renewMember.full_name}</span></p>
              <div>
                <Label className="text-xs text-[#888]">Pilih Paket</Label>
                <Select value={renewMembershipId || null} onValueChange={(v) => v && setRenewMembershipId(v)}>
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
              </div>
              <div>
                <Label className="text-xs text-[#888]">Metode Bayar</Label>
                <Select value={renewPayMethod} onValueChange={(v) => v && setRenewPayMethod(v as 'cash' | 'transfer' | 'qris')}>
                  <SelectTrigger className="border-[#2A2A2A] bg-[#111] text-white">
                    <SelectValue>
                      {(val: any) => val ? val.charAt(0).toUpperCase() + val.slice(1) : "Metode bayar"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="border-[#2A2A2A] bg-[#111]">
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                    <SelectItem value="qris">QRIS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleRenew}
                disabled={renewSub.isPending || !renewMembershipId}
                className="w-full bg-[#D4FF00] font-bold text-black hover:bg-[#c5ef00]"
              >
                {renewSub.isPending ? 'Memproses...' : 'Perpanjang & Bayar'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
