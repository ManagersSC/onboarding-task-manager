import { Badge } from "@components/ui/badge"
import { Flag } from "lucide-react"
import { cn } from "@components/lib/utils"

export function UrgencyBadge({ urgency, className }) {
  const urgencyConfig = {
    critical: {
      label: "Critical",
      className: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800",
    },
    high: {
      label: "High",
      className:
        "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800",
    },
    medium: {
      label: "Medium",
      className:
        "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    },
    low: {
      label: "Low",
      className:
        "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800",
    },
  }

  const config = urgencyConfig[urgency?.toLowerCase()] || urgencyConfig.medium

  return (
    <Badge variant="outline" className={cn("flex items-center", config.className, className)}>
      <Flag className="h-3 w-3 mr-1" />
      <span>{config.label}</span>
    </Badge>
  )
}
