'use client'

import { useTodayClasses } from '@/hooks/useClasses'
import { Skeleton } from '@/components/ui/skeleton'
import { Clock, Users } from 'lucide-react'

export default function TodaySchedule() {
  const { data, isLoading } = useTodayClasses()

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
      <h3 className="mb-3 text-sm font-semibold text-white">Jadwal Kelas Hari Ini</h3>

      {(!data || data.length === 0) ? (
        <p className="py-6 text-center text-sm text-[#555]">Tidak ada kelas hari ini</p>
      ) : (
        <div className="space-y-2">
          {data.map((cls) => (
            <div
              key={cls.id}
              className="flex items-center justify-between rounded-lg border border-[#2A2A2A]/50 bg-[#111] px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{cls.name}</p>
                <div className="mt-0.5 flex items-center gap-3 text-[11px] text-[#888]">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {cls.start_time.slice(0, 5)} - {cls.end_time.slice(0, 5)}
                  </span>
                  <span>{cls.trainer_name}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-[#888]">
                <Users className="h-3.5 w-3.5" />
                <span>{cls.capacity}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
