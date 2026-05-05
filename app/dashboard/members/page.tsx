'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useMembersWithSubscription, useCreateMember, useDeleteMember, useUpdateMember } from '@/hooks/useMembers'
import { useActiveMemberships } from '@/hooks/useMemberships'
import { useCheckIn } from '@/hooks/useAttendance'
import { useRenewSubscription } from '@/hooks/useSubscriptions'
import { formatRupiah, formatTanggal, hitungEndDate, generateReceiptWALink, type ReceiptData } from '@/lib/utils'
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
import NativeSelect from '@/components/dashboard/NativeSelect'
import PackageCombobox from '@/components/dashboard/PackageCombobox'
import { Search, Plus, Download, Edit2, RotateCcw, Trash2, ShieldAlert, CheckCircle2, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { GYM_ID } from '@/lib/constants'
import type { ActiveSubscriptionView, Membership } from '@/lib/types'

export default function MembersPage() {
  const { data: members, isLoading } = useMembersWithSubscription()
  const { data: memberships } = useActiveMemberships()
  const createMember = useCreateMember()
  const deleteMember = useDeleteMember()
  const updateMember = useUpdateMember()
  const checkIn = useCheckIn()
  const renewSub = useRenewSubscription()
  const supabase = createClient()
  const queryClient = useQueryClient()

  // Realtime subscription agar data visitor baru langsung muncul (LIVE)
  useEffect(() => {
    const channel = supabase
      .channel('members-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'members' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['members-with-subscription'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, queryClient])

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const PER_PAGE = 10

  // Dialog states
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editMemberData, setEditMemberData] = useState<ActiveSubscriptionView | null>(null)
  const [renewOpen, setRenewOpen] = useState(false)
  const [renewMember, setRenewMember] = useState<ActiveSubscriptionView | null>(null)

  // Add form
  const [formName, setFormName] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formMemberNo, setFormMemberNo] = useState('')
  const [formEmergency, setFormEmergency] = useState('')
  const [formMembership, setFormMembership] = useState('') // Gym package
  const [formPtMembership, setFormPtMembership] = useState('') // PT package
  const [formPayMethod, setFormPayMethod] = useState<'cash' | 'transfer' | 'qris'>('cash')
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().split('T')[0])
  const [formNotes, setFormNotes] = useState('')
  const [approvingId, setApprovingId] = useState<string | null>(null)

  // Receipt dialog
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null)

  // Renew form
  const [renewMembershipId, setRenewMembershipId] = useState('')
  const [renewPtMembershipId, setRenewPtMembershipId] = useState('')
  const [renewMemberNo, setRenewMemberNo] = useState('')
  const [renewPayMethod, setRenewPayMethod] = useState<'cash' | 'transfer' | 'qris'>('cash')

  const gymPackages = useMemo(() => memberships?.filter(m => m.category === 'gym') || [], [memberships])
  const ptPackages = useMemo(() => memberships?.filter(m => m.category === 'pt') || [], [memberships])

  // Filter & search
  const filtered = useMemo(() => {
    let list = members || []
    if (search) {
      const s = search.toLowerCase()
      list = list.filter((m) => m.full_name.toLowerCase().includes(s) || m.phone.includes(s) || (m.member_no && m.member_no.toLowerCase().includes(s)))
    }
    if (statusFilter !== 'all') {
      list = list.filter((m) => m.status === statusFilter)
    }
    
    // Filter Tipe Membership vs Visitor
    if (typeFilter === 'visitor') {
      list = list.filter((m) => {
        // Visitor = belum punya subscription, paket DAY, atau notes masih visitor
        const isVisitorNotes = m.notes?.toLowerCase().includes('visitor')
        const isDayPkg = m.membership_name === 'DAY'
        const noSubscription = !m.membership_name
        return isVisitorNotes || isDayPkg || noSubscription
      })
    } else if (typeFilter === 'regular') {
      list = list.filter((m) => {
        // Regular = punya subscription selain DAY DAN bukan visitor pending
        const isVisitorPending = m.notes === 'Visitor Harian' && m.status === 'inactive'
        const isDayOnly = m.membership_name === 'DAY' || !m.membership_name
        const isVisitorNotes = m.notes?.toLowerCase().includes('visitor') && isDayOnly
        return !isVisitorPending && !isVisitorNotes && m.membership_name
      })
    } else if (typeFilter === 'pt') {
      list = list.filter((m) => !!m.pt_membership_name)
    }
    
    // Urutkan: Paling atas untuk yang baru absen/pending (status inactive)
    list.sort((a, b) => {
      const aPending = (a.notes?.toLowerCase().includes('visitor') && a.status === 'inactive') ? 1 : 0
      const bPending = (b.notes?.toLowerCase().includes('visitor') && b.status === 'inactive') ? 1 : 0
      return bPending - aPending
    })
    
    return list
  }, [members, search, statusFilter, typeFilter])

  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const handleAddMember = async () => {
    if (!formName || !formPhone || !formMembership) {
      toast.error('Nama, No. HP, dan Paket wajib diisi')
      return
    }

    const selectedPkg = memberships?.find((m) => m.id === formMembership)
    if (!selectedPkg) return

    const selectedPtPkg = memberships?.find((m) => m.id === formPtMembership)

    try {
      await createMember.mutateAsync({
        member: {
          gym_id: GYM_ID,
          full_name: formName,
          phone: formPhone,
          member_no: formMemberNo || null,
          emergency_contact: formEmergency || null,
          photo_url: null,
          notes: formNotes || null,
        },
        subscription: formMembership ? {
          membership_id: formMembership,
          start_date: formStartDate,
          end_date: hitungEndDate(formStartDate, selectedPkg?.duration_days ?? 0).toISOString().split('T')[0],
        } : undefined,
        ptSubscription: formPtMembership && selectedPtPkg ? {
          membership_id: formPtMembership,
          start_date: formStartDate,
          end_date: hitungEndDate(formStartDate, selectedPtPkg.duration_days).toISOString().split('T')[0],
          remaining_sessions: selectedPtPkg.total_sessions,
        } : undefined,
        payment: formMembership && selectedPkg ? {
          paymentMethod: formPayMethod,
          amount: selectedPkg.price,
          membershipType: selectedPkg.name,
          notes: 'Pembayaran Member Baru (Gym)'
        } : undefined,
        ptPayment: formPtMembership && selectedPtPkg ? {
          paymentMethod: formPayMethod,
          amount: selectedPtPkg.price,
          membershipType: selectedPtPkg.name,
          notes: 'Pembayaran Member Baru (PT)'
        } : undefined,
      })
      toast.success(`${formName} berhasil ditambahkan!`)

      // Prepare receipt data
      const totalAmount = (selectedPkg?.price || 0) + (selectedPtPkg?.price || 0)
      if (totalAmount > 0) {
        setReceiptData({
          memberName: formName,
          memberPhone: formPhone,
          gymPackageName: selectedPkg?.name,
          gymEndDate: selectedPkg ? hitungEndDate(formStartDate, selectedPkg.duration_days).toISOString().split('T')[0] : undefined,
          ptPackageName: selectedPtPkg?.name,
          ptSessions: selectedPtPkg?.total_sessions ?? undefined,
          totalAmount,
          paymentMethod: formPayMethod,
          transactionType: 'new',
        })
        setReceiptOpen(true)
      }

      resetForm()
      setAddOpen(false)
    } catch (err: any) {
      const msg = err?.message || String(err)
      if (msg.includes('members_member_no_key') || msg.includes('duplicate key value')) {
        toast.error('No Member sudah digunakan, silakan pilih nomor lain.')
      } else {
        toast.error('Gagal menambahkan member')
      }
    }
  }

  const handleRenew = async () => {
    if (!renewMember || (!renewMembershipId && !renewPtMembershipId)) return
    
    const pkg = renewMembershipId ? memberships?.find((m) => m.id === renewMembershipId) : null
    
    const startDate = new Date().toISOString().split('T')[0]
    const endDate = pkg ? hitungEndDate(startDate, pkg.duration_days).toISOString().split('T')[0] : ''

    try {
      // Update member_no & notes
      const isNotDay = pkg ? pkg.name !== 'DAY' : true
      const updateData: any = {
        member_no: renewMemberNo?.trim() || null,
      }
      
      if (isNotDay && renewMember.notes?.toLowerCase().includes('visitor')) {
        updateData.notes = 'Membership Regular'
      }

      const { error: updErr } = await supabase
        .from('members')
        .update(updateData)
        .eq('id', renewMember.member_id)
      
      if (updErr) throw updErr

      // Jika visitor pending sedang diperpanjang, otomatis buat attendance log (Check-In)
      if (renewMember.notes?.toLowerCase().includes('visitor') && renewMember.status === 'inactive') {
        await supabase.from('attendance_logs').insert({
          gym_id: GYM_ID,
          member_id: renewMember.member_id,
          notes: `Visitor Extended to ${pkg ? pkg.name : 'PT Package'} (Check-In)`
        })
      }

      // Build PT payment jika ada
      const ptPkg = renewPtMembershipId ? memberships?.find(m => m.id === renewPtMembershipId) : null
      const ptPaymentData = ptPkg ? {
        membershipId: ptPkg.id,
        startDate,
        endDate: hitungEndDate(startDate, ptPkg.duration_days).toISOString().split('T')[0],
        amount: ptPkg.price,
        membershipType: ptPkg.name,
        totalSessions: ptPkg.total_sessions || 0,
      } : undefined

      await renewSub.mutateAsync({
        memberId: renewMember.member_id,
        membershipId: renewMembershipId || undefined,
        startDate: pkg ? startDate : undefined,
        endDate: pkg ? endDate : undefined,
        amount: pkg?.price,
        paymentMethod: renewPayMethod,
        membershipType: pkg?.name,
        ptPayment: ptPaymentData,
      })

      // Invalidate cache agar data UI ter-update
      queryClient.invalidateQueries({ queryKey: ['members-with-subscription'] })
      
      toast.success(`Membership ${renewMember.full_name} berhasil diperpanjang!`)

      // Prepare receipt data
      const totalAmount = (pkg?.price || 0) + (ptPkg?.price || 0)
      if (totalAmount > 0) {
        setReceiptData({
          memberName: renewMember.full_name,
          memberPhone: renewMember.phone,
          gymPackageName: pkg?.name,
          gymEndDate: pkg ? endDate : undefined,
          ptPackageName: ptPkg?.name,
          ptSessions: ptPkg?.total_sessions ?? undefined,
          totalAmount,
          paymentMethod: renewPayMethod,
          transactionType: 'renew',
        })
        setReceiptOpen(true)
      }

      setRenewOpen(false)
      setRenewMember(null)
    } catch (err: any) {
      console.error('Renew error:', err)
      const msg = err?.message || String(err)
      if (msg.includes('members_member_no_key') || msg.includes('duplicate key value')) {
        toast.error('No Member sudah digunakan, silakan pilih nomor lain.')
      } else {
        toast.error(`Gagal memperpanjang: ${msg}`)
      }
    }
  }

  const handleUpdateMember = async () => {
    if (!editMemberData) return
    if (!formName || !formPhone) {
      toast.error('Nama dan No. HP wajib diisi')
      return
    }

    try {
      await updateMember.mutateAsync({
        id: editMemberData.member_id,
        data: {
          full_name: formName,
          phone: formPhone,
          member_no: formMemberNo || null,
          emergency_contact: formEmergency || null,
          notes: formNotes || null,
        }
      })
      toast.success('Member berhasil diupdate')
      setEditOpen(false)
      resetForm()
    } catch (err: any) {
      console.error('Update member error:', err)
      const msg = err?.message || String(err)
      if (msg.includes('members_member_no_key') || msg.includes('duplicate key value')) {
        toast.error('No Member sudah digunakan, silakan pilih nomor lain.')
      } else {
        toast.error(`Gagal mengupdate member: ${msg}`)
      }
    }
  }

  const handleDelete = async (id: string, name: string) => {
    try {
      await deleteMember.mutateAsync(id)
      toast.success(`${name} berhasil dihapus`)
    } catch (err) {
      console.error(err)
      toast.error('Gagal menghapus member')
    }
  }

  const handleApproveVisitor = async (m: any) => {
    setApprovingId(m.member_id)
    try {
      // Ambil paket DAY secara dinamis dari database
      let { data: pkgData } = await supabase
        .from('memberships')
        .select('id, price')
        .eq('name', 'DAY')
        .limit(1)
        .single()
      
      if (!pkgData) {
        const { data: fallbackPkg } = await supabase
          .from('memberships')
          .select('id, price')
          .ilike('name', '%DAY%')
          .limit(1)
          .single()
        pkgData = fallbackPkg
      }

      if (!pkgData) {
        const { data: absoluteFallback } = await supabase
          .from('memberships')
          .select('id, price')
          .limit(1)
          .single()
        pkgData = absoluteFallback
      }

      const DAY_PACKAGE_ID = pkgData?.id || '6f53dd6e-74fd-4b75-a852-23d9ec00a77e'
      const pkgPrice = pkgData?.price || 15000

      const startDate = new Date().toISOString().split('T')[0]
      const endDate = hitungEndDate(startDate, 1).toISOString().split('T')[0]

      // 1. Absen (Check-In)
      const { error: attErr } = await supabase.from('attendance_logs').insert({
        gym_id: GYM_ID,
        member_id: m.member_id,
        notes: 'Visitor Check-In (Admin Approved)'
      })
      if (attErr) throw attErr
      
      // 2. Tambah Subscription (Paket DAY 1 Hari)
      const { error: subErr } = await supabase.from('subscriptions').insert({
        member_id: m.member_id,
        membership_id: DAY_PACKAGE_ID,
        start_date: startDate,
        end_date: endDate,
        status: 'active'
      })
      if (subErr) throw subErr

      // 3. Catat Keuangan (Revenue)
      const { error: payErr } = await supabase.from('payments').insert({
        gym_id: GYM_ID,
        member_id: m.member_id,
        amount: pkgPrice,
        payment_method: 'cash',
        membership_type: 'DAY',
        notes: 'Pembayaran Visitor Harian (Daily Pass)'
      })
      if (payErr) throw payErr
      
      // 4. Ubah notes agar tidak muncul lagi sebagai pending
      const { error: updErr } = await supabase
        .from('members')
        .update({ notes: 'Visitor Harian (Selesai)' })
        .eq('id', m.member_id)
      
      if (updErr) throw updErr
      
      // Invalidate semua query terkait agar dashboard update
      queryClient.invalidateQueries({ queryKey: ['members-with-subscription'] })
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['overview'] })
      
      toast.success(`${m.full_name} berhasil disetujui! Paket DAY & Pembayaran ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(pkgPrice)} tercatat.`)
    } catch (err) {
      toast.error('Gagal menyetujui visitor')
      console.error(err)
    } finally {
      setApprovingId(null)
    }
  }

  const exportExcel = () => {
    const rows = [
      ['No. Member', 'Nama', 'Telepon', 'Paket', 'Mulai', 'Expired', 'Status'],
      ...(filtered || []).map((m) => [
        m.member_no ?? '',
        m.full_name,
        m.phone,
        m.membership_name,
        m.start_date,
        m.end_date,
        m.status,
      ]),
    ]

    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Members</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
        <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
        <style>
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #aaaaaa; padding: 8px; text-align: left; font-family: Arial, sans-serif; }
          th { background-color: #f2f2f2; font-weight: bold; }
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>
              ${rows[0].map(cell => `<th>${cell}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows.slice(1).map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `members_${new Date().toISOString().split('T')[0]}.xls`
    a.click()
    URL.revokeObjectURL(url)
  }

  const resetForm = () => {
    setFormName('')
    setFormPhone('')
    setFormMemberNo('')
    setFormEmergency('')
    setFormMembership('')
    setFormPtMembership('')
    setFormStartDate(new Date().toISOString().split('T')[0])
    setFormNotes('')
  }

  const selectedPkg = memberships?.find((m) => m.id === formMembership)

  return (
    <div className="space-y-4">
      {/* Header manajemen member */}
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl uppercase text-white sm:text-3xl">Manajemen Member</h1>
        <p className="text-sm text-[#888]">Kelola data member reguler dan pengunjung harian</p>
      </div>

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
          <NativeSelect
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            options={[
              { value: 'all', label: 'Semua Tipe' },
              { value: 'regular', label: 'Member Reguler' },
              { value: 'pt', label: 'Member PT' },
              { value: 'visitor', label: 'Pengunjung Harian' },
            ]}
            triggerClassName="w-36 text-xs"
          />
          <NativeSelect
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            options={[
              { value: 'all', label: 'Semua' },
              { value: 'active', label: 'Aktif' },
              { value: 'expiring_soon', label: 'Segera' },
              { value: 'critical', label: 'Kritis' },
              { value: 'expired', label: 'Expired' },
            ]}
            triggerClassName="w-28 text-xs"
          />

          <Button size="sm" variant="outline" onClick={exportExcel} className="border-[#2A2A2A] text-xs text-[#888]">
            <Download className="mr-1 h-3.5 w-3.5" /> Excel
          </Button>

          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger render={<Button size="sm" className="bg-[#D4FF00] text-xs font-bold text-black hover:bg-[#E60000]" />}>
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
                  <Label className="text-xs text-[#888]">No. Member (Opsional)</Label>
                  <Input value={formMemberNo} onChange={(e) => setFormMemberNo(e.target.value)} className="border-[#2A2A2A] bg-[#111] text-white" />
                </div>
                <div>
                  <Label className="text-xs text-[#888]">Kontak Darurat</Label>
                  <Input value={formEmergency} onChange={(e) => setFormEmergency(e.target.value)} className="border-[#2A2A2A] bg-[#111] text-white" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-[#888]">Paket Gym (Wajib)</Label>
                    <PackageCombobox
                      packages={gymPackages}
                      value={formMembership}
                      onValueChange={setFormMembership}
                      placeholder="Pilih paket gym"
                    />
                    {selectedPkg && (
                      <p className="mt-1 text-[10px] text-[#FF2A2A]">
                        Aktif sampai: {formatTanggal(hitungEndDate(formStartDate, selectedPkg.duration_days).toISOString())}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-[#888]">Paket PT (Opsional)</Label>
                    <PackageCombobox
                      packages={ptPackages}
                      value={formPtMembership}
                      onValueChange={setFormPtMembership}
                      placeholder="Pilih paket PT"
                    />
                    {formPtMembership && ptPackages.find(p => p.id === formPtMembership) && (
                      <p className="mt-1 text-[10px] text-[#FF2A2A]">
                        Sesi: {ptPackages.find(p => p.id === formPtMembership)?.total_sessions} Sesi
                      </p>
                    )}
                  </div>
                </div>

                {(formMembership || formPtMembership) && (
                  <div className="rounded-lg border border-[#2A2A2A] bg-[#111] p-3">
                    <div className="mb-3 flex items-center justify-between border-b border-[#2A2A2A] pb-2 text-sm">
                      <span className="text-[#888]">Total Tagihan:</span>
                      <span className="font-heading text-lg text-[#D4FF00]">
                        {formatRupiah(
                          (selectedPkg?.price || 0) +
                          (ptPackages.find(p => p.id === formPtMembership)?.price || 0)
                        )}
                      </span>
                    </div>
                    <div>
                      <Label className="text-xs text-[#888]">Metode Bayar</Label>
                      <NativeSelect
                        value={formPayMethod}
                        onChange={(e) => setFormPayMethod(e.target.value as 'cash' | 'transfer' | 'qris')}
                        options={[
                          { value: 'cash', label: 'Cash' },
                          { value: 'transfer', label: 'Transfer' },
                          { value: 'qris', label: 'QRIS' },
                        ]}
                      />
                    </div>
                  </div>
                )}
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
                  className="w-full bg-[#FF2A2A] font-bold text-black hover:bg-[#E60000]"
                >
                  {createMember.isPending ? 'Menyimpan...' : 'Simpan Member'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Edit Member Dialog */}
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogContent className="max-h-[90dvh] overflow-y-auto border-[#2A2A2A] bg-[#1A1A1A] text-white sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-heading text-xl">Edit Profil Member</DialogTitle>
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
                  <Label className="text-xs text-[#888]">No. Member (Opsional)</Label>
                  <Input value={formMemberNo} onChange={(e) => setFormMemberNo(e.target.value)} className="border-[#2A2A2A] bg-[#111] text-white" />
                </div>
                <div>
                  <Label className="text-xs text-[#888]">Kontak Darurat</Label>
                  <Input value={formEmergency} onChange={(e) => setFormEmergency(e.target.value)} className="border-[#2A2A2A] bg-[#111] text-white" />
                </div>
                <div>
                  <Label className="text-xs text-[#888]">Catatan</Label>
                  <Input value={formNotes} onChange={(e) => setFormNotes(e.target.value)} className="border-[#2A2A2A] bg-[#111] text-white" />
                </div>
                <Button
                  onClick={handleUpdateMember}
                  disabled={updateMember.isPending}
                  className="w-full bg-[#FF2A2A] font-bold text-black hover:bg-[#E60000]"
                >
                  {updateMember.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
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
                        <p className="truncate text-sm font-semibold text-white">
                          {num}. {m.full_name} 
                          {m.member_no && <span className="ml-1 text-xs text-[#888]">#{m.member_no}</span>}
                        </p>
                        <p className="text-[11px] text-[#888]">{m.phone}</p>
                      </div>
                      <StatusBadge status={m.status} />
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-[#555]">
                      <span>{m.membership_name}</span>
                      <span>Exp: {formatTanggal(m.end_date)}</span>
                      <span>Sisa {m.days_remaining} hari</span>
                    </div>
                    {m.pt_membership_name && (
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                          m.pt_remaining_sessions === null || m.pt_remaining_sessions === undefined
                            ? 'bg-[#555]/20 text-[#888]'
                            : m.pt_remaining_sessions <= 0
                              ? 'bg-red-500/15 text-red-400'
                              : m.pt_remaining_sessions <= 2
                                ? 'bg-amber-500/15 text-amber-400'
                                : 'bg-emerald-500/15 text-emerald-400'
                        }`}>
                          🏋️ {m.pt_membership_name} · {m.pt_remaining_sessions ?? 0}/{m.pt_total_sessions ?? 0} sesi
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {m.notes === 'Visitor Harian' && m.status === 'inactive' ? (
                  <div className="mt-2 flex gap-1.5 border-t border-[#2A2A2A]/50 pt-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleApproveVisitor(m)}
                      disabled={approvingId === m.member_id}
                      className="h-7 flex-1 text-[11px] bg-[#FF2A2A]/10 text-[#FF2A2A] hover:bg-[#FF2A2A]/20"
                    >
                      <CheckCircle2 className="mr-1 h-3 w-3" /> {approvingId === m.member_id ? 'Loading...' : 'Izinkan & Absen'}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger render={<Button size="sm" variant="ghost" className="h-7 flex-1 text-[11px] text-red-400 hover:bg-red-500/10" />}>
                        <Trash2 className="mr-1 h-3 w-3" /> Tolak & Hapus
                      </AlertDialogTrigger>
                      <AlertDialogContent className="border-[#2A2A2A] bg-[#1A1A1A] text-white">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Tolak & Hapus {m.full_name}?</AlertDialogTitle>
                          <AlertDialogDescription className="text-[#888]">
                            Data visitor ini akan dihapus dari sistem.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="border-[#2A2A2A] text-[#888]">Batal</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(m.member_id, m.full_name)} className="bg-red-500 text-white hover:bg-red-600">
                            Hapus
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ) : m.notes?.toLowerCase().includes('visitor') && m.status === 'inactive' ? (
                  /* Visitor yang sudah di-approve (DAY aktif) — tampilkan Edit, Perpanjang, Hapus */
                  <div className="mt-2 flex gap-1.5 border-t border-[#2A2A2A]/50 pt-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditMemberData(m)
                        setFormName(m.full_name)
                        setFormPhone(m.phone)
                        setFormMemberNo(m.member_no || '')
                        setFormEmergency(m.emergency_contact || '')
                        setFormNotes(m.notes || '')
                        setEditOpen(true)
                      }}
                      className="h-7 flex-1 text-[11px] text-blue-400 hover:bg-blue-500/10"
                    >
                      <Edit2 className="mr-1 h-3 w-3" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { setRenewMember(m); setRenewMemberNo(m.member_no || ''); setRenewPtMembershipId(''); setRenewOpen(true) }}
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
                            Data visitor ini akan dihapus dari sistem.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="border-[#2A2A2A] text-[#888]">Batal</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(m.member_id, m.full_name)} className="bg-red-500 text-white hover:bg-red-600">
                            Hapus
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ) : (
                  <div className="mt-2 flex gap-1.5 border-t border-[#2A2A2A]/50 pt-2">
                    <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditMemberData(m)
                      setFormName(m.full_name)
                      setFormPhone(m.phone)
                      setFormMemberNo(m.member_no || '')
                      setFormEmergency(m.emergency_contact || '')
                      setFormNotes(m.notes || '')
                      setEditOpen(true)
                    }}
                    className="h-7 flex-1 text-[11px] text-blue-400 hover:bg-blue-500/10"
                  >
                    <Edit2 className="mr-1 h-3 w-3" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setRenewMember(m); setRenewMemberNo(m.member_no || ''); setRenewOpen(true) }}
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
                )}
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
      <Dialog open={renewOpen} onOpenChange={(open) => { setRenewOpen(open); if (!open) { setRenewPtMembershipId(''); setRenewMembershipId(''); } }}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto border-[#2A2A2A] bg-[#1A1A1A] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Perpanjang Membership</DialogTitle>
          </DialogHeader>
          {renewMember && (() => {
            const renewGymPkg = memberships?.find(m => m.id === renewMembershipId)
            const renewPtPkg = renewPtMembershipId ? memberships?.find(m => m.id === renewPtMembershipId) : null
            const totalAmount = (renewGymPkg?.price || 0) + (renewPtPkg?.price || 0)

            return (
            <div className="space-y-3">
              <p className="text-sm text-[#888]">Member: <span className="text-white">{renewMember.full_name}</span></p>
              
              <div>
                <Label className="text-xs text-[#888]">No. Member (Baru/Opsional)</Label>
                <Input
                  value={renewMemberNo}
                  onChange={(e) => setRenewMemberNo(e.target.value)}
                  placeholder="Misal: 001"
                  className="border-[#2A2A2A] bg-[#111] text-white mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-[#888]">Paket Gym (Opsional)</Label>
                  <PackageCombobox
                    packages={gymPackages}
                    value={renewMembershipId}
                    onValueChange={setRenewMembershipId}
                    placeholder="Pilih paket gym"
                  />
                  {renewGymPkg && (
                    <p className="mt-1 text-[10px] text-[#D4FF00]">
                      Aktif sampai: {formatTanggal(hitungEndDate(new Date().toISOString().split('T')[0], renewGymPkg.duration_days).toISOString())}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-[#888]">Paket PT (Opsional)</Label>
                  <PackageCombobox
                    packages={ptPackages}
                    value={renewPtMembershipId}
                    onValueChange={setRenewPtMembershipId}
                    placeholder="Pilih paket PT"
                  />
                  {renewPtPkg && (
                    <p className="mt-1 text-[10px] text-[#D4FF00]">
                      {renewPtPkg.total_sessions} Sesi PT
                    </p>
                  )}
                </div>
              </div>

              {(renewMembershipId || renewPtMembershipId) && (
                <div className="rounded-lg border border-[#2A2A2A] bg-[#111] p-3">
                  <div className="mb-3 flex items-center justify-between border-b border-[#2A2A2A] pb-2 text-sm">
                    <span className="text-[#888]">Total Tagihan:</span>
                    <span className="font-heading text-lg text-[#D4FF00]">
                      {formatRupiah(totalAmount)}
                    </span>
                  </div>
                  <div>
                    <Label className="text-xs text-[#888]">Metode Bayar</Label>
                    <NativeSelect
                      value={renewPayMethod}
                      onChange={(e) => setRenewPayMethod(e.target.value as 'cash' | 'transfer' | 'qris')}
                      options={[
                        { value: 'cash', label: 'Cash' },
                        { value: 'transfer', label: 'Transfer' },
                        { value: 'qris', label: 'QRIS' },
                      ]}
                    />
                  </div>
                </div>
              )}

              <Button
                onClick={handleRenew}
                disabled={renewSub.isPending || (!renewMembershipId && !renewPtMembershipId)}
                className="w-full bg-[#FF2A2A] font-bold text-black hover:bg-[#E60000]"
              >
                {renewSub.isPending ? 'Memproses...' : 'Perpanjang & Bayar'}
              </Button>
            </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* Receipt / Kwitansi Dialog */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto border-[#2A2A2A] bg-[#1A1A1A] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Kwitansi Pembayaran</DialogTitle>
          </DialogHeader>
          {receiptData && (
            <div className="space-y-4">
              {/* Receipt preview */}
              <div className="rounded-xl border border-[#2A2A2A] bg-[#111] p-4 space-y-3">
                <div className="text-center border-b border-dashed border-[#333] pb-3">
                  <p className="font-heading text-sm font-bold text-[#FF2A2A]">LINEUP GYM PRAMBANAN</p>
                  <p className="text-[10px] text-[#555]">Be Strong Be Healthy!</p>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#888]">Member</span>
                    <span className="text-white font-medium">{receiptData.memberName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#888]">Jenis</span>
                    <span className="text-white">{receiptData.transactionType === 'new' ? 'Pendaftaran Baru' : 'Perpanjangan'}</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-[#333] pt-2 space-y-1.5 text-xs">
                  {receiptData.gymPackageName && (
                    <div className="flex justify-between">
                      <span className="text-[#888]">Paket Gym</span>
                      <span className="text-white">{receiptData.gymPackageName}</span>
                    </div>
                  )}
                  {receiptData.gymEndDate && (
                    <div className="flex justify-between">
                      <span className="text-[#888]">Berlaku s/d</span>
                      <span className="text-[#D4FF00] font-medium">{formatTanggal(receiptData.gymEndDate)}</span>
                    </div>
                  )}
                  {receiptData.ptPackageName && (
                    <div className="flex justify-between">
                      <span className="text-[#888]">Paket PT</span>
                      <span className="text-white">{receiptData.ptPackageName}{receiptData.ptSessions ? ` (${receiptData.ptSessions} Sesi)` : ''}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-dashed border-[#333] pt-2 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#888]">Metode Bayar</span>
                    <span className="text-white capitalize">{receiptData.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold">
                    <span className="text-[#888]">Total</span>
                    <span className="text-[#D4FF00] font-heading text-base">{formatRupiah(receiptData.totalAmount)}</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-[#333] pt-2 text-center">
                  <p className="text-[10px] text-[#555]">{formatTanggal(new Date())} — Terima kasih!</p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setReceiptOpen(false)}
                  className="flex-1 border-[#2A2A2A] text-[#888] hover:bg-[#2A2A2A] hover:text-white"
                >
                  Lewati
                </Button>
                <Button
                  onClick={() => {
                    const url = generateReceiptWALink(receiptData)
                    window.open(url, '_blank')
                    setReceiptOpen(false)
                  }}
                  className="flex-1 bg-[#25D366] font-bold text-white hover:bg-[#1DA851]"
                >
                  <MessageSquare className="mr-1.5 h-4 w-4" /> Kirim ke WA
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
