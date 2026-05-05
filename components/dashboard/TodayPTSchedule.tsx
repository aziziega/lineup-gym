'use client'

import { usePtSessionsByWeek } from '@/hooks/usePtSessions'
import { Skeleton } from '@/components/ui/skeleton'
import { Clock, User } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function TodayPTSchedule() {
  const [today, setToday] = useState(() => new Date().toLocaleDateString('sv-SE'))

  // Auto-refresh date if page left open
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().toLocaleDateString('sv-SE')
      if (now !== today) setToday(now)
    }, 60000)
    return () => clearInterval(timer)
  }, [today])

  const { data, isLoading } = usePtSessionsByWeek(today, today)

  if (isLoading) {
    return (
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
        <Skeleton className="mb-4 h-5 w-40 bg-[#2A2A2A]" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="mb-2 h-14 w-full bg-[#2A2A2A]" />
        ))}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[#2A2A2A]/50 bg-[#1A1A1A] p-4">
      <h3 className="mb-3 text-sm font-semibold text-white">Jadwal PT Hari Ini</h3>

      {!data || data.length === 0 ? (
        <p className="py-6 text-center text-sm text-[#555]">Tidak ada jadwal PT hari ini</p>
      ) : (
        <div className="space-y-2">
          {data.map((session) => (
            <div
              key={session.id}
              className={`flex items-center justify-between rounded-lg border px-3 py-2.5 ${
                session.is_completed
                  ? 'border-[#2A2A2A]/30 bg-[#1A1A1A] opacity-60'
                  : 'border-[#2A2A2A]/50 bg-[#111]'
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className={`truncate text-sm font-medium ${session.is_completed ? 'line-through text-[#888]' : 'text-white'}`}>
                  {session.member_name}
                </p>
                <div className={`mt-0.5 flex items-center gap-3 text-[11px] ${session.is_completed ? 'text-[#555]' : 'text-[#888]'}`}>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {session.session_time.slice(0, 5)} WIB
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                {session.is_completed ? (
                  <span className="inline-flex items-center gap-1 rounded bg-[#25D366]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#25D366]">
                    Selesai
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded bg-[#FF2A2A]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#FF2A2A]">
                    <User className="h-3 w-3" /> PT
                  </span>
                )}
                <span className={`text-[10px] ${session.is_completed ? 'text-[#555]' : 'text-[#888]'}`}>
                  Sesi {((session.total_sessions || 0) - (session.remaining_sessions || 0)) + 1}/{session.total_sessions}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
