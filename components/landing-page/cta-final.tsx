'use client'

import { ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'

export default function CtaFinal() {
  return (
    <section className="relative overflow-hidden py-20">
      <motion.div 
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 bg-gradient-to-r from-[#FF2A2A]/10 to-[#0A0A0A]" 
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ type: "spring", bounce: 0.4, duration: 0.8 }}
        className="relative mx-auto max-w-3xl px-4 text-center"
      >
        <h2 className="font-heading text-3xl text-white sm:text-5xl">
          Siap Mulai <span className="text-[#FF2A2A]">Perjalanan Fitness</span> Kamu?
        </h2>
        <p className="mt-4 text-sm text-[#888]">
          Gabung bersama 400+ member yang sudah merasakan manfaat latihan di Line Up Gym Prambanan
        </p>
        <motion.a
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          href="https://wa.me/6285707678485?text=Halo,%20saya%20tertarik%20untuk%20mendaftar%20di%20Line%20Up%20Gym!"
          target="_blank"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#FF2A2A] px-10 py-4 text-lg font-bold text-white shadow-[0_0_30px_-5px_rgba(255,42,42,0.4)] transition-colors hover:bg-[#CC2222]"
        >
          Daftar Sekarang <ChevronRight className="h-5 w-5" />
        </motion.a>
      </motion.div>
    </section>
  )
}