'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GYM_ID } from '@/lib/constants'
import GymPackages from './gym-packages'
import PtPackages from './pt-packages'

interface PackageData {
  id: string
  name: string
  category: string
  duration_days: number
  total_sessions: number | null
  price: number
  description: string | null
}

export default function Price() {
  const [packages, setPackages] = useState<PackageData[]>([])
  const [loadingPkgs, setLoadingPkgs] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchPackages() {
      const { data } = await supabase
        .from('memberships')
        .select('id, name, category, duration_days, total_sessions, price, description')
        .eq('gym_id', GYM_ID)
        .eq('is_active', true)
        .gt('price', 0)
        .order('price', { ascending: true })
      setPackages(data || [])
      setLoadingPkgs(false)
    }
    fetchPackages()
  }, [supabase])

  const gymPackages = packages.filter(p => p.category === 'gym')
  const ptPackages = packages.filter(p => p.category === 'pt')

  return (
    <section id="harga" className="bg-[#111] py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-12 text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-[#FF2A2A]">Harga Paket</p>
          <h2 className="mt-2 font-heading text-3xl text-white sm:text-4xl">Pilih Paket Terbaik</h2>
          <p className="mt-2 text-sm text-[#888]">Harga terjangkau, fasilitas premium</p>
        </div>

        {loadingPkgs ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 animate-pulse rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A]" />
            ))}
          </div>
        ) : (
          <>
            <GymPackages packages={gymPackages} />
            <PtPackages packages={ptPackages} />
          </>
        )}
      </div>
    </section>
  )
}