'use client'

import { useState } from 'react'
import { ShowcaseLayout } from '@/components/layout/ShowcaseLayout'
import { UpgradeModal } from '@/components/layout/UpgradeModal'
import { UserPlus, CreditCard } from 'lucide-react'

export default function FormulirShowcase() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const features = [
    {
      title: "Pendaftaran Mandiri",
      description: "Calon member isi formulir dan pilih paket sendiri kapan saja melalui HP mereka.",
      icon: UserPlus
    },
    {
      title: "Pembayaran Otomatis",
      description: "Dukung payment gateway — member langsung bayar via QRIS/VA tanpa konfirmasi manual.",
      icon: CreditCard
    }
  ]

  return (
    <>
      <ShowcaseLayout
        title="Halaman Publik"
        subtitle="Tampilkan profil bisnis, paket, dan formulir pendaftaran mandiri"
        description="Buka Halaman Pendaftaran Publik"
        features={features}
        onUpgrade={() => setIsModalOpen(true)}
      />
      <UpgradeModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  )
}
