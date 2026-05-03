'use client'

import { ChevronRight } from 'lucide-react'
import { formatRupiah } from '@/lib/utils'

interface PackageData {
  id: string
  name: string
  category: string
  duration_days: number
  total_sessions: number | null
  price: number
  description: string | null
}

export default function PtPackages({ packages }: { packages: PackageData[] }) {
  if (packages.length === 0) return null

  return (
    <div>
      <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-[#888]">Paket Personal Trainer</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className="group relative overflow-hidden rounded-2xl border border-blue-500/20 bg-[#1A1A1A] p-6 transition-all hover:border-blue-500/40"
          >
            <div className="absolute right-0 top-0 h-24 w-24 bg-gradient-to-bl from-blue-500/10 to-transparent" />
            <div className="relative">
              <div className="mb-2 inline-block rounded-md bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
                PERSONAL TRAINER
              </div>
              <h4 className="font-heading text-2xl text-white">{pkg.name}</h4>
              <p className="mt-1 text-xs text-[#888]">
                {pkg.total_sessions} sesi · {pkg.duration_days} hari
              </p>
              {pkg.description && <p className="mt-1 text-xs text-[#555]">{pkg.description}</p>}
              <p className="mt-4 font-heading text-3xl text-blue-400">{formatRupiah(pkg.price)}</p>
              <a
                href={`https://wa.me/6285647618646?text=Halo,%20saya%20tertarik%20paket%20PT%20${encodeURIComponent(pkg.name)}%20(${formatRupiah(pkg.price)})`}
                target="_blank"
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500/10 py-2.5 text-sm font-semibold text-blue-400 transition-colors hover:bg-blue-500 hover:text-white"
              >
                Tanya PT <ChevronRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}