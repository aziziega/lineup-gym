'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, Star, MapPin, Phone, Eye, EyeOff } from 'lucide-react'
import { GYM_INFO } from '@/lib/constants'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message === 'Invalid login credentials'
        ? 'Email atau password salah. Silakan coba lagi.'
        : error.message
      )
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center px-4 py-8">
      {/* Background pattern */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 40px,
              #FF2A2A 40px,
              #FF2A2A 41px
            )`,
          }}
        />
        {/* Glow accent top */}
        <div className="absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full bg-[#FF2A2A]/10 blur-[100px]" />
      </div>

      {/* Logo & Branding */}
      <div className="relative z-10 mb-6 text-center">
        <h1 className="font-heading text-5xl leading-none tracking-tight sm:text-6xl">
          <span className="text-[#FF2A2A]">LINE UP</span>{' '}
          <span className="text-white">GYM</span>
        </h1>

        {/* Rating */}
        <div className="mt-2 flex items-center justify-center gap-1.5 text-sm text-[#888]">
          <div className="flex">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className="h-3.5 w-3.5 fill-[#D4FF00] text-[#D4FF00]"
              />
            ))}
          </div>
          <span className="text-white/80">{GYM_INFO.RATING}</span>
          <span>Â· Ulasan Google</span>
        </div>

        {/* Tagline */}
        <p className="mt-2 text-sm text-[#888]">
          "{GYM_INFO.TAGLINE}"
        </p>
      </div>

      {/* Login Card */}
      <Card className="relative z-10 w-full max-w-sm border-[#2A2A2A] bg-[#1A1A1A]">
        <CardContent className="p-5 sm:p-6">
          <h2 className="mb-4 text-center font-heading text-2xl text-white">
            MASUK DASHBOARD
          </h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-[#888]">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@lineupgym.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-[#2A2A2A] bg-[#111] text-white placeholder:text-[#555] focus:border-[#FF2A2A] focus:ring-[#FF2A2A]/30"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-[#888]">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="border-[#2A2A2A] bg-[#111] pr-10 text-white placeholder:text-[#555] focus:border-[#FF2A2A] focus:ring-[#FF2A2A]/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] hover:text-[#888]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#FF2A2A] text-sm font-bold text-black transition-transform hover:scale-[1.02] hover:bg-[#E60000] active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Memproses...
                </span>
              ) : (
                'MASUK'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Footer info */}
      <div className="relative z-10 mt-6 space-y-1.5 text-center text-xs text-[#555]">
        <div className="flex items-center justify-center gap-1.5">
          <MapPin className="h-3 w-3" />
          <span>Prambanan, Klaten, Jawa Tengah</span>
        </div>
        <div className="flex items-center justify-center gap-1.5">
          <Phone className="h-3 w-3" />
          <a
            href={`https://wa.me/6285647618646`}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-[#FF2A2A]"
          >
            {GYM_INFO.PHONE}
          </a>
        </div>
        <p className="pt-2 text-[10px] text-[#333]">
          Â© {new Date().getFullYear()} {GYM_INFO.NAME}. All rights reserved.
        </p>
      </div>
    </div>
  )
}
