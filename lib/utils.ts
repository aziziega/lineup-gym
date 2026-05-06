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
  const sisa = daysLeft ?? 0

  let statusMsg: string
  if (sisa < 0) {
    statusMsg = `Membership Line Up Gym kamu sudah berakhir pada *${tgl}* (${Math.abs(sisa)} hari yang lalu).\n\nSegera perpanjang agar tidak ketinggalan sesi latihan!`
  } else if (sisa === 0) {
    statusMsg = `Membership Line Up Gym kamu berakhir *HARI INI* (${tgl}).\n\nYuk segera perpanjang agar bisa tetap latihan tanpa jeda!`
  } else {
    statusMsg = `Membership Line Up Gym kamu akan berakhir pada *${tgl}* (sisa *${sisa} hari*).\n\nYuk perpanjang sekarang dan tetap semangat latihan!`
  }

  const pesan = encodeURIComponent(
    `Halo Kak ${name},\n\n${statusMsg}\n\nInfo perpanjangan hubungi kami:\nTelp: 0857-0767-8485\nLokasi: *Banjarsari, Kb. Dalem Kidul Kec. Prambanan, Klaten, Jawa Tengah, Indonesia 57454*\n\n*LINEUP GYM PRAMBANAN* - Be Strong Be Healthy!`
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

// Generate kwitansi/struk pembayaran via WA link
export type ReceiptData = {
  memberName: string
  memberPhone: string
  gymPackageName?: string
  gymEndDate?: string
  ptPackageName?: string
  ptSessions?: number
  totalAmount: number
  paymentMethod: string
  transactionType: 'new' | 'renew'
}

export const generateReceiptWALink = (data: ReceiptData) => {
  const now = new Date()
  const tanggalBayar = formatTanggal(now)
  const jam = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  const trxId = `TRX-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`

  const metodeLabel = data.paymentMethod === 'cash' ? 'Cash' : data.paymentMethod === 'transfer' ? 'Transfer' : 'QRIS'
  const tipeLabel = data.transactionType === 'new' ? 'Pendaftaran Baru' : 'Perpanjangan'

  let detailPaket = ''
  if (data.gymPackageName) {
    detailPaket += `- Paket Gym: ${data.gymPackageName}\n`
    if (data.gymEndDate) {
      detailPaket += `- Berlaku s/d: ${formatTanggal(data.gymEndDate)}\n`
    }
  }
  if (data.ptPackageName) {
    detailPaket += `- Paket PT: ${data.ptPackageName}`
    if (data.ptSessions) {
      detailPaket += ` (${data.ptSessions} Sesi)`
    }
    detailPaket += '\n'
  }
  if (!data.gymPackageName && !data.ptPackageName) {
    detailPaket = '- (Tidak ada paket)\n'
  }

  const pesan = encodeURIComponent(
    `*KWITANSI PEMBAYARAN*\n*LINEUP GYM PRAMBANAN*\nNo: ${trxId}\n\nTerima kasih Kak *${data.memberName}*!\nPembayaran ${tipeLabel.toLowerCase()} telah kami terima.\n\n*Detail Paket:*\n${detailPaket}\n*Detail Pembayaran:*\n- Total: ${formatRupiah(data.totalAmount)}\n- Metode: ${metodeLabel}\n- Tanggal: ${tanggalBayar}, ${jam} WIB\n- Jenis: ${tipeLabel}\n\nTetap semangat latihannya!\nJika ada pertanyaan, silakan balas pesan ini.\n\n*LINEUP GYM PRAMBANAN*\nBe Strong Be Healthy!`
  )

  const cleanPhone = data.memberPhone.replace(/[^0-9]/g, '').replace(/^0/, '62')
  return `https://wa.me/${cleanPhone}?text=${pesan}`
}
