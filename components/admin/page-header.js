"use client"

import { cn } from "@components/lib/utils"

export function PageHeader({ title, description, children, className }) {
  return (
    <div className={cn(
      "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 animate-fade-in-up",
      className
    )}>
      <div>
        <h1 className="text-headline font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="text-body-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-2">{children}</div>
      )}
    </div>
  )
}
