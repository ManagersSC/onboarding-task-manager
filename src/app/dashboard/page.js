"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
// Assuming these paths are correct in your project. Adjust if necessary.
import { TaskCard } from "@components/TaskCard"
import FolderCard from "@components/FolderCard"
import { UserFileViewerModal } from "@components/dashboard/UserFileViewerModal"
import { ProfileActions } from "@components/ProfileActions"
import UserDashboardTourClient from "@components/onboarding/UserDashboardTourClient"
import { useTour } from "@components/onboarding/TourProvider"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@components/ui/select"
import { Skeleton } from "@components/ui/skeleton"
import { Badge } from "@components/ui/badge"
import { Button } from "@components/ui/button"
import { Input } from "@components/ui/input"
import { Card, CardContent, CardTitle } from "@components/ui/card"
import { Checkbox } from "@components/ui/checkbox"
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
  Loader2,
  RefreshCw,
  CircleHelp,
} from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@components/ui/popover"
import { Tabs, TabsList, TabsTrigger } from "@components/ui/tabs"
import { Label } from "@components/ui/label"
import { toast } from "sonner"
import { AnimatePresence, motion } from "framer-motion"
import { staggerContainer, fadeInUp } from "@components/lib/utils"
import { AnimatedCounterSimple } from "@components/ui/animated-counter"
import { ProgressRing } from "@components/ui/animated-counter"

function getFolderStatus(subtasks) {
  const hasOverdue = subtasks.some((t) => t.overdue)
  const hasAssigned = subtasks.some((t) => !t.completed && !t.overdue)
  if (hasOverdue) return "overdue"
  if (hasAssigned) return "assigned"
  return "completed"
}

// Coerce any value into a safe, searchable string
function toSearchableString(value) {
  if (typeof value === "string") return value
  if (Array.isArray(value)) return value.filter(Boolean).join(" ")
  if (value === null || value === undefined) return ""
  try {
    return String(value)
  } catch {
    return ""
  }
}

