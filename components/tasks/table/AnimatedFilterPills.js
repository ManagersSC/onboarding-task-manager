"use client"

import { motion } from "framer-motion"
import { X } from 'lucide-react'

export function AnimatedFilterPill({ label, value, onRemove }) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onRemove}
      className="inline-flex items-center gap-1.5 rounded-full bg-primary/5 border border-primary/15 px-2.5 py-1 text-caption text-primary font-medium cursor-pointer hover:bg-primary/10 transition-colors"
    >
      <span className="text-muted-foreground">{label}:</span>
      <span className="max-w-[100px] truncate">{value}</span>
      <X className="h-3 w-3 shrink-0 opacity-60 hover:opacity-100" />
      <span className="sr-only">Remove {label} filter</span>
    </motion.button>
  )
}
