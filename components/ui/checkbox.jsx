"use client"

import React from "react"
import { cn } from "@components/lib/utils"

const Checkbox = React.forwardRef(({ className, ...props }, ref) => (
  <input
    ref={ref}
    type="checkbox"
    className={cn(
      "h-4 w-4 shrink-0 rounded-sm border border-primary shadow " +
      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring " +
      "disabled:cursor-not-allowed disabled:opacity-50 " +
      "checked:bg-primary checked:text-primary-foreground",
      className
    )}
    {...props}
  />
))
Checkbox.displayName = "Checkbox"

export { Checkbox }
