"use client"

import { useTheme } from "@components/theme-provider"
import { generateColorFromString } from "@lib/utils/colour-hash"
import { Badge } from "@components/ui/badge"
import { motion } from "framer-motion"
import { Folder } from 'lucide-react'
import { cn } from "@components/lib/utils"

export function FolderBadge({ name }) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  if (!name) return null

  const colors = generateColorFromString(name)
  const bgColor = isDark ? colors.dark : colors.light
  const textColor = isDark ? "text-white" : "text-black"

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ 
        type: "spring", 
        stiffness: 500, 
        damping: 20,
        duration: 0.3 
      }}
      whileHover={{ 
        scale: 1.05,
        transition: { duration: 0.2 }
      }}
    >
      <Badge
        className={cn(
          "font-normal text-xs px-2 py-0.5 truncate max-w-[150px] flex items-center gap-1",
          textColor
        )}
        style={{
          backgroundColor: bgColor,
          borderColor: "transparent",
        }}
      >
        <motion.div
          initial={{ rotate: -10 }}
          animate={{ rotate: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Folder className="h-3 w-3" />
        </motion.div>
        <span>{name}</span>
      </Badge>
    </motion.div>
  )
}