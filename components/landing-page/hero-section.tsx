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
            href="https://wa.me/6285707678485?text=Halo,%20saya%20tertarik%20untuk%20mendaftar%20di%20Line%20Up%20Gym!"
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

        <div className="mt-8 flex items-center justify-center gap-6">
          <a href="https://instagram.com/lineup.gym" target="_blank" rel="noopener noreferrer" className="text-[#888] hover:text-[#FF2A2A] transition-colors flex items-center gap-2 text-sm font-medium">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
            </svg>
            Instagram
          </a>
          <a href="https://www.tiktok.com/@lineupgymofficial" target="_blank" rel="noopener noreferrer" className="text-[#888] hover:text-[#FF2A2A] transition-colors flex items-center gap-2 text-sm font-medium">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.12-3.39-3.25-3.46-5.62-.05-1.92.65-3.83 1.98-5.23 1.29-1.4 3.19-2.28 5.12-2.34v4.04c-1.15.03-2.3.51-3.08 1.41-.66.75-.97 1.76-.84 2.76.13 1.09.82 2.07 1.77 2.58.91.5 2.01.62 2.99.33 1.26-.35 2.22-1.48 2.37-2.78.04-.33.05-.66.05-.98v-17.1z" />
            </svg>
            TikTok
          </a>
        </div>

        <Stats />
      </motion.div>
    </section>
  )
}