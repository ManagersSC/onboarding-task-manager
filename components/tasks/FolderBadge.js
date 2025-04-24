"use client"

import { useTheme } from "@components/theme-provider"
import { generateColorFromString } from "@lib/utils/colour-hash"
import { Badge } from "@components/ui/badge"

export function FolderBadge({ name }) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  if (!name) return null

  const colors = generateColorFromString(name)
  const bgColor = isDark ? colors.dark : colors.light
  const textColor = isDark ? "text-white" : "text-black"

  return (
    <Badge
      className="font-normal text-xs px-2 py-0.5 truncate max-w-[150px]"
      style={{
        backgroundColor: bgColor,
        color: textColor,
        borderColor: "transparent",
      }}
    >
      {name}
    </Badge>
  )
}
