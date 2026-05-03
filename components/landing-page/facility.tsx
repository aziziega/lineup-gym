'use client'

import { Dumbbell, Droplets, Lock, Bath, Wind, Shield, Sparkles, Clock } from 'lucide-react'

const FACILITIES = [
  { icon: Clock, title: 'Buka Setiap Hari', desc: '06:00 - 21:00 WIB' },
  { icon: Dumbbell, title: 'Alat Gym Modern & Impor', desc: 'Lengkap + Free Weight area' },
  { icon: Sparkles, title: 'Bersih & Terawat', desc: 'Kebersihan selalu terjaga' },
  { icon: Shield, title: 'Harga Terjangkau', desc: 'Mulai dari paket harian' },
  { icon: Bath, title: '2 Kamar Mandi', desc: 'Terpisah pria & wanita' },
  { icon: Lock, title: 'Locker Aman', desc: 'Simpan barang dengan tenang' },
  { icon: Droplets, title: 'Refill Minum Gratis', desc: 'Dispenser air tersedia' },
  { icon: Wind, title: 'Mushola', desc: 'Tempat ibadah nyaman' },
]

export default function Facility() {
  return (
    <section id="fasilitas" className="py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-12 text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-[#FF2A2A]">Fasilitas</p>
          <h2 className="mt-2 font-heading text-3xl text-white sm:text-4xl">Kenapa Pilih Lineup Gym?</h2>
          <p className="mt-2 text-sm text-[#888]">Fasilitas lengkap untuk mendukung latihan maksimal kamu</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {FACILITIES.map((f, i) => (
            <div
              key={i}
              className="group rounded-xl border border-[#1A1A1A] bg-[#111] p-5 transition-all hover:border-[#FF2A2A]/30 hover:bg-[#1A1A1A]"
            >
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-[#FF2A2A]/10 text-[#FF2A2A] transition-colors group-hover:bg-[#FF2A2A]/20">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-white">{f.title}</h3>
              <p className="mt-0.5 text-[11px] text-[#888]">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}