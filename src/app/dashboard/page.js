"use client"

import { useState, useEffect } from "react"
import { ProfileActions } from "@components/ProfileActions"
import { TaskCard } from "@components/TaskCard"
import FolderCard from "@components/FolderCard"
import TaskList from "@components/TaskList"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@components/ui/select"
import { Skeleton } from "@components/ui/skeleton"
import { Badge } from "@components/ui/badge"
import { Button } from "@components/ui/button"
import { Input } from "@components/ui/input"
import { Card, CardContent, CardTitle } from "@components/ui/card"
import { Clock, CheckCircle, AlertCircle, Search, LayoutDashboard, ListFilter } from "lucide-react"

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
  const [searchQuery, setSearchQuery] = useState("")
  const [activeView, setActiveView] = useState("kanban")

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
      console.error("Error completing task:", e)
    }
  }

  // Filter tasks by week and search query
  const filteredTasks = tasks.filter((task) => {
    const matchesWeek = selectedWeek === "" || selectedWeek === "all" || task.week === selectedWeek.toString()
    const matchesSearch =
      searchQuery === "" ||
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()))

    return matchesWeek && matchesSearch
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

  // Calculate summary statistics
  const totalTasks = tasks.length
  const completedTasksCount = tasks.filter((task) => task.completed).length
  const overdueTasksCount = tasks.filter((task) => task.overdue).length
  const completionRate = totalTasks > 0 ? Math.round((completedTasksCount / totalTasks) * 100) : 0

  // Get available weeks for filter
  const availableWeeks = [...new Set(tasks.map((task) => task.week).filter(Boolean))].sort((a, b) => a - b)

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        {/* Dashboard Header with Profile Actions*/}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Task Dashboard</h1>
            <p className="text-muted-foreground">Manage and track your onboarding tasks</p>
          </div>
          <ProfileActions />
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Completion Rate</p>
                <div className="flex items-baseline">
                  <span className="text-2xl font-bold text-foreground">{completionRate}%</span>
                  <span className="text-sm text-muted-foreground ml-2">of tasks</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Pending Tasks</p>
                <div className="flex items-baseline">
                  <span className="text-2xl font-bold text-foreground">
                    {assignedTasks.length + foldersByStatus.assigned.length}
                  </span>
                  <span className="text-sm text-muted-foreground ml-2">assigned</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Overdue Tasks</p>
                <div className="flex items-baseline">
                  <span className="text-2xl font-bold text-foreground">{overdueTasksCount}</span>
                  <span className="text-sm text-muted-foreground ml-2">need attention</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and View Toggle */}
        <div className="flex flex-col md:flex-row gap-4 mb-6 items-start md:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Select value={selectedWeek} onValueChange={setSelectedWeek}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Filter by Week" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Weeks</SelectItem>
                {availableWeeks.map((week) => (
                  <SelectItem key={week} value={week.toString()}>
                    Week {week}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Button
              variant={activeView === "kanban" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveView("kanban")}
              className="flex-1 md:flex-none"
            >
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Kanban
            </Button>
            <Button
              variant={activeView === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveView("list")}
              className="flex-1 md:flex-none"
            >
              <ListFilter className="h-4 w-4 mr-2" />
              List
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-[120px] w-full rounded-lg" />
                <Skeleton className="h-[120px] w-full rounded-lg" />
              </div>
            ))}
          </div>
        ) : error ? (
          <Card className="p-6 border-destructive/50 bg-destructive/10">
            <CardTitle className="text-destructive mb-2">Error Loading Tasks</CardTitle>
            <CardContent className="p-0">
              <p>{error}</p>
              <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {activeView === "kanban" ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Assigned Column */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                    >
                      <Clock className="h-4 w-4 mr-1.5" />
                      Assigned
                    </Badge>
                    <span className="text-sm text-muted-foreground">
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
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800"
                    >
                      <AlertCircle className="h-4 w-4 mr-1.5" />
                      Overdue
                    </Badge>
                    <span className="text-sm text-muted-foreground">
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
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"
                    >
                      <CheckCircle className="h-4 w-4 mr-1.5" />
                      Completed
                    </Badge>
                    <span className="text-sm text-muted-foreground">
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
            ) : (
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="mb-6 w-full md:w-auto">
                  <TabsTrigger value="all">All Tasks</TabsTrigger>
                  <TabsTrigger value="assigned">Assigned</TabsTrigger>
                  <TabsTrigger value="overdue">Overdue</TabsTrigger>
                  <TabsTrigger value="completed">Completed</TabsTrigger>
                </TabsList>

                <TabsContent value="all">
                  <TaskList
                    title="All Tasks"
                    tasks={[
                      ...assignedTasks.map((task) => ({ ...task, status: "assigned" })),
                      ...overdueTasks.map((task) => ({ ...task, status: "overdue" })),
                      ...completedTasks.map((task) => ({ ...task, status: "completed" })),
                    ]}
                    onComplete={handleComplete}
                  />
                </TabsContent>

                <TabsContent value="assigned">
                  <TaskList
                    title="Assigned Tasks"
                    tasks={assignedTasks.map((task) => ({ ...task, status: "assigned" }))}
                    onComplete={handleComplete}
                  />
                </TabsContent>

                <TabsContent value="overdue">
                  <TaskList
                    title="Overdue Tasks"
                    tasks={overdueTasks.map((task) => ({ ...task, status: "overdue" }))}
                    onComplete={handleComplete}
                  />
                </TabsContent>

                <TabsContent value="completed">
                  <TaskList
                    title="Completed Tasks"
                    tasks={completedTasks.map((task) => ({ ...task, status: "completed" }))}
                    onComplete={handleComplete}
                  />
                </TabsContent>
              </Tabs>
            )}
          </>
        )}
      </main>
    </div>
  )
}
