'use client'

import { ChevronRight } from 'lucide-react'
import { formatRupiah } from '@/lib/utils'
import { StaggerContainer, StaggerItem } from '@/components/ui/fade-in'

interface PackageData {
  id: string
  name: string
  category: string
  duration_days: number
  total_sessions: number | null
  price: number
  description: string | null
}

export default function GymPackages({ packages }: { packages: PackageData[] }) {
  if (packages.length === 0) return null

  return (
    <div className="mb-8">
      <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-[#888]">Paket Gym</h3>
      <StaggerContainer className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {packages.map((pkg) => (
          <StaggerItem key={pkg.id}>
            <div className="group h-full relative overflow-hidden rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-6 transition-all hover:border-[#FF2A2A]/40">
              <div className="absolute right-0 top-0 h-24 w-24 bg-gradient-to-bl from-[#FF2A2A]/10 to-transparent" />
              <div className="relative">
                <h4 className="font-heading text-2xl text-white">{pkg.name}</h4>
                <p className="mt-1 text-xs text-[#888]">{pkg.duration_days} hari akses</p>
                {pkg.description && <p className="mt-1 text-xs text-[#555]">{pkg.description}</p>}
                <p className="mt-4 font-heading text-3xl text-[#FF2A2A]">{formatRupiah(pkg.price)}</p>
                <a
                  href={`https://wa.me/6285647618646?text=Halo,%20saya%20mau%20daftar%20paket%20${encodeURIComponent(pkg.name)}%20(${formatRupiah(pkg.price)})`}
                  target="_blank"
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[#FF2A2A]/10 py-2.5 text-sm font-semibold text-[#FF2A2A] transition-colors hover:bg-[#FF2A2A] hover:text-white"
                >
                  Pilih Paket <ChevronRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>
    </div>
  )
}