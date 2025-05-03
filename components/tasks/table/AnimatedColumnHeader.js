"use client"

import { motion } from "framer-motion"
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from "@components/lib/utils"

export function AnimatedColumnHeader({
  children,
  column,
  sortColumn,
  sortDirection,
  onSort,
  className,
  onResizeStart,
  isHovered,
}) {
  const isSorted = sortColumn === column

  return (
    <div
      className={cn("relative flex h-full w-full items-center cursor-pointer group", className)}
      onClick={() => onSort && onSort(column)}
    >
      <span className="flex items-center gap-1">
        {children}
        {isSorted && (
          <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} className="ml-1">
            {sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </motion.div>
        )}
      </span>

      {onSort && !isSorted && (
        <motion.div
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          className="ml-1 opacity-0 group-hover:opacity-100"
        >
          <ChevronUp className="h-3 w-3 text-muted-foreground/50" />
        </motion.div>
      )}

      {onResizeStart && (
        <div
          className="absolute right-0 top-0 h-full w-6 cursor-col-resize"
          onMouseDown={(e) => onResizeStart(e, column)}
        >
          <motion.div
            className="absolute right-0 top-0 h-full w-[1px] bg-border"
            animate={{
              width: isHovered ? "2px" : "1px",
              backgroundColor: isHovered ? "rgb(59, 130, 246)" : "rgb(226, 232, 240)",
            }}
          />
        </div>
      )}
    </div>
  )
}