'use client'

import { ChevronRight } from 'lucide-react'

export default function CtaFinal() {
  return (
    <section className="relative overflow-hidden py-20">
      <div className="absolute inset-0 bg-gradient-to-r from-[#FF2A2A]/10 to-[#0A0A0A]" />
      <div className="relative mx-auto max-w-3xl px-4 text-center">
        <h2 className="font-heading text-3xl text-white sm:text-5xl">
          Siap Mulai <span className="text-[#FF2A2A]">Perjalanan Fitness</span> Kamu?
        </h2>
        <p className="mt-4 text-sm text-[#888]">
          Gabung bersama 400+ member yang sudah merasakan manfaat latihan di Line Up Gym Prambanan
        </p>
        <a
          href="https://wa.me/6285647618646?text=Halo,%20saya%20tertarik%20untuk%20mendaftar%20di%20Line%20Up%20Gym!"
          target="_blank"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#FF2A2A] px-10 py-4 text-lg font-bold text-white shadow-lg shadow-[#FF2A2A]/20 transition-all hover:scale-105 hover:bg-[#CC2222]"
        >
          Daftar Sekarang <ChevronRight className="h-5 w-5" />
        </a>
      </div>
    </section>
  )
}