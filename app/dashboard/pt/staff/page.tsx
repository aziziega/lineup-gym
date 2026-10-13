'use client'

import { useState } from 'react'
import { ShowcaseLayout } from '@/components/layout/ShowcaseLayout'
import { UpgradeModal } from '@/components/layout/UpgradeModal'
import { UserCheck, DollarSign, Calendar, Award } from 'lucide-react'

export default function StaffShowcase() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const features = [
    {
      title: 'Manajemen Profil & Sertifikasi Trainer',
      description: 'Kelola data identitas pelatih, riwayat spesialisasi (bodybuilding, rehab, fat loss), dan masa aktif sertifikasi kebugaran.',
      icon: UserCheck,
    },
    {
      title: 'Kalkulasi Komisi & Bagi Hasil Otomatis',
      description: 'Perhitungan otomatis fee/komisi pelatih per sesi latihan selesai, transparansi payroll, dan slip rekap komisi bulanan.',
      icon: DollarSign,
    },
    {
      title: 'Jadwal Shift & Kuota Kapasitas Klien',
      description: 'Atur jam kerja, hari libur, serta batasan maksimal jumlah member aktif yang dapat dibimbing oleh masing-masing coach.',
      icon: Calendar,
    },
    {
      title: 'Evaluasi Rating & Performa Pelatih',
      description: 'Pantau kepuasan member, feedback ulasan sesi, tingkat retensi perpanjangan paket PT, dan produktivitas setiap trainer.',
      icon: Award,
    },
  ]

  return (
    <>
      <ShowcaseLayout
        title="Manajemen Staff PT"
        subtitle="Kelola instruktur pelatih, kalkulasi bagi hasil komisi sesi, dan pantau performa trainer"
        description="Buka Fitur Manajemen Staff PT"
        features={features}
        onUpgrade={() => setIsModalOpen(true)}
      />
      <UpgradeModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  )
}
