'use client'

import Navbar from '@/components/landing-page/navbar'
import HeroSection from '@/components/landing-page/hero-section'
import Facility from '@/components/landing-page/facility'
import Price from '@/components/landing-page/price'
import Galery from '@/components/landing-page/galery'
import Testimoni from '@/components/landing-page/testimoni'
import Location from '@/components/landing-page/location'
import CtaFinal from '@/components/landing-page/cta-final'
import Footer from '@/components/landing-page/footer'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <Navbar />
      <HeroSection />
      <Facility />
      <Price />
      <Galery />
      <Testimoni />
      <Location />
      <CtaFinal />
      <Footer />
    </div>
  )
}
