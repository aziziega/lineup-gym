'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'react-hot-toast'
import { CheckCircle2, AlertTriangle, ArrowLeft, Clock } from 'lucide-react'
import { GYM_ID } from '@/lib/constants'

type Step = 'search' | 'visitor' | 'success' | 'expired' | 'not_found' | 'visitor_registered' | 'visitor_checked_in'

export default function CheckinKiosk() {
  const [step, setStep] = useState<Step>('search')
  const [searchVal, setSearchVal] = useState('')
  const [loading, setLoading] = useState(false)

  const [currentTime, setCurrentTime] = useState('')
  const [isClosed, setIsClosed] = useState(false)

  // Result state (for success/expired display)
  const [memberInfo, setMemberInfo] = useState<any>(null)

  // Visitor state
  const [visitorName, setVisitorName] = useState('')
  const [visitorPhone, setVisitorPhone] = useState('')

  const supabase = createClient()

  useEffect(() => {
    const updateClock = () => {
      const now = new Date()
      setCurrentTime(
        now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      )
      const hour = now.getHours()
      if (hour < 6 || hour >= 21) {
        setIsClosed(true)
      } else {
        setIsClosed(false)
      }
    }
    updateClock()
    const interval = setInterval(updateClock, 1000)
    return () => clearInterval(interval)
  }, [])

  // Cari member â†’ jika aktif, LANGSUNG check-in (tanpa konfirmasi)
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchVal) return

    setLoading(true)
    try {
      // Cari dari active_subscriptions_view menggunakan No Member ATAU No HP
      const { data, error } = await supabase
        .from('active_subscriptions_view')
        .select('*')
        .eq('gym_id', GYM_ID)
        .or(`member_no.eq.${searchVal},phone.eq.${searchVal}`)
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error("Supabase Error [active_subscriptions_view]:", error)
        throw error
      }

      if (data) {
        setMemberInfo(data)

        if (data.status === 'active' || data.status === 'expiring_soon') {
          // VALIDASI: Cegah Visitor DAY check-in lebih dari 1x dalam sehari
          if (data.membership_name === 'DAY') {
            const today = new Date().toISOString().split('T')[0]
            const { data: checkToday } = await supabase
              .from('attendance_logs')
              .select('id')
              .eq('member_id', data.member_id)
              .gte('check_in_at', `${today}T00:00:00Z`)
              .lte('check_in_at', `${today}T23:59:59Z`)
              .limit(1)

            if (checkToday && checkToday.length > 0) {
              setStep('visitor_checked_in')
              setLoading(false)
              setTimeout(() => resetKiosk(), 8000)
              return
            }
          }

          // LANGSUNG check-in tanpa konfirmasi
          const { error: logError } = await supabase.from('attendance_logs').insert({
            gym_id: GYM_ID,
            member_id: data.member_id,
            notes: 'Kiosk Self Check-In'
          })
          if (logError) throw logError

          setStep('success')
          setTimeout(() => resetKiosk(), 5000)
        } else {
          // Status expired â†’ tampilkan peringatan
          setStep('expired')
        }
      } else {
        // Coba cari di tabel members biasa (mungkin belum punya subscription)
        const { data: memberData } = await supabase
          .from('members')
          .select('*')
          .eq('gym_id', GYM_ID)
          .or(`member_no.eq.${searchVal},phone.eq.${searchVal}`)
          .limit(1)
          .single()

        if (memberData) {
          setMemberInfo({ ...memberData, status: 'expired', membership_name: 'Tidak ada paket aktif' })
          setStep('expired')
        } else {
          setStep('not_found')
        }
      }
    } catch (err: any) {
      console.error("Check-in Error:", err)
      toast.error('Gagal memproses check-in: ' + (err.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const handleRegisterVisitor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!visitorName || !visitorPhone) return
    setLoading(true)

    try {
      // 1. Buat member baru
      const { data: newMember, error: memberErr } = await supabase.from('members').insert({
        gym_id: GYM_ID,
        full_name: visitorName,
        phone: visitorPhone,
        notes: 'Visitor Harian'
      }).select().single()

      if (memberErr) throw memberErr

      setMemberInfo({ full_name: visitorName })
      setStep('visitor_registered')
      setTimeout(() => resetKiosk(), 10000) // Beri waktu lebih lama untuk membaca instruksi
    } catch (err: any) {
      toast.error('Gagal mendaftar visitor')
    } finally {
      setLoading(false)
    }
  }

  const resetKiosk = () => {
    setStep('search')
    setSearchVal('')
    setMemberInfo(null)
    setVisitorName('')
    setVisitorPhone('')
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a] p-4 text-white">
      {/* Live Clock & operational hours - Above the card */}
      <div className="mb-6 flex flex-col items-center gap-1 animate-in fade-in-50 duration-500">
        <div className="flex items-center gap-2 rounded-xl border border-[#2A2A2A] bg-[#111] px-5 py-2.5 shadow-lg shadow-[#D4FF00]/5">
          <Clock className="h-5 w-5 text-[#D4FF00]" />
          <span className="font-heading text-2xl font-bold text-[#D4FF00] tracking-wider">
            {currentTime || '--:--:--'}
          </span>
        </div>
        <p className="text-xs text-[#888]">
          Jam Operasional: <span className="text-white font-medium">06:00 - 21:00</span>
        </p>
      </div>

      <div className="w-full max-w-md rounded-2xl border border-[#2A2A2A] bg-[#111] p-6 shadow-2xl">

        {isClosed ? (
          <div className="space-y-6 py-6 text-center">
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 shadow-lg">
              <AlertTriangle className="mx-auto mb-3 h-12 w-12 text-red-400" />
              <p className="text-xl font-bold text-red-400 tracking-wide">SISTEM TUTUP</p>
              <p className="mt-3 text-sm text-[#ccc]">
                Website tidak menerima akses absen di luar jam operasional.
              </p>
              <p className="mt-1 text-xs text-[#888]">
                Buka Jam 06.00 - Tutup 21.00
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="mb-8 text-center flex flex-col items-center">
              <img src="/logo.jpg" alt="Line Up Gym Logo" className="w-24 h-24 rounded-full object-cover border-2 border-[#FF2A2A] mb-3 shadow-lg shadow-[#FF2A2A]/20 animate-pulse" />
              <h1 className="font-heading text-3xl font-black text-[#FF2A2A] italic">LINE UP GYM</h1>
              <p className="text-sm text-[#888]">Self Check-In</p>
            </div>

            {/* STEP 1: PENCARIAN â€” langsung check-in jika aktif */}
            {step === 'search' && (
              <form onSubmit={handleSearch} className="space-y-4">
                <div>
                  <Label className="text-center block text-sm text-[#ccc]">Masukkan No. Member atau No. HP</Label>
                  <Input
                    autoFocus
                    value={searchVal}
                    onChange={(e) => setSearchVal(e.target.value)}
                    placeholder="Contoh: 001 atau 0812..."
                    className="mt-2 h-14 border-[#333] bg-[#1a1a1a] text-center text-xl font-bold tracking-widest text-white placeholder:text-[#555]"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading || !searchVal}
                  className="h-12 w-full bg-[#D4FF00] text-lg font-bold text-black hover:bg-[#c5ef00]"
                >
                  {loading ? 'Memproses...' : 'Check-In'}
                </Button>

                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-[#333]" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-[#111] px-2 text-[#666]">Atau</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep('visitor')}
                  className="h-12 w-full border-[#333] bg-transparent text-[#FF2A2A] hover:bg-[#1a1a1a]"
                >
                  Saya Pengunjung Baru (Visitor)
                </Button>
              </form>
            )}

            {/* EXPIRED â€” tolak check-in */}
            {step === 'expired' && memberInfo && (
              <div className="space-y-6 text-center">
                <div className="space-y-1">
                  <p className="text-sm text-[#888]">Halo,</p>
                  <h2 className="text-2xl font-bold text-white">{memberInfo.full_name}</h2>
                  {memberInfo.member_no && <p className="text-sm text-[#555]">No: {memberInfo.member_no}</p>}
                </div>

                <div className="rounded-xl border border-red-900/50 bg-red-900/10 p-4">
                  <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-red-400" />
                  <p className="text-lg font-bold text-red-400">PAKET EXPIRED</p>
                  <p className="mt-2 text-sm text-[#ccc]">{memberInfo.membership_name}</p>
                  <p className="mt-1 text-xs text-[#888]">Silakan hubungi Admin untuk perpanjang paket.</p>
                </div>

                <Button
                  onClick={resetKiosk}
                  className="h-12 w-full border-[#333] bg-transparent text-[#888] hover:bg-[#1a1a1a]"
                  variant="outline"
                >
                  Kembali
                </Button>
              </div>
            )}

            {/* VISITOR ALREADY CHECKED IN */}
            {step === 'visitor_checked_in' && (
              <div className="space-y-6 text-center">
                <div className="text-center mb-4">
                  <p className="text-sm text-[#888]">Halo,</p>
                  <h2 className="text-2xl font-bold text-white">{memberInfo.full_name}</h2>
                </div>

                <div className="rounded-xl border border-orange-500/50 bg-orange-500/10 p-6 shadow-lg">
                  <AlertTriangle className="mx-auto mb-3 h-12 w-12 text-orange-400" />
                  <p className="text-xl font-bold text-orange-400 tracking-wide">PEMBERITAHUAN</p>
                  <div className="mt-3 inline-block rounded-full bg-orange-500/20 px-4 py-1 text-xs font-semibold text-orange-400 border border-orange-500/30">
                    Anda Sudah Absen Sebagai Visitor
                  </div>
                  <p className="mt-4 text-sm text-[#ccc]">
                    Paket harian (Daily Pass) hanya berlaku untuk 1x akses masuk.
                  </p>
                </div>

                <Button
                  onClick={resetKiosk}
                  className="h-12 w-full border-[#333] bg-transparent text-[#888] hover:bg-[#1a1a1a]"
                  variant="outline"
                >
                  Kembali
                </Button>
              </div>
            )}
            {step === 'not_found' && (
              <div className="space-y-6 text-center">
                <div className="rounded-xl border border-yellow-900/50 bg-yellow-900/10 p-4">
                  <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-yellow-400" />
                  <p className="text-lg font-bold text-yellow-400">DATA TIDAK VALID</p>
                  <p className="mt-2 text-sm text-[#ccc]">No. Member atau No. HP &quot;{searchVal}&quot; tidak terdaftar.</p>
                  <p className="mt-1 text-xs text-[#888]">Silakan hubungi Admin atau daftar sebagai Visitor.</p>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={resetKiosk}
                    className="h-12 flex-1 border-[#333] bg-transparent text-[#888] hover:bg-[#1a1a1a]"
                    variant="outline"
                  >
                    Coba Lagi
                  </Button>
                  <Button
                    onClick={() => { resetKiosk(); setStep('visitor') }}
                    className="h-12 flex-1 bg-[#D4FF00] font-bold text-black hover:bg-[#c5ef00]"
                  >
                    Daftar Visitor
                  </Button>
                </div>
              </div>
            )}

            {/* VISITOR REGISTRATION */}
            {step === 'visitor' && (
              <form onSubmit={handleRegisterVisitor} className="space-y-4">
                <div className="mb-4 flex items-center">
                  <Button type="button" variant="ghost" size="icon" onClick={resetKiosk} className="h-8 w-8 text-[#888]">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <h2 className="text-lg font-bold text-white">Daftar Visitor</h2>
                </div>
                <div>
                  <Label className="text-sm text-[#ccc]">Nama Lengkap</Label>
                  <Input
                    autoFocus
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                    className="mt-1 border-[#333] bg-[#1a1a1a] text-white"
                  />
                </div>
                <div>
                  <Label className="text-sm text-[#ccc]">No. HP / WhatsApp</Label>
                  <Input
                    value={visitorPhone}
                    onChange={(e) => setVisitorPhone(e.target.value)}
                    className="mt-1 border-[#333] bg-[#1a1a1a] text-white"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading || !visitorName || !visitorPhone}
                  className="mt-4 h-12 w-full bg-[#D4FF00] text-lg font-bold text-black hover:bg-[#c5ef00]"
                >
                  {loading ? 'Memproses...' : 'Lanjut'}
                </Button>
              </form>
            )}


            {/* VISITOR REGISTERED â€” Instruksi ke kasir */}
            {step === 'visitor_registered' && (
              <div className="flex flex-col items-center justify-center py-8 text-center animate-in slide-in-from-bottom-4 duration-300">
                <div className="mb-4 rounded-full bg-yellow-500/20 p-4">
                  <AlertTriangle className="h-16 w-16 text-yellow-500" />
                </div>
                <h2 className="mb-2 text-2xl font-bold text-white">Data Berhasil Disimpan</h2>
                <p className="mb-6 text-lg text-yellow-400">Halo, {memberInfo?.full_name}!</p>
                <div className="rounded-xl border border-[#333] bg-[#1a1a1a] p-4 text-left">
                  <p className="text-sm text-[#ccc] leading-relaxed">
                    1. Silakan menuju **Meja Kasir / Resepsionis**.<br />
                    2. Lakukan pembayaran tiket harian (Daily Pass).<br />
                    3. Admin akan mengaktifkan tiket Anda.<br />
                    4. Anda siap berlatih!
                  </p>
                </div>
                <Button
                  onClick={resetKiosk}
                  className="mt-8 h-12 w-full border-[#333] bg-transparent text-white hover:bg-[#222]"
                  variant="outline"
                >
                  Kembali ke Awal
                </Button>
              </div>
            )}

            {/* SUCCESS â€” langsung tampil setelah submit */}
            {step === 'success' && (
              <div className="flex flex-col items-center justify-center py-8 text-center animate-in zoom-in duration-300">
                <div className="mb-4 rounded-full bg-[#FF2A2A]/20 p-4">
                  <CheckCircle2 className="h-16 w-16 text-[#FF2A2A]" />
                </div>
                <h2 className="mb-1 text-2xl font-bold text-white">Check-In Berhasil!</h2>
                {memberInfo && <p className="text-lg text-[#FF2A2A]">{memberInfo.full_name}</p>}
                <p className="mt-4 text-sm text-[#888]">
                  {visitorName
                    ? 'Silakan tunjukkan layar ini ke Admin dan lakukan pembayaran.'
                    : 'Silakan tunjukkan layar ini ke Admin untuk masuk.'}
                </p>
                <p className="mt-8 text-xs text-[#555]">Layar ini akan menutup otomatis dalam 5 detik...</p>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}
