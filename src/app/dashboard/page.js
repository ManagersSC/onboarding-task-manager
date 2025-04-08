"use client"

import { useState, useEffect } from "react"
import { DashboardNav } from "@components/DashboardNav"
import FolderCard from "@components/FolderCard"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@components/ui/select"
import { Skeleton } from "@components/ui/skeleton"
import { Card, CardContent, CardFooter, CardHeader } from "@components/ui/card"
import { Badge } from "@components/ui/badge"
import { Button } from "@components/ui/button"
import { Clock, Check, ExternalLink, Loader2 } from "lucide-react"

// Determines the status of a folder
function getFolderStatus(subtasks) {
  const hasOverdue = subtasks.some((t) => t.overdue)
  const hasAssigned = subtasks.some((t) => !t.completed && !t.overdue)

  if (hasOverdue) return "overdue"
  if (hasAssigned) return "assigned"
  return "completed"
}

export default function DashboardPage() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedWeek, setSelectedWeek] = useState("")

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await fetch("/api/get-tasks")
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Failed to load tasks")
        }
        const data = await response.json()
        const tasksFromBackend = Array.isArray(data) ? data : data.tasks || []

        // Transform backend data to match frontend structure
        const tasksArray = tasksFromBackend.map((task) => ({
          id: task.id,
          title: Array.isArray(task.title) ? task.title[0] : task.title,
          description: task.description,
          completed: task.completed,
          overdue: task.overdue,
          resourceUrl: Array.isArray(task.resourceUrl) ? task.resourceUrl[0] : task.resourceUrl,
          lastStatusChange: task.lastStatusChange,
          week: task.week,
          folder: task.folder, // will be null if not associated with a folder
        }))

        setTasks(tasksArray)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }

    fetchTasks()
  }, [])

  const handleComplete = async (taskId) => {
    try {
      const response = await fetch("/api/complete-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to complete task")
      }
      setTasks((prevTasks) =>
        prevTasks.map((task) => (task.id === taskId ? { ...task, completed: true, overdue: false } : task)),
      )
    } catch (e) {
      console.log("Error completing task:", e)
    }
  }

  // Filter tasks by week if needed
  const filteredTasks = tasks.filter((task) => {
    if (selectedWeek === "all" || !selectedWeek) return true
    return task.week === selectedWeek.toString()
  })

  // Group tasks that have a folder name
  const folderGroups = filteredTasks.reduce((groups, task) => {
    if (task.folder) {
      if (!groups[task.folder]) {
        groups[task.folder] = []
      }
      groups[task.folder].push(task)
    }
    return groups
  }, {})

  // Tasks without a folder
  const individualTasks = filteredTasks.filter((task) => !task.folder)

  // For non-folder tasks
  const assignedTasks = individualTasks.filter((task) => !task.completed && !task.overdue)
  const overdueTasks = individualTasks.filter((task) => task.overdue)
  const completedTasks = individualTasks.filter((task) => task.completed)

  // Process folders by status
  const foldersByStatus = {
    assigned: [],
    overdue: [],
    completed: [],
  }

  Object.entries(folderGroups).forEach(([folderName, tasksInFolder]) => {
    const status = getFolderStatus(tasksInFolder)
    foldersByStatus[status].push({ folderName, tasks: tasksInFolder, status })
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Your Tasks</h1>
          <Select value={selectedWeek} onValueChange={setSelectedWeek}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by Week" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Weeks</SelectItem>
              {[1, 2, 3, 4, 5].map((week) => (
                <SelectItem key={week} value={week.toString()}>
                  Week {week}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center">
            <Skeleton className="h-10 w-full" />
          </div>
        ) : error ? (
          <div className="text-red-500">{error}</div>
        ) : (
          <div className="grid gap-8 md:grid-cols-3">
            {/* Assigned Column */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Assigned</h2>
                <span className="text-sm text-gray-500">
                  {assignedTasks.length + foldersByStatus.assigned.length} items
                </span>
              </div>
              <div className="space-y-4">
                {/* Render assigned folders */}
                {foldersByStatus.assigned.map(({ folderName, tasks, status }) => (
                  <FolderCard
                    key={folderName}
                    folderName={folderName}
                    tasks={tasks}
                    onComplete={handleComplete}
                    status={status}
                  />
                ))}

                {/* Render assigned individual tasks */}
                {assignedTasks.map((task) => (
                  <TaskCard key={task.id} task={{ ...task, status: "assigned" }} onComplete={handleComplete} />
                ))}

                {assignedTasks.length === 0 && foldersByStatus.assigned.length === 0 && (
                  <div className="rounded-lg border border-dashed p-8 text-center">
                    <p className="text-sm text-muted-foreground">No assigned items</p>
                  </div>
                )}
              </div>
            </div>

            {/* Overdue Column */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Overdue</h2>
                <span className="text-sm text-gray-500">
                  {overdueTasks.length + foldersByStatus.overdue.length} items
                </span>
              </div>
              <div className="space-y-4">
                {/* Render overdue folders */}
                {foldersByStatus.overdue.map(({ folderName, tasks, status }) => (
                  <FolderCard
                    key={folderName}
                    folderName={folderName}
                    tasks={tasks}
                    onComplete={handleComplete}
                    status={status}
                  />
                ))}

                {/* Render overdue individual tasks */}
                {overdueTasks.map((task) => (
                  <TaskCard key={task.id} task={{ ...task, status: "overdue" }} onComplete={handleComplete} />
                ))}

                {overdueTasks.length === 0 && foldersByStatus.overdue.length === 0 && (
                  <div className="rounded-lg border border-dashed p-8 text-center">
                    <p className="text-sm text-muted-foreground">No overdue items</p>
                  </div>
                )}
              </div>
            </div>

            {/* Completed Column */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Completed</h2>
                <span className="text-sm text-gray-500">
                  {completedTasks.length + foldersByStatus.completed.length} items
                </span>
              </div>
              <div className="space-y-4">
                {/* Render completed folders */}
                {foldersByStatus.completed.map(({ folderName, tasks, status }) => (
                  <FolderCard
                    key={folderName}
                    folderName={folderName}
                    tasks={tasks}
                    onComplete={handleComplete}
                    status={status}
                  />
                ))}

                {/* Render completed individual tasks */}
                {completedTasks.map((task) => (
                  <TaskCard key={task.id} task={{ ...task, status: "completed" }} onComplete={handleComplete} />
                ))}

                {completedTasks.length === 0 && foldersByStatus.completed.length === 0 && (
                  <div className="rounded-lg border border-dashed p-8 text-center">
                    <p className="text-sm text-muted-foreground">No completed items</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

// Helper component for individual task cards
function TaskCard({ task, onComplete }) {
  const [isCompleting, setIsCompleting] = useState(false)

  const statusColors = {
    assigned: "bg-blue-50 text-blue-700 border-blue-200",
    overdue: "bg-red-50 text-red-700 border-red-200",
    completed: "bg-green-50 text-green-700 border-green-200",
  }

  const statusIcons = {
    assigned: <Clock className="h-4 w-4" />,
    overdue: <Clock className="h-4 w-4" />,
    completed: <Check className="h-4 w-4" />,
  }

  const handleCompleteClick = async () => {
    setIsCompleting(true)
    try {
      await onComplete(task.id)
    } finally {
      setIsCompleting(false)
    }
  }

  return (
    <Card className="group relative overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="p-4">
        <div className="flex items-start justify-between space-x-4">
          <Badge variant="outline" className={statusColors[task.status]}>
            <span className="flex items-center gap-1">
              {statusIcons[task.status]}
              {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
            </span>
          </Badge>
          {task.week && (
            <Badge variant="outline" className="text-gray-600">
              Week {task.week}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <h3 className="font-medium">{task.title}</h3>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <div className="flex items-center justify-between w-full">
          {task.resourceUrl ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-blue-600 hover:text-blue-700"
              onClick={() => window.open(task.resourceUrl, "_blank", "noopener,noreferrer")}
              title={task.resourceUrl}
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              View Resource
            </Button>
          ) : (
            <Button variant="ghost" size="sm" className="text-gray-400 cursor-not-allowed" disabled>
              <ExternalLink className="h-4 w-4 mr-1" />
              No Resource
            </Button>
          )}
          {task.status !== "completed" && (
            <Button size="sm" onClick={handleCompleteClick} variant="outline" disabled={isCompleting}>
              {isCompleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Completing...
                </>
              ) : (
                "Complete"
              )}
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}

