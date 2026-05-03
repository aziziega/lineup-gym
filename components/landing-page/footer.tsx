'use client'

import Image from 'next/image'
import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-[#1A1A1A] bg-[#0A0A0A] py-10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo.jpg" alt="Logo" width={28} height={28} className="rounded-full" />
            <span className="font-heading text-lg text-[#FF2A2A] italic">LINEUP GYM</span>
          </div>

          <div className="flex items-center gap-6 text-xs text-[#555]">
            <a href="https://www.instagram.com/lineup.gym_/" target="_blank" className="hover:text-white">Instagram</a>
            <a href="https://maps.app.goo.gl/gWF4BnTf6oxZjV366" target="_blank" className="hover:text-white">Google Maps</a>
            <a href="https://wa.me/6285647618646" target="_blank" className="hover:text-white">WhatsApp</a>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center justify-between gap-2 border-t border-[#1A1A1A] pt-6 md:flex-row">
          <p className="text-[11px] text-[#333]">&copy; {new Date().getFullYear()} Line Up Gym Prambanan. All rights reserved.</p>
          {/* Admin access — Opsi A (link kecil di footer) + Opsi B (manual /login di address bar) */}
          <Link href="/login" className="text-[11px] text-[#333] transition-colors hover:text-[#555]">
            Admin
          </Link>
        </div>
      </div>
    </footer>
  )
}