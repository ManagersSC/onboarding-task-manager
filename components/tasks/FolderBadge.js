"use client"

import { useTheme } from "@components/theme-provider"
import { generateColorFromString } from "@lib/utils/colour-hash"
import { Badge } from "@components/ui/badge"
import { cn } from "@components/lib/utils"
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from "@components/ui/tooltip"

export function FolderBadge({ name, usageCount, isSystem = false, className = "" }) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  if (!name) return null

  const colors = generateColorFromString(name)
  const dotColor = isDark ? colors.dark : colors.light

  return (
    <TooltipProvider delayDuration={400}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("inline-flex items-center", className)}>
            <Badge
              variant="secondary"
              className="font-normal text-caption px-2 py-0.5 max-w-[120px] flex items-center gap-1.5 cursor-default"
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: dotColor }}
              />
              <span className="truncate">{name}</span>
              {isSystem && (
                <span className="text-caption opacity-60">(S)</span>
              )}
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>{name}{isSystem ? " (System)" : ""}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
