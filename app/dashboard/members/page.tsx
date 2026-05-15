'use client'

import { useState, useMemo, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useMembersWithSubscription, useCreateMember, useDeleteMember, useUpdateMember } from '@/hooks/useMembers'
import { useActiveMemberships } from '@/hooks/useMemberships'
import { useCheckIn } from '@/hooks/useAttendance'
import { useRenewSubscription } from '@/hooks/useSubscriptions'
import { formatRupiah, formatTanggal, hitungEndDate, toLocalISOString, generateReceiptWALink, calculateDaysRemaining, cn, type ReceiptData } from '@/lib/utils'
import StatusBadge from '@/components/members/StatusBadge'
import { Button, buttonVariants } from '@/components/ui/button'
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
import { Search, Plus, Edit2, Trash2, CheckCircle2, X, Download, RotateCcw, ShieldAlert, Loader2, ArrowLeft, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { GYM_ID } from '@/lib/constants'
import type { ActiveSubscriptionView, Membership } from '@/lib/types'

function MembersContent() {
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
  const searchParams = useSearchParams()
  const typeFilter = searchParams.get('type') || 'all'

  const [page, setPage] = useState(1)
  const PER_PAGE = 10

  // Dialog states
  const [addOpen, setAddOpen] = useState(false)

  // Auto-open modal if ?add=true is in URL
  useEffect(() => {
    if (searchParams.get('add') === 'true') {
      setAddOpen(true)
      // Bersihkan URL agar tidak terbuka lagi saat refresh
      const url = new URL(window.location.href)
      url.searchParams.delete('add')
      window.history.replaceState({}, '', url.pathname + url.search)
    }
  }, [searchParams])
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
  const [formStartDate, setFormStartDate] = useState(new Date().toLocaleDateString('sv-SE'))

  // Hitung nomor member berikutnya secara otomatis
  const nextMemberNo = useMemo(() => {
    if (!members || members.length === 0) return '1'
    
    // Ambil semua nomor member, bersihkan karakter non-angka, konversi ke integer
    const nos = members
      .map(m => {
        const onlyDigits = (m.member_no || '').replace(/[^0-9]/g, '')
        return onlyDigits ? parseInt(onlyDigits, 10) : 0
      })
      .filter(n => n > 0)
    
    const max = nos.length > 0 ? Math.max(...nos) : 0
    // Kembalikan nomor berikutnya tanpa padding nol (misal 1, 2, 457)
    return String(max + 1)
  }, [members])

  // Pastikan tanggal mulai selalu update ke "hari ini" & No Member terisi otomatis saat modal dibuka
  useEffect(() => {
    if (addOpen) {
      setFormStartDate(new Date().toLocaleDateString('sv-SE'))
      setFormMemberNo(nextMemberNo)
    }
  }, [addOpen, nextMemberNo])
  const [formNotes, setFormNotes] = useState('')

  // Receipt dialog
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null)

  // Renew form
  const [renewMembershipId, setRenewMembershipId] = useState('')
  const [renewPtMembershipId, setRenewPtMembershipId] = useState('')
  const [renewMemberNo, setRenewMemberNo] = useState('')
  const [renewPayMethod, setRenewPayMethod] = useState<'cash' | 'transfer' | 'qris'>('cash')
  const [renewStartDate, setRenewStartDate] = useState(new Date().toISOString().split('T')[0])

  const [cancelPTOpen, setCancelPTOpen] = useState(false)
  const [cancelPTData, setCancelPTData] = useState<{ memberId: string; ptSubId: string; memberName: string } | null>(null)

  const [cancelRenewOpen, setCancelRenewOpen] = useState(false)
  const [cancelRenewData, setCancelRenewData] = useState<{ memberId: string; subId: string; memberName: string } | null>(null)

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
      list = list.filter((m) => {
        const localDays = calculateDaysRemaining(m.end_date)
        if (statusFilter === 'active') return localDays !== null && localDays > 7
        if (statusFilter === 'expiring_soon') return localDays !== null && localDays >= 4 && localDays <= 7
        if (statusFilter === 'critical') return localDays !== null && localDays >= 0 && localDays <= 3
        if (statusFilter === 'expired') return localDays !== null && localDays < 0
        return m.status === statusFilter
      })
    }
    
    // Filter Tipe Membership vs Visitor
    if (typeFilter === 'visitor') {
      list = list.filter((m) => {
        const isDayPkg = m.membership_name?.toUpperCase() === 'VISITOR'
        const isVisitorNotes = m.notes?.toLowerCase().includes('visitor')
        return isDayPkg || isVisitorNotes
      })
    } else if (typeFilter === 'regular') {
      list = list.filter((m) => {
        const isDayPkg = m.membership_name?.toUpperCase() === 'VISITOR'
        const isVisitorNotes = m.notes?.toLowerCase().includes('visitor')
        return !isDayPkg && !isVisitorNotes
      })
    } else if (typeFilter === 'pt') {
      list = list.filter((m) => !!m.pt_membership_name)
    }
    
    // Urutkan: 
    list.sort((a, b) => {
      // 1. Paling atas untuk yang baru absen/pending (status inactive)
      const aPending = (a.notes?.toLowerCase().includes('visitor') && a.status === 'inactive') ? 1 : 0
      const bPending = (b.notes?.toLowerCase().includes('visitor') && b.status === 'inactive') ? 1 : 0
      if (aPending !== bPending) return bPending - aPending

      // 2. Urutkan berdasarkan Nomor Member secara Numerik (1, 2, 3...)
      const numA = parseInt((a.member_no || '').replace(/[^0-9]/g, ''), 10) || 0
      const numB = parseInt((b.member_no || '').replace(/[^0-9]/g, ''), 10) || 0
      
      if (numA !== numB) return numA - numB
      
      // Fallback: Nama
      return a.full_name.localeCompare(b.full_name)
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

    // Cek duplikasi (Nomor HP wajib unik)
    const existingMember = members?.find(m => 
      m.phone.replace(/[^0-9]/g, '') === formPhone.replace(/[^0-9]/g, '')
    )

    if (existingMember) {
      toast.error(`Nomor HP ${formPhone} sudah terdaftar atas nama "${existingMember.full_name}"!`)
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
          end_date: toLocalISOString(hitungEndDate(formStartDate, selectedPkg?.duration_days ?? 0)),
        } : undefined,
        ptSubscription: formPtMembership && selectedPtPkg ? {
          membership_id: formPtMembership,
          start_date: formStartDate,
          end_date: toLocalISOString(hitungEndDate(formStartDate, selectedPtPkg.duration_days)),
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
          gymEndDate: selectedPkg ? toLocalISOString(hitungEndDate(formStartDate, selectedPkg.duration_days)) : undefined,
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
    
    // Jika paketnya VISITOR, paksa end_date ke akhir hari ini (23:59:59)
    const isVisitorPkg = pkg?.name.toUpperCase() === 'VISITOR'
    const startDate = renewStartDate
    let endDate = pkg ? toLocalISOString(hitungEndDate(startDate, pkg.duration_days)) : ''
    
    if (isVisitorPkg) {
      const today = new Date(startDate)
      today.setHours(23, 59, 59, 999)
      endDate = today.toISOString()
    }

    try {
      // Update member_no & notes
      const updateData: any = {
        member_no: renewMemberNo?.trim() || null,
      }
      
      // Jika bayar paket VISITOR, pastikan notes-nya tertulis visitor
      if (isVisitorPkg) {
        updateData.notes = 'visitor'
      } else if (renewMember.notes?.toLowerCase().includes('visitor')) {
        // Jika tadinya visitor tapi sekarang bayar paket regular, hapus notes visitor-nya
        updateData.notes = 'Membership Regular'
      }

      const { error: updErr } = await supabase
        .from('members')
        .update(updateData)
        .eq('id', renewMember.member_id)
      
      if (updErr) throw updErr

      // OTOMATIS ABSEN (Check-In) untuk paket VISITOR
      // Atau jika dia visitor lama yang sedang diaktifkan kembali
      if (isVisitorPkg || (renewMember.notes?.toLowerCase().includes('visitor') && renewMember.status === 'inactive')) {
        await supabase.from('attendance_logs').insert({
          gym_id: GYM_ID,
          member_id: renewMember.member_id,
          notes: isVisitorPkg ? 'Visitor Check-In (Auto via Renewal)' : 'Visitor Extended (Check-In)'
        })
      }

      // Build PT payment jika ada
      const ptPkg = renewPtMembershipId ? memberships?.find(m => m.id === renewPtMembershipId) : null
      const ptPaymentData = ptPkg ? {
        membershipId: ptPkg.id,
        startDate,
        endDate: toLocalISOString(hitungEndDate(startDate, ptPkg.duration_days)),
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

    // Cek duplikasi (Nomor HP wajib unik, tapi bukan dirinya sendiri)
    const existingOther = members?.find(m => 
      m.member_id !== editMemberData.member_id && 
      m.phone.replace(/[^0-9]/g, '') === formPhone.replace(/[^0-9]/g, '')
    )

    if (existingOther) {
      toast.error(`Nomor HP ${formPhone} sudah digunakan oleh member lain ("${existingOther.full_name}")!`)
      return
    }

    try {
      // 1. Update basic member info
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

      // 2. Override Subscription (Bypass Payment)
      const startDate = formStartDate || toLocalISOString(new Date())
      const subPromises = []
      
      // Persiapkan Update Gym Package
      if (formMembership) {
          const gymPkg = gymPackages.find(p => p.id === formMembership)
          if (gymPkg) {
             const endDate = toLocalISOString(hitungEndDate(startDate, gymPkg.duration_days))
             
             if (editMemberData.subscription_id) {
                subPromises.push(
                  supabase.from('subscriptions').update({
                    membership_id: gymPkg.id,
                    start_date: startDate,
                    end_date: endDate,
                    status: 'active'
                  }).eq('id', editMemberData.subscription_id)
                )
             } else {
                subPromises.push(
                  supabase.from('subscriptions').insert({
                    member_id: editMemberData.member_id,
                    membership_id: gymPkg.id,
                    start_date: startDate,
                    end_date: endDate,
                    status: 'active'
                  })
                )
             }
          }
      }

      // Persiapkan Update PT Package
      if (formPtMembership) {
          const ptPkg = ptPackages.find(p => p.id === formPtMembership)
          if (ptPkg) {
             const endDate = toLocalISOString(hitungEndDate(startDate, ptPkg.duration_days))
             
             if (editMemberData.pt_subscription_id) {
                subPromises.push(
                  supabase.from('subscriptions').update({
                    membership_id: ptPkg.id,
                    start_date: startDate,
                    end_date: endDate,
                    remaining_sessions: ptPkg.total_sessions,
                    status: 'active'
                  }).eq('id', editMemberData.pt_subscription_id)
                )
             } else {
                subPromises.push(
                  supabase.from('subscriptions').insert({
                    member_id: editMemberData.member_id,
                    membership_id: ptPkg.id,
                    start_date: startDate,
                    end_date: endDate,
                    remaining_sessions: ptPkg.total_sessions,
                    status: 'active'
                  })
                )
             }
          }
      }

      // Jalankan semua update paket secara paralel agar cepat
      const results = await Promise.all(subPromises)
      for (const res of results) {
        if (res.error) throw new Error(`Gagal update paket: ${res.error.message}`)
      }

      toast.success('Member dan Paket berhasil diperbarui!')
      setEditOpen(false)
      resetForm()
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['members-with-subscription'] }),
        queryClient.invalidateQueries({ queryKey: ['expiry'] }),
        queryClient.invalidateQueries({ queryKey: ['critical-count'] })
      ])
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

  // Fitur Batalkan PT & Hapus Uangnya (Sudah Pakai Modal)
  const handleCancelPT = async () => {
    if (!cancelPTData) return
    const { memberId, ptSubId, memberName } = cancelPTData

    try {
      // 1. Cari transaksi pembayaran terakhir dari member ini yang kemungkinan besar adalah PT
      // Kita cari berdasarkan member_id dan urutan terbaru
      const { data: latestPayment, error: searchError } = await supabase
        .from('payments')
        .select('id, notes, membership_type, amount')
        .eq('member_id', memberId)
        .order('paid_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (searchError) throw searchError

      const promises = []
      
      // Hapus paket PT-nya
      promises.push(supabase.from('subscriptions').delete().eq('id', ptSubId))
      
      // Hapus uangnya jika ketemu transaksinya
      // Kita cek juga apakah nominalnya cocok atau notes-nya mengandung PT untuk keamanan
      if (latestPayment) {
        console.log('Menghapus transaksi:', latestPayment)
        promises.push(supabase.from('payments').delete().eq('id', latestPayment.id))
      }

      await Promise.all(promises)
      
      // PAKSA REFRESH SEMUA DATA KEUANGAN
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['members-with-subscription'] }),
        queryClient.invalidateQueries({ queryKey: ['payments'] }),
        queryClient.invalidateQueries({ queryKey: ['revenue-monthly'] }),
        queryClient.invalidateQueries({ queryKey: ['revenue-current-month'] }),
        queryClient.invalidateQueries({ queryKey: ['overview'] }),
        queryClient.invalidateQueries({ queryKey: ['revenue-chart'] }), // Jika ada chart
      ])
      
      setCancelPTOpen(false)
      if (latestPayment) {
        toast.success(`Paket PT ${memberName} dibatalkan & uang senilai ${formatRupiah(latestPayment.amount)} telah dihapus dari laporan.`)
      } else {
        toast.success(`Paket PT ${memberName} telah dihapus (Tidak ada data transaksi keuangan yang ditemukan).`)
      }
    } catch (error: any) {
      console.error(error)
      toast.error('Gagal membatalkan PT: ' + error.message)
    }
  }

  // Fitur Batalkan Perpanjangan (Rollback Tanggal & Uang)
  const handleCancelRenewal = async () => {
    if (!cancelRenewData) return
    const { memberId, subId, memberName } = cancelRenewData

    try {
      // 1. Cari transaksi pembayaran terakhir (Non-PT) dari member ini
      const { data: latestPayment } = await supabase
        .from('payments')
        .select('id, amount')
        .eq('member_id', memberId)
        .not('membership_type', 'ilike', '%PT%') // Cari yang bukan PT
        .order('paid_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      // 2. Cari subscription lama yang statusnya 'expired' untuk diaktifkan kembali
      const { data: prevSub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('member_id', memberId)
        .eq('status', 'expired')
        .order('end_date', { ascending: false })
        .limit(1)
        .maybeSingle()

      const promises = []
      
      // Hapus subscription yang baru (pembatalan perpanjangan)
      promises.push(supabase.from('subscriptions').delete().eq('id', subId))
      
      // Aktifkan kembali subscription lama jika ada
      if (prevSub) {
        promises.push(supabase.from('subscriptions').update({ status: 'active' }).eq('id', prevSub.id))
      }
      
      // Hapus uangnya jika ketemu transaksinya
      if (latestPayment) {
        promises.push(supabase.from('payments').delete().eq('id', latestPayment.id))
      }

      await Promise.all(promises)
      
      // Refresh semua data
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['members-with-subscription'] }),
        queryClient.invalidateQueries({ queryKey: ['payments'] }),
        queryClient.invalidateQueries({ queryKey: ['revenue-monthly'] }),
        queryClient.invalidateQueries({ queryKey: ['revenue-current-month'] }),
        queryClient.invalidateQueries({ queryKey: ['overview'] }),
      ])
      
      setCancelRenewOpen(false)
      toast.success(`Perpanjangan ${memberName} dibatalkan. Status kembali ke sebelumnya & uang telah dihapus.`)
    } catch (error: any) {
      console.error(error)
      toast.error('Gagal membatalkan perpanjangan: ' + error.message)
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



  const exportExcel = () => {
    const rows = [
      ['Nomer Member', 'Nama', 'Telepon', 'Paket', 'Mulai', 'Expired', 'Status'],
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl uppercase text-foreground sm:text-3xl">Manajemen Member</h1>
          <p className="text-sm text-muted-foreground">Kelola data member reguler dan pengunjung harian</p>
        </div>

        {/* Legend Warna (Tampilan Baru) */}
        <div className="flex flex-wrap gap-x-4 gap-y-2 rounded-xl border border-border/50 bg-card/50 p-3">
          {[
            { label: 'Aktif (>7hr)', color: 'bg-[#00FF85]' },
            { label: 'Segera (4-7hr)', color: 'bg-[#D4FF00]' },
            { label: 'Kritis (1-3hr)', color: 'bg-[#FFB800]' },
            { label: 'Hari Terakhir', color: 'bg-[#FF6B35]' },
            { label: 'Lewat Hari', color: 'bg-[#FF2A2A]' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${item.color} shadow-[0_0_5px_currentColor]`} />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile header: search + actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            placeholder="Cari nama atau HP..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="border-border bg-card pl-9 text-sm text-foreground placeholder:text-muted-foreground/60"
          />
        </div>
        <div className="flex gap-2">
        <div className="flex w-full items-center gap-1 overflow-x-auto pb-1 sm:w-auto sm:pb-0 scrollbar-hide">
          {[
            { value: 'all', label: 'Semua' },
            { value: 'active', label: 'Aktif' },
            { value: 'expiring_soon', label: 'Segera' },
            { value: 'critical', label: 'Kritis' },
            { value: 'expired', label: 'Expired' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setStatusFilter(opt.value); setPage(1); }}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors border ${
                statusFilter === opt.value
                  ? 'bg-primary text-foreground border-[#FF2A2A]'
                  : 'bg-card text-muted-foreground hover:bg-[#2A2A2A] hover:text-foreground border-border'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

          <Button size="sm" variant="outline" onClick={exportExcel} className="border-border text-xs text-muted-foreground">
            <Download className="mr-1 h-3.5 w-3.5" /> Excel
          </Button>

          <Dialog 
            open={addOpen} 
            modal={true}
            disablePointerDismissal={true}
            onOpenChange={(open, details) => {
              if (details.reason === 'outside-press' || details.reason === 'escape-key') return
              setAddOpen(open)
            }}
          >
            <DialogTrigger render={<Button size="sm" className="bg-[#D4FF00] text-xs font-bold text-black hover:bg-[#E60000]" />}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Tambah
            </DialogTrigger>
            <DialogContent className="max-h-[90dvh] overflow-y-auto border-border bg-card text-foreground sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-heading text-xl">Tambah Member Baru</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Nama Lengkap *</Label>
                  <Input value={formName} onChange={(e) => setFormName(e.target.value)} className="border-border bg-background text-foreground" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">No. HP *</Label>
                  <Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} className="border-border bg-background text-foreground" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">No. Member (Opsional)</Label>
                  <Input value={formMemberNo} onChange={(e) => setFormMemberNo(e.target.value)} className="border-border bg-background text-foreground" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Kontak Darurat</Label>
                  <Input value={formEmergency} onChange={(e) => setFormEmergency(e.target.value)} className="border-border bg-background text-foreground" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Paket Gym (Wajib)</Label>
                    <PackageCombobox
                      packages={gymPackages}
                      value={formMembership}
                      onValueChange={setFormMembership}
                      placeholder="Pilih paket gym"
                    />
                    {selectedPkg && (
                      <p className="mt-1 text-[10px] text-primary">
                        Aktif sampai: {formatTanggal(hitungEndDate(formStartDate, selectedPkg.duration_days).toISOString())}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Paket PT (Opsional)</Label>
                    <PackageCombobox
                      packages={ptPackages}
                      value={formPtMembership}
                      onValueChange={setFormPtMembership}
                      placeholder="Pilih paket PT"
                    />
                    {formPtMembership && ptPackages.find(p => p.id === formPtMembership) && (
                      <p className="mt-1 text-[10px] text-primary">
                        Sesi: {ptPackages.find(p => p.id === formPtMembership)?.total_sessions} Sesi
                      </p>
                    )}
                  </div>
                </div>

                {(formMembership || formPtMembership) && (
                  <div className="rounded-lg border border-border bg-background p-3">
                    <div className="mb-3 flex items-center justify-between border-b border-border pb-2 text-sm">
                      <span className="text-muted-foreground">Total Tagihan:</span>
                      <span className="font-heading text-lg text-accent">
                        {formatRupiah(
                          (selectedPkg?.price || 0) +
                          (ptPackages.find(p => p.id === formPtMembership)?.price || 0)
                        )}
                      </span>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Metode Bayar</Label>
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
                  <Label className="text-xs text-muted-foreground">Tanggal Mulai</Label>
                  <Input type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} className="border-border bg-background text-foreground" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Catatan</Label>
                  <Input value={formNotes} onChange={(e) => setFormNotes(e.target.value)} className="border-border bg-background text-foreground" />
                </div>
                <Button
                  onClick={handleAddMember}
                  disabled={createMember.isPending}
                  className="w-full bg-primary font-bold text-black hover:bg-[#E60000]"
                >
                  {createMember.isPending ? 'Menyimpan...' : 'Simpan Member'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog 
            open={editOpen} 
            modal={true}
            disablePointerDismissal={true}
            onOpenChange={(open, details) => {
              if (details.reason === 'outside-press' || details.reason === 'escape-key') return
              setEditOpen(open)
            }}
          >
            <DialogContent className="max-h-[90dvh] overflow-y-auto border-border bg-card text-foreground sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-heading text-xl">Edit Profil Member</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Nama Lengkap *</Label>
                  <Input value={formName} onChange={(e) => setFormName(e.target.value)} className="border-border bg-background text-foreground" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">No. HP *</Label>
                  <Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} className="border-border bg-background text-foreground" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">No. Member (Opsional)</Label>
                  <Input value={formMemberNo} onChange={(e) => setFormMemberNo(e.target.value)} className="border-border bg-background text-foreground" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Kontak Darurat</Label>
                  <Input value={formEmergency} onChange={(e) => setFormEmergency(e.target.value)} className="border-border bg-background text-foreground" />
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                  <div>
                    <Label className="text-xs text-muted-foreground">Ubah Paket Gym</Label>
                    <PackageCombobox
                      packages={gymPackages}
                      value={formMembership}
                      onValueChange={setFormMembership}
                      placeholder="Pilih paket gym"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Ubah Paket PT</Label>
                    <PackageCombobox
                      packages={ptPackages}
                      value={formPtMembership}
                      onValueChange={setFormPtMembership}
                      placeholder="Pilih paket PT"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Tanggal Mulai (Jika paket diubah)</Label>
                  <Input type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} className="border-border bg-background text-foreground" />
                </div>
                <div className="p-2 border border-red-500/20 bg-red-500/5 rounded-lg">
                  <p className="text-[10px] text-red-400 font-medium">
                    PERHATIAN: Mengubah paket di sini murni untuk koreksi data awal. Transaksi ini TIDAK AKAN ditambahkan ke Laporan Keuangan (Income Rp0).
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Catatan</Label>
                  <Input value={formNotes} onChange={(e) => setFormNotes(e.target.value)} className="border-border bg-background text-foreground" />
                </div>
                <Button
                  onClick={handleUpdateMember}
                  disabled={updateMember.isPending}
                  className="w-full bg-primary font-bold text-black hover:bg-[#E60000]"
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
            <div key={i} className="h-24 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      ) : paginated.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-12 text-center">
          <p className="text-sm text-muted-foreground/60">Tidak ada data member</p>
        </div>
      ) : (
        <div className="space-y-2">
          {paginated.map((m, idx) => {
            const initials = m.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
            const num = (page - 1) * PER_PAGE + idx + 1

            return (
              <div key={m.member_id} className="rounded-xl border border-border/50 bg-card p-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#D4FF00]/10 font-heading text-lg text-accent">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {num}. {m.full_name} 
                          {m.member_no && <span className="ml-1 text-xs text-muted-foreground">#{m.member_no}</span>}
                        </p>
                        <p className="text-[11px] text-muted-foreground">{m.phone}</p>
                      </div>
                        <StatusBadge 
                          status={(() => {
                            const localDays = calculateDaysRemaining(m.end_date)
                            if (localDays === null) return m.status;
                            if (localDays < 0) return 'expired';
                            if (localDays <= 3) return 'critical';
                            if (localDays <= 7) return 'expiring_soon';
                            return 'active';
                          })()} 
                        />
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground/60">
                        <span>{m.membership_name}</span>
                        <span className="flex items-center gap-1">
                          Exp: {formatTanggal(m.end_date)}
                        </span>
                        <span>
                          {(() => {
                            const days = calculateDaysRemaining(m.end_date)
                            if (days === null) return 'No Active Package'
                            if (days === 0) return <span className="text-[#FF6B35] font-bold">Hari Terakhir</span>
                            if (days < 0) return <span className="text-[#FF2A2A] font-bold">Lewat {Math.abs(days)} Hari</span>
                            if (days <= 3) return <span className="text-[#FFB800] font-bold">Sisa {days} hari</span>
                            if (days <= 7) return <span className="text-[#D4FF00] font-bold">Sisa {days} hari</span>
                            return <span className="text-[#00FF85]">Sisa {days} hari</span>
                          })()}
                        </span>
                        <span className="text-[#00E5FF] font-bold">Kunjungan: {m.attendance_count}x</span>
                      </div>
                    {m.pt_membership_name && (
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                          m.pt_remaining_sessions === null || m.pt_remaining_sessions === undefined
                            ? 'bg-[#555]/20 text-muted-foreground'
                            : m.pt_remaining_sessions <= 0
                              ? 'bg-red-500/15 text-red-400'
                              : m.pt_remaining_sessions <= 2
                                ? 'bg-amber-500/15 text-amber-400'
                                : 'bg-emerald-500/15 text-emerald-400'
                        }`}>
                          🏋️ {m.pt_membership_name} · {m.pt_remaining_sessions ?? 0}/{m.pt_total_sessions ?? 0} sesi
                          
                          {/* Tombol Batal PT */}
                          {m.pt_subscription_id && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setCancelPTData({ memberId: m.member_id, ptSubId: m.pt_subscription_id!, memberName: m.full_name });
                                setCancelPTOpen(true);
                              }}
                              className="ml-1 hover:text-red-500 transition-colors"
                              title="Batalkan Paket PT & Hapus Uangnya"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-2 flex gap-1.5 border-t border-border/50 pt-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const mGymId = gymPackages.find(p => p.name.toUpperCase().trim() === (m.membership_name || '').toUpperCase().trim())?.id || ''
                      const mPtId = ptPackages.find(p => p.name.toUpperCase().trim() === (m.pt_membership_name || '').toUpperCase().trim())?.id || ''
                      setEditMemberData(m)
                      setFormName(m.full_name)
                      setFormPhone(m.phone)
                      setFormMemberNo(m.member_no || '')
                      setFormEmergency(m.emergency_contact || '')
                      setFormNotes(m.notes || '')
                      setFormMembership(mGymId)
                      setFormPtMembership(mPtId)
                      setFormStartDate(m.start_date || toLocalISOString(new Date()))
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

                  {/* Tombol Batal Perpanjangan (Hanya Muncul Jika Aktif) */}
                  {m.status === 'active' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setCancelRenewData({ memberId: m.member_id, subId: m.subscription_id!, memberName: m.full_name });
                        setCancelRenewOpen(true);
                      }}
                      className="h-7 flex-1 text-[11px] text-orange-400 hover:bg-orange-500/10 hover:text-orange-300"
                    >
                      <RotateCcw className="mr-1 h-3 w-3" /> Batal
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), "h-7 flex-1 text-[11px] text-red-400 hover:bg-red-500/10")}>
                      <Trash2 className="mr-1 h-3 w-3" /> Hapus
                    </AlertDialogTrigger>
                    <AlertDialogContent className="border-border bg-card text-foreground">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Hapus {m.full_name}?</AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground">
                          Data member tidak bisa dikembalikan setelah dihapus.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="border-border text-muted-foreground">Batal</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(m.member_id, m.full_name)}
                          className="bg-red-500 text-foreground hover:bg-red-600"
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
            className="border-border text-xs text-muted-foreground"
          >
            Sebelumnya
          </Button>
          <span className="text-xs text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="border-border text-xs text-muted-foreground"
          >
            Selanjutnya
          </Button>
        </div>
      )}

      <Dialog 
        open={renewOpen} 
        modal={true}
        disablePointerDismissal={true}
        onOpenChange={(open, details) => { 
          if (details.reason === 'outside-press' || details.reason === 'escape-key') return
          setRenewOpen(open)
          if (!open) { 
            setRenewPtMembershipId(''); 
            setRenewMembershipId(''); 
            setRenewStartDate(new Date().toISOString().split('T')[0]);
          } 
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto border-border bg-card text-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Perpanjang Membership</DialogTitle>
          </DialogHeader>
          {renewMember && (() => {
            const renewGymPkg = memberships?.find(m => m.id === renewMembershipId)
            const renewPtPkg = renewPtMembershipId ? memberships?.find(m => m.id === renewPtMembershipId) : null
            const totalAmount = (renewGymPkg?.price || 0) + (renewPtPkg?.price || 0)

            return (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Member: <span className="text-foreground">{renewMember.full_name}</span></p>
              
              <div>
                <Label className="text-xs text-muted-foreground">No. Member (Baru/Opsional)</Label>
                <Input
                  value={renewMemberNo}
                  onChange={(e) => setRenewMemberNo(e.target.value)}
                  placeholder="Misal: 001"
                  className="border-border bg-background text-foreground mt-1"
                />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Tanggal Mulai</Label>
                <Input
                  type="date"
                  value={renewStartDate}
                  onChange={(e) => setRenewStartDate(e.target.value)}
                  className="border-border bg-background text-foreground mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Paket Gym (Opsional)</Label>
                  <PackageCombobox
                    packages={gymPackages}
                    value={renewMembershipId}
                    onValueChange={setRenewMembershipId}
                    placeholder="Pilih paket gym"
                  />
                  {renewGymPkg && (
                    <p className="mt-1 text-[10px] text-accent">
                      Aktif sampai: {formatTanggal(hitungEndDate(renewStartDate, renewGymPkg.duration_days).toISOString())}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Paket PT (Opsional)</Label>
                  <PackageCombobox
                    packages={ptPackages}
                    value={renewPtMembershipId}
                    onValueChange={setRenewPtMembershipId}
                    placeholder="Pilih paket PT"
                  />
                  {renewPtPkg && (
                    <p className="mt-1 text-[10px] text-accent">
                      {renewPtPkg.total_sessions} Sesi PT
                    </p>
                  )}
                </div>
              </div>

              {(renewMembershipId || renewPtMembershipId) && (
                <div className="rounded-lg border border-border bg-background p-3">
                  <div className="mb-3 flex items-center justify-between border-b border-border pb-2 text-sm">
                    <span className="text-muted-foreground">Total Tagihan:</span>
                    <span className="font-heading text-lg text-accent">
                      {formatRupiah(totalAmount)}
                    </span>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Metode Bayar</Label>
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
                className="w-full bg-primary font-bold text-black hover:bg-[#E60000]"
              >
                {renewSub.isPending ? 'Memproses...' : 'Perpanjang & Bayar'}
              </Button>
            </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      <Dialog 
        open={receiptOpen} 
        modal={true}
        disablePointerDismissal={true}
        onOpenChange={(open, details) => {
          if (details.reason === 'outside-press' || details.reason === 'escape-key') return
          setReceiptOpen(open)
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto border-border bg-card text-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Kwitansi Pembayaran</DialogTitle>
          </DialogHeader>
          {receiptData && (
            <div className="space-y-4">
              {/* Receipt preview */}
              <div className="rounded-xl border border-border bg-background p-4 space-y-3">
                <div className="text-center border-b border-dashed border-[#333] pb-3">
                  <p className="font-heading text-sm font-bold text-primary">LINEUP GYM PRAMBANAN</p>
                  <p className="text-[10px] text-muted-foreground/60">Be Strong Be Healthy!</p>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Member</span>
                    <span className="text-foreground font-medium">{receiptData.memberName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Jenis</span>
                    <span className="text-foreground">{receiptData.transactionType === 'new' ? 'Pendaftaran Baru' : 'Perpanjangan'}</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-[#333] pt-2 space-y-1.5 text-xs">
                  {receiptData.gymPackageName && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Paket Gym</span>
                      <span className="text-foreground">{receiptData.gymPackageName}</span>
                    </div>
                  )}
                  {receiptData.gymEndDate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Berlaku s/d</span>
                      <span className="text-accent font-medium">{formatTanggal(receiptData.gymEndDate)}</span>
                    </div>
                  )}
                  {receiptData.ptPackageName && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Paket PT</span>
                      <span className="text-foreground">{receiptData.ptPackageName}{receiptData.ptSessions ? ` (${receiptData.ptSessions} Sesi)` : ''}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-dashed border-[#333] pt-2 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Metode Bayar</span>
                    <span className="text-foreground capitalize">{receiptData.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold">
                    <span className="text-muted-foreground">Total</span>
                    <span className="text-accent font-heading text-base">{formatRupiah(receiptData.totalAmount)}</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-[#333] pt-2 text-center">
                  <p className="text-[10px] text-muted-foreground/60">{formatTanggal(new Date())} — Terima kasih!</p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setReceiptOpen(false)}
                  className="flex-1 border-border text-muted-foreground hover:bg-[#2A2A2A] hover:text-foreground"
                >
                  Lewati
                </Button>
                <Button
                  onClick={() => {
                    const url = generateReceiptWALink(receiptData)
                    window.open(url, '_blank')
                    setReceiptOpen(false)
                  }}
                  className="flex-1 bg-[#25D366] font-bold text-foreground hover:bg-[#1DA851]"
                >
                  <MessageSquare className="mr-1.5 h-4 w-4" /> Kirim ke WA
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Modal Konfirmasi Batal Perpanjangan */}
      <AlertDialog open={cancelRenewOpen} onOpenChange={setCancelRenewOpen}>
        <AlertDialogContent className="border-border bg-card text-foreground">
          <AlertDialogHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/10 mb-4 mx-auto">
              <RotateCcw className="h-6 w-6 text-orange-500" />
            </div>
            <AlertDialogTitle className="text-center">Batalkan Perpanjangan?</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-muted-foreground">
              Yakin ingin membatalkan perpanjangan terakhir untuk <span className="font-bold text-foreground">{cancelRenewData?.memberName}</span>? 
              <br/><br/>
              Sistem akan <span className="text-orange-400 font-medium">mengembalikan tanggal expired ke aslinya</span> dan <span className="text-red-400 font-medium">MENGHAPUS pendapatan</span> terkait dari laporan keuangan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-muted-foreground">Kembali</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelRenewal}
              className="bg-orange-500 text-white hover:bg-orange-600 font-bold"
            >
              Ya, Batalkan & Kembalikan Status
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal Konfirmasi Batal PT */}
      <AlertDialog open={cancelPTOpen} onOpenChange={setCancelPTOpen}>
        <AlertDialogContent className="border-border bg-card text-foreground">
          <AlertDialogHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 mb-4 mx-auto">
              <ShieldAlert className="h-6 w-6 text-red-500" />
            </div>
            <AlertDialogTitle className="text-center">Batalkan Paket PT?</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-muted-foreground">
              Yakin ingin membatalkan paket PT untuk <span className="font-bold text-foreground">{cancelPTData?.memberName}</span>? 
              <br/><br/>
              Tindakan ini akan <span className="text-red-400 font-medium">menghapus paket PT</span> dan <span className="text-red-400 font-medium">MENGURANGI pendapatan</span> di Laporan Keuangan secara otomatis.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-muted-foreground">Kembali</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelPT}
              className="bg-red-500 text-white hover:bg-red-600 font-bold"
            >
              Ya, Batalkan PT & Uangnya
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default function MembersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Memuat data member...</div>}>
      <MembersContent />
    </Suspense>
  )
}
