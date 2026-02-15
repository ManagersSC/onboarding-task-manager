"use client"

import { useState } from "react"
import { Check, Clock, Folder, AlertCircle, Loader2, Star, Flag, Paperclip } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@components/ui/table"
import { Card, CardContent, CardFooter, CardHeader } from "@components/ui/card"
import { Button } from "@components/ui/button"
import { Badge } from "@components/ui/badge"
import { cn } from "@components/lib/utils"

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

function TaskModal({ folderName, tasks, onClose, onComplete, onOpenFiles, disableActions }) {
  const [completingTaskId, setCompletingTaskId] = useState(null)

  const handleCompleteTask = async (taskId) => {
    if (disableActions) return
    setCompletingTaskId(taskId)
    try {
      await onComplete(taskId)
    } finally {
      setCompletingTaskId(null)
    }
  }

  // Status configuration using semantic tokens
  const statusConfig = {
    assigned: {
      icon: <Clock className="h-4 w-4" />,
      label: "Assigned",
      badgeClass: "bg-info-muted text-info border-info/20",
    },
    overdue: {
      icon: <AlertCircle className="h-4 w-4" />,
      label: "Overdue",
      badgeClass: "bg-error-muted text-error border-error/20",
    },
    completed: {
      icon: <Check className="h-4 w-4" />,
      label: "Completed",
      badgeClass: "bg-success-muted text-success border-success/20",
    },
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5 text-primary" />
            {folderName}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-4 overflow-auto max-h-[70vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50%]">Task</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.length > 0 ? (
                tasks.map((task) => {
                  const status = task.completed ? "completed" : task.overdue ? "overdue" : "assigned"
                  const statusDetails = statusConfig[status]

                  return (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">{task.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusDetails.badgeClass}>
                          <span className="flex items-center gap-1">
                            {statusDetails.icon}
                            <span className="hidden sm:inline">{statusDetails.label}</span>
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {onOpenFiles && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => onOpenFiles(task.id, task.title)}
                            >
                              <Paperclip className="h-4 w-4" />
                            </Button>
                          )}

                          {!task.completed && (
                            <Button
                              variant={task.overdue ? "default" : "outline"}
                              size="sm"
                              className={cn(
                                task.overdue && "bg-error hover:bg-error/90 text-error-foreground",
                                disableActions && "opacity-50 cursor-not-allowed pointer-events-none"
                              )}
                              disabled={completingTaskId === task.id || disableActions}
                              onClick={() => {
                                if (disableActions) return;
                                handleCompleteTask(task.id)
                              }}
                            >
                              {completingTaskId === task.id ? (
                                <>
                                  <Loader2 className="h-4 w-4 sm:mr-1.5 animate-spin" />
                                  <span className="hidden sm:inline">Completing...</span>
                                </>
                              ) : (
                                <>
                                  <Check className="h-4 w-4 sm:mr-1.5" />
                                  <span className="hidden sm:inline">Complete</span>
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                    No tasks in this folder
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function FolderCard({ folderName, tasks, onComplete, onOpenFiles, status, disableActions }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)

  // Calculate task counts and progress
  const totalTasks = tasks.length
  const completedTasks = tasks.filter((task) => task.completed).length
  const progress = Math.round((completedTasks / totalTasks) * 100) || 0
  const weekNumber = tasks[0]?.week || "N/A"

  // Check if folder contains any custom tasks
  const hasCustomTasks = tasks.some((task) => task.isCustom)

  // Get highest urgency level in the folder
  const urgencyLevels = ["Critical", "High", "Medium", "Low"]
  const tasksWithUrgency = tasks.filter((task) => task.urgency)
  const highestUrgencyTask =
    tasksWithUrgency.length > 0
      ? tasksWithUrgency.reduce((highest, task) => {
          const currentIndex = urgencyLevels.indexOf(task.urgency)
          const highestIndex = urgencyLevels.indexOf(highest)
          return currentIndex < highestIndex ? task.urgency : highest
        }, "Low")
      : null

  const showUrgency = highestUrgencyTask && highestUrgencyTask !== "Medium" && highestUrgencyTask !== "Low"
  const urgencyInfo = highestUrgencyTask ? urgencyConfig[highestUrgencyTask] : null

  // Status styling using semantic tokens
  const statusConfig = {
    assigned: {
      icon: <Clock className="h-4 w-4" />,
      label: "Assigned",
      badgeClass: "bg-info-muted text-info border-info/20",
      accentClass: "status-border-info",
      progressClass: "progress-gradient-info",
    },
    overdue: {
      icon: <AlertCircle className="h-4 w-4" />,
      label: "Overdue",
      badgeClass: "bg-error-muted text-error border-error/20",
      accentClass: "status-border-error",
      progressClass: "progress-gradient-warning",
    },
    completed: {
      icon: <Check className="h-4 w-4" />,
      label: "Completed",
      badgeClass: "bg-success-muted text-success border-success/20",
      accentClass: "status-border-success",
      progressClass: "progress-gradient-success",
    },
  }

  const statusInfo = statusConfig[status]

  const handleCompleteAll = async () => {
    setIsCompleting(true)
    try {
      // Get all incomplete task IDs
      const incompleteTasks = tasks.filter((task) => !task.completed).map((task) => task.id)

      // Complete each task sequentially
      for (const taskId of incompleteTasks) {
        await onComplete(taskId)
      }
    } finally {
      setIsCompleting(false)
    }
  }

  return (
    <>
      <Card
        className={cn(
          "cursor-pointer border-border/60 hover:shadow-elevated hover:-translate-y-0.5 transition-all duration-base ease-out-expo",
          statusInfo.accentClass,
          isHovered && "shadow-elevated",
          hasCustomTasks && "ring-1 ring-primary/20",
        )}
        onClick={() => setIsOpen(true)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Folder className="h-5 w-5 text-primary" />
              <h3 className="font-medium text-foreground">{folderName}</h3>
              {hasCustomTasks && (
                <Badge
                  variant="outline"
                  className="bg-primary/10 text-primary border-primary/20"
                >
                  <Star className="h-3 w-3" />
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {showUrgency && urgencyInfo && (
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
                </Badge>
              )}
              <Badge variant="outline" className="text-foreground/70 dark:text-foreground/80">
                Week {weekNumber}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2 pb-2">
          <div className="flex items-center justify-between mb-2">
            <Badge variant="outline" className={statusInfo.badgeClass}>
              <span className="flex items-center gap-1">
                {statusInfo.icon}
                {statusInfo.label}
              </span>
            </Badge>
            <span className="text-sm text-muted-foreground">
              {completedTasks}/{totalTasks} tasks
            </span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className={cn("font-semibold", progress >= 75 ? "text-success" : progress >= 50 ? "text-info" : "text-warning")}>{progress}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-slower ease-out-expo", statusInfo.progressClass)}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="p-4 pt-2">
          <Button size="sm" variant="secondary" className="w-full">
            View Tasks
          </Button>
        </CardFooter>
      </Card>

      {isOpen && (
        <TaskModal folderName={folderName} tasks={tasks} onClose={() => setIsOpen(false)} onComplete={onComplete} onOpenFiles={onOpenFiles} disableActions={disableActions} />
      )}
    </>
  )
}
