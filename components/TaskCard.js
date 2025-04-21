"use client"

import { useState } from "react"
import { Check, Clock, ExternalLink, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@components/ui/card"
import { Badge } from "@components/ui/badge"
import { cn } from "@components/lib/utils"

export function TaskCard({ task, onComplete }) {
  const [isCompleting, setIsCompleting] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  // Compute status based on task properties if not explicitly provided
  const computedStatus = task.status || (task.completed ? "completed" : task.overdue ? "overdue" : "assigned")

  const statusConfig = {
    assigned: {
      icon: <Clock className="h-4 w-4" />,
      label: "Assigned",
      badgeClass:
        "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      accentClass: "border-l-4 border-blue-500 dark:border-blue-400",
    },
    overdue: {
      icon: <AlertCircle className="h-4 w-4" />,
      label: "Overdue",
      badgeClass: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
      accentClass: "border-l-4 border-red-500 dark:border-red-400",
    },
    completed: {
      icon: <Check className="h-4 w-4" />,
      label: "Completed",
      badgeClass:
        "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800",
      accentClass: "border-l-4 border-green-500 dark:border-green-400",
    },
  }

  const statusInfo = statusConfig[computedStatus]

  const handleCompleteClick = async () => {
    setIsCompleting(true)
    try {
      await onComplete(task.id)
    } finally {
      setIsCompleting(false)
    }
  }

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all hover:shadow-md",
        statusInfo.accentClass,
        isHovered && "shadow-md",
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between space-x-4">
          <Badge variant="outline" className={statusInfo.badgeClass}>
            <span className="flex items-center gap-1">
              {statusInfo.icon}
              {statusInfo.label}
            </span>
          </Badge>
          {task.week && (
            <Badge variant="outline" className="text-foreground/70 dark:text-foreground/80">
              Week {task.week}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2 pb-2">
        <h3 className="font-medium text-foreground">{task.title}</h3>
        {task.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{task.description}</p>}
      </CardContent>
      <CardFooter className="p-4 pt-2 flex items-center justify-between">
        {task.resourceUrl ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 px-2 h-8"
            onClick={() => window.open(task.resourceUrl, "_blank", "noopener,noreferrer")}
            title={task.resourceUrl}
          >
            <ExternalLink className="h-4 w-4 mr-1.5" />
            View Resource
          </Button>
        ) : (
          <Button variant="ghost" size="sm" className="text-muted-foreground cursor-not-allowed px-2 h-8" disabled>
            <ExternalLink className="h-4 w-4 mr-1.5" />
            No Resource
          </Button>
        )}
        {computedStatus !== "completed" && (
          <Button
            size="sm"
            onClick={handleCompleteClick}
            variant={computedStatus === "overdue" ? "default" : "outline"}
            disabled={isCompleting}
            className={cn("h-8", computedStatus === "overdue" && "bg-red-600 hover:bg-red-700 text-white")}
          >
            {isCompleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Completing...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-1.5" />
                Complete
              </>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
