"use client"

import { useState } from "react"
import { Card, CardContent, CardFooter } from "@components/ui/card"
import { Button } from "@components/ui/button"
import { Badge } from "@components/ui/badge"
import { Check, Clock, AlertCircle, ExternalLink, Loader2, Star, Flag } from "lucide-react"
import { cn } from "@components/lib/utils"
import Link from "next/link"

// Urgency configuration
const urgencyConfig = {
  Critical: {
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-900/20",
    borderColor: "border-red-200 dark:border-red-800",
  },
  High: {
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-900/20",
    borderColor: "border-orange-200 dark:border-orange-800",
  },
  Medium: {
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-900/20",
    borderColor: "border-amber-200 dark:border-amber-800",
  },
  Low: {
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-900/20",
    borderColor: "border-green-200 dark:border-green-800",
  },
}

export function TaskCard({ task, onComplete, disableActions }) {
  const [isCompleting, setIsCompleting] = useState(false)

  // Status configuration
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

  // Ensure we have a valid status
  const status = task.status || (task.completed ? "completed" : task.overdue ? "overdue" : "assigned")
  const statusInfo = statusConfig[status] || statusConfig.assigned

  // Get urgency styling if available
  const urgencyInfo = task.urgency ? urgencyConfig[task.urgency] : null

  const handleComplete = async () => {
    if (disableActions || task.completed) return
    setIsCompleting(true)
    try {
      await onComplete(task.id)
    } finally {
      setIsCompleting(false)
    }
  }

  return (
    <Card className={cn("overflow-hidden", statusInfo.accentClass, task.isQuiz && "border-2 border-blue-500 shadow-lg")}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start gap-2 mb-2">
          <h3 className="font-medium text-foreground">
            {task.title}
            {task.isQuiz && (
              <Badge variant="default" className="ml-2 bg-blue-600 text-white">Quiz</Badge>
            )}
          </h3>
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline" className={statusInfo.badgeClass}>
              <span className="flex items-center gap-1">
                {statusInfo.icon}
                <span className="hidden sm:inline">{statusInfo.label}</span>
              </span>
            </Badge>

            {task.isCustom && (
              <Badge
                variant="outline"
                className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
              >
                <Star className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">Custom</span>
              </Badge>
            )}

            {task.urgency && task.urgency !== "Medium" && urgencyInfo && (
              <Badge
                variant="outline"
                className={cn(
                  "flex items-center gap-1",
                  urgencyInfo.color,
                  urgencyInfo.bgColor,
                  urgencyInfo.borderColor,
                )}
              >
                <Flag className="h-3 w-3" />
                <span className="hidden sm:inline">{task.urgency}</span>
              </Badge>
            )}
          </div>
        </div>

        {task.description && <p className="text-sm text-muted-foreground mb-2">{task.description}</p>}

        {task.week && <div className="text-xs text-muted-foreground mb-2">Week {task.week}</div>}
      </CardContent>

      <CardFooter className="p-4 pt-0 flex justify-between items-center">
        {task.isQuiz ? (
          <div className="flex w-full justify-end">
            {task.quizId ? (
              <Link href={`/quizzes/${task.quizId}`}>
                <Button 
                  variant="default" 
                  size="sm" 
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {task.completed ? "View Results" : "Get Started"}
                </Button>
              </Link>
            ) : (
              <Button 
                variant="default" 
                size="sm" 
                className="bg-gray-400 cursor-not-allowed" 
                disabled
              >
                Quiz Unavailable
              </Button>
            )}
          </div>
        ) : (
          <>
            {task.resourceUrl ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                onClick={() => window.open(task.resourceUrl, "_blank", "noopener,noreferrer")}
              >
                <ExternalLink className="h-4 w-4 mr-1.5" />
                Resource
              </Button>
            ) : (
              <span /> // Empty span to maintain alignment
            )}

            {!task.completed ? (
              <Button
                variant={task.overdue ? "default" : "outline"}
                size="sm"
                className={cn(
                  task.overdue && "bg-red-600 hover:bg-red-700 text-white",
                  // Hard-disable visuals when globally disabled
                  disableActions && "opacity-50 cursor-not-allowed pointer-events-none",
                )}
                disabled={isCompleting || disableActions}
                onClick={!disableActions ? handleComplete : undefined}
              >
                {isCompleting ? (
                  <>
                    <Loader2 className={cn("h-4 w-4 mr-1.5", (isCompleting && !disableActions) ? "animate-spin" : "")} />
                    Completing...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-1.5" />
                    Complete
                  </>
                )}
              </Button>
            ) : (
              <div className="text-xs text-muted-foreground">
                Completed {task.lastStatusChange ? new Date(task.lastStatusChange).toLocaleDateString() : ""}
              </div>
            )}
          </>
        )}
      </CardFooter>
    </Card>
  )
}