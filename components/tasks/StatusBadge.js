import { Badge } from "@components/ui/badge"
import { Clock, AlertCircle, CheckCircle } from "lucide-react"
import { cn } from "@components/lib/utils"

export function StatusBadge({ status, className }) {
  const statusConfig = {
    assigned: {
      icon: <Clock className="h-3.5 w-3.5 mr-1" />,
      label: "Assigned",
      variant: "outline",
      className: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    },
    overdue: {
      icon: <AlertCircle className="h-3.5 w-3.5 mr-1" />,
      label: "Overdue",
      variant: "outline",
      className: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800",
    },
    completed: {
      icon: <CheckCircle className="h-3.5 w-3.5 mr-1" />,
      label: "Completed",
      variant: "outline",
      className:
        "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800",
    },
  }

  const config = statusConfig[status?.toLowerCase()] || statusConfig.assigned

  return (
    <Badge variant={config.variant} className={cn("flex items-center", config.className, className)}>
      {config.icon}
      <span>{config.label}</span>
    </Badge>
  )
}
