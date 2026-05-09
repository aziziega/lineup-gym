'use client'

import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useQuery } from '@tanstack/react-query'
import { GYM_ID } from '@/lib/constants'

export default function Footer() {
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

  return (
    <footer className="border-t border-[#1A1A1A] bg-[#0A0A0A] py-10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
          <div className="flex items-center gap-2">
            <img src={logoUrl || '/logo.jpg'} alt="Logo" className="h-7 w-7 rounded-full object-cover" />
            <span className="font-heading text-lg text-primary italic">LINEUP GYM</span>
          </div>

          <div className="flex items-center gap-6 text-xs text-muted-foreground/60">
            <a href="https://www.instagram.com/lineup.gym_/" target="_blank" className="hover:text-foreground">Instagram</a>
            <a href="https://maps.app.goo.gl/gWF4BnTf6oxZjV366" target="_blank" className="hover:text-foreground">Google Maps</a>
            <a href="https://wa.me/6285647618646" target="_blank" className="hover:text-foreground">WhatsApp</a>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center justify-between gap-2 border-t border-[#1A1A1A] pt-6 md:flex-row">
          <p className="text-[11px] text-[#333]">&copy; {new Date().getFullYear()} Line Up Gym Prambanan. All rights reserved.</p>
          {/* Admin access — Opsi A (link kecil di footer) + Opsi B (manual /login di address bar) */}
          <Link href="/login" className="text-[11px] text-[#333] transition-colors hover:text-muted-foreground/60">
            Admin
          </Link>
        </div>
      </div>
    </footer>
  )
}