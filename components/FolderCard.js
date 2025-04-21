"use client"

import { useState } from "react"
import { Check, Clock, Folder, AlertCircle, ExternalLink, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@components/ui/table"
import { Card, CardContent, CardFooter, CardHeader } from "@components/ui/card"
import { Button } from "@components/ui/button"
import { Badge } from "@components/ui/badge"
import { Progress } from "@components/ui/progress"
import { cn } from "@components/lib/utils"

function TaskModal({ folderName, tasks, onClose, onComplete }) {
  const [completingTaskId, setCompletingTaskId] = useState(null)

  const handleCompleteTask = async (taskId) => {
    setCompletingTaskId(taskId)
    try {
      await onComplete(taskId)
    } finally {
      setCompletingTaskId(null)
    }
  }

  // Status configuration
  const statusConfig = {
    assigned: {
      icon: <Clock className="h-4 w-4" />,
      label: "Assigned",
      badgeClass:
        "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    },
    overdue: {
      icon: <AlertCircle className="h-4 w-4" />,
      label: "Overdue",
      badgeClass: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
    },
    completed: {
      icon: <Check className="h-4 w-4" />,
      label: "Completed",
      badgeClass:
        "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800",
    },
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5 text-blue-600 dark:text-blue-400" />
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
                          {task.resourceUrl && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                              onClick={() => window.open(task.resourceUrl, "_blank", "noopener,noreferrer")}
                            >
                              <ExternalLink className="h-4 w-4 sm:mr-1.5" />
                              <span className="hidden sm:inline">Resource</span>
                            </Button>
                          )}

                          {!task.completed && (
                            <Button
                              variant={task.overdue ? "default" : "outline"}
                              size="sm"
                              className={cn(task.overdue && "bg-red-600 hover:bg-red-700 text-white")}
                              disabled={completingTaskId === task.id}
                              onClick={() => handleCompleteTask(task.id)}
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
                  <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
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

export default function FolderCard({ folderName, tasks, onComplete, status }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)

  // Calculate task counts and progress
  const totalTasks = tasks.length
  const completedTasks = tasks.filter((task) => task.completed).length
  const progress = Math.round((completedTasks / totalTasks) * 100) || 0
  const weekNumber = tasks[0]?.week || "N/A"

  // Status styling
  const statusConfig = {
    assigned: {
      icon: <Clock className="h-4 w-4" />,
      label: "Assigned",
      badgeClass:
        "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      accentClass: "border-l-4 border-blue-500 dark:border-blue-400",
      progressClass: "bg-blue-500 dark:bg-blue-400",
    },
    overdue: {
      icon: <AlertCircle className="h-4 w-4" />,
      label: "Overdue",
      badgeClass: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
      accentClass: "border-l-4 border-red-500 dark:border-red-400",
      progressClass: "bg-red-500 dark:bg-red-400",
    },
    completed: {
      icon: <Check className="h-4 w-4" />,
      label: "Completed",
      badgeClass:
        "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800",
      accentClass: "border-l-4 border-green-500 dark:border-green-400",
      progressClass: "bg-green-500 dark:bg-green-400",
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
          "cursor-pointer transition-all hover:shadow-md",
          statusInfo.accentClass,
          isHovered && "shadow-md",
        )}
        onClick={() => setIsOpen(true)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Folder className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h3 className="font-medium text-foreground">{folderName}</h3>
            </div>
            <Badge variant="outline" className="text-foreground/70 dark:text-foreground/80">
              Week {weekNumber}
            </Badge>
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
              <span className="font-medium text-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" indicatorClassName={statusInfo.progressClass} />
          </div>
        </CardContent>
        <CardFooter className="p-4 pt-2">
          <Button size="sm" variant="secondary" className="w-full">
            View Tasks
          </Button>
        </CardFooter>
      </Card>

      {isOpen && (
        <TaskModal folderName={folderName} tasks={tasks} onClose={() => setIsOpen(false)} onComplete={onComplete} />
      )}
    </>
  )
}
