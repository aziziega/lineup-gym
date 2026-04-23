'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GYM_ID } from '@/lib/constants'
import { useQuery } from '@tanstack/react-query'
import { useCheckIn, useTodayAttendance, useTodayAttendanceCount } from '@/hooks/useAttendance'
import { formatTanggal } from '@/lib/utils'
import { Search, CheckCircle2, UserCheck, XCircle, Clock } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import StatusBadge from '@/components/members/StatusBadge'
import { toast } from 'sonner'
import type { ActiveSubscriptionView } from '@/lib/types'

export default function CheckInPage() {
  const supabase = createClient()
  const [search, setSearch] = useState('')
  const [checkedInMember, setCheckedInMember] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const checkIn = useCheckIn()
  const { data: todayLogs } = useTodayAttendance()
  const { data: todayCount } = useTodayAttendanceCount()

  // Autofocus search
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Search member
  const { data: searchResults } = useQuery({
    queryKey: ['search-member', search],
    queryFn: async () => {
      if (search.length < 2) return []
      const { data, error } = await supabase
        .from('active_subscriptions_view')
        .select('*')
        .eq('gym_id', GYM_ID)
        .or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`)
        .limit(5)
      if (error) throw error
      return data as ActiveSubscriptionView[]
    },
    enabled: search.length >= 2,
  })

  const handleCheckIn = async (member: ActiveSubscriptionView) => {
    if (member.status === 'expired') {
      toast.error(`${member.full_name} sudah expired! Perpanjang dulu.`)
      return
    }

    try {
      await checkIn.mutateAsync(member.member_id)
      setCheckedInMember(member.full_name)
      setSearch('')
      toast.success(`${member.full_name} berhasil check-in!`)

      // Reset sukses setelah 2 detik
      setTimeout(() => {
        setCheckedInMember(null)
        inputRef.current?.focus()
      }, 2000)
    } catch {
      toast.error('Gagal check-in. Coba lagi.')
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-5">
      {/* Counter check-in */}
      <div className="text-center">
        <p className="text-[11px] font-medium uppercase tracking-wider text-[#888]">Check-In Hari Ini</p>
        <p className="font-heading text-6xl text-[#D4FF00]">{todayCount ?? 0}</p>
      </div>

      {/* Animasi sukses */}
      {checkedInMember && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-[#D4FF00]/30 bg-[#D4FF00]/5 py-6">
          <CheckCircle2 className="h-12 w-12 text-[#D4FF00]" />
          <p className="font-heading text-2xl text-[#D4FF00]">{checkedInMember}</p>
          <p className="text-sm text-[#888]">Berhasil check-in ✓</p>
        </div>
      )}

      {/* Search bar */}
      {!checkedInMember && (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#555]" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Cari nama atau nomor HP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-12 border-[#2A2A2A] bg-[#1A1A1A] pl-10 text-base text-white placeholder:text-[#555] focus:border-[#D4FF00]"
            />
          </div>

          {/* Search results */}
          {searchResults && searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map((member) => {
                const initials = member.full_name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)
                const isExpired = member.status === 'expired'

                return (
                  <div
                    key={member.member_id}
                    className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#D4FF00]/10 font-heading text-xl text-[#D4FF00]">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-semibold text-white">{member.full_name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <StatusBadge status={member.status} />
                          <span className="text-xs text-[#888]">
                            Sisa {member.days_remaining} hari
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-[#555]">{member.membership_name} · {member.phone}</p>
                      </div>
                    </div>

                    {isExpired ? (
                      <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                        <XCircle className="h-4 w-4 shrink-0" />
                        <span>Member sudah expired. Perpanjang dulu!</span>
                      </div>
                    ) : (
                      <Button
                        onClick={() => handleCheckIn(member)}
                        disabled={checkIn.isPending}
                        className="mt-3 h-12 w-full bg-[#D4FF00] text-base font-bold text-black hover:bg-[#c5ef00] active:scale-[0.98]"
                      >
                        <UserCheck className="mr-2 h-5 w-5" />
                        CHECK IN ✓
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {search.length >= 2 && searchResults && searchResults.length === 0 && (
            <p className="text-center text-sm text-[#555]">Tidak ditemukan member dengan nama/HP "{search}"</p>
          )}
        </>
      )}

      {/* Log check-in hari ini */}
      <div>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-[#888]">Riwayat Hari Ini</h3>
        {(!todayLogs || todayLogs.length === 0) ? (
          <p className="text-center text-sm text-[#555]">Belum ada check-in hari ini</p>
        ) : (
          <div className="space-y-1.5">
            {todayLogs.slice(0, 10).map((log: any) => (
              <div
                key={log.id}
                className="flex items-center justify-between rounded-lg border border-[#2A2A2A]/50 bg-[#1A1A1A] px-3 py-2"
              >
                <span className="truncate text-sm text-white">{log.members?.full_name ?? 'Unknown'}</span>
                <span className="flex shrink-0 items-center gap-1 text-xs text-[#888]">
                  <Clock className="h-3 w-3" />
                  {new Date(log.check_in_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
