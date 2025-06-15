"use client"

import { motion } from "framer-motion"
import { InfoIcon, PartyPopperIcon, CheckCircleIcon } from "lucide-react"

export function InfoDisplay({ title = "Information", text = "Some details here." }) {
  let IconComponent = InfoIcon
  if (title?.toLowerCase().includes("welcome")) {
    IconComponent = PartyPopperIcon
  } else if (title?.toLowerCase().includes("complete") || title?.toLowerCase().includes("finish")) {
    IconComponent = CheckCircleIcon
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.4, ease: "circOut" }}
      className="text-center flex flex-col items-center justify-center w-full max-w-2xl mx-auto py-8 sm:py-12"
      role="status"
      aria-live="polite"
    >
      <IconComponent className="h-16 w-16 sm:h-20 sm:w-20 text-primary mb-6 sm:mb-8" strokeWidth={1.5} />
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 text-foreground">{title}</h1>
      <p className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed max-w-xl">{text}</p>
    </motion.div>
  )
}
