'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Menu, X } from 'lucide-react'

export default function Navbar() {
    const [mobileMenu, setMobileMenu] = useState(false)

    const scrollTo = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
        setMobileMenu(false)
    }

    return (
        <nav className="fixed top-0 z-50 w-full border-b border-[#1A1A1A] bg-[#0A0A0A]/90 backdrop-blur-lg">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
                <button onClick={() => scrollTo('hero')} className="flex items-center gap-2">
                    <Image src="/logo.jpg" alt="Logo" width={36} height={36} className="rounded-full border border-[#FF2A2A]/50" />
                    <span className="font-heading text-xl">
                        <span className="text-[#FF2A2A] italic">LINEUP</span> GYM
                    </span>
                </button>

                {/* Desktop nav */}
                <div className="hidden items-center gap-6 md:flex">
                    {['fasilitas', 'harga', 'galeri', 'lokasi'].map(s => (
                        <button key={s} onClick={() => scrollTo(s)} className="text-sm capitalize text-[#888] transition-colors hover:text-white">
                            {s}
                        </button>
                    ))}
                    <a
                        href="https://wa.me/6285647618646?text=Halo,%20saya%20tertarik%20untuk%20mendaftar%20di%20Line%20Up%20Gym!"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-[#FF2A2A] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#CC2222]"
                    >
                        Daftar Sekarang
                    </a>
                </div>

                {/* Mobile hamburger */}
                <button onClick={() => setMobileMenu(!mobileMenu)} className="md:hidden text-white">
                    {mobileMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
            </div>

            {/* Mobile menu dropdown */}
            {mobileMenu && (
                <div className="border-t border-[#1A1A1A] bg-[#0A0A0A] px-4 pb-4 pt-2 md:hidden">
                    {['fasilitas', 'harga', 'galeri', 'lokasi'].map(s => (
                        <button key={s} onClick={() => scrollTo(s)} className="block w-full py-2.5 text-left text-sm capitalize text-[#888] hover:text-white">
                            {s}
                        </button>
                    ))}
                    <a
                        href="https://wa.me/6285647618646?text=Halo,%20saya%20tertarik%20untuk%20mendaftar%20di%20Line%20Up%20Gym!"
                        target="_blank"
                        className="mt-2 block w-full rounded-lg bg-[#FF2A2A] py-2.5 text-center text-sm font-bold text-white"
                    >
                        Daftar Sekarang
                    </a>
                </div>
            )}
        </nav>
    )
}