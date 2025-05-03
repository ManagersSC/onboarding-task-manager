"use client"

import { motion } from "framer-motion"
import { X } from 'lucide-react'
import { Button } from "@components/ui/button"

export function AnimatedFilterPill({ label, value, onRemove }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 10 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
    >
      <span className="mr-1 text-xs text-muted-foreground">{label}:</span>
      {value}
      <Button variant="ghost" size="sm" onClick={onRemove} className="ml-1 h-4 w-4 p-0 rounded-full">
        <X className="h-3 w-3" />
        <span className="sr-only">Remove filter</span>
      </Button>
    </motion.div>
  )
}