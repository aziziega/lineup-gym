'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'

function Counter({ value, duration = 1.5 }: { value: string; duration?: number }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })
  const [displayValue, setDisplayValue] = useState('')

  useEffect(() => {
    if (!isInView) return

    // Ekstrak angka murni dengan opsional tanda + atau % (misalnya "450+" -> 450, "50+" -> 50)
    const match = value.match(/^(\d+)([\+%]?)$/)
    if (!match) {
      // Jika bukan angka biasa (seperti "06.00-21.00 WIB"), tampilkan apa adanya secara langsung
      setDisplayValue(value)
      return
    }

    const targetNumber = parseInt(match[1], 10)
    const suffix = match[2] || ''

    let start = 0
    const end = targetNumber
    if (start === end) {
      setDisplayValue(value)
      return
    }

    let startTime: number | null = null

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1)
      
      // Easing function (easeOutQuad) agar animasi melambat saat mendekati akhir
      const easeProgress = progress * (2 - progress)
      
      const current = Math.floor(easeProgress * (end - start) + start)
      setDisplayValue(`${current}${suffix}`)

      if (progress < 1) {
        window.requestAnimationFrame(step)
      } else {
        setDisplayValue(value)
      }
    }

    window.requestAnimationFrame(step)
  }, [value, duration, isInView])

  return (
    <span ref={ref}>
      {displayValue || '0'}
    </span>
  )
}

export default function Stats() {
  const containerRef = useRef(null)
  const isContainerInView = useInView(containerRef, { once: true, margin: "-50px" })

  const statsData = [
    { value: '50+', label: 'Alat Premium & Modern' },
    { value: '500+', label: 'Member Terdaftar' },
    { value: '06.00-21.00 WIB', label: 'Jam Operasional' },
  ]

  return (
    <div 
      ref={containerRef}
      className="mt-16 grid grid-cols-3 gap-4"
    >
      {statsData.map((s, index) => (
        <motion.div 
          key={s.label} 
          initial={{ opacity: 0, y: 20 }}
          animate={isContainerInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: index * 0.15, ease: "easeOut" }}
          className="rounded-xl border border-[#1A1A1A] bg-background/70 px-3 py-4 backdrop-blur-sm transition-all duration-300 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5"
        >
          <p className="font-heading text-2xl text-primary sm:text-3xl">
            <Counter value={s.value} />
          </p>
          <p className="text-[11px] text-muted-foreground sm:text-xs mt-1">{s.label}</p>
        </motion.div>
      ))}
    </div>
  )
}