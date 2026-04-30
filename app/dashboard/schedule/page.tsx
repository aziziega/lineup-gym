'use client'

import { useState, useMemo } from 'react'
import { usePtSessionsByWeek, usePtActiveMembers, useCreatePtSession, useCompletePtSession, useDeletePtSession } from '@/hooks/usePtSessions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import NativeSelect from '@/components/dashboard/NativeSelect'
import { Plus, CheckCircle2, ChevronLeft, ChevronRight, AlertTriangle, Trash2, Dumbbell } from 'lucide-react'
import { toast } from 'sonner'

const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
const dayLabels: Record<string, string> = { monday: 'Senin', tuesday: 'Selasa', wednesday: 'Rabu', thursday: 'Kamis', friday: 'Jumat', saturday: 'Sabtu', sunday: 'Minggu' }

function getWeekDates(offset: number) {
  const now = new Date()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7) + offset * 7)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d.toISOString().split('T')[0]
  })
}

/** Cek apakah 2 waktu bentrok (jarak < 1 jam) */
function isTimeConflict(timeA: string, timeB: string): boolean {
  const [hA, mA] = timeA.split(':').map(Number)
  const [hB, mB] = timeB.split(':').map(Number)
  const minutesA = hA * 60 + mA
  const minutesB = hB * 60 + mB
  return Math.abs(minutesA - minutesB) < 60
}

