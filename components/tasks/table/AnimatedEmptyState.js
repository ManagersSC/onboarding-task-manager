"use client"

import { motion } from "framer-motion"
import { FileQuestion, Plus } from 'lucide-react'
import { Button } from "@components/ui/button"

export function AnimatedEmptyState({ message, onOpenCreateTask, searchTerm, onClearSearch }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center py-12 text-center"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <FileQuestion className="h-16 w-16 text-muted-foreground/50 mb-4" />
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="text-lg font-medium mb-2"
      >
        {message}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="flex gap-3 mt-4"
      >
        {searchTerm && (
          <Button variant="outline" onClick={onClearSearch}>
            Clear Search
          </Button>
        )}
        <Button variant="outline" onClick={onOpenCreateTask} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create New Task
        </Button>
      </motion.div>
    </motion.div>
  )
}