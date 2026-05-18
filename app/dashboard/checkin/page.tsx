'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatTanggal } from '@/lib/utils'
import { GYM_ID } from '@/lib/constants'
import { UserCheck, Users, Clock, Trash2, AlertTriangle, ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
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
} from "@/components/ui/alert-dialog"

export default function CheckInDashboard() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('sv-SE'))
  const [isToday, setIsToday] = useState(true)
  const supabase = createClient()

  // Date Navigation Handlers
  const handlePrevDay = () => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() - 1)
    const newDateStr = d.toLocaleDateString('sv-SE')
    setSelectedDate(newDateStr)
    setIsToday(newDateStr === new Date().toLocaleDateString('sv-SE'))
  }

  const handleNextDay = () => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + 1)
    const newDateStr = d.toLocaleDateString('sv-SE')
    setSelectedDate(newDateStr)
    setIsToday(newDateStr === new Date().toLocaleDateString('sv-SE'))
  }

  const handleToday = () => {
    const todayStr = new Date().toLocaleDateString('sv-SE')
    setSelectedDate(todayStr)
    setIsToday(true)
  }

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
              const isVisitor = newPayload.notes?.toLowerCase().includes('visitor')
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

  const handleDeleteLog = async (id: string) => {
    setDeletingId(id)
    try {
      // 1. Dapatkan info member sebelum datanya dihapus untuk audit log
      const logToDelete = logs.find((l) => l.id === id)
      const memberName = logToDelete?.members?.full_name || 'Member'

      // 2. Hapus data absensi
      const { error } = await supabase
        .from('attendance_logs')
        .delete()
        .eq('id', id)

      if (error) throw error

      // 3. Catat ke tabel audit log (activity_logs)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.from('activity_logs').insert({
            gym_id: GYM_ID,
            admin_id: user.id,
            action_type: 'delete_check_in',
            table_name: 'attendance_logs',
            record_id: id,
            details: {
              old_data: {
                id,
                member_name: memberName,
                check_in_at: logToDelete?.check_in_at,
                notes: logToDelete?.notes
              }
            }
          })
        }
      } catch (auditErr) {
        console.error('Failed to write audit log for delete checkin:', auditErr)
      }
      
      toast.success('Check-in berhasil dihapus')
      fetchLogs() // Refresh data
    } catch (err) {
      console.error('Error deleting log:', err)
      toast.error('Gagal menghapus check-in')
    } finally {
      setDeletingId(null)
    }
  }

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
        .limit(100)

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
          <h1 className="font-heading text-2xl uppercase text-foreground sm:text-3xl">Laporan Check-In</h1>
          <p className="text-sm text-muted-foreground">Pantau kehadiran member secara real-time</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="border-border/50 bg-card">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <Users className="mb-2 h-8 w-8 text-primary" />
            <p className="text-sm text-muted-foreground">Total Masuk</p>
            <p className="font-heading text-3xl text-foreground">{logs.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <UserCheck className="mb-2 h-8 w-8 text-green-400" />
            <p className="text-sm text-muted-foreground">Member Gym</p>
            <p className="font-heading text-3xl text-foreground">{members}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <UserCheck className="mb-2 h-8 w-8 text-blue-400" />
            <p className="text-sm text-muted-foreground">Visitor</p>
            <p className="font-heading text-3xl text-foreground">{visitors}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 bg-card overflow-hidden">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/30 px-5 py-4">
          <CardTitle className="text-lg text-foreground font-heading uppercase tracking-wide flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            {isToday ? 'Riwayat Hari Ini' : `Riwayat: ${formatTanggal(selectedDate)}`}
          </CardTitle>
          
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrevDay}
              className="h-8 w-8 border-border/50 hover:bg-primary/10"
            >
              <ChevronLeft className="h-4 w-4 text-foreground" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleToday}
              disabled={selectedDate === new Date().toLocaleDateString('sv-SE')}
              className="h-8 text-xs font-bold border-border/50 hover:bg-[#D4FF00] hover:text-black disabled:opacity-50"
            >
              Hari Ini
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={handleNextDay}
              disabled={selectedDate >= new Date().toLocaleDateString('sv-SE')}
              className="h-8 w-8 border-border/50 hover:bg-primary/10 disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4 text-foreground" />
            </Button>

            {/* Styled Date Picker Input */}
            <div className="relative flex items-center gap-2 rounded-lg border border-border/50 bg-background px-3 py-1.5 text-xs text-foreground font-semibold">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              <input
                type="date"
                value={selectedDate}
                max={new Date().toLocaleDateString('sv-SE')}
                onChange={(e) => {
                  const val = e.target.value
                  setSelectedDate(val)
                  setIsToday(val === new Date().toLocaleDateString('sv-SE'))
                }}
                className="bg-transparent text-foreground outline-none cursor-pointer [color-scheme:dark] font-heading"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-sm text-muted-foreground/60">Memuat data...</p>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground/60">
                {isToday 
                  ? 'Belum ada yang check-in hari ini' 
                  : `Belum ada yang check-in pada tanggal ${formatTanggal(selectedDate)}`
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => {
                const time = new Date(log.check_in_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                const isVisitor = log.notes?.toLowerCase().includes('visitor')

                return (
                  <div key={log.id} className="group flex items-center justify-between rounded-lg border border-border/50 bg-background p-4 transition-colors hover:border-primary/30">
                    <div className="flex items-center gap-4">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${isVisitor ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                        <UserCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">
                          {log.members?.full_name}
                          {log.members?.member_no && <span className="ml-2 text-xs font-normal text-muted-foreground">#{log.members.member_no}</span>}
                        </p>
                        <p className="text-xs text-muted-foreground/60">{isVisitor ? 'Visitor Harian' : 'Member Aktif'}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="mr-1 h-4 w-4" /> {time}
                      </div>
                      
                      <AlertDialog>
                        <AlertDialogTrigger
                          disabled={deletingId === log.id}
                          className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-red-500/10 hover:text-red-500 group-hover:opacity-100 disabled:opacity-50"
                          title="Hapus Check-in"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </AlertDialogTrigger>
                        <AlertDialogContent className="border-border bg-card">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2 text-foreground">
                              <AlertTriangle className="h-5 w-5 text-red-500" />
                              Hapus Riwayat Check-In?
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-muted-foreground">
                              Tindakan ini akan menghapus riwayat kehadiran <strong>{log.members?.full_name}</strong> secara permanen. Statistik kunjungan member akan berkurang.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="border-border bg-background text-foreground hover:bg-muted">Batal</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteLog(log.id)}
                              className="bg-red-600 text-white hover:bg-red-700"
                            >
                              Hapus Sekarang
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
        </CardContent>
      </Card>
    </div>
  )
}
