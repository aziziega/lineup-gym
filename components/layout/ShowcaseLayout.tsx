'use client'

import { Lock, Crown, CheckCircle2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface FeatureCardProps {
  title: string
  description: string
  icon: any
}

function FeatureCard({ title, description, icon: Icon }: FeatureCardProps) {
  return (
    <div className="group relative flex gap-4 rounded-xl border border-border/50 bg-white/5 p-5 transition-all hover:bg-white/[0.08]">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-500 transition-transform group-hover:scale-110">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex flex-col gap-1 text-left">
        <h4 className="text-sm font-bold text-foreground leading-tight">{title}</h4>
        <p className="text-[11px] leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

interface ShowcaseLayoutProps {
  title: string
  subtitle: string
  description: string
  features: FeatureCardProps[]
  onUpgrade: () => void
}

export function ShowcaseLayout({ title, subtitle, description, features, onUpgrade }: ShowcaseLayoutProps) {
  return (
    <div className="relative min-h-[calc(100vh-120px)] w-full overflow-hidden rounded-2xl bg-[#0a0a0a] p-8">
      {/* Background Decor */}
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-red-500/10 blur-[100px]" />
      <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-red-500/5 blur-[100px]" />

      {/* Header Info */}
      <div className="mb-12 flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 border border-border/50">
           <Lock className="h-6 w-6 text-muted-foreground/50" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      {/* Main Showcase Overlay */}
      <div className="relative mx-auto mt-12 flex max-w-2xl flex-col items-center text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 border border-border/50 shadow-2xl">
          <Lock className="h-8 w-8 text-muted-foreground/30" />
        </div>
        
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-1 text-[10px] font-bold tracking-wider text-red-500">
          <Crown className="h-3 w-3" /> FITUR V2 EKSKLUSIF
        </div>

        <h2 className="mb-3 text-3xl font-extrabold tracking-tight text-foreground">
          {description}
        </h2>
        
        <p className="mb-12 max-w-lg text-sm text-muted-foreground">
          Dapatkan kontrol penuh dan wawasan mendalam untuk setiap aspek bisnis Anda — 
          mulai dari pendaftaran mandiri hingga analisis pendapatan otomatis.
        </p>

        {/* Feature Grid */}
        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
          {features.map((f, i) => (
            <FeatureCard key={i} {...f} />
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-16 flex flex-col items-center gap-4">
          <Button 
            size="lg"
            onClick={onUpgrade}
            className="group h-12 gap-2 bg-red-600 px-8 font-bold text-white hover:bg-red-700 shadow-[0_0_20px_rgba(220,38,38,0.3)] transition-all hover:scale-105"
          >
            Upgrade ke Web-V2 Sekarang
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
          
          <div className="text-center">
             <p className="text-[13px] font-medium text-foreground">Dapatkan Penawaran Spesial & Konsultasi Gratis</p>
             <p className="text-[11px] text-muted-foreground">Hubungi Developer untuk informasi lebih lanjut</p>
          </div>
        </div>
      </div>
    </div>
  )
}
