import { Badge } from "@components/ui/badge"
import { FileText, Video, Star, File } from "lucide-react"
import { cn } from "@components/lib/utils"

export function TaskTypeBadge({ type, isCustom, className }) {
  // Handle custom tasks
  if (isCustom) {
    return (
      <Badge
        variant="outline"
        className={cn(
          "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800 flex items-center",
          className,
        )}
      >
        <Star className="h-3 w-3 mr-1" />
        <span>Custom</span>
      </Badge>
    )
  }

  // Handle regular task types
  const typeConfig = {
    doc: {
      icon: <FileText className="h-3 w-3 mr-1" />,
      label: "Document",
      className: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    },
    video: {
      icon: <Video className="h-3 w-3 mr-1" />,
      label: "Video",
      className: "bg-pink-50 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300 border-pink-200 dark:border-pink-800",
    },
    core: {
      icon: <File className="h-3 w-3 mr-1" />,
      label: "Core",
      className: "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 border-teal-200 dark:border-teal-800",
    },
  }

  const config = typeConfig[type?.toLowerCase()] || typeConfig.core

  return (
    <Badge variant="outline" className={cn("flex items-center", config.className, className)}>
      {config.icon}
      <span>{config.label}</span>
    </Badge>
  )
}
