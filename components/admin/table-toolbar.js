"use client"

import { Search } from "lucide-react"
import { Input } from "@components/ui/input"
import { cn } from "@components/lib/utils"

export function TableToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search…",
  children,
  className,
}) {
  return (
    <div className={cn(
      "flex flex-wrap items-center gap-3 mb-4",
      className
    )}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="h-10 w-72 rounded-lg pl-9 border-border/40 focus-visible:ring-2 focus-visible:ring-primary/20"
        />
      </div>
      {children}
    </div>
  )
}
