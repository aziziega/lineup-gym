'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Menu, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useQuery } from '@tanstack/react-query'
import { GYM_ID } from '@/lib/constants'

export default function Navbar() {
    const [mobileMenu, setMobileMenu] = useState(false)
    const supabase = createClient()

    const { data: logoUrl } = useQuery({
        queryKey: ['gym-logo'],
        queryFn: async () => {
            const { data } = await supabase
                .from('settings')
                .select('logo_url')
                .eq('id', GYM_ID)
                .single()
            return data?.logo_url || '/logo.jpg'
        },
        staleTime: 1000 * 60 * 5,
    })

    const scrollTo = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
        setMobileMenu(false)
    }

    return (
        <nav className="fixed top-0 z-50 w-full border-b border-[#1A1A1A] bg-[#0A0A0A]/90 backdrop-blur-lg">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
                <button onClick={() => scrollTo('hero')} className="flex items-center gap-2">
                    <img src={logoUrl || '/logo.jpg'} alt="Logo" className="h-9 w-9 rounded-full border border-[#FF2A2A]/50 object-cover" />
                    <span className="font-heading text-xl">
                        <span className="text-primary italic">LINEUP</span> GYM
                    </span>
                </button>

                {/* Desktop nav */}
                <div className="hidden items-center gap-6 md:flex">
                    {['fasilitas', 'harga', 'galeri', 'lokasi'].map(s => (
                        <button key={s} onClick={() => scrollTo(s)} className="text-sm capitalize text-muted-foreground transition-colors hover:text-foreground">
                            {s}
                        </button>
                    ))}
                    <a
                        href="https://wa.me/6285647618646?text=Halo,%20saya%20tertarik%20untuk%20mendaftar%20di%20Line%20Up%20Gym!"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-foreground transition-colors hover:bg-[#CC2222]"
                    >
                        Daftar Sekarang
                    </a>
                </div>

                {/* Mobile hamburger */}
                <button onClick={() => setMobileMenu(!mobileMenu)} className="md:hidden text-foreground">
                    {mobileMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
            </div>

            {/* Mobile menu dropdown */}
            {mobileMenu && (
                <div className="border-t border-[#1A1A1A] bg-[#0A0A0A] px-4 pb-4 pt-2 md:hidden">
                    {['fasilitas', 'harga', 'galeri', 'lokasi'].map(s => (
                        <button key={s} onClick={() => scrollTo(s)} className="block w-full py-2.5 text-left text-sm capitalize text-muted-foreground hover:text-foreground">
                            {s}
                        </button>
                    ))}
                    <a
                        href="https://wa.me/6285647618646?text=Halo,%20saya%20tertarik%20untuk%20mendaftar%20di%20Line%20Up%20Gym!"
                        target="_blank"
                        className="mt-2 block w-full rounded-lg bg-primary py-2.5 text-center text-sm font-bold text-foreground"
                    >
                        Daftar Sekarang
                    </a>
                </div>
            )}
        </nav>
    )
}