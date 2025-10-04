"use client"

import { useState, useEffect, useMemo } from "react"
// Assuming these paths are correct in your project. Adjust if necessary.
import { TaskCard } from "@components/TaskCard"
import FolderCard from "@components/FolderCard"
import { ProfileActions } from "@components/ProfileActions"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@components/ui/select"
import { Skeleton } from "@components/ui/skeleton"
import { Badge } from "@components/ui/badge"
import { Button } from "@components/ui/button"
import { Input } from "@components/ui/input"
import { Card, CardContent, CardTitle } from "@components/ui/card"
import {
  Clock,
  CheckCircle,
  AlertCircle,
  Search,
  LayoutDashboard,
  ListFilter,
  SlidersHorizontal,
  X,
  Star,
  Flag,
} from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@components/ui/popover"
import { Tabs, TabsList, TabsTrigger } from "@components/ui/tabs"
import { Label } from "@components/ui/label"
import { toast } from "sonner"
import { AnimatePresence, motion } from "framer-motion"

function getFolderStatus(subtasks) {
  const hasOverdue = subtasks.some((t) => t.overdue)
  const hasAssigned = subtasks.some((t) => !t.completed && !t.overdue)
  if (hasOverdue) return "overdue"
  if (hasAssigned) return "assigned"
  return "completed"
}

