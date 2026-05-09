'use client'

import { useExpiry, useExpiryStats } from '@/hooks/useExpiry'
import { useActiveMemberships } from '@/hooks/useMemberships'
import { useRenewSubscription } from '@/hooks/useSubscriptions'
import { formatRupiah, formatTanggal, generateWALink, hitungEndDate, toLocalISOString } from '@/lib/utils'
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
import { AlertTriangle, Clock, CalendarX, MessageCircle, RotateCcw, Send } from 'lucide-react'
import { toast } from 'sonner'
import { useState, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { ActiveSubscriptionView } from '@/lib/types'

export default function ExpiryPage() {
  const { data: expiryList, isLoading } = useExpiry()
  const { data: stats } = useExpiryStats()
  const { data: memberships } = useActiveMemberships()
  const renewSub = useRenewSubscription()

  const [activeTab, setActiveTab] = useState<'all' | 'regular' | 'pt' | 'visitor'>('all')
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
  const PER_PAGE = 10

  const queryClient = useQueryClient()
  const supabase = createClient()

  const gymPackages = useMemo(() => memberships?.filter(m => m.category === 'gym') || [], [memberships])
  const ptPackages = useMemo(() => memberships?.filter(m => m.category === 'pt') || [], [memberships])

  const filteredList = useMemo(() => {
    let list = expiryList || []

    // 1. Filter Kategori
    if (activeTab === 'regular') {
      list = list.filter(m => m.membership_name && m.membership_name !== 'DAY')
    } else if (activeTab === 'pt') {
      list = list.filter(m => !!m.pt_subscription_id)
    } else if (activeTab === 'visitor') {
      list = list.filter(m => m.membership_name === 'DAY')
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

    return list
  }, [expiryList, activeTab, statusFilter, search])

  const totalPages = Math.ceil(filteredList.length / PER_PAGE)
  const paginated = filteredList.slice((page - 1) * PER_PAGE, page * PER_PAGE)


  const getPriorityLabel = (m: ActiveSubscriptionView) => {
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
  }

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

    const startDate = renewStartDate
    const endDate = pkg ? toLocalISOString(hitungEndDate(startDate, pkg.duration_days)) : ''

    try {
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
      setRenewOpen(false)
      setRenewMember(null)
      setRenewMemberNo('')
      setRenewMembershipId('')
      setRenewPtMembershipId('')
    } catch {
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
      {/* Metric Cards */}
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Expired Hari Ini" value={stats?.todayCount ?? 0} icon={CalendarX} accent="red" />
        <MetricCard label="Exp ≤ 7 Hari" value={stats?.weekCount ?? 0} icon={AlertTriangle} accent="orange" />
        <MetricCard label="Exp ≤ 30 Hari" value={stats?.monthCount ?? 0} icon={Clock} accent="muted" />
      </div>

      {/* Filter Tabs (Category) */}
      <div className="flex flex-col gap-3">
        <div className="flex w-full items-center gap-1 overflow-x-auto pb-1 scrollbar-hide">
          {[
            { value: 'all', label: 'Semua' },
            { value: 'regular', label: 'Member Reguler' },
            { value: 'pt', label: 'Member PT' },
            { value: 'visitor', label: 'Pengunjung Harian' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setActiveTab(opt.value as any)}
              className={`whitespace-nowrap rounded-lg px-4 py-2 text-xs font-bold transition-colors border ${
                activeTab === opt.value
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
            { value: 'all', label: 'Semua Status' },
            { value: 'active', label: 'Aktif' },
            { value: 'expiring_soon', label: 'Segera' },
            { value: 'critical', label: 'Kritis' },
            { value: 'expired', label: 'Expired' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value as any)}
              className={`whitespace-nowrap rounded-full px-3 py-1 text-[10px] font-semibold transition-colors border ${
                statusFilter === opt.value
                  ? 'bg-[#FF2A2A] text-white border-[#FF2A2A]'
                  : 'bg-transparent text-muted-foreground border-border/50 hover:border-muted-foreground'
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
                    <p className={`mt-0.5 text-xs font-semibold ${priority === 'expired' || priority === 'critical' ? 'text-red-400' : priority === 'expiring_soon' ? 'text-[#FF6B35]' : 'text-muted-foreground'
                      }`}>
                      {priority === 'expired' ? 'SUDAH EXPIRED / SESI HABIS' : `Sisa ${m.days_remaining} hari`}
                    </p>
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
                        m.pt_remaining_sessions
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

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between border-t border-border/50 pt-4">
          <p className="text-xs text-muted-foreground">
            Menampilkan <span className="text-foreground font-medium">{(page - 1) * PER_PAGE + 1}</span> - <span className="text-foreground font-medium">{Math.min(page * PER_PAGE, filteredList.length)}</span> dari <span className="text-foreground font-medium">{filteredList.length}</span> member
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo(0, 0) }}
              className="border-border text-muted-foreground hover:bg-card hover:text-foreground"
            >
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => { setPage(p => Math.min(totalPages, p + 1)); window.scrollTo(0, 0) }}
              className="border-border text-muted-foreground hover:bg-card hover:text-foreground"
            >
              Selanjutnya
            </Button>
          </div>
        </div>
      )}

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
