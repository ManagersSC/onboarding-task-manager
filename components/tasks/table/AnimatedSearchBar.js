"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Search, X, Loader2 } from 'lucide-react'
import { Input } from "@components/ui/input"
import { Button } from "@components/ui/button"

export function AnimatedSearchBar({
  value,
  onChange,
  onKeyDown,
  onClear,
  isLoading,
  placeholder = "Search tasks..."
}) {
  const [isFocused, setIsFocused] = useState(false)

  return (
    <motion.div
      className="relative w-full max-w-sm"
      initial={{ scale: 1 }}
      animate={{
        scale: isFocused ? 1.02 : 1,
        boxShadow: isFocused ? "0 4px 8px rgba(0, 0, 0, 0.1)" : "0 0px 0px rgba(0, 0, 0, 0)",
      }}
      transition={{ duration: 0.2 }}
    >
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="pl-9 pr-10"
        aria-label="Search tasks"
      />
      {value && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1 h-7 w-7 p-0"
          onClick={onClear}
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      {isLoading && <Loader2 className="absolute right-10 top-2.5 h-4 w-4 animate-spin text-primary" />}
    </motion.div>
  )
}