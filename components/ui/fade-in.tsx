'use client'

import { motion, Variants } from 'framer-motion'
import { ReactNode } from 'react'

export function StaggerContainer({ children, className = '' }: { children: ReactNode, className?: string }) {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15, // Delay between each item
      },
    },
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-50px' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, className = '' }: { children: ReactNode, className?: string }) {
  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 15,
        mass: 1,
      },
    },
  }

  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  )
}