const TaskList = ({ tasks, onComplete, disableActions }) => {
  return (
    <div className="divide-y divide-border">
      <AnimatePresence initial={false}>
        {tasks.map((task) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <TaskCard task={task} onComplete={onComplete} disableActions={disableActions} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export default function DashboardPage() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeView, setActiveView] = useState("kanban")
  const [section, setSection] = useState("active") // active | completed
  const [globalPaused, setGlobalPaused] = useState({ isPaused: false, pausedUntil: null })

  const [filters, setFilters] = useState({
    status: "all",
    week: "all",
    type: "all",
    urgency: "all",
  })

  const getActiveFiltersCount = () => {
    return Object.values(filters).filter((value) => value !== "all").length
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch tasks and quizzes in parallel
        const [tasksResponse, quizzesResponse] = await Promise.all([
          fetch("/api/get-tasks"),
          fetch("/api/user/quizzes")
        ]);
  
        const tasksFromBackend = tasksResponse.ok ? await tasksResponse.json() : [];
        console.log("get-tasks payload:", tasksFromBackend);
        const quizzesData = quizzesResponse.ok ? await quizzesResponse.json() : [];
  
        console.log("Raw tasks from backend:", tasksFromBackend);
        console.log("Raw quizzes from API:", quizzesData);
  
        const quizLogIds = new Set(quizzesData.map(q => q.logId));

        // Process quiz data from API endpoint (primary source)
        const apiQuizTasks = quizzesData.map((quiz) => {
          return {
            id: `quiz-${quiz.quizId || quiz.logId}`,
            title: quiz.title,
            description: quiz.description,
            completed: quiz.completed,
            overdue: quiz.overdue || false,
            resourceUrl: quiz.resourceUrl,
            lastStatusChange: quiz.lastStatusChange,
            completedTime: quiz.completedTime || quiz.completed_time || quiz.lastStatusChange || null,
            week: quiz.week,
            folder: null, // Quizzes don't need folders in the UI
            isQuiz: true,
            quizId: quiz.quizId,
            score: quiz.score,
            passed: quiz.passed,
            originalLogId: quiz.logId,
            status: quiz.status,
            type: "Quiz"
          }
        })
  
        console.log("=== Quiz Processing Results ===")
        console.log("API quiz tasks:", apiQuizTasks.length)
        console.log("Total quiz tasks:", apiQuizTasks.length)
  
        // Remove quiz tasks from regular tasks to prevent duplication
        const regularTasks = tasksFromBackend
          .filter(task => !quizLogIds.has(task.id))
          .map(task => ({
            id: task.id,
            title: Array.isArray(task.title) ? task.title[0] : task.title,
            description: task.description || "",
            completed: task.completed,
            overdue: task.overdue,
            // No per-task completion toggle. We rely on globalPaused only.
            resourceUrl: Array.isArray(task.resourceUrl) ? task.resourceUrl[0] : task.resourceUrl,
            lastStatusChange: task.lastStatusChange,
            completedTime: task.completedTime || task.completed_time || task.completedDate || task.completed_date || task.lastStatusChange || null,
            week: task.week,
            folder: Array.isArray(task.folder) ? task.folder[0] : task.folder,
            isQuiz: false
          }))
  
        console.log("Regular tasks after quiz filtering:", regularTasks.length)
  
        // Combine all tasks
        const allTasks = [...regularTasks, ...apiQuizTasks];

        // Determine global paused state from API
        const isPaused = Array.isArray(tasksFromBackend) && tasksFromBackend.some(t => t.paused)
        const pausedUntil = Array.isArray(tasksFromBackend)
          ? (tasksFromBackend.find(t => t.paused && t.pausedUntil)?.pausedUntil || null)
          : null
        console.log("derived isPaused:", isPaused, "pausedUntil:", pausedUntil)

        setTasks(allTasks);
        setGlobalPaused({ isPaused, pausedUntil });

        // Show paused message once if applicant is paused
        if (isPaused) {
          const dateText = pausedUntil ? new Date(pausedUntil).toLocaleString() : null
          toast.info(
            dateText
              ? `Your onboarding is paused until ${dateText}. You can still view tasks, but completion is disabled.`
              : `Your onboarding is paused. You can still view tasks, but completion is disabled.`
          )
        }
  
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to load tasks. Please try again.");
      } finally {
        setLoading(false);
      }
    };
  
    fetchData();
  }, []);

  const handleComplete = async (taskId) => {
    // Global hard stop: if onboarding is paused, never attempt completion
    if (globalPaused.isPaused) {
      const dateText = globalPaused.pausedUntil ? new Date(globalPaused.pausedUntil).toLocaleString() : null
      toast.info(
        dateText
          ? `Your onboarding is paused until ${dateText}. Task completion is disabled.`
          : `Your onboarding is paused. Task completion is disabled.`
      )
      return;
    }
    const taskToComplete = tasks.find(t => t.id === taskId);
    if (taskToComplete && taskToComplete.isQuiz) {
      console.warn("Attempted to complete a quiz task via handleComplete. This is not allowed.");
      return;
    }
    
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
      console.error("Error completing task:", e.message)
    }
  }

  const resetFilters = () => {
    setFilters({
      status: "all",
      week: "all",
      type: "all",
      urgency: "all",
    })
    setSearchQuery("")
  }

  const filteredTasks = useMemo(
    () =>
      tasks.filter((task) => {
        const matchesSearch =
          searchQuery === "" ||
          task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()))

        let matchesStatus = true
        if (filters.status !== "all") {
          const taskStatus = task.completed ? "completed" : task.overdue ? "overdue" : "assigned"
          matchesStatus = taskStatus === filters.status
        }

        const matchesWeek = filters.week === "all" || String(task.week) === filters.week

        const matchesType =
          filters.type === "all" ||
          (filters.type === "custom" && task.isCustom) ||
          (filters.type === "standard" && !task.isCustom)

        const matchesUrgency =
          filters.urgency === "all" ||
          (filters.urgency === "no urgency"
            ? !task.urgency
            : task.urgency && task.urgency.toLowerCase() === filters.urgency.toLowerCase())

        return matchesSearch && matchesStatus && matchesWeek && matchesType && matchesUrgency
      }),
    [tasks, searchQuery, filters],
  )

  const filteredQuizTasks = useMemo(() => filteredTasks.filter((task) => task.isQuiz), [filteredTasks])
  const filteredNormalTasks = useMemo(() => filteredTasks.filter((task) => !task.isQuiz), [filteredTasks])

  const { folderGroups, individualTasks } = useMemo(() => {
    const groups = {}
    const individuals = []
    filteredNormalTasks.forEach((task) => {
      if (task.folder) {
        if (!groups[task.folder]) {
          groups[task.folder] = []
        }
        groups[task.folder].push(task)
      } else {
        individuals.push(task)
      }
    })
    return { folderGroups: groups, individualTasks: individuals }
  }, [filteredNormalTasks])

  const assignedTasks = useMemo(
    () => individualTasks.filter((task) => !task.completed && !task.overdue),
    [individualTasks],
  )
  const overdueTasks = useMemo(() => individualTasks.filter((task) => task.overdue), [individualTasks])
  const completedTasks = useMemo(() => individualTasks.filter((task) => task.completed), [individualTasks])

  const assignedQuizTasks = useMemo(() => filteredQuizTasks.filter((task) => !task.completed), [filteredQuizTasks])
  const completedQuizTasks = useMemo(() => filteredQuizTasks.filter((task) => task.completed), [filteredQuizTasks])

  // Completed view list (independent of status filter): search/type/week/urgency are respected
  const completedViewTasks = useMemo(() => {
    const matchesOtherFilters = (task) => {
      const matchesSearch =
        searchQuery === "" ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesWeek = filters.week === "all" || String(task.week) === filters.week
      const matchesType =
        filters.type === "all" ||
        (filters.type === "custom" && task.isCustom) ||
        (filters.type === "standard" && !task.isCustom)
      const matchesUrgency =
        filters.urgency === "all" ||
        (filters.urgency === "no urgency" ? !task.urgency : task.urgency && task.urgency.toLowerCase() === filters.urgency.toLowerCase())
      return matchesSearch && matchesWeek && matchesType && matchesUrgency
    }
    const onlyCompleted = tasks.filter((t) => t.completed && matchesOtherFilters(t))
    return [...onlyCompleted].sort((a, b) => {
      const aTime = new Date(a.completedTime || a.lastStatusChange || 0).getTime()
      const bTime = new Date(b.completedTime || b.lastStatusChange || 0).getTime()
      return bTime - aTime
    })
  }, [tasks, filters.type, filters.week, filters.urgency, searchQuery])

  const foldersByStatus = useMemo(() => {
    const acc = {
      assigned: [],
      overdue: [],
      completed: [],
    }
    Object.entries(folderGroups).forEach(([folderName, tasksInFolder]) => {
      const status = getFolderStatus(tasksInFolder)
      acc[status].push({ folderName, tasks: tasksInFolder, status })
    })
    return acc
  }, [folderGroups])

  const totalTasks = tasks.length
  const completedTasksCount = tasks.filter((task) => task.completed).length
  const overdueTasksCount = tasks.filter((task) => task.overdue && !task.isQuiz).length
  const assignedTasksCount = tasks.filter((task) => !task.completed && !task.overdue).length
  const completionRate = totalTasks > 0 ? Math.round((completedTasksCount / totalTasks) * 100) : 0

  const availableWeeks = useMemo(
    () => [...new Set(tasks.map((task) => task.week).filter(Boolean))].sort((a, b) => Number(a) - Number(b)),
    [tasks],
  )

  const customTasksCount = tasks.filter((task) => task.isCustom).length
  const standardTasksCount = tasks.length - customTasksCount

  const urgencyCounts = useMemo(() => {
    const counts = tasks.reduce((acc, task) => {
      if (task.urgency) {
        acc[task.urgency] = (acc[task.urgency] || 0) + 1
      }
      return acc
    }, {})
    const tasksWithoutUrgency = tasks.filter((task) => !task.urgency).length
    if (tasksWithoutUrgency > 0) {
      counts["No Urgency"] = tasksWithoutUrgency
    }
    return counts
  }, [tasks])

  const statusCounts = useMemo(
    () => ({
      all: tasks.length,
      assigned: assignedTasksCount,
      overdue: overdueTasksCount,
      completed: completedTasksCount,
    }),
    [tasks.length, assignedTasksCount, overdueTasksCount, completedTasksCount],
  )

  const switchSection = (nextSection) => {
    setSection(nextSection)
    setFilters((prev) => ({
      ...prev,
      status:
        nextSection === "completed" ? "completed" : prev.status === "completed" ? "all" : prev.status,
    }))
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        {/* ... rest of your JSX remains the same ... */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Task Dashboard</h1>
            <p className="text-muted-foreground">Manage and track your onboarding tasks</p>
          </div>
          <ProfileActions />
        </div>

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
                  <span className="text-2xl font-bold text-foreground">{assignedTasksCount}</span>
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

        <div className="mb-6 flex flex-col space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
              {section === "active" && (
                <Tabs
                  value={filters.status === "completed" ? "all" : filters.status}
                  onValueChange={(value) => setFilters({ ...filters, status: value })}
                  className="w-full md:w-auto"
                >
                  <TabsList className="grid grid-cols-3 w-full md:w-auto">
                    <TabsTrigger value="all" className="text-xs md:text-sm">
                      All{" "}
                      <Badge variant="secondary" className="ml-1 bg-muted">
                        {statusCounts.all}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="assigned" className="text-xs md:text-sm">
                      Assigned{" "}
                      <Badge variant="secondary" className="ml-1 bg-muted">
                        {statusCounts.assigned}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="overdue" className="text-xs md:text-sm">
                      Overdue{" "}
                      <Badge variant="secondary" className="ml-1 bg-muted">
                        {statusCounts.overdue}
                      </Badge>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              )}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 bg-card text-card-foreground">
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    Filters
                    {getActiveFiltersCount() > 0 && (
                      <Badge className="ml-1 bg-primary text-primary-foreground">{getActiveFiltersCount()}</Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] min-w-[320px]" align="end">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium leading-none">Task Filters</h4>
                      <p className="text-sm text-muted-foreground">Refine tasks by type, week, and urgency</p>
                    </div>
                    <div className="grid gap-2">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Type</Label>
                        <div className="col-span-3">
                          <Select
                            value={filters.type}
                            onValueChange={(value) => setFilters({ ...filters, type: value })}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent style={{ minWidth: "180px" }}>
                              <SelectItem value="all">All Types</SelectItem>
                              <SelectItem value="standard">Standard ({standardTasksCount})</SelectItem>
                              <SelectItem value="custom">Custom ({customTasksCount})</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Week</Label>
                        <div className="col-span-3">
                          <Select
                            value={filters.week}
                            onValueChange={(value) => setFilters({ ...filters, week: value })}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select week" />
                            </SelectTrigger>
                            <SelectContent style={{ minWidth: "180px" }}>
                              <SelectItem value="all">All Weeks</SelectItem>
                              {availableWeeks.map((week) => (
                                <SelectItem key={String(week)} value={String(week)}>
                                  Week {week}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Urgency</Label>
                        <div className="col-span-3">
                          <Select
                            value={filters.urgency}
                            onValueChange={(value) => setFilters({ ...filters, urgency: value })}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select urgency" />
                            </SelectTrigger>
                            <SelectContent style={{ minWidth: "180px" }}>
                              <SelectItem value="all">All Urgency</SelectItem>
                              {Object.entries(urgencyCounts).map(([urgency, count]) => (
                                <SelectItem key={urgency} value={urgency.toLowerCase()}>
                                  {urgency} ({count})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetFilters}
                      className="mt-2 bg-card text-card-foreground"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Reset Filters
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              <div className="flex items-center gap-2 ml-auto">
                <Button
                  variant={section === "active" ? "default" : "outline"}
                  size="sm"
                  onClick={() => switchSection("active")}
                  className="h-9"
                >
                  Active
                </Button>
                <Button
                  variant={section === "completed" ? "default" : "outline"}
                  size="sm"
                  onClick={() => switchSection("completed")}
                  className="h-9"
                >
                  Completed
                </Button>
                <Button
                  variant={activeView === "kanban" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveView("kanban")}
                  className="h-9"
                >
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  Kanban
                </Button>
                <Button
                  variant={activeView === "list" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveView("list")}
                  className="h-9"
                >
                  <ListFilter className="h-4 w-4 mr-2" />
                  List
                </Button>
              </div>
            </div>
          </div>

          {getActiveFiltersCount() > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {filters.status !== "all" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Status: {filters.status.charAt(0).toUpperCase() + filters.status.slice(1)}
                  <X
                    className="h-3 w-3 ml-1 cursor-pointer"
                    onClick={() => setFilters({ ...filters, status: "all" })}
                  />
                </Badge>
              )}
              {filters.type !== "all" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  {filters.type === "custom" ? <Star className="h-3 w-3 mr-1" /> : null}
                  Type: {filters.type.charAt(0).toUpperCase() + filters.type.slice(1)}
                  <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => setFilters({ ...filters, type: "all" })} />
                </Badge>
              )}
              {filters.week !== "all" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Week: {filters.week}
                  <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => setFilters({ ...filters, week: "all" })} />
                </Badge>
              )}
              {filters.urgency !== "all" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Flag className="h-3 w-3 mr-1" />
                  Urgency: {filters.urgency.charAt(0).toUpperCase() + filters.urgency.slice(1)}
                  <X
                    className="h-3 w-3 ml-1 cursor-pointer"
                    onClick={() => setFilters({ ...filters, urgency: "all" })}
                  />
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={resetFilters} className="h-7 px-2 text-xs">
                Clear all
              </Button>
            </div>
          )}
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
              <Button
                variant="outline"
                className="mt-4 bg-card text-card-foreground"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : filteredTasks.length === 0 ? (
          tasks.length === 0 ? (
            <div className="text-center py-12 border rounded-lg">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">No tasks assigned</h3>
              <p className="text-muted-foreground">No tasks has been assigned to you yet.</p>
            </div>
          ) : (
            <div className="text-center py-12 border rounded-lg">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">No tasks found</h3>
              <p className="text-muted-foreground mb-4">No tasks match your current filter criteria.</p>
              <Button onClick={resetFilters}>Reset Filters</Button>
            </div>
          )
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={`${section}-${activeView}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            {section === "active" && activeView === "kanban" ? (
              (filters.status === "assigned" || filters.status === "overdue") ? (
                // Single status selected → show only that column; items displayed in a 3xN grid
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={filters.status === "assigned" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800" : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800"}
                    >
                      {filters.status === "assigned" ? <Clock className="h-4 w-4 mr-1.5" /> : <AlertCircle className="h-4 w-4 mr-1.5" />}
                      {filters.status === "assigned" ? "Assigned" : "Overdue"}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {filters.status === "assigned"
                        ? (assignedQuizTasks.length + foldersByStatus.assigned.length + assignedTasks.length)
                        : (foldersByStatus.overdue.length + overdueTasks.length)} items
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {filters.status === "assigned" ? (
                      <>
                        {assignedQuizTasks.map((task) => (
                          <TaskCard key={task.id} task={{ ...task, status: "assigned" }} onComplete={handleComplete} disableActions={globalPaused.isPaused} />
                        ))}
                        {foldersByStatus.assigned.map(({ folderName, tasks: tasksInFolder, status }) => (
                          <FolderCard
                            key={folderName}
                            folderName={folderName}
                            tasks={tasksInFolder}
                            onComplete={handleComplete}
                            status={status}
                            disableActions={globalPaused.isPaused}
                          />
                        ))}
                        {assignedTasks.map((task) => (
                          <TaskCard key={task.id} task={{ ...task, status: "assigned" }} onComplete={handleComplete} disableActions={globalPaused.isPaused} />
                        ))}
                        {(assignedTasks.length === 0 && foldersByStatus.assigned.length === 0 && assignedQuizTasks.length === 0) && (
                          <div className="rounded-lg border border-dashed p-8 text-center col-span-full">
                            <p className="text-sm text-muted-foreground">No assigned items</p>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {foldersByStatus.overdue.map(({ folderName, tasks: tasksInFolder, status }) => (
                          <FolderCard
                            key={folderName}
                            folderName={folderName}
                            tasks={tasksInFolder}
                            onComplete={handleComplete}
                            status={status}
                            disableActions={globalPaused.isPaused}
                          />
                        ))}
                        {overdueTasks.map((task) => (
                          <TaskCard key={task.id} task={{ ...task, status: "overdue" }} onComplete={handleComplete} disableActions={globalPaused.isPaused} />
                        ))}
                        {(overdueTasks.length === 0 && foldersByStatus.overdue.length === 0) && (
                          <div className="rounded-lg border border-dashed p-8 text-center col-span-full">
                            <p className="text-sm text-muted-foreground">No overdue items</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ) : (
                // All → show both columns side-by-side
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                        {assignedQuizTasks.length + foldersByStatus.assigned.length + assignedTasks.length} items
                      </span>
                    </div>
                    <div className="space-y-4">
                      {assignedQuizTasks.map((task) => (
                        <TaskCard key={task.id} task={{ ...task, status: "assigned" }} onComplete={handleComplete} disableActions={globalPaused.isPaused} />
                      ))}
                      {foldersByStatus.assigned.map(({ folderName, tasks: tasksInFolder, status }) => (
                        <FolderCard
                          key={folderName}
                          folderName={folderName}
                          tasks={tasksInFolder}
                          onComplete={handleComplete}
                          status={status}
                          disableActions={globalPaused.isPaused}
                        />
                      ))}
                      {assignedTasks.map((task) => (
                        <TaskCard key={task.id} task={{ ...task, status: "assigned" }} onComplete={handleComplete} disableActions={globalPaused.isPaused} />
                      ))}
                      {assignedTasks.length === 0 &&
                        foldersByStatus.assigned.length === 0 &&
                        assignedQuizTasks.length === 0 && (
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
                        {foldersByStatus.overdue.length + overdueTasks.length} items
                      </span>
                    </div>
                    <div className="space-y-4">
                      {foldersByStatus.overdue.map(({ folderName, tasks: tasksInFolder, status }) => (
                        <FolderCard
                          key={folderName}
                          folderName={folderName}
                          tasks={tasksInFolder}
                          onComplete={handleComplete}
                          status={status}
                          disableActions={globalPaused.isPaused}
                        />
                      ))}
                      {overdueTasks.map((task) => (
                        <TaskCard key={task.id} task={{ ...task, status: "overdue" }} onComplete={handleComplete} disableActions={globalPaused.isPaused} />
                      ))}
                      {overdueTasks.length === 0 && foldersByStatus.overdue.length === 0 && (
                        <div className="rounded-lg border border-dashed p-8 text-center">
                          <p className="text-sm text-muted-foreground">No overdue items</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            ) : section === "active" && activeView === "list" ? (
              <TaskList tasks={[...filteredQuizTasks.filter(t=>!t.completed), ...filteredNormalTasks.filter(t=>!t.completed && !t.overdue), ...filteredNormalTasks.filter(t=>t.overdue)]} onComplete={handleComplete} disableActions={globalPaused.isPaused} />
            ) : (
              // Completed Section - 3xN grid sorted by completedTime
              <>
                <div className="flex items-center gap-2 mb-4">
                  <Badge
                    variant="outline"
                    className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"
                  >
                    <CheckCircle className="h-4 w-4 mr-1.5" />
                    Completed
                  </Badge>
                  <span className="text-sm text-muted-foreground">{completedViewTasks.length} items</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <AnimatePresence initial={false}>
                    {completedViewTasks.length > 0 ? (
                      completedViewTasks.map((t) => (
                        <motion.div
                          key={t.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.2 }}
                        >
                          <TaskCard
                            task={{ ...t, status: "completed" }}
                            onComplete={handleComplete}
                            disableActions={globalPaused.isPaused}
                          />
                        </motion.div>
                      ))
                    ) : (
                      <div className="rounded-lg border border-dashed p-8 text-center col-span-full">
                        <p className="text-sm text-muted-foreground">No completed items</p>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>
    </div>
  )
}
