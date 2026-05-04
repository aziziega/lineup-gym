'use client'

import { useRef } from 'react'
import Image from 'next/image'
import { ChevronRight, Star } from 'lucide-react'
import { motion, useScroll, useTransform } from 'framer-motion'
import Stats from './stats'

export default function HeroSection() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start']
  })
  
  // Parallax effect: moves down and scales slightly as you scroll down
  const yBg = useTransform(scrollYProgress, [0, 1], ['0%', '30%'])
  const scaleBg = useTransform(scrollYProgress, [0, 1], [1, 1.1])

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section ref={ref} id="hero" className="relative flex min-h-screen items-center justify-center overflow-hidden pt-16">
      {/* Background image with Parallax */}
      <motion.div 
        style={{ y: yBg, scale: scaleBg }}
        className="absolute inset-0 z-0 origin-bottom"
      >
        <Image src="/gym-hero.png" alt="Line Up Gym" fill className="object-cover opacity-30" priority />
      </motion.div>
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#0A0A0A]/60 via-transparent to-[#0A0A0A]" />

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 mx-auto max-w-4xl px-4 text-center mt-10"
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#FF2A2A]/30 bg-[#FF2A2A]/10 px-4 py-1.5"
        >
          <Star className="h-4 w-4 text-[#FF2A2A]" />
          <span className="text-sm text-[#FF2A2A]">Rating 4.9 di Google Maps</span>
        </motion.div>

        <h1 className="font-heading text-5xl leading-tight text-white sm:text-7xl md:text-8xl">
          <span className="text-[#FF2A2A] italic">LINEUP</span> GYM
        </h1>
        <h2 className="font-heading text-2xl text-[#888] sm:text-3xl">PRAMBANAN</h2>

        <p className="mx-auto mt-6 max-w-lg text-lg text-[#aaa] sm:text-xl">
          Be Strong Be Healthy
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm text-[#666]">
          Tempat nyaman, alat baru, fasilitas lengkap. Gym terbaik di Prambanan, Klaten.
        </p>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <a
            href="https://wa.me/6285647618646?text=Halo,%20saya%20tertarik%20untuk%20mendaftar%20di%20Line%20Up%20Gym!"
            target="_blank"
            className="flex items-center gap-2 rounded-xl bg-[#FF2A2A] px-8 py-3.5 text-base font-bold text-white shadow-lg shadow-[#FF2A2A]/20 transition-all hover:scale-105 hover:bg-[#CC2222]"
          >
            Gabung Sekarang <ChevronRight className="h-5 w-5" />
          </a>
          <button
            onClick={() => scrollTo('harga')}
            className="rounded-xl border border-[#333] px-8 py-3.5 text-base text-[#aaa] transition-colors hover:border-[#555] hover:text-white"
          >
            Lihat Harga
          </button>
        </div>

        <Stats />
      </motion.div>
    </section>
  )
}