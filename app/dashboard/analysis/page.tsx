'use client'

import { useState } from 'react'
import { ShowcaseLayout } from '@/components/layout/ShowcaseLayout'
import { UpgradeModal } from '@/components/layout/UpgradeModal'
import { TrendingUp, BarChart, Clock, Heart } from 'lucide-react'

export default function AnalysisShowcase() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const features = [
    {
      title: "Statistik Member",
      description: "Pertumbuhan, retensi, churn, distribusi status, dan sumber registrasi secara real-time.",
      icon: TrendingUp
    },
    {
      title: "Revenue & Proyeksi",
      description: "Revenue bulanan, forecast bulan depan, serta breakdown member visitor vs regular.",
      icon: BarChart
    },
    {
      title: "Kehadiran & Jam Sibuk",
      description: "Total check-in harian, rata-rata kunjungan per member, dan heatmap jam tersibuk.",
      icon: Clock
    },
    {
      title: "Member Paling Loyal",
      description: "Peringkat loyalitas berdasarkan kehadiran, lama bergabung, dan ketepatan bayar.",
      icon: Heart
    }
  ]

  return (
    <>
      <ShowcaseLayout
        title="Analisis Lengkap"
        subtitle="Dashboard komprehensif untuk insights mendalam bisnis Anda"
        description="Unlock Complete Analytics"
        features={features}
        onUpgrade={() => setIsModalOpen(true)}
      />
      <UpgradeModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  )
}
