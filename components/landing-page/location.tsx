'use client'

import { MapPin, Clock, Phone, AtSign, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { StaggerContainer, StaggerItem } from '@/components/ui/fade-in'

export default function Location() {
  return (
    <section id="lokasi" className="bg-[#111] py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-12 text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-[#FF2A2A]">Lokasi & Kontak</p>
          <h2 className="mt-2 font-heading text-3xl text-white sm:text-4xl">Temukan Kami</h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Google Maps */}
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="overflow-hidden rounded-2xl border border-[#2A2A2A]"
          >
            <iframe
              src="https://maps.google.com/maps?q=Line+Up+Gym+Prambanan&t=&z=15&ie=UTF8&iwloc=&output=embed"
              width="100%"
              height="350"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full h-full min-h-[350px]"
            />
          </motion.div>
          <StaggerContainer className="flex flex-col gap-4">
            <StaggerItem>
              <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#FF2A2A]/10 text-[#FF2A2A]">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Alamat</h4>
                    <p className="mt-1 text-sm text-[#888]">Banjarsari, Kb. Dalem Kidul, Kec. Prambanan, Klaten, Jawa Tengah, Indonesia 57454</p>
                    <a
                      href="https://maps.app.goo.gl/gWF4BnTf6oxZjV366"
                      target="_blank"
                      className="mt-2 inline-flex items-center gap-1 text-xs text-[#FF2A2A] hover:underline"
                    >
                      Buka di Google Maps <ChevronRight className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>
            </StaggerItem>

            <StaggerItem>
              <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#FF2A2A]/10 text-[#FF2A2A]">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Jam Operasional</h4>
                    <p className="mt-1 text-sm text-[#888]">Setiap Hari</p>
                    <p className="font-heading text-xl text-white">06:00 — 21:00 WIB</p>
                  </div>
                </div>
              </div>
            </StaggerItem>

            <StaggerItem>
              <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#FF2A2A]/10 text-[#FF2A2A]">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Hubungi Kami</h4>
                    <a href="tel:+6285647618646" className="mt-1 block text-sm text-[#888] hover:text-white">0856-4761-8646</a>
                    <a
                      href="https://wa.me/6285647618646?text=Halo,%20saya%20ingin%20bertanya%20tentang%20Line%20Up%20Gym"
                      target="_blank"
                      className="mt-2 inline-flex items-center gap-1 rounded-lg bg-[#25D366]/10 px-3 py-1.5 text-xs font-medium text-[#25D366] hover:bg-[#25D366]/20"
                    >
                      Chat via WhatsApp
                    </a>
                  </div>
                </div>
              </div>
            </StaggerItem>

            <StaggerItem>
              <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#FF2A2A]/10 text-[#FF2A2A]">
                    <AtSign className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Instagram</h4>
                    <a
                      href="https://www.instagram.com/lineup.gym_/"
                      target="_blank"
                      className="mt-1 block text-sm text-[#888] hover:text-white"
                    >
                      @lineup.gym_
                    </a>
                    <p className="mt-0.5 text-[11px] text-[#555]">Follow untuk info promo & event terbaru</p>
                  </div>
                </div>
              </div>
            </StaggerItem>
          </StaggerContainer>
        </div>
      </div>
    </section>
  )
}