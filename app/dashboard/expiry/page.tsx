'use client'

import { useExpiry, useExpiryStats } from '@/hooks/useExpiry'
import { useActiveMemberships } from '@/hooks/useMemberships'
import { useRenewSubscription } from '@/hooks/useSubscriptions'
import { formatRupiah, formatTanggal, generateWALink, generateReceiptWALink, hitungEndDate, toLocalISOString } from '@/lib/utils'
import type { ReceiptData } from '@/lib/utils'
import MetricCard from '@/components/dashboard/MetricCard'
import StatusBadge from '@/components/members/StatusBadge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import NativeSelect from '@/components/dashboard/NativeSelect'
import PackageCombobox from '@/components/dashboard/PackageCombobox'
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
import { AlertTriangle, Clock, CalendarX, MessageCircle, RotateCcw, Send, Search } from 'lucide-react'
import { toast } from 'sonner'
import { useState, useMemo, useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { GYM_ID } from '@/lib/constants'
import type { ActiveSubscriptionView } from '@/lib/types'

export default function ExpiryPage() {
  const { data: expiryList, isLoading } = useExpiry()
  const { data: stats } = useExpiryStats()
  const { data: memberships } = useActiveMemberships()
  const renewSub = useRenewSubscription()

  const [activeTab, setActiveTab] = useState<'all' | 'regular' | 'pt' | 'visitor'>('regular')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expiring_soon' | 'critical' | 'expired'>('all')
  const [search, setSearch] = useState('')
  const [renewOpen, setRenewOpen] = useState(false)
  const [renewMember, setRenewMember] = useState<ActiveSubscriptionView | null>(null)
  const [renewMemberNo, setRenewMemberNo] = useState('')
  const [renewMembershipId, setRenewMembershipId] = useState('')
  const [renewPtMembershipId, setRenewPtMembershipId] = useState('')
  const [renewPayMethod, setRenewPayMethod] = useState<'cash' | 'transfer' | 'qris'>('cash')
  const [renewStartDate, setRenewStartDate] = useState(new Date().toISOString().split('T')[0])
  const [page, setPage] = useState(1)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null)
  const PER_PAGE = 10

  const queryClient = useQueryClient()
  const supabase = createClient()

  const gymPackages = useMemo(() => memberships?.filter(m => m.category === 'gym') || [], [memberships])
  const ptPackages = useMemo(() => memberships?.filter(m => m.category === 'pt') || [], [memberships])

  const getPriorityLabel = useCallback((m: ActiveSubscriptionView) => {
    // Jika di tab PT, prioritas berdasarkan sesi
    if (activeTab === 'pt') {
      if (m.pt_remaining_sessions === 0) return 'expired'
      if (m.pt_remaining_sessions !== null && m.pt_remaining_sessions <= 2) return 'critical'
      return 'active'
    }

    const isGymExpired = m.membership_name && m.days_remaining !== null && m.days_remaining < 0

    if (isGymExpired) return 'expired'
    if (m.days_remaining !== null && m.days_remaining <= 3) return 'critical'
    if (m.days_remaining !== null && m.days_remaining <= 7) return 'expiring_soon'
    return 'active'
  }, [activeTab])


  const filteredList = useMemo(() => {
    let list = expiryList || []

    // 1. Filter Kategori
    if (activeTab === 'regular') {
      list = list.filter(m => m.membership_name && m.membership_name !== 'VISITOR')
    } else if (activeTab === 'pt') {
      list = list.filter(m => !!m.pt_subscription_id)
    } else if (activeTab === 'visitor') {
      list = list.filter(m => m.membership_name === 'VISITOR')
    }

    // 2. Filter Status
    if (statusFilter !== 'all') {
      list = list.filter(m => {
        const isPtExpired = m.pt_subscription_id && m.pt_remaining_sessions === 0
        const isGymExpired = m.membership_name && m.days_remaining !== null && m.days_remaining <= 0

        // Jika sedang di tab PT, fokus ke status PT
        if (activeTab === 'pt') {
          if (statusFilter === 'expired') return isPtExpired
          if (statusFilter === 'critical') return (m.pt_remaining_sessions !== null && m.pt_remaining_sessions > 0 && m.pt_remaining_sessions <= 2)
          if (statusFilter === 'active') return (m.pt_remaining_sessions !== null && m.pt_remaining_sessions > 2)
          return true
        }

        if (statusFilter === 'expired') return isGymExpired || isPtExpired
        if (statusFilter === 'critical') return (m.days_remaining !== null && m.days_remaining > 0 && m.days_remaining <= 3)
        if (statusFilter === 'expiring_soon') return (m.days_remaining !== null && m.days_remaining > 3 && m.days_remaining <= 7)
        if (statusFilter === 'active') return (m.days_remaining !== null && m.days_remaining > 7)
        return true
      })
    }

    // 3. Search
    if (search) {
      const s = search.toLowerCase()
      list = list.filter(m =>
        m.full_name.toLowerCase().includes(s) ||
        m.phone.includes(s) ||
        m.member_no?.toLowerCase().includes(s)
      )
    }

    // 4. Sort
    const priorityWeight: Record<string, number> = {
      expired: 0,
      critical: 1,
      expiring_soon: 2,
      active: 3,
    }

    list.sort((a, b) => {
      const pA = getPriorityLabel(a)
      const pB = getPriorityLabel(b)

      if (priorityWeight[pA] !== priorityWeight[pB]) {
        return priorityWeight[pA] - priorityWeight[pB]
      }

      // Jika sama-sama expired, yang paling baru (days_remaining mendekati 0) di atas
      if (pA === 'expired') {
        // Untuk Gym: -1, -2, -3 (Descending)
        // Untuk PT: pt_remaining_sessions (Ascending, though usually all 0 here)
        if (activeTab === 'pt') {
          return (a.pt_remaining_sessions ?? 0) - (b.pt_remaining_sessions ?? 0)
        }
        return (b.days_remaining ?? 0) - (a.days_remaining ?? 0)
      }

      // Jika aktif/kritis/segera, yang paling cepat habis di atas (Ascending)
      if (activeTab === 'pt') {
        return (a.pt_remaining_sessions ?? 0) - (b.pt_remaining_sessions ?? 0)
      }
      return (a.days_remaining ?? 0) - (b.days_remaining ?? 0)
    })

    return list
  }, [expiryList, activeTab, statusFilter, search, getPriorityLabel]) // Tambahkan getPriorityLabel ke deps jika perlu, tapi biasanya stable

  const totalPages = Math.ceil(filteredList.length / PER_PAGE)
  const paginated = filteredList.slice((page - 1) * PER_PAGE, page * PER_PAGE)



  const handleMarkAsContacted = async (memberId: string) => {
    try {
      const now = new Date().toISOString()
      const { error } = await supabase
        .from('members')
        .update({ last_contacted_at: now })
        .eq('id', memberId)

      if (error) throw error
      queryClient.invalidateQueries({ queryKey: ['expiry'] })
    } catch (err) {
      console.error(err)
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
      
      if (isVisitorPkg) {
        updateData.notes = 'visitor'
      } else if (renewMember.notes?.toLowerCase().includes('visitor')) {
        updateData.notes = 'Membership Regular'
      }

      const { error: updErr } = await supabase
        .from('members')
        .update(updateData)
        .eq('id', renewMember.member_id)
      
      if (updErr) throw updErr

      // OTOMATIS ABSEN (Check-In) untuk paket VISITOR
      if (isVisitorPkg || (renewMember.notes?.toLowerCase().includes('visitor') && renewMember.status === 'inactive')) {
        await supabase.from('attendance_logs').insert({
          gym_id: GYM_ID,
          member_id: renewMember.member_id,
          notes: isVisitorPkg ? 'Visitor Check-In (Auto via Expiry Page)' : 'Visitor Extended (Check-In)'
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
      
      toast.success(`Membership ${renewMember.full_name} berhasil diperpanjang!`)

      // Prepare receipt data
      const totalAmount = (pkg?.price || 0) + (ptPkg?.price || 0)
      if (totalAmount > 0) {
        setReceiptData({
          memberName: renewMember.full_name,
          memberPhone: renewMember.phone,
          memberNo: renewMemberNo?.trim() || renewMember.member_no || null,
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
      setRenewMemberNo('')
      setRenewMembershipId('')
      setRenewPtMembershipId('')
    } catch (err: any) {
      console.error(err)
      toast.error('Gagal memperpanjang membership')
    }
  }

  const handleFonnteSimulation = () => {
    if (!expiryList) return
    const targetMembers = expiryList.filter((m) => m.days_remaining !== null && m.days_remaining <= 3)
    if (targetMembers.length === 0) {
      toast.info('Tidak ada member yang perlu di-remind hari ini')
      return
    }
    console.log('=== FONNTE REMINDER SIMULATION ===')
    targetMembers.forEach(m => {
      console.log(`Mengirim WA ke ${m.phone} (${m.full_name})...`)
      console.log(`Pesan: Halo kak ${m.full_name}, paket membership Gym Lineup kakak ${m.days_remaining! <= 0 ? 'telah berakhir' : 'akan segera berakhir dalam ' + m.days_remaining + ' hari'}. Yuk perpanjang untuk lanjut nge-gym!`)
    })
    console.log('====================================')
    toast.success(`Simulasi berhasil! ${targetMembers.length} pesan terkirim secara otomatis via API.`)
  }

  return (
    <div className="space-y-5">
      {/* Header Expiry */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl uppercase text-foreground sm:text-3xl">Membership Expiry</h1>
          <p className="text-sm text-muted-foreground">Monitoring member yang akan habis masa aktifnya</p>
        </div>

        {/* Legend Warna */}
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

      {/* Metric Cards */}
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Expired Hari Ini" value={stats?.todayCount ?? 0} icon={CalendarX} accent="red" />
        <MetricCard label="Kritis ≤ 3 Hari" value={stats?.criticalCount ?? 0} icon={AlertTriangle} accent="orange" />
        <MetricCard label="Segera ≤ 7 Hari" value={stats?.soonCount ?? 0} icon={Clock} accent="yellow" />
      </div>

      {/* Filter Tabs (Category) */}
      <div className="flex flex-col gap-3">
        <div className="flex w-full items-center gap-1 overflow-x-auto pb-1 scrollbar-hide">
          {[
            { value: 'regular', label: 'Member Reguler' },
            { value: 'pt', label: 'Member PT' },
            { value: 'visitor', label: 'Pengunjung Harian' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setActiveTab(opt.value as any)}
              className={`whitespace-nowrap rounded-lg px-4 py-2 text-xs font-bold transition-colors border ${activeTab === opt.value
                  ? 'bg-primary text-black border-primary'
                  : 'bg-card text-muted-foreground border-border/50 hover:text-foreground'
                }`}
            >
              {opt.label.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Status Filter pill */}
        <div className="flex w-full items-center gap-1 overflow-x-auto pb-1 scrollbar-hide">
          {[
            { value: 'all', label: 'Semua' },
            { value: 'active', label: 'Aktif' },
            { value: 'expiring_soon', label: 'Segera' },
            { value: 'critical', label: 'Kritis' },
            { value: 'expired', label: 'Expired' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setStatusFilter(opt.value as any); setPage(1); }}
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

        {/* Search Bar */}
        <div className="relative">
          <Input
            placeholder="Cari member di sini..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-border bg-card text-foreground placeholder:text-muted-foreground/50 h-10 pl-4"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <AlertDialog>
          <AlertDialogTrigger render={<Button size="sm" variant="outline" className="border-border text-xs text-[#128C7E] hover:bg-[#128C7E]/10 hover:text-[#128C7E]" />}>
            <Send className="mr-1 h-3.5 w-3.5" /> Automated WhatsApp Reminder (Simulasi)
          </AlertDialogTrigger>
          <AlertDialogContent className="border-border bg-card text-foreground">
            <AlertDialogHeader>
              <AlertDialogTitle>Kirim Pengingat Otomatis?</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                Fitur ini akan mengirimkan pesan WhatsApp secara otomatis ke semua member yang akan expired (tanpa perlu klik satu per satu).
                <br /><br />
                <span className="text-accent font-semibold">Note:</span> Ini adalah simulasi fitur premium (V2). Untuk aktivasi fitur Automated WhatsApp API Gateway ini, silakan hubungi developer:
                <br />
                <span className="text-foreground font-bold text-lg">0821-5360-8914 (Azizi)</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-border text-muted-foreground">Batal</AlertDialogCancel>
              <AlertDialogAction onClick={handleFonnteSimulation} className="bg-[#128C7E] text-foreground hover:bg-[#0d6b5d]">
                Mulai Simulasi
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Expiry cards */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      ) : (!filteredList || filteredList.length === 0) ? (
        <div className="rounded-xl border border-border bg-card py-12 text-center">
          <p className="text-sm text-muted-foreground/60">🎉 Tidak ada data expiry pada tab ini!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {paginated.map((m) => {
            const initials = m.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
            const priority = getPriorityLabel(m)

            // Cek apakah sudah dihubungi dalam 30 hari terakhir
            const lastContacted = m.last_contacted_at ? new Date(m.last_contacted_at) : null
            const isRecentlyContacted = lastContacted && (Date.now() - lastContacted.getTime()) < 30 * 24 * 60 * 60 * 1000

            return (
              <div
                key={m.subscription_id || m.member_id}
                className={`rounded-xl border bg-card p-3 ${priority === 'critical' && !isRecentlyContacted ? 'border-red-500/30' : 'border-border/50'
                  }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-heading text-lg ${priority === 'critical' && !isRecentlyContacted
                    ? 'animate-pulse-critical bg-red-500/10 text-red-400'
                    : priority === 'expired'
                      ? 'bg-red-500/20 text-red-500'
                      : 'bg-[#D4FF00]/10 text-accent'
                    }`}>
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {m.full_name}
                        {isRecentlyContacted && <span className="ml-2 inline-flex items-center rounded bg-green-500/10 px-1 py-0.5 text-[9px] text-green-400 font-bold">SUDAH HUBUNGI WA</span>}
                      </p>
                      <StatusBadge status={priority} />
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                      <span>{m.membership_name || (m.pt_membership_name ? `PT: ${m.pt_membership_name}` : 'No Package')} Â· {formatRupiah(m.price ?? 0)}</span>
                      {m.pt_remaining_sessions !== null && (
                        <span className={m.pt_remaining_sessions === 0 ? 'text-red-400 font-bold' : ''}>Sisa Sesi PT: {m.pt_remaining_sessions}</span>
                      )}
                      <span>Exp: {formatTanggal(m.end_date || m.pt_end_date || '')}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-3">
                      <p className={`text-xs font-bold ${
                        m.days_remaining === null ? 'text-muted-foreground' :
                        m.days_remaining < 0 ? 'text-[#FF2A2A]' :
                        m.days_remaining === 0 ? 'text-[#FF6B35]' :
                        m.days_remaining <= 3 ? 'text-[#FFB800]' :
                        m.days_remaining <= 7 ? 'text-[#D4FF00]' : 'text-[#00FF85]'
                      }`}>
                        {m.days_remaining === null 
                          ? 'BELUM ADA PAKET'
                          : m.days_remaining < 0 
                            ? `LEWAT ${Math.abs(m.days_remaining)} HARI` 
                            : m.days_remaining === 0 
                              ? 'AKTIF (S/D MALAM INI)' 
                              : `Sisa ${m.days_remaining} hari`}
                      </p>

                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-2 flex gap-1.5 border-t border-border/50 pt-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      handleMarkAsContacted(m.member_id)
                      const isPt = activeTab === 'pt'
                      const url = generateWALink(
                        m.phone,
                        m.full_name,
                        isPt ? m.pt_end_date : m.end_date,
                        isPt ? null : m.days_remaining,
                        isPt,
                        m.pt_remaining_sessions,
                        m.member_no
                      )
                      window.open(url, '_blank')
                    }}
                    className={`h-7 flex-1 text-[11px] ${isRecentlyContacted ? 'text-muted-foreground' : 'text-green-400 hover:bg-green-500/10'}`}
                  >
                    <MessageCircle className="mr-1 h-3 w-3" /> WhatsApp
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setRenewMember(m); setRenewOpen(true) }}
                    className="h-7 flex-1 text-[11px] text-primary hover:bg-primary/10"
                  >
                    <RotateCcw className="mr-1 h-3 w-3" /> Perpanjang
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination Controls — Sesuai Gambar Request */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-6">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => { setPage(p => Math.max(1, p - 1)) }}
            className="border-border/50 bg-card px-4 text-xs text-muted-foreground hover:bg-background hover:text-foreground"
          >
            Sebelumnya
          </Button>
          
          <div className="flex items-center gap-2 font-heading text-sm">
            <span className="text-[#D4FF00] font-bold">{page}</span>
            <span className="text-muted-foreground/30">/</span>
            <span className="text-[#D4FF00] opacity-80">{totalPages}</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages}
            onClick={() => { setPage(p => Math.min(totalPages, p + 1)) }}
            className="border-border/50 bg-card px-4 text-xs text-muted-foreground hover:bg-background hover:text-foreground"
          >
            Selanjutnya
          </Button>
        </div>
      )}

      {/* Receipt Dialog */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="border-border bg-card text-foreground sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl text-center">Pembayaran Berhasil!</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 text-green-500">
              <RotateCcw className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Pembayaran dari</p>
              <p className="font-heading text-lg">
                {receiptData?.memberName} {receiptData?.memberNo ? `#${receiptData.memberNo}` : ''}
              </p>
              <p className="text-xl font-bold text-accent">{formatRupiah(receiptData?.totalAmount ?? 0)}</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3 text-left text-xs space-y-1">
              {receiptData?.gymPackageName && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paket Gym:</span>
                  <span>{receiptData.gymPackageName}</span>
                </div>
              )}
              {receiptData?.ptPackageName && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paket PT:</span>
                  <span>{receiptData.ptPackageName}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Metode:</span>
                <span className="uppercase">{receiptData?.paymentMethod}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              className="w-full bg-[#25D366] font-bold text-white hover:bg-[#128C7E]"
              onClick={() => {
                if (receiptData) {
                  const link = generateReceiptWALink(receiptData);
                  window.open(link, '_blank');
                }
              }}
            >
              <MessageCircle className="mr-2 h-4 w-4" /> Kirim Struk (WhatsApp)
            </Button>
            <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setReceiptOpen(false)}>
              Selesai
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Renew Dialog */}
      <Dialog open={renewOpen} onOpenChange={(open) => {
        setRenewOpen(open);
        if (!open) {
          setRenewPtMembershipId('');
          setRenewMembershipId('');
          setRenewMemberNo('');
          setRenewStartDate(new Date().toISOString().split('T')[0]);
        }
      }}>
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
    </div>
  )
}
