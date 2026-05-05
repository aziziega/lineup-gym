'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatTanggal } from '@/lib/utils'
import { UserCheck, Users, Clock } from 'lucide-react'
import { toast } from 'sonner'

export default function CheckInDashboard() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('sv-SE'))
  const [isToday, setIsToday] = useState(true)
  const supabase = createClient()

  // Auto-switch date if it changes overnight
  useEffect(() => {
    const timer = setInterval(() => {
      const nowStr = new Date().toLocaleDateString('sv-SE')
      if (isToday && selectedDate !== nowStr) {
        setSelectedDate(nowStr)
      }
    }, 60000)
    return () => clearInterval(timer)
  }, [isToday, selectedDate])

  useEffect(() => {
    fetchLogs()

    // Realtime subscription dengan nama channel unik
    const channelName = `attendance_logs_${Date.now()}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendance_logs' },
        async (payload) => {
          console.log('Realtime Payload Received:', payload)
          
          // Hanya re-fetch jika payload baru masuk di tanggal yang sedang dipilih
          const newPayload = payload.new as any
          if (newPayload && newPayload.check_in_at) {
            const payloadDate = new Date(newPayload.check_in_at).toLocaleDateString('sv-SE')
            if (payloadDate === selectedDate) {
              fetchLogs()
            }
          }

          // Tampilkan Pop-up untuk semua check-in baru (biar admin tahu ada yang datang)
          if (payload.eventType === 'INSERT' && newPayload.member_id) {
            const { data: m } = await supabase
              .from('members')
              .select('full_name')
              .eq('id', newPayload.member_id)
              .single()

            if (m) {
              const isVisitor = newPayload.notes?.includes('Visitor')
              toast.success(`${m.full_name} baru saja Check-In!`, {
                description: isVisitor ? 'Visitor Harian' : 'Member Gym',
                icon: '👋',
                duration: 5000,
              })
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedDate])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      // Hitung rentang waktu lokal ke UTC untuk query database
      const start = new Date(selectedDate)
      start.setHours(0, 0, 0, 0)
      const end = new Date(selectedDate)
      end.setHours(23, 59, 59, 999)

      const { data, error } = await supabase
        .from('attendance_logs')
        .select(`
          id,
          check_in_at,
          notes,
          members (
            id,
            full_name,
            member_no,
            phone
          )
        `)
        .gte('check_in_at', start.toISOString())
        .lte('check_in_at', end.toISOString())
        .order('check_in_at', { ascending: false })

      if (error) throw error
      setLogs(data || [])
    } catch (err) {
      console.error('Error fetching logs:', err)
    } finally {
      setLoading(false)
    }
  }

  const visitors = logs.filter(l => l.notes?.toLowerCase().includes('visitor')).length
  const members = logs.length - visitors

  return (
    <div className="space-y-6 p-2 sm:p-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl uppercase text-white sm:text-3xl">Laporan Check-In</h1>
          <p className="text-sm text-[#888]">Pantau kehadiran member secara real-time</p>
        </div>
        <div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              const val = e.target.value
              setSelectedDate(val)
              setIsToday(val === new Date().toLocaleDateString('sv-SE'))
            }}
            className="rounded-lg border border-[#2A2A2A] bg-[#111] px-3 py-1.5 text-sm text-white [color-scheme:dark]"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="border-[#2A2A2A]/50 bg-[#1A1A1A]">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <Users className="mb-2 h-8 w-8 text-[#FF2A2A]" />
            <p className="text-sm text-[#888]">Total Masuk</p>
            <p className="font-heading text-3xl text-white">{logs.length}</p>
          </CardContent>
        </Card>
        <Card className="border-[#2A2A2A]/50 bg-[#1A1A1A]">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <UserCheck className="mb-2 h-8 w-8 text-green-400" />
            <p className="text-sm text-[#888]">Member Gym</p>
            <p className="font-heading text-3xl text-white">{members}</p>
          </CardContent>
        </Card>
        <Card className="border-[#2A2A2A]/50 bg-[#1A1A1A]">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <UserCheck className="mb-2 h-8 w-8 text-blue-400" />
            <p className="text-sm text-[#888]">Visitor</p>
            <p className="font-heading text-3xl text-white">{visitors}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-[#2A2A2A]/50 bg-[#1A1A1A]">
        <CardHeader>
          <CardTitle className="text-lg text-white">Riwayat Hari Ini</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-sm text-[#555]">Memuat data...</p>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-[#555]">Belum ada yang check-in hari ini</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => {
                const time = new Date(log.check_in_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                const isVisitor = log.notes?.includes('Visitor')

                return (
                  <div key={log.id} className="flex items-center justify-between rounded-lg border border-[#2A2A2A]/50 bg-[#111] p-4">
                    <div className="flex items-center gap-4">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${isVisitor ? 'bg-blue-500/10 text-blue-400' : 'bg-[#FF2A2A]/10 text-[#FF2A2A]'}`}>
                        <UserCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">
                          {log.members?.full_name}
                          {log.members?.member_no && <span className="ml-2 text-xs font-normal text-[#888]">#{log.members.member_no}</span>}
                        </p>
                        <p className="text-xs text-[#555]">{isVisitor ? 'Visitor Harian' : 'Member Aktif'}</p>
                      </div>
                    </div>
                    <div className="flex items-center text-sm text-[#888]">
                      <Clock className="mr-1 h-4 w-4" /> {time}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