const TaskList = ({ tasks, onComplete, onOpenFiles, disableActions }) => {
  return (
    <div className="divide-y divide-border">
      <AnimatePresence>
        {tasks.map((task, i) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2, delay: i * 0.04 }}
            layout
          >
            <TaskCard task={task} onComplete={onComplete} onOpenFiles={onOpenFiles} disableActions={disableActions} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

// HelpControls component - defined outside DashboardPage to prevent recreation on every render
function HelpControls() {
  const { start } = useTour();
  const [autoShow, setAutoShow] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/user/intro-tooltip", { cache: "no-store" });
        const d = res.ok ? await res.json() : {};
        // introTooltip true => tour already completed => do NOT auto show
        if (!cancelled) setAutoShow(!Boolean(d?.introTooltip));
      } catch {}
    })();
    return () => { cancelled = true };
  }, []);

  const onToggle = async (checked) => {
    setAutoShow(checked);
    try {
      // store inverse: autoShow=true means not completed
      await fetch("/api/user/intro-tooltip", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ introTooltip: !checked })
      });
    } catch {}
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Help" data-tour="user.help">
          <CircleHelp className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Show tips automatically</div>
            <Checkbox checked={autoShow} onCheckedChange={onToggle} aria-label="Show tips automatically" />
          </div>
          <Button size="sm" className="w-full" onClick={() => start()}>Start tour</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function DashboardPage() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeView, setActiveView] = useState("kanban")
  const [section, setSection] = useState("active") // active | completed
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [globalPaused, setGlobalPaused] = useState({ isPaused: false, pausedUntil: null })

  // File viewer modal state
  const [fileViewerOpen, setFileViewerOpen] = useState(false)
  const [fileViewerTaskId, setFileViewerTaskId] = useState(null)
  const [fileViewerTaskTitle, setFileViewerTaskTitle] = useState(null)

  const handleOpenFiles = useCallback((taskId, taskTitle) => {
    setFileViewerTaskId(taskId)
    setFileViewerTaskTitle(taskTitle)
    setFileViewerOpen(true)
  }, [])

  const [filters, setFilters] = useState({
    status: "all",
    week: "all",
    type: "all",
    urgency: "all",
  })

  // --- PERSISTENCE: hydrate from localStorage on first mount ---
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("dashboard_prefs") || "{}")
      if (saved.section === "active" || saved.section === "completed") {
        setSection(saved.section)
      }
      if (saved.activeView === "kanban" || saved.activeView === "list") {
        setActiveView(saved.activeView)
      }
      if (saved.searchQuery && typeof saved.searchQuery === "string") {
        setSearchQuery(saved.searchQuery)
      }
      if (saved.filters && typeof saved.filters === "object") {
        setFilters((prev) => ({ ...prev, ...saved.filters }))
      }
    } catch {}
  }, [])

  // Save preferences whenever they change
  useEffect(() => {
    const prefs = {
      section,
      activeView,
      searchQuery,
      filters,
    }
    try {
      localStorage.setItem("dashboard_prefs", JSON.stringify(prefs))
    } catch {}
  }, [section, activeView, searchQuery, filters])

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
          // Completed takes precedence — if quiz was submitted, it's not overdue
          const isCompleted = Boolean(quiz.completed)
          return {
            id: `quiz-${quiz.quizId || quiz.logId}`,
            title: toSearchableString(quiz.title),
            description: toSearchableString(quiz.description),
            completed: isCompleted,
            overdue: isCompleted ? false : (quiz.overdue || false),
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
            title: toSearchableString(Array.isArray(task.title) ? task.title : task.title),
            description: toSearchableString(task.description),
            completed: task.completed,
            overdue: task.overdue,
            // No per-task completion toggle. We rely on globalPaused only.
            resourceUrl: Array.isArray(task.resourceUrl) ? task.resourceUrl[0] : task.resourceUrl,
            lastStatusChange: task.lastStatusChange,
            completedTime: task.completedTime || task.completed_time || task.completedDate || task.completed_date || task.lastStatusChange || null,
            // Try multiple possible API field names for due/overdue date
            dueDate:
              task.dueDate ||
              task.due_date ||
              task.overdueDate ||
              task.overdue_date ||
              task.overdueUntil ||
              task.overdue_until ||
              null,
            week: task.week,
            folder: Array.isArray(task.folder) ? task.folder[0] : task.folder,
            isQuiz: false,
            attachmentCount: task.attachmentCount || 0,
            hasDocuments: task.hasDocuments || false,
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

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      // Re-fetch tasks and quizzes in parallel
      const [tasksResponse, quizzesResponse] = await Promise.all([
        fetch("/api/get-tasks"),
        fetch("/api/user/quizzes"),
      ])

      const tasksFromBackend = tasksResponse.ok ? await tasksResponse.json() : []
      const quizzesData = quizzesResponse.ok ? await quizzesResponse.json() : []

      const quizLogIds = new Set(quizzesData.map((q) => q.logId))

      const apiQuizTasks = quizzesData.map((quiz) => {
        const isCompleted = Boolean(quiz.completed)
        return {
          id: `quiz-${quiz.quizId || quiz.logId}`,
          title: quiz.title,
          description: quiz.description,
          completed: isCompleted,
          overdue: isCompleted ? false : (quiz.overdue || false),
          resourceUrl: quiz.resourceUrl,
          lastStatusChange: quiz.lastStatusChange,
          completedTime: quiz.completedTime || quiz.completed_time || quiz.lastStatusChange || null,
          week: quiz.week,
          folder: null,
          isQuiz: true,
          quizId: quiz.quizId,
          score: quiz.score,
          passed: quiz.passed,
          originalLogId: quiz.logId,
          status: quiz.status,
          type: "Quiz",
        }
      })

      const regularTasks = tasksFromBackend
        .filter((task) => !quizLogIds.has(task.id))
        .map((task) => ({
          id: task.id,
          title: Array.isArray(task.title) ? task.title[0] : task.title,
          description: task.description || "",
          completed: task.completed,
          overdue: task.overdue,
          resourceUrl: Array.isArray(task.resourceUrl) ? task.resourceUrl[0] : task.resourceUrl,
          lastStatusChange: task.lastStatusChange,
          completedTime:
            task.completedTime ||
            task.completed_time ||
            task.completedDate ||
            task.completed_date ||
            task.lastStatusChange ||
            null,
          dueDate:
            task.dueDate ||
            task.due_date ||
            task.overdueDate ||
            task.overdue_date ||
            task.overdueUntil ||
            task.overdue_until ||
            null,
          week: task.week,
          folder: Array.isArray(task.folder) ? task.folder[0] : task.folder,
          isQuiz: false,
          attachmentCount: task.attachmentCount || 0,
          hasDocuments: task.hasDocuments || false,
        }))

      const allTasks = [...regularTasks, ...apiQuizTasks]

      const isPaused = Array.isArray(tasksFromBackend) && tasksFromBackend.some((t) => t.paused)
      const pausedUntil = Array.isArray(tasksFromBackend)
        ? tasksFromBackend.find((t) => t.paused && t.pausedUntil)?.pausedUntil || null
        : null

      setTasks(allTasks)
      setGlobalPaused({ isPaused, pausedUntil })
    } catch (e) {
      console.error("Error refreshing data:", e)
      setError("Failed to refresh tasks. Please try again.")
    } finally {
      setIsRefreshing(false)
    }
  }

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
    try {
      const saved = JSON.parse(localStorage.getItem("dashboard_prefs") || "{}")
      localStorage.setItem(
        "dashboard_prefs",
        JSON.stringify({ ...saved, filters: { status: "all", week: "all", type: "all", urgency: "all" }, searchQuery: "" })
      )
    } catch {}
  }

  const filteredTasks = useMemo(
    () =>
      tasks.filter((task) => {
        const query = searchQuery.toLowerCase()
        const titleText = toSearchableString(task.title).toLowerCase()
        const descText = toSearchableString(task.description).toLowerCase()
        const matchesSearch =
          searchQuery === "" ||
          titleText.includes(query) ||
          descText.includes(query)

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
      const query = searchQuery.toLowerCase()
      const titleText = toSearchableString(task.title).toLowerCase()
      const descText = toSearchableString(task.description).toLowerCase()
      const matchesSearch =
        searchQuery === "" ||
        titleText.includes(query) ||
        descText.includes(query)

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
  // Overdue Tasks = tasks in the "Overdue" stage (includes all task types)
  const overdueTasksCount = tasks.filter((task) => task.overdue).length
  // Pending Tasks = tasks in the "Assigned" stage (not completed and not overdue)
  const assignedTasksCount = tasks.filter((task) => !task.completed && !task.overdue).length
  // Completion Rate = (completed tasks / total tasks assigned) * 100
  const completionRate = totalTasks > 0 ? Math.round((completedTasksCount / totalTasks) * 100) : 0

  const availableWeeks = useMemo(
    () => {
      const weekStrings = tasks
        .map((task) => (task.week !== undefined && task.week !== null ? String(task.week) : null))
        .filter(Boolean)
      const uniqueWeeks = [...new Set(weekStrings)]
      return uniqueWeeks.sort((a, b) => Number(a) - Number(b))
    },
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
    <UserDashboardTourClient>
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        {/* ... rest of your JSX remains the same ... */}
        <div className="mb-8 flex justify-between items-center animate-fade-in-up">
          <div data-tour="user.header">
            <h1 className="text-3xl font-bold tracking-tight text-foreground mb-1">Task Dashboard</h1>
            <p className="text-muted-foreground">Manage and track your onboarding tasks</p>
          </div>
          <div className="flex items-center gap-2">
            <HelpControls />
            <ProfileActions />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8" data-tour="user.metrics">
          <Card className="border-border/60 bg-gradient-to-br from-success/5 to-transparent animate-fade-in-up">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Completion Rate</p>
                <div className="flex items-baseline gap-1">
                  <AnimatedCounterSimple value={completionRate} className="text-2xl font-bold text-foreground" />
                  <span className="text-2xl font-bold text-foreground">%</span>
                  <span className="text-sm text-muted-foreground ml-1">of tasks</span>
                </div>
              </div>
              <ProgressRing value={completionRate} size={48} strokeWidth={4} />
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-gradient-to-br from-info/5 to-transparent animate-fade-in-up stagger-2">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Pending Tasks</p>
                <div className="flex items-baseline gap-1">
                  <AnimatedCounterSimple value={assignedTasksCount} className="text-2xl font-bold text-foreground" />
                  <span className="text-sm text-muted-foreground ml-1">assigned</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-info/15 to-info/5 flex items-center justify-center">
                <Clock className="h-6 w-6 text-info" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-gradient-to-br from-error/5 to-transparent animate-fade-in-up stagger-3">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Overdue Tasks</p>
                <div className="flex items-baseline gap-1">
                  <AnimatedCounterSimple value={overdueTasksCount} className="text-2xl font-bold text-foreground" />
                  <span className="text-sm text-muted-foreground ml-1">need attention</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-error/15 to-error/5 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-error" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6 flex flex-col space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="group relative w-full md:w-80 focus-within:md:w-96 transition-all duration-base" data-tour="user.search">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors duration-base" />
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
                  data-tour="user.statusTabs"
                  value={filters.status === "completed" ? "all" : filters.status}
                  onValueChange={(value) => setFilters({ ...filters, status: value })}
                  className="w-full md:w-auto"
                >
                  <TabsList className="grid grid-cols-3 w-full md:w-auto rounded-xl gap-1 bg-muted/50 p-1">
                    <TabsTrigger value="all" className="text-xs md:text-sm rounded-lg transition-all duration-base">
                      All{" "}
                      <Badge variant="secondary" className="ml-1 text-[10px] h-5 px-1.5">
                        {statusCounts.all}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="assigned" className="text-xs md:text-sm rounded-lg transition-all duration-base">
                      Assigned{" "}
                      <Badge variant="info" className="ml-1 text-[10px] h-5 px-1.5">
                        {statusCounts.assigned}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="overdue" className="text-xs md:text-sm rounded-lg transition-all duration-base">
                      Overdue{" "}
                      <Badge variant="error" className="ml-1 text-[10px] h-5 px-1.5">
                        {statusCounts.overdue}
                      </Badge>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              )}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 bg-card text-card-foreground" data-tour="user.filters">
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
                  variant="outline"
                  size="icon"
                  onClick={handleRefresh}
                  disabled={isRefreshing || loading}
                  aria-label="Refresh"
                  title="Refresh"
                  className="rounded-lg"
                >
                  {isRefreshing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
                <div className="flex rounded-lg bg-muted/50 p-0.5" data-tour="user.sectionToggle">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => switchSection("active")}
                    className={`h-8 rounded-md text-xs transition-all duration-base ${section === "active" ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    Active
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => switchSection("completed")}
                    className={`h-8 rounded-md text-xs transition-all duration-base ${section === "completed" ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    Completed
                  </Button>
                </div>
                <div className="flex rounded-lg bg-muted/50 p-0.5" data-tour="user.viewToggle">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveView("kanban")}
                    className={`h-8 rounded-md text-xs transition-all duration-base ${activeView === "kanban" ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <LayoutDashboard className="h-4 w-4 mr-1.5" />
                    Kanban
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveView("list")}
                    className={`h-8 rounded-md text-xs transition-all duration-base ${activeView === "list" ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <ListFilter className="h-4 w-4 mr-1.5" />
                    List
                  </Button>
                </div>
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
        ) : isRefreshing ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
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
            <div data-tour="user.taskCards">
            {section === "active" && activeView === "kanban" ? (
              (filters.status === "assigned" || filters.status === "overdue") ? (
                // Single status selected → show only that column; items displayed in a 3xN grid
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={filters.status === "assigned" ? "bg-info-muted text-info border-info/20" : "bg-error-muted text-error border-error/20"}
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
                          <TaskCard key={task.id} task={{ ...task, status: "assigned" }} onComplete={handleComplete} onOpenFiles={handleOpenFiles} disableActions={globalPaused.isPaused} />
                        ))}
                        {foldersByStatus.assigned.map(({ folderName, tasks: tasksInFolder, status }) => (
                          <FolderCard
                            key={folderName}
                            folderName={folderName}
                            tasks={tasksInFolder}
                            onComplete={handleComplete}
                            onOpenFiles={handleOpenFiles}
                            status={status}
                            disableActions={globalPaused.isPaused}
                          />
                        ))}
                        {assignedTasks.map((task) => (
                          <TaskCard key={task.id} task={{ ...task, status: "assigned" }} onComplete={handleComplete} onOpenFiles={handleOpenFiles} disableActions={globalPaused.isPaused} />
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
                            onOpenFiles={handleOpenFiles}
                            status={status}
                            disableActions={globalPaused.isPaused}
                          />
                        ))}
                        {overdueTasks.map((task) => (
                          <TaskCard key={task.id} task={{ ...task, status: "overdue" }} onComplete={handleComplete} onOpenFiles={handleOpenFiles} disableActions={globalPaused.isPaused} />
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
                        className="bg-info-muted text-info border-info/20"
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
                        <TaskCard key={task.id} task={{ ...task, status: "assigned" }} onComplete={handleComplete} onOpenFiles={handleOpenFiles} disableActions={globalPaused.isPaused} />
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
                        <TaskCard key={task.id} task={{ ...task, status: "assigned" }} onComplete={handleComplete} onOpenFiles={handleOpenFiles} disableActions={globalPaused.isPaused} />
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
                        className="bg-error-muted text-error border-error/20"
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
                        <TaskCard key={task.id} task={{ ...task, status: "overdue" }} onComplete={handleComplete} onOpenFiles={handleOpenFiles} disableActions={globalPaused.isPaused} />
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
              <TaskList tasks={[...filteredQuizTasks.filter(t=>!t.completed), ...filteredNormalTasks.filter(t=>!t.completed && !t.overdue), ...filteredNormalTasks.filter(t=>t.overdue)]} onComplete={handleComplete} onOpenFiles={handleOpenFiles} disableActions={globalPaused.isPaused} />
            ) : (
              // Completed Section - masonry layout sorted by completedTime
              <>
                <div className="flex items-center gap-2 mb-4">
                  <Badge
                    variant="outline"
                    className="bg-success-muted text-success border-success/20"
                  >
                    <CheckCircle className="h-4 w-4 mr-1.5" />
                    Completed
                  </Badge>
                  <span className="text-sm text-muted-foreground">{completedViewTasks.length} items</span>
                </div>
                <div className="[column-fill:_balance] columns-1 md:columns-2 lg:columns-3 gap-4">
                  <AnimatePresence initial={false}>
                    {completedViewTasks.length > 0 ? (
                      completedViewTasks.map((t, i) => (
                        <motion.div
                          key={t.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.2, delay: i * 0.03 }}
                          className="break-inside-avoid mb-4"
                        >
                          <TaskCard
                            task={{ ...t, status: "completed" }}
                            onComplete={handleComplete}
                            onOpenFiles={handleOpenFiles}
                            disableActions={globalPaused.isPaused}
                            compact={!t.description}
                          />
                        </motion.div>
                      ))
                    ) : (
                      <div className="rounded-lg border border-dashed p-8 text-center">
                        <p className="text-sm text-muted-foreground">No completed items</p>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            )}
            </div>
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* File Viewer Modal */}
      <UserFileViewerModal
        isOpen={fileViewerOpen}
        onClose={() => setFileViewerOpen(false)}
        taskId={fileViewerTaskId}
        taskTitle={fileViewerTaskTitle}
      />
    </div>
    </UserDashboardTourClient>
  )
}
