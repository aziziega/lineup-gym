import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format rupiah
export const formatRupiah = (amount: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)

// Format tanggal bahasa Indonesia
export const formatTanggal = (date: string | Date | null | undefined) => {
  if (!date) return '-'
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(date))
}

// Generate WA link
export const generateWALink = (phone: string, name: string, endDate: string | null | undefined, daysLeft: number | null | undefined) => {
  const tgl = endDate ? formatTanggal(endDate) : '-'
  const sisa = daysLeft !== null && daysLeft !== undefined ? daysLeft : '?'
  const pesan = encodeURIComponent(
    `Halo ${name} 💪\n\nMembership Line Up Gym kamu akan berakhir pada ${tgl} (sisa ${sisa} hari).\n\nYuk perpanjang sekarang dan tetap semangat latihan!\nInfo perpanjangan hubungi kami:\n📱 0856-4761-8646\n📍 Banjarsari, Prambanan, Klaten\n\nLine Up Gym ★ 4.9 — Tempat nyaman, alat baru, fasilitas lengkap 🏋️`
  )
  const cleanPhone = phone.replace(/[^0-9]/g, '').replace(/^0/, '62')
  return `https://wa.me/${cleanPhone}?text=${pesan}`
}

// Hitung end_date dari start_date + duration_days
export const hitungEndDate = (startDate: Date | string, durationDays: number): Date => {
  const end = new Date(startDate)
  end.setDate(end.getDate() + durationDays)
  return end
}
