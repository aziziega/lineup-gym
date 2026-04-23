'use client'

import { useState } from 'react'
import { useClasses, useCreateClass, useToggleClass, useBookingsByDate, useCreateBooking, useCancelBooking, dayMap } from '@/hooks/useClasses'
import { useMembers } from '@/hooks/useMembers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Clock, Users, ToggleRight, ToggleLeft, X } from 'lucide-react'
import { toast } from 'sonner'
import type { Class } from '@/lib/types'

const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const

export default function SchedulePage() {
  const { data: classes, isLoading } = useClasses()
  const { data: members } = useMembers()
  const createClass = useCreateClass()
  const toggleClass = useToggleClass()
  const createBooking = useCreateBooking()
  const cancelBooking = useCancelBooking()

  const todayIdx = (new Date().getDay() + 6) % 7 // 0 = monday
  const [selectedDay, setSelectedDay] = useState(daysOfWeek[todayIdx])
  const [addOpen, setAddOpen] = useState(false)
  const [detailClass, setDetailClass] = useState<Class | null>(null)
  const [bookingMemberId, setBookingMemberId] = useState('')

  // Form
  const [fName, setFName] = useState('')
  const [fTrainer, setFTrainer] = useState('')
  const [fStart, setFStart] = useState('')
  const [fEnd, setFEnd] = useState('')
  const [fCap, setFCap] = useState('12')
  const [fDay, setFDay] = useState<string>(daysOfWeek[todayIdx])

  const today = new Date().toISOString().split('T')[0]
  const { data: bookings, refetch: refetchBookings } = useBookingsByDate(detailClass?.id ?? null, today)

  const filteredClasses = (classes || []).filter((c) => c.day_of_week === selectedDay)

  const handleAddClass = async () => {
    if (!fName || !fTrainer || !fStart || !fEnd) {
      toast.error('Semua field wajib diisi')
      return
    }
    try {
      await createClass.mutateAsync({
        gym_id: '',
        name: fName,
        trainer_name: fTrainer,
        start_time: fStart,
        end_time: fEnd,
        capacity: parseInt(fCap),
        day_of_week: fDay as Class['day_of_week'],
      })
      toast.success(`Kelas ${fName} ditambahkan!`)
      setAddOpen(false)
    } catch {
      toast.error('Gagal menambahkan kelas')
    }
  }

  const handleToggle = async (cls: Class) => {
    try {
      await toggleClass.mutateAsync({ id: cls.id, is_active: !cls.is_active })
      toast.success(`Kelas ${cls.name} ${!cls.is_active ? 'diaktifkan' : 'dinonaktifkan'}`)
    } catch {
      toast.error('Gagal mengubah status')
    }
  }

  const handleAddBooking = async () => {
    if (!detailClass || !bookingMemberId) return
    try {
      await createBooking.mutateAsync({
        member_id: bookingMemberId,
        class_id: detailClass.id,
        booked_date: today,
      })
      toast.success('Booking berhasil!')
      setBookingMemberId('')
      refetchBookings()
    } catch {
      toast.error('Gagal booking. Mungkin sudah terdaftar.')
    }
  }

  const handleCancelBooking = async (bookingId: string) => {
    try {
      await cancelBooking.mutateAsync(bookingId)
      toast.success('Booking dibatalkan')
      refetchBookings()
    } catch {
      toast.error('Gagal membatalkan')
    }
  }

  return (
    <div className="space-y-4">
      {/* Day tabs — horizontal scroll mobile */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {daysOfWeek.map((day) => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
              selectedDay === day
                ? 'bg-[#D4FF00] text-black'
                : 'border border-[#2A2A2A] bg-[#1A1A1A] text-[#888] hover:text-white'
            }`}
          >
            {dayMap[day]}
          </button>
        ))}
      </div>

      {/* Add class button */}
      <Button size="sm" onClick={() => setAddOpen(true)} className="bg-[#D4FF00] text-xs font-bold text-black hover:bg-[#c5ef00]">
        <Plus className="mr-1 h-3.5 w-3.5" /> Tambah Kelas
      </Button>

      {/* Class cards */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]" />
          ))}
        </div>
      ) : filteredClasses.length === 0 ? (
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] py-12 text-center">
          <p className="text-sm text-[#555]">Tidak ada kelas di hari {dayMap[selectedDay]}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredClasses.map((cls) => (
            <div
              key={cls.id}
              className={`rounded-xl border bg-[#1A1A1A] p-3 ${cls.is_active ? 'border-[#2A2A2A]/50' : 'border-[#2A2A2A]/30 opacity-50'}`}
            >
              <div className="flex items-start justify-between">
                <button onClick={() => setDetailClass(cls)} className="min-w-0 text-left">
                  <p className="text-sm font-semibold text-white">{cls.name}</p>
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-[#888]">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {cls.start_time.slice(0, 5)} - {cls.end_time.slice(0, 5)}
                    </span>
                    <span>{cls.trainer_name}</span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {cls.capacity}
                    </span>
                  </div>
                </button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleToggle(cls)}
                  className={`h-8 w-8 p-0 ${cls.is_active ? 'text-[#D4FF00]' : 'text-[#555]'}`}
                >
                  {cls.is_active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add class dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="border-[#2A2A2A] bg-[#1A1A1A] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Tambah Kelas Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-[#888]">Nama Kelas *</Label>
              <Input value={fName} onChange={(e) => setFName(e.target.value)} className="border-[#2A2A2A] bg-[#111] text-white" />
            </div>
            <div>
              <Label className="text-xs text-[#888]">Trainer *</Label>
              <Input value={fTrainer} onChange={(e) => setFTrainer(e.target.value)} className="border-[#2A2A2A] bg-[#111] text-white" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-[#888]">Jam Mulai *</Label>
                <Input type="time" value={fStart} onChange={(e) => setFStart(e.target.value)} className="border-[#2A2A2A] bg-[#111] text-white" />
              </div>
              <div>
                <Label className="text-xs text-[#888]">Jam Selesai *</Label>
                <Input type="time" value={fEnd} onChange={(e) => setFEnd(e.target.value)} className="border-[#2A2A2A] bg-[#111] text-white" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-[#888]">Kapasitas</Label>
                <Input type="number" value={fCap} onChange={(e) => setFCap(e.target.value)} className="border-[#2A2A2A] bg-[#111] text-white" />
              </div>
              <div>
                <Label className="text-xs text-[#888]">Hari</Label>
                <Select value={fDay} onValueChange={(v) => v && setFDay(v)}>
                  <SelectTrigger className="border-[#2A2A2A] bg-[#111] text-white">
                    <SelectValue>
                      {(val: any) => val ? val.charAt(0).toUpperCase() + val.slice(1) : "Pilih hari"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="border-[#2A2A2A] bg-[#111]">
                    {daysOfWeek.map((d) => (
                      <SelectItem key={d} value={d}>{dayMap[d]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleAddClass} disabled={createClass.isPending} className="w-full bg-[#D4FF00] font-bold text-black hover:bg-[#c5ef00]">
              {createClass.isPending ? 'Menyimpan...' : 'Simpan Kelas'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Class detail sheet */}
      <Sheet open={!!detailClass} onOpenChange={(open) => !open && setDetailClass(null)}>
        <SheetContent className="border-[#2A2A2A] bg-[#111] text-white">
          <SheetHeader>
            <SheetTitle className="font-heading text-xl text-white">{detailClass?.name}</SheetTitle>
          </SheetHeader>
          {detailClass && (
            <div className="mt-4 space-y-4">
              <div className="space-y-1 text-sm text-[#888]">
                <p>Trainer: <span className="text-white">{detailClass.trainer_name}</span></p>
                <p>Waktu: <span className="text-white">{detailClass.start_time.slice(0, 5)} - {detailClass.end_time.slice(0, 5)}</span></p>
                <p>Kapasitas: <span className="text-white">{detailClass.capacity}</span></p>
              </div>

              <div>
                <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-[#888]">Booking Hari Ini</h4>
                {(!bookings || bookings.length === 0) ? (
                  <p className="text-sm text-[#555]">Belum ada booking</p>
                ) : (
                  <div className="space-y-1.5">
                    {bookings.map((b: any) => (
                      <div key={b.id} className="flex items-center justify-between rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-2">
                        <span className="text-sm text-white">{b.members?.full_name}</span>
                        <Button size="sm" variant="ghost" onClick={() => handleCancelBooking(b.id)} className="h-7 text-[11px] text-red-400">
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add booking */}
              <div>
                <Label className="text-xs text-[#888]">Tambah Booking</Label>
                <div className="flex gap-2">
                  <Select value={bookingMemberId} onValueChange={(v) => v && setBookingMemberId(v)}>
                    <SelectTrigger className="flex-1 border-[#2A2A2A] bg-[#1A1A1A] text-sm text-white">
                      <SelectValue placeholder="Pilih member">
                        {(val: any) => val && members ? members.find((m) => m.id === val)?.full_name : "Pilih member"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="border-[#2A2A2A] bg-[#111]">
                      {members?.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAddBooking} disabled={!bookingMemberId} className="bg-[#D4FF00] text-sm font-bold text-black">
                    Booking
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