export default function SchedulePage() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [addOpen, setAddOpen] = useState(false)
  const [addDate, setAddDate] = useState('')
  const [addTime, setAddTime] = useState('07:00')
  const [addMemberId, setAddMemberId] = useState('')

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset])
  const startDate = weekDates[0]
  const endDate = weekDates[6]

  const { data: sessions, isLoading } = usePtSessionsByWeek(startDate, endDate)
  const { data: ptMembers } = usePtActiveMembers()
  const createSession = useCreatePtSession()
  const completeSession = useCompletePtSession()
  const deleteSession = useDeletePtSession()

  const selectedPtMember = ptMembers?.find(m => m.member_id === addMemberId)

  const handleAddSession = async () => {
    if (!addMemberId || !addDate || !addTime) { toast.error('Pilih member, tanggal, dan jam'); return }
    const ptMember = ptMembers?.find(m => m.member_id === addMemberId)
    if (!ptMember?.pt_subscription_id) { toast.error('Member tidak punya PT aktif'); return }

    // Cek bentrok jadwal (1 coach, 1 sesi per jam)
    const sameDaySessions = (sessions || []).filter(s => s.session_date === addDate && !s.is_completed)
    const conflict = sameDaySessions.find(s => isTimeConflict(s.session_time, addTime))
    if (conflict) {
      toast.error(`Jadwal bentrok! Sudah ada sesi ${conflict.member_name} jam ${conflict.session_time?.slice(0, 5)} di hari itu. Coach hanya 1, tidak bisa double booking.`)
      return
    }

    try {
      await createSession.mutateAsync({ memberId: addMemberId, subscriptionId: ptMember.pt_subscription_id, sessionDate: addDate, sessionTime: addTime })
      toast.success('Sesi PT dijadwalkan!')
      setAddOpen(false)
      setAddMemberId('')
    } catch { toast.error('Gagal menjadwalkan sesi') }
  }

  const handleComplete = async (session: any) => {
    try {
      await completeSession.mutateAsync({ sessionId: session.id, subscriptionId: session.subscription_id })
      toast.success(`Sesi ${session.member_name} selesai!`)
    } catch { toast.error('Gagal menandai sesi') }
  }

  const handleDelete = async (sessionId: string) => {
    try { await deleteSession.mutateAsync(sessionId); toast.success('Sesi dihapus') }
    catch { toast.error('Gagal menghapus sesi') }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00')
    return `${d.getDate()}/${d.getMonth() + 1}`
  }

  const weekLabel = (() => {
    const s = new Date(startDate + 'T00:00:00')
    const e = new Date(endDate + 'T00:00:00')
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des']
    return `${s.getDate()} ${months[s.getMonth()]} – ${e.getDate()} ${months[e.getMonth()]} ${e.getFullYear()}`
  })()

  const todayStr = new Date().toISOString().split('T')[0]

  // Hitung total sesi minggu ini
  const weekSessionCount = (sessions || []).length
  const completedCount = (sessions || []).filter(s => s.is_completed).length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Dumbbell className="h-5 w-5 text-[#FF2A2A]" />
        <h2 className="font-heading text-lg text-white">Jadwal Personal Trainer</h2>
      </div>

      {/* Stats bar */}
      <div className="flex gap-2">
        <div className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A]/50 bg-[#1A1A1A] px-3 py-1.5">
          <span className="text-[11px] text-[#888]">Minggu ini:</span>
          <span className="font-heading text-sm text-[#D4FF00]">{weekSessionCount} sesi</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A]/50 bg-[#1A1A1A] px-3 py-1.5">
          <span className="text-[11px] text-[#888]">Selesai:</span>
          <span className="font-heading text-sm text-green-400">{completedCount}/{weekSessionCount}</span>
        </div>
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <Button size="sm" variant="ghost" onClick={() => setWeekOffset(w => w - 1)} className="text-[#888]">
          <ChevronLeft className="h-4 w-4 mr-1" /> Sebelumnya
        </Button>
        <div className="text-center">
          <p className="text-sm font-semibold text-white">{weekLabel}</p>
          {weekOffset !== 0 && (
            <button onClick={() => setWeekOffset(0)} className="text-[10px] text-[#FF2A2A] hover:underline">Minggu Ini</button>
          )}
        </div>
        <Button size="sm" variant="ghost" onClick={() => setWeekOffset(w => w + 1)} className="text-[#888]">
          Selanjutnya <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Add session button */}
      <Button size="sm" onClick={() => { setAddOpen(true); setAddDate(weekDates[0]) }} className="bg-[#D4FF00] text-xs font-bold text-black hover:bg-[#E60000]">
        <Plus className="mr-1 h-3.5 w-3.5" /> Tambah Sesi PT
      </Button>

      {/* 7-day grid */}
      {isLoading ? (
        <div className="grid grid-cols-7 gap-1">{Array.from({ length: 7 }).map((_, i) => <div key={i} className="h-32 animate-pulse rounded-lg bg-[#1A1A1A] border border-[#2A2A2A]" />)}</div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {weekDates.map((date, idx) => {
            const daySessions = (sessions || []).filter(s => s.session_date === date).sort((a, b) => a.session_time.localeCompare(b.session_time))
            const isToday = date === todayStr
            return (
              <div key={date} className={`rounded-xl border p-2 min-h-[140px] ${isToday ? 'border-[#D4FF00]/50 bg-[#1A1A1A]' : 'border-[#2A2A2A]/50 bg-[#111]'}`}>
                {/* Day header */}
                <div className={`mb-2 pb-1.5 border-b ${isToday ? 'border-[#D4FF00]/30' : 'border-[#2A2A2A]/50'}`}>
                  <p className={`text-[10px] font-bold uppercase ${isToday ? 'text-[#D4FF00]' : 'text-[#888]'}`}>{dayLabels[daysOfWeek[idx]]}</p>
                  <p className={`text-xs ${isToday ? 'text-[#D4FF00]' : 'text-[#555]'}`}>{formatDate(date)}</p>
                </div>

                {/* Sessions */}
                <div className="space-y-1.5">
                  {daySessions.map(s => (
                    <div key={s.id} className={`rounded-lg p-1.5 text-[10px] transition-all ${s.is_completed ? 'bg-green-500/10 border border-green-500/20' : 'bg-[#1A1A1A] border border-[#2A2A2A]/30 hover:border-[#FF2A2A]/30'}`}>
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0">
                          <p className={`font-semibold truncate ${s.is_completed ? 'text-green-400' : 'text-white'}`}>{s.member_name}</p>
                          <p className="text-[#888]">{s.session_time?.slice(0, 5)}</p>
                        </div>
                        <div className="flex shrink-0 gap-0.5">
                          {!s.is_completed ? (
                            <>
                              <button onClick={() => handleComplete(s)} className="rounded p-0.5 text-[#D4FF00] hover:bg-[#D4FF00]/10" title="Tandai Selesai">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => handleDelete(s.id)} className="rounded p-0.5 text-red-400 hover:bg-red-500/10" title="Hapus">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </>
                          ) : (
                            <span className="text-[9px] text-green-400">✓</span>
                          )}
                        </div>
                      </div>
                      {/* Warning jika sesi hampir habis */}
                      {!s.is_completed && s.remaining_sessions != null && s.remaining_sessions <= 2 && (
                        <div className="mt-1 flex items-center gap-0.5 text-[9px] text-amber-400">
                          <AlertTriangle className="h-2.5 w-2.5" />
                          Sisa {s.remaining_sessions} sesi
                        </div>
                      )}
                    </div>
                  ))}
                  {daySessions.length === 0 && (
                    <p className="text-[10px] text-[#333] italic">Kosong</p>
                  )}
                </div>

                {/* Quick add for this day */}
                <button onClick={() => { setAddDate(date); setAddOpen(true) }} className="mt-1.5 flex w-full items-center justify-center rounded-md border border-dashed border-[#2A2A2A]/50 py-1 text-[10px] text-[#555] hover:border-[#FF2A2A]/30 hover:text-[#FF2A2A] transition-colors">
                  <Plus className="h-3 w-3 mr-0.5" /> Tambah
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Add PT Session Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="border-[#2A2A2A] bg-[#1A1A1A] text-white sm:max-w-sm">
          <DialogHeader><DialogTitle className="font-heading text-xl">Jadwalkan Sesi PT</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-[#888]">Member (PT Aktif)</Label>
              {ptMembers && ptMembers.length > 0 ? (
                <NativeSelect
                  value={addMemberId}
                  onChange={(e) => setAddMemberId(e.target.value)}
                  options={[
                    { value: '', label: 'Pilih member...' },
                    ...ptMembers.map(m => ({
                      value: m.member_id,
                      label: `${m.full_name} (${m.pt_membership_name} · Sisa ${m.pt_remaining_sessions} sesi)`
                    }))
                  ]}
                />
              ) : (
                <p className="text-xs text-[#555] mt-1">Tidak ada member dengan PT aktif</p>
              )}
              {selectedPtMember && selectedPtMember.pt_remaining_sessions !== null && selectedPtMember.pt_remaining_sessions <= 0 && (
                <p className="mt-1 text-xs text-amber-400 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Sesi PT sudah habis!</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-[#888]">Tanggal</Label>
                <Input type="date" value={addDate} onChange={(e) => setAddDate(e.target.value)} className="border-[#2A2A2A] bg-[#111] text-white" />
              </div>
              <div>
                <Label className="text-xs text-[#888]">Jam</Label>
                <Input type="time" value={addTime} onChange={(e) => setAddTime(e.target.value)} className="border-[#2A2A2A] bg-[#111] text-white" />
              </div>
            </div>

            {/* Preview bentrok */}
            {addDate && addTime && (() => {
              const sameDaySessions = (sessions || []).filter(s => s.session_date === addDate && !s.is_completed)
              const conflict = sameDaySessions.find(s => isTimeConflict(s.session_time, addTime))
              if (conflict) return (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-400 flex items-start gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>Bentrok dengan sesi <strong>{conflict.member_name}</strong> jam {conflict.session_time?.slice(0, 5)}. Coach hanya 1, pilih jam lain.</span>
                </div>
              )
              return null
            })()}

            <Button onClick={handleAddSession} disabled={createSession.isPending || !addMemberId} className="w-full bg-[#FF2A2A] font-bold text-black hover:bg-[#E60000]">
              {createSession.isPending ? 'Menyimpan...' : 'Jadwalkan Sesi'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
