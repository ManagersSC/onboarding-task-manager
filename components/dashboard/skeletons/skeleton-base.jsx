"use client"

import { motion } from "framer-motion"
import { Skeleton } from "@components/ui/skeleton"

// Animation variants for staggered loading
export const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
}

export const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
}

// Helper function to create an array of a specific length
export const createArray = (length) => Array.from({ length }, (_, i) => i)

// Base skeleton component
export function SkeletonBase({ className, children }) {
  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className={className}>
      {children}
    </motion.div>
  )
}

// Skeleton item component
export function SkeletonItem({ className, height = "h-4", width = "w-full" }) {
  return (
    <motion.div variants={itemVariants}>
      <Skeleton className={`${height} ${width} ${className}`} />
    </motion.div>
  )
}
