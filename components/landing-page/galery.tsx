'use client'

import Image from 'next/image'

const GALLERY = [
  { src: '/gym-hero.png', alt: 'Area utama Line Up Gym' },
  { src: '/gym-equipment.png', alt: 'Alat gym modern' },
  { src: '/gym-cardio.png', alt: 'Area latihan' },
]

export default function Galery() {
  return (
    <section id="galeri" className="py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-12 text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-[#FF2A2A]">Galeri</p>
          <h2 className="mt-2 font-heading text-3xl text-white sm:text-4xl">Suasana Lineup Gym</h2>
          <p className="mt-2 text-sm text-[#888]">Intip suasana latihan di gym kami</p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {GALLERY.map((img, i) => (
            <div key={i} className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-[#1A1A1A]">
              <Image
                src={img.src}
                alt={img.alt}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <p className="absolute bottom-3 left-3 text-sm font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                {img.alt}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}