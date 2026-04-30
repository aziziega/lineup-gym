'use client'

import { useExpiry, useExpiryStats } from '@/hooks/useExpiry'
import { useActiveMemberships } from '@/hooks/useMemberships'
import { useRenewSubscription } from '@/hooks/useSubscriptions'
import { formatRupiah, formatTanggal, generateWALink, hitungEndDate } from '@/lib/utils'
import MetricCard from '@/components/dashboard/MetricCard'
import StatusBadge from '@/components/members/StatusBadge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
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
import type { ActiveSubscriptionView } from '@/lib/types'

export default function ExpiryPage() {
  const { data: expiryList, isLoading } = useExpiry()
  const { data: stats } = useExpiryStats()
  const { data: memberships } = useActiveMemberships()
  const renewSub = useRenewSubscription()

  const [activeTab, setActiveTab] = useState<'membership' | 'visitor'>('membership')
  const [renewOpen, setRenewOpen] = useState(false)
  const [renewMember, setRenewMember] = useState<ActiveSubscriptionView | null>(null)
  const [renewMembershipId, setRenewMembershipId] = useState('')
  const [renewPayMethod, setRenewPayMethod] = useState<'cash' | 'transfer' | 'qris'>('cash')

  const filteredList = useMemo(() => {
    let list = expiryList || []
    if (activeTab === 'visitor') {
      return list.filter((m) => m.membership_name === 'DAY' || m.notes?.includes('Visitor'))
    }
    return list.filter((m) => m.membership_name !== 'DAY' && !m.notes?.includes('Visitor'))
  }, [expiryList, activeTab])


  const getPriorityLabel = (daysRemaining: number) => {
    if (daysRemaining <= 3) return 'critical'
    if (daysRemaining <= 7) return 'expiring_soon'
    return 'active'
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

  const handleSendAllReminders = () => {
    if (!expiryList) return
    const critical = expiryList.filter((m) => m.days_remaining !== null && m.days_remaining <= 7 && m.days_remaining >= 0)
    critical.forEach((m, i) => {
      setTimeout(() => {
        window.open(generateWALink(m.phone, m.full_name, m.end_date!, m.days_remaining!), '_blank')
      }, i * 500)
    })
    toast.success(`Membuka ${critical.length} link WhatsApp`)
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
    toast.success(`Berhasil mengirim reminder ke ${targetMembers.length} member (Simulasi Fonnte)`)
  }

  return (
    <div className="space-y-5">
      {/* Metric Cards */}
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Expired Hari Ini" value={stats?.todayCount ?? 0} icon={CalendarX} accent="red" />
        <MetricCard label="Exp ≤ 7 Hari" value={stats?.weekCount ?? 0} icon={AlertTriangle} accent="orange" />
        <MetricCard label="Exp ≤ 30 Hari" value={stats?.monthCount ?? 0} icon={Clock} accent="muted" />
      </div>

      {/* Tabs Custom */}
      <div className="flex gap-2 rounded-xl bg-[#1A1A1A] p-1 border border-[#2A2A2A]/50 max-w-md">
        <button
          onClick={() => setActiveTab('membership')}
          className={`flex-1 rounded-lg py-2 text-xs font-bold transition-colors ${activeTab === 'membership' ? 'bg-[#FF2A2A] text-black' : 'text-[#888] hover:text-white'
            }`}
        >
          REGULARS MEMBER
        </button>
        <button
          onClick={() => setActiveTab('visitor')}
          className={`flex-1 rounded-lg py-2 text-xs font-bold transition-colors ${activeTab === 'visitor' ? 'bg-[#FF2A2A] text-black' : 'text-[#888] hover:text-white'
            }`}
        >
          VISITOR
        </button>
      </div>

      {/* Kirim semua reminder */}
      <div className="flex gap-2">
        <AlertDialog>
          <AlertDialogTrigger render={<Button size="sm" variant="outline" className="border-[#2A2A2A] text-xs text-[#888]" />}>
            <Send className="mr-1 h-3.5 w-3.5" /> WA Manual (≤ 7 hari)
          </AlertDialogTrigger>
          <AlertDialogContent className="border-[#2A2A2A] bg-[#1A1A1A] text-white">
            <AlertDialogHeader>
              <AlertDialogTitle>Kirim Reminder WhatsApp?</AlertDialogTitle>
              <AlertDialogDescription className="text-[#888]">
                Ini akan membuka link WhatsApp satu per satu untuk semua member yang akan expired dalam 7 hari.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-[#2A2A2A] text-[#888]">Batal</AlertDialogCancel>
              <AlertDialogAction onClick={handleSendAllReminders} className="bg-[#FF2A2A] text-black">
                Kirim Semua
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button size="sm" variant="outline" onClick={handleFonnteSimulation} className="border-[#2A2A2A] text-xs text-[#128C7E] hover:bg-[#128C7E]/10 hover:text-[#128C7E]">
          <Send className="mr-1 h-3.5 w-3.5" /> Fonnte Simulasi (≤ 3 hari)
        </Button>
      </div>

      {/* Expiry cards */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]" />
          ))}
        </div>
      ) : (!filteredList || filteredList.length === 0) ? (
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] py-12 text-center">
          <p className="text-sm text-[#555]">🎉 Tidak ada data expiry pada tab ini!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredList.map((m) => {
            const initials = m.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
            const priority = getPriorityLabel(m.days_remaining ?? 99)

            return (
              <div
                key={m.subscription_id}
                className={`rounded-xl border bg-[#1A1A1A] p-3 ${priority === 'critical' ? 'border-red-500/30' : 'border-[#2A2A2A]/50'
                  }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-heading text-lg ${priority === 'critical'
                    ? 'animate-pulse-critical bg-red-500/10 text-red-400'
                    : 'bg-[#D4FF00]/10 text-[#D4FF00]'
                    }`}>
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-white">{m.full_name}</p>
                      <StatusBadge status={m.status} />
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-[#888]">
                      <span>{m.membership_name} Â· {formatRupiah(m.price ?? 0)}</span>
                      <span>Exp: {formatTanggal(m.end_date)}</span>
                    </div>
                    <p className={`mt-0.5 text-xs font-semibold ${(m.days_remaining ?? 99) <= 3 ? 'text-red-400' : (m.days_remaining ?? 99) <= 7 ? 'text-[#FF6B35]' : 'text-[#888]'
                      }`}>
                      {(m.days_remaining ?? 99) <= 0 ? 'SUDAH EXPIRED' : `Sisa ${m.days_remaining} hari`}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-2 flex gap-1.5 border-t border-[#2A2A2A]/50 pt-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    render={<a href={generateWALink(m.phone, m.full_name, m.end_date, m.days_remaining)} target="_blank" rel="noopener noreferrer" />}
                    className="h-7 flex-1 text-[11px] text-green-400 hover:bg-green-500/10"
                  >
                    <MessageCircle className="mr-1 h-3 w-3" /> WhatsApp
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setRenewMember(m); setRenewOpen(true) }}
                    className="h-7 flex-1 text-[11px] text-[#FF2A2A] hover:bg-[#FF2A2A]/10"
                  >
                    <RotateCcw className="mr-1 h-3 w-3" /> Perpanjang
                  </Button>
                </div>
              </div>
            )
          })}
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
                <PackageCombobox
                  packages={memberships || []}
                  value={renewMembershipId}
                  onValueChange={setRenewMembershipId}
                  placeholder="Cari paket..."
                />
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
              <Button onClick={handleRenew} disabled={renewSub.isPending || !renewMembershipId} className="w-full bg-[#FF2A2A] font-bold text-black hover:bg-[#E60000]">
                {renewSub.isPending ? 'Memproses...' : 'Perpanjang & Bayar'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
