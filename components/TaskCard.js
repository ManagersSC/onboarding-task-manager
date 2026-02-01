"use client"

import { useState } from "react"
import { Card, CardContent, CardFooter } from "@components/ui/card"
import { Button } from "@components/ui/button"
import { Badge } from "@components/ui/badge"
import { Check, Clock, AlertCircle, ExternalLink, Loader2, Star, Flag } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@components/ui/tooltip"
import { cn } from "@components/lib/utils"
import Link from "next/link"

// Urgency configuration using semantic tokens
const urgencyConfig = {
  Critical: {
    color: "text-error",
    bgColor: "bg-error-muted",
    borderColor: "border-error/20",
  },
  High: {
    color: "text-warning",
    bgColor: "bg-warning-muted",
    borderColor: "border-warning/20",
  },
  Medium: {
    color: "text-warning",
    bgColor: "bg-warning-muted",
    borderColor: "border-warning/20",
  },
  Low: {
    color: "text-success",
    bgColor: "bg-success-muted",
    borderColor: "border-success/20",
  },
}

export function TaskCard({ task, onComplete, disableActions, compact = false }) {
  const [isCompleting, setIsCompleting] = useState(false)

  // Status configuration using semantic tokens
  const statusConfig = {
    assigned: {
      icon: <Clock className="h-4 w-4" />,
      label: "Assigned",
      badgeClass: "bg-info-muted text-info border-info/20",
      accentClass: "status-border-info",
    },
    overdue: {
      icon: <AlertCircle className="h-4 w-4" />,
      label: "Overdue",
      badgeClass: "bg-error-muted text-error border-error/20",
      accentClass: "status-border-error",
    },
    completed: {
      icon: <Check className="h-4 w-4" />,
      label: "Completed",
      badgeClass: "bg-success-muted text-success border-success/20",
      accentClass: "status-border-success",
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

  const renderSecondaryMeta = () => {
    if (status === "completed") {
      const completedAtRaw = task.completedTime || task.lastStatusChange || task.completedDate
      if (!completedAtRaw) return null
      const completedAt = new Date(completedAtRaw)
      const now = new Date()
      const diffMs = now.getTime() - completedAt.getTime()
      const minutes = Math.floor(diffMs / 60000)
      const hours = Math.floor(minutes / 60)
      const days = Math.floor(hours / 24)
      let rel = "just now"
      if (days > 0) rel = `${days} day${days === 1 ? "" : "s"} ago`
      else if (hours > 0) rel = `${hours} hour${hours === 1 ? "" : "s"} ago`
      else if (minutes > 0) rel = `${minutes} min${minutes === 1 ? "" : "s"} ago`
      return { label: `Completed ${rel}`, tooltip: completedAt.toLocaleString() }
    }

    // Assigned/Overdue: compute due delta if dueDate present
    const rawDue = task.dueDate || task.overdueDate || task.overdue_until || task.overdueUntil
    if (rawDue) {
      const due = new Date(rawDue)
      const now = new Date()
      const diffMs = due.getTime() - now.getTime()
      const minutes = Math.ceil(Math.abs(diffMs) / 60000)
      const hours = Math.ceil(minutes / 60)
      const days = Math.ceil(hours / 24)
      if (diffMs >= 0) {
        // in future
        const rel = days > 1 ? `${days} days` : hours > 1 ? `${hours} hours` : `${minutes} mins`
        return { label: `Due in ${rel}`, tooltip: due.toLocaleString() }
      } else {
        // overdue
        const rel = days > 1 ? `${days} days` : hours > 1 ? `${hours} hours` : `${minutes} mins`
        return { label: `Overdue by ${rel}`, tooltip: due.toLocaleString() }
      }
    }
    return null
  }

  const secondaryMeta = renderSecondaryMeta()

  return (
    <Card className={cn("overflow-hidden h-full flex flex-col border-border/60 hover:shadow-elevated hover:-translate-y-0.5 transition-all duration-base ease-out-expo", statusInfo.accentClass, task.isQuiz && "border-2 border-info shadow-sm")}>
      <CardContent className="p-4 flex-1">
        <div className="flex justify-between items-start gap-2 mb-2">
          <h3 className="font-medium text-foreground">
            {task.title}
            {task.isQuiz && (
              <Badge variant="info-solid" className="ml-2">Quiz</Badge>
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
                className="bg-primary/10 text-primary border-primary/20"
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

        <div
          className={cn("text-sm text-muted-foreground mb-2 overflow-hidden", !compact && "md:min-h-[40px]")}
          style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}
        >
          {task.description || ""}
        </div>

      </CardContent>

      <CardFooter className="p-4 pt-0 flex justify-between items-center">
        {task.isQuiz ? (
          <div className="flex w-full justify-end">
            {task.quizId ? (
              <Link href={`/quizzes/${task.quizId}`}>
                <Button
                  variant="default"
                  size="sm"
                >
                  {task.completed ? "View Results" : "Get Started"}
                </Button>
              </Link>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="opacity-50 cursor-not-allowed"
                disabled
              >
                Quiz Unavailable
              </Button>
            )}
          </div>
        ) : (
          <div className="w-full flex items-center justify-between">
            <div>
              {task.resourceUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-info hover:text-info/80"
                  onClick={() => window.open(task.resourceUrl, "_blank", "noopener,noreferrer")}
                >
                  <ExternalLink className="h-4 w-4 mr-1.5" />
                  Resource
                </Button>
              )}
            </div>
            <div className="flex items-center gap-3">
              {!task.completed && secondaryMeta && (
                <div className="text-xs text-muted-foreground">{secondaryMeta.label}</div>
              )}
              {!task.completed ? (
                <Button
                  variant={task.overdue ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    task.overdue && "bg-error hover:bg-error/90 text-error-foreground",
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
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-xs text-muted-foreground">
                        {secondaryMeta ? secondaryMeta.label : "Completed"}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      {secondaryMeta ? secondaryMeta.tooltip : ""}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {typeof task.week !== "undefined" && task.week !== null && (
                <div className="text-xs text-muted-foreground">Week {task.week}</div>
              )}
            </div>
          </div>
        )}
      </CardFooter>
    </Card>
  )
}