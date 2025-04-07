"use client"

import { useState } from "react"
import { Check, Clock, ExternalLink, Loader2, X, Folder } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@components/ui/table"
import { Card, CardContent, CardHeader } from "@components/ui/card"
import { Button } from "@components/ui/button"
import { Badge } from "@components/ui/badge"


function Modal({ folderName, tasks, onClose, onComplete }) {
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
      variant: "outline",
      className: "bg-blue-50 text-blue-700 border-blue-200",
    },
    overdue: {
      icon: <Clock className="h-4 w-4" />,
      label: "Overdue",
      variant: "outline",
      className: "bg-red-50 text-red-700 border-red-200",
    },
    completed: {
      icon: <Check className="h-4 w-4" />,
      label: "Completed",
      variant: "outline",
      className: "bg-green-50 text-green-700 border-green-200",
    },
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] p-0 gap-0">
        <DialogHeader className="px-3 py-4 sm:p-6 border-b flex flex-row items-center justify-between">
          <DialogTitle className="text-lg sm:text-xl font-semibold truncate pr-2">{folderName}</DialogTitle>
        </DialogHeader>

        <div className="px-3 py-3 sm:p-6 sm:pt-4 sm:pb-4 overflow-auto max-h-[70vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50%] py-3">Task</TableHead>
                <TableHead className="py-3">Status</TableHead>
                <TableHead className="text-right py-3">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.length > 0 ? (
                tasks.map((task) => {
                  const status = task.completed ? "completed" : task.overdue ? "overdue" : "assigned"
                  const statusDetails = statusConfig[status]

                  return (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium py-3 sm:py-4">{task.title}</TableCell>
                      <TableCell className="py-3 sm:py-4">
                        <Badge variant={statusDetails.variant} className={statusDetails.className}>
                          <span className="flex items-center gap-1">
                            {statusDetails.icon}
                            <span className="hidden xs:inline">{statusDetails.label}</span>
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right py-3 sm:py-4">
                        <div className="flex items-center justify-end gap-1 sm:gap-2">
                          {task.resourceUrl && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-blue-600 hover:text-blue-700 px-1 sm:px-3"
                              onClick={() => window.open(task.resourceUrl, "_blank", "noopener,noreferrer")}
                            >
                              <ExternalLink className="h-4 w-4 sm:mr-1.5" />
                              <span className="hidden sm:inline">Resource</span>
                            </Button>
                          )}

                          {!task.completed && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-1 sm:px-3"
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

  // Calculate task counts
  const totalTasks = tasks.length
  const weekNumber = tasks[0]?.week || "N/A"

  // Status styling
  const statusStyles = {
    assigned: {
      badge: "bg-blue-50 text-blue-700 border-blue-200",
    },
    overdue: {
      badge: "bg-red-50 text-red-700 border-red-200",
    },
    completed: {
      badge: "bg-green-50 text-green-700 border-green-200",
    },
  }

  const statusStyle = statusStyles[status] || statusStyles.assigned

  return (
    <>
      <Card
        className="cursor-pointer transition-all hover:shadow-md hover:bg-gray-50 mb-4"
        onClick={() => setIsOpen(true)}
      >
        <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Folder className="h-5 w-5 text-blue-600" />
            <h3 className="font-medium text-lg">{folderName}</h3>
          </div>
          <Badge variant="outline" className="text-gray-600">
            Week {weekNumber}
          </Badge>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Badge variant="outline" className={statusStyle.badge}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Badge>
              <span className="text-sm text-gray-500 ml-2">
                {totalTasks} {totalTasks === 1 ? "task" : "tasks"}
              </span>
            </div>
            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-none">View Tasks</Badge>
          </div>
        </CardContent>
      </Card>

      {isOpen && (
        <Modal folderName={folderName} tasks={tasks} onClose={() => setIsOpen(false)} onComplete={onComplete} />
      )}
    </>
  )
}