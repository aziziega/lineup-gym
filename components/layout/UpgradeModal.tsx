'use client'

import { X, CheckCircle2, Phone } from 'lucide-react'
import { cn } from '@/lib/utils'

export function UpgradeModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-border bg-[#0d0d0d] shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-6 top-6 z-10 rounded-full bg-white/5 p-2 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-8">
          <div className="text-center space-y-3 mb-8">
            <h2 className="text-3xl font-bold text-foreground tracking-tight">Upgrade ke Dashboard V2</h2>
            <p className="text-sm text-muted-foreground px-8">Tingkatkan performa gym Anda dengan fitur eksklusif di versi terbaru.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
            {[
              "WhatsApp Bot Assistant 24 Jam",
              "Perpanjang Membership Otomatis",
              "Pembayaran Mandiri (QRIS/VA)",
              "Registrasi Online",
              "Analisis Laba/Rugi & Proyeksi",
              "Absensi Barcode/QR Modern",
              "Auto Backup Data (Anti-Hilang)",
              "Custom Domain & Branding Gym"
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-red-500 shrink-0" />
                <span className="text-[13px] text-gray-300">{feature}</span>
              </div>
            ))}
          </div>

          <div className="space-y-4 pt-6 border-t border-border/50">
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">Dapatkan Penawaran Spesial & Konsultasi Gratis</p>
              <p className="text-[11px] text-muted-foreground">Hubungi Azizi untuk detail biaya dan fitur eksklusif</p>
            </div>

            <a
              href="https://wa.me/6282153608914"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl shadow-[0_0_20px_rgba(220,38,38,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Phone className="h-5 w-5" />
              Hubungi Azizi (0821-5360-8914)
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
