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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
import { useState } from 'react'
import type { ActiveSubscriptionView } from '@/lib/types'

export default function ExpiryPage() {
  const { data: expiryList, isLoading } = useExpiry()
  const { data: stats } = useExpiryStats()
  const { data: memberships } = useActiveMemberships()
  const renewSub = useRenewSubscription()

  const [renewOpen, setRenewOpen] = useState(false)
  const [renewMember, setRenewMember] = useState<ActiveSubscriptionView | null>(null)
  const [renewMembershipId, setRenewMembershipId] = useState('')
  const [renewPayMethod, setRenewPayMethod] = useState<'cash' | 'transfer' | 'qris'>('cash')

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
    const critical = expiryList.filter((m) => m.days_remaining <= 7 && m.days_remaining >= 0)
    critical.forEach((m, i) => {
      setTimeout(() => {
        window.open(generateWALink(m.phone, m.full_name, m.end_date, m.days_remaining), '_blank')
      }, i * 500)
    })
    toast.success(`Membuka ${critical.length} link WhatsApp`)
  }

  return (
    <div className="space-y-5">
      {/* Metric Cards */}
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Expired Hari Ini" value={stats?.todayCount ?? 0} icon={CalendarX} accent="red" />
        <MetricCard label="Exp ≤ 7 Hari" value={stats?.weekCount ?? 0} icon={AlertTriangle} accent="orange" />
        <MetricCard label="Exp ≤ 30 Hari" value={stats?.monthCount ?? 0} icon={Clock} accent="muted" />
      </div>

      {/* Kirim semua reminder */}
      <AlertDialog>
        <AlertDialogTrigger render={<Button size="sm" variant="outline" className="border-[#2A2A2A] text-xs text-[#888]" />}>
          <Send className="mr-1 h-3.5 w-3.5" /> Kirim Reminder Semua (≤ 7 hari)
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
            <AlertDialogAction onClick={handleSendAllReminders} className="bg-[#D4FF00] text-black">
              Kirim Semua
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Expiry cards */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]" />
          ))}
        </div>
      ) : (!expiryList || expiryList.length === 0) ? (
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] py-12 text-center">
          <p className="text-sm text-[#555]">🎉 Tidak ada member yang akan expired dalam 30 hari!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {expiryList.map((m) => {
            const initials = m.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
            const priority = getPriorityLabel(m.days_remaining)

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
                      <span>{m.membership_name} · {formatRupiah(m.price)}</span>
                      <span>Exp: {formatTanggal(m.end_date)}</span>
                    </div>
                    <p className={`mt-0.5 text-xs font-semibold ${m.days_remaining <= 3 ? 'text-red-400' : m.days_remaining <= 7 ? 'text-[#FF6B35]' : 'text-[#888]'
                      }`}>
                      {m.days_remaining <= 0 ? 'SUDAH EXPIRED' : `Sisa ${m.days_remaining} hari`}
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
                    className="h-7 flex-1 text-[11px] text-[#D4FF00] hover:bg-[#D4FF00]/10"
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
                <Select value={renewMembershipId} onValueChange={(v) => v && setRenewMembershipId(v)}>
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
              <Button onClick={handleRenew} disabled={renewSub.isPending || !renewMembershipId} className="w-full bg-[#D4FF00] font-bold text-black hover:bg-[#c5ef00]">
                {renewSub.isPending ? 'Memproses...' : 'Perpanjang & Bayar'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
