'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { GYM_ID } from '@/lib/constants'

const FALLBACK_GALLERY = [
  { src: '/gym-hero.png', alt: 'Area utama Line Up Gym' },
  { src: '/gym-equipment.png', alt: 'Alat gym modern' },
  { src: '/gym-cardio.png', alt: 'Area latihan' },
]

export default function Galery() {
  const [images, setImages] = useState<{ src: string; alt: string }[]>([])
  const supabase = createClient()

  useEffect(() => {
    async function fetchGallery() {
      const { data } = await supabase
        .from('settings')
        .select('gallery')
        .eq('id', GYM_ID)
        .single()

      if (data?.gallery && Array.isArray(data.gallery) && data.gallery.length > 0) {
        setImages(data.gallery.map((url: string) => ({ src: url, alt: 'Suasana LineUp Gym' })))
      } else {
        setImages(FALLBACK_GALLERY)
      }
    }
    fetchGallery()
  }, [])

  return (
    <section id="galeri" className="py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-12 text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-primary">Galeri</p>
          <h2 className="mt-2 font-heading text-3xl text-foreground sm:text-4xl">Suasana Lineup Gym</h2>
          <p className="mt-2 text-sm text-muted-foreground">Intip suasana latihan di gym kami</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((img, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-border/50 bg-card"
            >
              <Image
                src={img.src}
                alt={img.alt}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <p className="absolute bottom-4 left-4 text-xs font-semibold uppercase tracking-wider text-white opacity-0 transition-all duration-300 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0">
                {img.alt}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}