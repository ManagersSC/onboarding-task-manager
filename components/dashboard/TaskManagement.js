"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Pencil,
  Trash,
  X,
  CalendarIcon,
  RefreshCw,
  Flag,
  Zap,
  Timer,
  AlertTriangle,
  CheckCircle,
  MoreHorizontal,
  Eye,
  Search,
  TrendingUp,
  Users,
} from "lucide-react"
import { ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@components/ui/select"
import { Input } from "@components/ui/input"
import { Label } from "@components/ui/label"
import { Textarea } from "@components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs"
import { Button } from "@components/ui/button"
import { Badge } from "@components/ui/badge"
import { Save } from "lucide-react"
import { TaskManagementSkeleton } from "./skeletons/task-management-skeleton"
import { NewTaskModal } from "./subComponents/new-staff-task-modal"
import { toast } from "sonner"
import { Popover, PopoverContent, PopoverTrigger } from "@components/ui/popover"
import { CustomCalendar } from "@components/dashboard/subComponents/custom-calendar"
import { format, parse, isValid } from "date-fns"
import { Separator } from "@components/ui/separator"
import { Skeleton } from "@components/ui/skeleton"
import { Avatar, AvatarFallback } from "@components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@components/ui/tooltip"
import { Checkbox } from "@components/ui/checkbox"

// Enhanced priority colors with very high priority
const priorityColors = {
  "very high": "bg-red-500 text-white",
  high: "bg-orange-500 text-white",
  medium: "bg-yellow-500 text-white",
  low: "bg-green-500 text-white",
  "very low": "bg-blue-500 text-white",
}

// Status colors
const statusColors = {
  "in-progress": "bg-emerald-500 text-white",
  completed: "bg-blue-500 text-white",
  flagged: "bg-amber-500 text-white",
  overdue: "bg-red-500 text-white",
  today: "bg-emerald-500 text-white",
}

// Priority order
const priorityOrder = {
  "very high": 1,
  high: 2,
  medium: 3,
  low: 4,
  "very low": 5,
}

// Add this near the other utility functions
const formatDueDate = (rawDate) => {
  if (!rawDate) return "No due date"
  try {
    // Handle different date formats from Airtable
    const date = new Date(rawDate)
    if (isNaN(date.getTime())) return "Invalid date"
    return format(date, "MMM dd, yyyy")
  } catch (error) {
    console.log("Date formatting error:", error, "Raw date:", rawDate)
    return rawDate
  }
}

const priorityIcons = {
  "very high": Zap,
  high: AlertTriangle,
  medium: Timer,
  low: Clock,
  "very low": CheckCircle,
}

function getStatusGroup(status) {
  const normalizedStatus = (status || "").toLowerCase().trim()
  if (normalizedStatus === "today" || normalizedStatus === "in-progress") {
    return "upcoming"
  } else if (normalizedStatus === "overdue") {
    return "overdue"
  } else if (normalizedStatus === "flagged") {
    return "flagged"
  }
  return "upcoming"
}

const statusMap = {
  "in-progress": "In-progress",
  "completed": "Completed",
  "flagged": "Flagged",
  "overdue": " Overdue",
  "today": "In-progress",
}

// Shared normalization functions
const normalizeStatus = (status) => {
  if (!status) return ""
  const key = status.toLowerCase().replace(/\s+/g, "-")
  return statusMap[key] || status
}

const normalizeStaffId = (val, staff) => {
  if (!val) return ""
  if (staff.some((s) => s.id === val)) return val
  const found = staff.find((s) => s.name === val)
  return found ? found.id : val
}

const normalizeDueDate = (date) => {
  if (!date) return ""
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date
    return format(parse(date, "yyyy-MM-dd", new Date()), "yyyy-MM-dd")
  } catch {
    return date
  }
}

const normalizeTask = (task, staff) => {
  return {
    ...task,
    title: task.title || "",
    description: task.description || "",
    flaggedReason: task.flaggedReason || "",
    priority: task.priority || "",
    status: normalizeStatus(task.status),
    dueDate: normalizeDueDate(task.rawDueDate || task.dueDate),
    for: normalizeStaffId(task.for, staff),
  }
}

function isTaskChanged(original, edited, staff) {
  if (!original || !edited) return false

  const normalizedOriginal = normalizeTask(original, staff)
  const normalizedEdited = normalizeTask(edited, staff)

  const fields = ["title", "description", "flaggedReason", "priority", "status", "dueDate", "for"]

  for (const key of fields) {
    const origVal = (normalizedOriginal[key] ?? "").toString().trim()
    const editVal = (normalizedEdited[key] ?? "").toString().trim()
    if (origVal !== editVal) {
      console.log(`Field ${key} changed: "${origVal}" -> "${editVal}"`)
      return true
    }
  }
  return false
}

export function TaskManagement() {
  const [tasks, setTasks] = useState({ upcoming: [], overdue: [], flagged: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [newTaskModalOpen, setNewTaskModalOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState("John Doe")
  const [staff, setStaff] = useState([])
  const [viewMode, setViewMode] = useState("list") // list, grid, calendar
  const [searchQuery, setSearchQuery] = useState("")
  const lastTasksRef = useRef(null)
  const [selectedTask, setSelectedTask] = useState(null)
  const [showTaskDetails, setShowTaskDetails] = useState(false)
  const [showGroupsModal, setShowGroupsModal] = useState(false)
  const [selectedApplicantId, setSelectedApplicantId] = useState(null)
  const [groupSearch, setGroupSearch] = useState("")
  const [hireBannerSnoozeUntil, setHireBannerSnoozeUntil] = useState(0)
  const [isBannerHovered, setIsBannerHovered] = useState(false)
  const firstSeenMapRef = useRef({})

  const [deleteTaskDialogOpen, setDeleteTaskDialogOpen] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState(null)
  const undoTimeoutRef = useRef(null)

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [taskToEdit, setTaskToEdit] = useState(null)
  const [editedTask, setEditedTask] = useState(null)
  const [hasChanges, setHasChanges] = useState(false)

  // Appraisal modal state
  const [appraisalOpen, setAppraisalOpen] = useState(false)
  const [appraisalSaving, setAppraisalSaving] = useState(false)
  const [appraisalTaskId, setAppraisalTaskId] = useState(null)
  const [appraisalApplicantId, setAppraisalApplicantId] = useState(null)
  const [appraisalApplicantName, setAppraisalApplicantName] = useState("")
  const [appraisalApplicantEmail, setAppraisalApplicantEmail] = useState("")
  const [appraisalDate, setAppraisalDate] = useState("")
  const [appraisalStartTime, setAppraisalStartTime] = useState("")
  const [appraisalEndTime, setAppraisalEndTime] = useState("")
  const [appraisalConfirmOpen, setAppraisalConfirmOpen] = useState(false)
  const [appraisalCalMonth, setAppraisalCalMonth] = useState(() => new Date())
  const [appraisalEventsByDate, setAppraisalEventsByDate] = useState({})
  const [appraisalDayEvents, setAppraisalDayEvents] = useState([])
  const [appraisalHasConflict, setAppraisalHasConflict] = useState(false)

  const [claimingTaskId, setClaimingTaskId] = useState(null)
  const pendingTimersRef = useRef(new Map())

  // Helper: global task when no assigned staff
  function isGlobalTask(task) {
    return !task?.for || task.for === "" || (Array.isArray(task.for) && task.for.length === 0)
  }

  // Helper: hire completion task (auto-generated verification tied to an applicant)
  function isHireCompletionTask(task) {
    return Boolean(task?.applicantId)
  }

  // Special task: Monthly Reviews
  function isMonthlyReviewsTask(task) {
    const t = (task?.taskType || "").toLowerCase().trim()
    return t === "monthly reviews" || t === "monthly_reviews"
  }

// Detect Appraisal tasks by type or title
function isAppraisalTask(task) {
  const typeStr = (task?.taskType || task?.type || "").toLowerCase().trim()
  const titleStr = (task?.title || "").toLowerCase()
  return typeStr.includes("appraisal") || titleStr.includes("appraisal")
}

  // Build groups of tasks by applicant (both unclaimed and claimed)
  const applicantGroups = (() => {
    const groups = {}
    const all = [...(tasks.upcoming || []), ...(tasks.overdue || []), ...(tasks.flagged || [])]
    for (const t of all) {
      if (!t.applicantId) continue
      const key = t.applicantId
      if (!groups[key]) {
        groups[key] = {
          applicantId: t.applicantId,
          applicantName: t.applicantName || "Unknown",
          tasks: [],
        }
      }
      groups[key].tasks.push(t)
    }
    const arr = Object.values(groups)
    // Sort by number of tasks desc then name
    arr.sort((a, b) => (b.tasks.length - a.tasks.length) || a.applicantName.localeCompare(b.applicantName))
    return arr
  })()

  const handleClaimTask = async (taskId) => {
    setClaimingTaskId(taskId)
    try {
      const response = await fetch(`/api/dashboard/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "claim" }),
      })
      if (response.status === 409) {
        toast.error("This task has already been claimed by someone else.")
        fetchTasks()
        setClaimingTaskId(null)
        return
      }
      if (!response.ok) {
        const data = await response.json()
        toast.error(data.error || "Failed to claim task.")
        setClaimingTaskId(null)
        return
      }
      toast.success("Task claimed!")
      fetchTasks()
    } catch (err) {
      toast.error("Error claiming task: " + err.message)
    } finally {
      setClaimingTaskId(null)
    }
  }

  const handleClaimAllForApplicant = async (applicantId) => {
    try {
      const res = await fetch(`/api/dashboard/tasks/claim-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicantId }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to claim tasks")
      }
      const claimedCount = (data.claimed || []).length
      const alreadyCount = (data.alreadyClaimed || []).length
      toast.success(
        `Claimed ${claimedCount} task${claimedCount === 1 ? "" : "s"}${alreadyCount ? `, ${alreadyCount} already claimed` : ""}`,
      )
      fetchTasks()
    } catch (e) {
      toast.error(`Claim all failed: ${e.message}`)
    }
  }

  // Flag actions
  const [flagDialogTask, setFlagDialogTask] = useState(null)
  const [flagReason, setFlagReason] = useState("")

  const openFlagDialog = (task) => {
    setFlagDialogTask(task)
    setFlagReason(task?.flaggedReason || "")
  }

  const submitFlag = async () => {
    if (!flagDialogTask?.id) return
    if (!flagReason.trim()) {
      toast.error("Flag reason is required")
      return
    }
    try {
      const res = await fetch(`/api/dashboard/tasks/${flagDialogTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "flag", flaggedReason: flagReason }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || "Failed to flag task")
      }
      toast.success("Task flagged")
      setFlagDialogTask(null)
      setFlagReason("")
      fetchTasks()
    } catch (e) {
      toast.error(e.message)
    }
  }

  const [resolveDialogTask, setResolveDialogTask] = useState(null)
  const [resolveNote, setResolveNote] = useState("")

  // Monthly Reviews modal state
  const [monthlyReviewsOpen, setMonthlyReviewsOpen] = useState(false)
  const [monthlyReviewsLoading, setMonthlyReviewsLoading] = useState(false)
  const [monthlyReviewsError, setMonthlyReviewsError] = useState("")
  const [monthlyPeople, setMonthlyPeople] = useState([])
  const [monthlySelected, setMonthlySelected] = useState({})
  const [monthlyReviewsTaskId, setMonthlyReviewsTaskId] = useState(null)

  const openResolveDialog = (task) => {
    setResolveDialogTask(task)
    setResolveNote("")
  }

  const resolveFlag = async (taskId, note = "") => {
    const key = `resolve-${taskId}`
    if (pendingTimersRef.current.has(key)) return
    const timer = setTimeout(async () => {
      pendingTimersRef.current.delete(key)
      try {
        const res = await fetch(`/api/dashboard/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "resolveFlag", resolutionNote: note }),
        })
        if (!res.ok) {
          const d = await res.json()
          throw new Error(d.error || "Failed to resolve flag")
        }
        fetchTasks()
      } catch (e) {
        toast.error(e.message)
      }
    }, 5000)
    pendingTimersRef.current.set(key, timer)
    toast.success("Flag will be resolved", {
      duration: 5000,
      action: {
        label: "Undo",
        onClick: () => {
          const t = pendingTimersRef.current.get(key)
          if (t) {
            clearTimeout(t)
            pendingTimersRef.current.delete(key)
          }
        },
      },
    })
  }

  const fetchTasks = () => {
    setLoading(true)
    fetch("/api/dashboard/tasks")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch tasks")
        return res.json()
      })
      .then((data) => {
        const incoming = data.tasks || { upcoming: [], overdue: [], flagged: [] }
        // Track first-seen timestamps for hire completion tasks (fallback if created time isn't available)
        try {
          const all = [...(incoming.upcoming || []), ...(incoming.overdue || []), ...(incoming.flagged || [])]
          const now = Date.now()
          let changed = false
          for (const t of all) {
            if (t && t.applicantId && String(t.status || "").toLowerCase() !== "completed") {
              const id = t.id || t.recordId
              if (id && !firstSeenMapRef.current[id]) {
                firstSeenMapRef.current[id] = now
                changed = true
              }
            }
          }
          if (changed) sessionStorage.setItem("hireTaskFirstSeenAt", JSON.stringify(firstSeenMapRef.current))
        } catch {}
        const prev = lastTasksRef.current
        const stringify = (obj) => JSON.stringify(obj)
        // Avoid resetting state if structurally equal to prevent re-animations
        if (!prev || stringify(prev) !== stringify(incoming)) {
          setTasks(incoming)
          lastTasksRef.current = incoming
        }
        setLoading(false)
      })
      .catch((err) => {
        console.error("Error fetching tasks:", err)
        setError(err.message)
        setLoading(false)
      })
  }

  const openMonthlyReviewsModal = async (task) => {
    try {
      setMonthlyReviewsError("")
      setMonthlyReviewsLoading(true)
      setMonthlyReviewsOpen(true)
      setMonthlyReviewsTaskId(task?.id || null)
      const res = await fetch("/api/admin/dashboard/new-hires")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to fetch onboarding people")
      const hires = Array.isArray(data?.newHires) ? data.newHires : []
      // Best-effort filter for people currently onboarding
      const onboarding = hires.filter((h) => h?.onboardingStarted === true || String(h?.onboardingStatus || "").toLowerCase() === "onboarding")
      setMonthlyPeople(onboarding)
      // Initialize checklist state (restore from session if available)
      const init = {}
      for (const p of onboarding) init[p.id] = false
      try {
        const key = task?.id ? `monthly_reviews_selected_${task.id}` : null
        if (key) {
          const saved = JSON.parse(sessionStorage.getItem(key) || "{}")
          for (const pid of Object.keys(saved || {})) {
            if (pid in init) init[pid] = Boolean(saved[pid])
          }
        }
      } catch {}
      setMonthlySelected(init)
    } catch (e) {
      setMonthlyReviewsError(e.message)
    } finally {
      setMonthlyReviewsLoading(false)
    }
  }

  // Persist selection per task
  useEffect(() => {
    if (!monthlyReviewsTaskId) return
    try {
      const key = `monthly_reviews_selected_${monthlyReviewsTaskId}`
      sessionStorage.setItem(key, JSON.stringify(monthlySelected || {}))
    } catch {}
  }, [monthlySelected, monthlyReviewsTaskId])

  const completeTask = async (taskId) => {
    const key = `complete-${taskId}`
    if (pendingTimersRef.current.has(key)) return
    // Optimistic remove from UI for smooth UX
    setTasks((prev) => {
      const next = { upcoming: [...prev.upcoming], overdue: [...prev.overdue], flagged: [...prev.flagged] }
      for (const group of ["upcoming", "overdue", "flagged"]) {
        const idx = next[group].findIndex((t) => t.id === taskId)
        if (idx !== -1) next[group].splice(idx, 1)
      }
      return next
    })
    const timer = setTimeout(async () => {
      pendingTimersRef.current.delete(key)
      try {
        const response = await fetch(`/api/dashboard/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "complete" }),
        })
        if (!response.ok) throw new Error("Failed to complete task")
        // Backend done; no need to refetch immediately due to optimistic update
      } catch (err) {
        toast.error("Error completing task: " + err.message)
        // Revert optimistic removal on error
        fetchTasks()
      }
    }, 5000)
    pendingTimersRef.current.set(key, timer)
    toast.success("Task will be marked complete", {
      duration: 5000,
      action: {
        label: "Undo",
        onClick: () => {
          const t = pendingTimersRef.current.get(key)
          if (t) {
            clearTimeout(t)
            pendingTimersRef.current.delete(key)
            // Restore by refetching
            fetchTasks()
          }
        },
      },
    })
  }

  const deleteTask = async (taskId) => {
    try {
      // First, make the API call to delete the task
      const response = await fetch(`/api/dashboard/tasks/${taskId}`, { 
        method: "DELETE" 
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete task")
      }

      // If API call succeeds, remove from local state
      let deletedTask
      const newTasks = { ...tasks }
      for (const key of Object.keys(newTasks)) {
        const idx = newTasks[key].findIndex((t) => t.id === taskId)
        if (idx !== -1) {
          deletedTask = newTasks[key][idx]
          newTasks[key] = [...newTasks[key].slice(0, idx), ...newTasks[key].slice(idx + 1)]
          break
        }
      }
      setTasks(newTasks)

      // Show success message
      toast.success("Task deleted successfully!")
      
    } catch (err) {
      console.error("Error deleting task:", err)
      toast.error("Error deleting task: " + err.message)
    }
  }

  const handleUndoDelete = (task) => {
    if (!task) return
    const group = getStatusGroup(task.status)
    setTasks((prev) => ({
      ...prev,
      [group]: [task, ...prev[group]],
    }))
    toast.dismiss()
    toast.success("Task restored.")
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setEditedTask((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSelectChange = (name, value) => {
    setEditedTask((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const saveChanges = async () => {
    try {
      // Validate required fields
      if (!editedTask.title?.trim()) {
        toast.error("Title is required")
        return
      }
      if (!editedTask.priority?.trim()) {
        toast.error("Priority is required")
        return
      }
      if (!editedTask.status?.trim()) {
        toast.error("Status is required")
        return
      }
      if (editedTask.status === "Flagged" && !editedTask.flaggedReason?.trim()) {
        toast.error("Flagged reason is required when status is Flagged")
        return
      }

      const response = await fetch(`/api/dashboard/tasks/${editedTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit",
          title: editedTask.title,
          description: editedTask.description || "",
          flaggedReason: editedTask.flaggedReason || "",
          priority: editedTask.priority,
          status: editedTask.status,
          dueDate: editedTask.dueDate || null,
          for: editedTask.for && editedTask.for !== "unassigned" ? [editedTask.for] : [],
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update task")
      }
      
      fetchTasks()
      setEditDialogOpen(false)
      setHasChanges(false)
      toast.success("Task updated successfully!")
    } catch (err) {
      console.error("Error updating task:", err)
      toast.error("Error updating task: " + err.message)
    }
  }

  useEffect(() => {
    if (taskToEdit && editedTask && staff.length > 0) {
      setHasChanges(isTaskChanged(taskToEdit, editedTask, staff))
    }
  }, [editedTask, taskToEdit, staff])

  // Fetch month events for appraisal modal (must be before any early return)
  useEffect(() => {
    if (!appraisalOpen) return
    const year = appraisalCalMonth.getFullYear()
    const month = appraisalCalMonth.getMonth()
    const start = new Date(year, month, 1).toISOString()
    const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString()
    ;(async () => {
      try {
        const res = await fetch(`/api/admin/dashboard/calendar?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`)
        if (!res.ok) throw new Error('Failed to fetch events')
        const data = await res.json()
        const map = {}
        for (const ev of data || []) {
          const s = new Date(ev.start?.dateTime || ev.start?.date)
          const e = new Date(ev.end?.dateTime || ev.end?.date)
          const key = s.toISOString().slice(0,10)
          if (!map[key]) map[key] = []
          map[key].push({ title: ev.summary || 'Event', start: s, end: e })
        }
        setAppraisalEventsByDate(map)
      } catch {
        setAppraisalEventsByDate({})
      }
    })()
  }, [appraisalOpen, appraisalCalMonth])

  useEffect(() => {
    setAppraisalDayEvents(appraisalEventsByDate[appraisalDate] || [])
  }, [appraisalEventsByDate, appraisalDate])

  useEffect(() => {
    if (!appraisalDate || !appraisalStartTime || !appraisalEndTime) { setAppraisalHasConflict(false); return }
    const start = new Date(`${appraisalDate}T${appraisalStartTime}:00`)
    const end = new Date(`${appraisalDate}T${appraisalEndTime}:00`)
    if (end <= start) { setAppraisalHasConflict(true); return }
    const conflict = (appraisalEventsByDate[appraisalDate] || []).some(ev => (start < ev.end && end > ev.start))
    setAppraisalHasConflict(conflict)
  }, [appraisalDate, appraisalStartTime, appraisalEndTime, appraisalEventsByDate])

  useEffect(() => {
    fetchTasks()
  }, [])

  useEffect(() => {
    fetch("/api/admin/staff")
      .then((res) => res.json())
      .then((data) => setStaff(data))
      .catch(() => setStaff([]))
  }, [])

  useEffect(() => {
    const timeout = undoTimeoutRef.current
    return () => {
      if (timeout) clearTimeout(timeout)
    }
  }, [])

  // Initialize banner snooze state from sessionStorage
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("hireBannerSnoozeUntil")
      if (raw) {
        const num = Number(raw)
        if (!Number.isNaN(num)) setHireBannerSnoozeUntil(num)
      }
    } catch {}
  }, [])

  // Load first-seen map for hire completion tasks
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("hireTaskFirstSeenAt")
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed === "object") firstSeenMapRef.current = parsed
      }
    } catch {}
  }, [])

  const handleNewTaskCreated = async (taskData) => {
    try {
      const response = await fetch("/api/dashboard/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskData),
      })
      if (!response.ok) throw new Error("Failed to create task")
      fetchTasks()
      let staffName = "Unknown"
      if (taskData.assignTo) {
        const staffObj = staff.find((s) => s.id === taskData.assignTo)
        if (staffObj) staffName = staffObj.name
      }
      toast.success(
        <div>
          <div className="font-semibold">Task Created Successfully</div>
          <div className="text-sm opacity-80">
            &quot;{taskData.title}&quot; assigned to {staffName}
          </div>
        </div>,
        { duration: 5000 },
      )
    } catch (err) {
      toast.error(
        <div>
          <div className="font-semibold">Error Creating Task</div>
          <div className="text-sm opacity-80">{err.message}</div>
        </div>,
        { duration: 5000 },
      )
    }
  }

  const getStaffName = (staffId) => {
    if (!staffId) return "Unassigned"
    const staffMember = staff.find((s) => s.id === staffId)
    return staffMember ? staffMember.name : staffId // Return the ID if name not found, not "Unknown"
  }

  const getStaffInitials = (staffId) => {
    if (!staffId) return "U"
    const name = getStaffName(staffId)
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) // Limit to 2 characters
  }

  const filteredTasks = (taskList, tabId) => {
    if (!searchQuery) return taskList
    return taskList.filter(
      (task) =>
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getStaffName(task.for).toLowerCase().includes(searchQuery.toLowerCase()),
    )
  }

  // Time options for Appraisal modal
  const appraisalTimeOptions = (() => {
    const opts = []
    for (let h = 8; h <= 18; h++) {
      for (const m of [0, 30]) {
        const hh = String(h).padStart(2, "0")
        const mm = String(m).padStart(2, "0")
        const label = `${((h % 12) || 12)}:${mm} ${h < 12 ? "AM" : "PM"}`
        opts.push({ value: `${hh}:${mm}`, label })
      }
    }
    return opts
  })()

  const openAppraisalModal = async (task) => {
    if (!task?.applicantId) return
    setAppraisalTaskId(task.id)
    setAppraisalApplicantId(task.applicantId)
    setAppraisalApplicantName(task.applicantName || "Applicant")
    setAppraisalApplicantEmail(task.applicantEmail || "")
    setAppraisalDate("")
    setAppraisalStartTime("")
    setAppraisalEndTime("")
    setAppraisalCalMonth(new Date())
    setAppraisalEventsByDate({})
    setAppraisalDayEvents([])
    setAppraisalHasConflict(false)
    try {
      if (!task.applicantEmail) {
        const res = await fetch(`/api/admin/users/${task.applicantId}`)
        if (res.ok) {
          const data = await res.json()
          const ap = data?.applicant
          if (ap?.email) setAppraisalApplicantEmail(ap.email)
          if (ap?.name) setAppraisalApplicantName(ap.name)
        }
      }
    } catch {}
    setAppraisalOpen(true)
  }

  const handleClaimAppraisalTask = async (task) => {
    await handleClaimTask(task.id)
    openAppraisalModal(task)
  }

  const TaskItem = ({ task, index, tabId }) => {
    const PriorityIcon = priorityIcons[task.priority.toLowerCase().trim()] || Clock

    return (
      <motion.div
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.2, delay: index * 0.05 }}
        className="group relative"
      >
        <div
          className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-card hover:bg-muted/30 hover:border-border transition-all duration-200 cursor-pointer"
          onClick={(e) => {
            if (isMonthlyReviewsTask(task) && !isGlobalTask(task)) {
              e.stopPropagation()
              openMonthlyReviewsModal(task)
            } else if (isAppraisalTask(task) && !isGlobalTask(task)) {
              e.stopPropagation()
              openAppraisalModal(task)
            }
          }}
        >
          {/* Priority Indicator */}
          <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
            <PriorityIcon
              className={`h-4 w-4 flex-shrink-0 ${
                task.priority.toLowerCase().trim() === "very high"
                  ? "text-red-500"
                  : task.priority.toLowerCase().trim() === "high"
                    ? "text-orange-500"
                    : task.priority.toLowerCase().trim() === "medium"
                      ? "text-yellow-500"
                      : task.priority.toLowerCase().trim() === "low"
                        ? "text-green-500"
                        : "text-blue-500"
              }`}
            />
          </div>

          {/* Task Content - Allow it to grow and shrink */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-sm text-foreground truncate flex-1">{task.title}</h4>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-2 min-w-0">
                <Badge
                  variant="secondary"
                  className={`text-[10px] px-2 py-0.5 font-medium border-0 ${
                    isGlobalTask(task)
                      ? "bg-gray-500/10 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400"
                      : "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                  }`}
                >
                  {isGlobalTask(task) ? "Unclaimed" : "Claimed"}
                </Badge>
                {task.applicantName && (
                  <>
                    <Separator orientation="vertical" className="h-3 flex-shrink-0" />
                    <span className="truncate">{task.applicantName}</span>
                  </>
                )}
                {!isGlobalTask(task) && (
                  <>
                    <Separator orientation="vertical" className="h-3 flex-shrink-0" />
                    <span className="truncate">{task.forName || getStaffName(task.for)}</span>
                  </>
                )}
              </div>
              <Separator orientation="vertical" className="h-3 flex-shrink-0" />
              <div className="flex items-center gap-1 flex-shrink-0">
                <Clock className="h-3 w-3" />
                <span className={tabId === "overdue" ? "text-red-500 font-medium" : task.rawDueDate ? "" : "text-muted-foreground italic"}>
                  {formatDueDate(task.rawDueDate)}
                </span>
              </div>
              {task.flaggedReason && (
                <>
                  <Separator orientation="vertical" className="h-3 flex-shrink-0" />
                  <div className="flex items-center gap-1 text-amber-600 min-w-0">
                    <AlertCircle className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{task.flaggedReason}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Compact Status Pill */}
          <div className="ml-auto flex items-center flex-shrink-0">
            <Badge
              className={`text-[10px] px-2 py-0.5 font-medium border-0 rounded-md ${
                task.status === " Overdue" || task.status === "overdue"
                  ? "bg-red-500/10 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                  : task.status === "In-progress" || task.status === "in-progress" || task.status === "today"
                    ? "bg-blue-500/10 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400"
                    : task.status === "Flagged" || task.status === "flagged"
                      ? "bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                      : "bg-gray-500/10 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400"
              }`}
              variant="secondary"
            >
              {task.status?.trim() || task.status}
            </Badge>
          </div>

          {/* Actions - Always visible */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {isGlobalTask(task) ? (
              <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 hover:bg-emerald-100 hover:text-emerald-700 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (isAppraisalTask(task)) {
                          handleClaimAppraisalTask(task)
                        } else {
                          handleClaimTask(task.id)
                        }
                      }}
                      disabled={claimingTaskId === task.id}
                    >
                      {claimingTaskId === task.id ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
                        >
                          <RefreshCw className="h-3 w-3" />
                        </motion.div>
                      ) : (
                        <Plus className="h-3 w-3" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Claim this task</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 hover:bg-muted-foreground/10 hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedTask(task)
                        setShowTaskDetails(true)
                      }}
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>View Details</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              </>
            ) : (
              <>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 hover:bg-emerald-100 hover:text-emerald-700 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400"
                        onClick={(e) => {
                          e.stopPropagation()
                          completeTask(task.id)
                        }}
                      >
                        <CheckCircle2 className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Mark as complete</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 hover:bg-muted-foreground/10 hover:text-foreground"
                    >
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedTask(task)
                        setShowTaskDetails(true)
                      }}
                    >
                      <Eye className="h-3 w-3 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openEditDialog(task)}>
                      <Pencil className="h-3 w-3 mr-2" />
                      Edit Task
                    </DropdownMenuItem>
                    {!isGlobalTask(task) && (
                      <DropdownMenuItem
                        onClick={() => {
                          const key = `unclaim-${task.id}`
                          const t = setTimeout(async () => {
                            try {
                              const res = await fetch(`/api/dashboard/tasks/${task.id}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ action: "unclaim" }),
                              })
                              if (!res.ok) {
                                const d = await res.json()
                                throw new Error(d.error || "Failed to unclaim")
                              }
                              fetchTasks()
                            } catch (e) {
                              toast.error(e.message)
                            }
                          }, 4000)
                          pendingTimersRef.current.set(key, t)
                          toast.success("Task will be unclaimed", {
                            duration: 4000,
                            action: {
                              label: "Undo",
                              onClick: () => {
                                const timer = pendingTimersRef.current.get(key)
                                if (timer) {
                                  clearTimeout(timer)
                                  pendingTimersRef.current.delete(key)
                                  toast.success("Unclaim cancelled")
                                }
                              },
                            },
                          })
                        }}
                      >
                        <X className="h-3 w-3 mr-2" />
                        Unclaim
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => {
                        setDeleteTaskDialogOpen(true)
                        setTaskToDelete(task)
                      }}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash className="h-3 w-3 mr-2" />
                      Delete Task
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Flag available for claimed tasks too */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 hover:bg-amber-100 hover:text-amber-700 dark:hover:bg-amber-900/20 dark:hover:text-amber-400"
                        onClick={(e) => {
                          e.stopPropagation()
                          openFlagDialog(task)
                        }}
                      >
                        <Flag className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Flag</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
            )}
            {isGlobalTask(task) && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 hover:bg-amber-100 hover:text-amber-700 dark:hover:bg-amber-900/20 dark:hover:text-amber-400"
                      onClick={(e) => {
                        e.stopPropagation()
                        openFlagDialog(task)
                      }}
                    >
                      <Flag className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Flag</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {!isGlobalTask(task) && task.status === "Flagged" && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={(e) => {
                        e.stopPropagation()
                        openResolveDialog(task)
                      }}
                    >
                      Resolve
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Resolve flag</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </motion.div>
    )
  }

  const renderTaskList = (taskList, tabId) => {
    let filtered = filteredTasks(taskList, tabId)
    // Upcoming should not show claimed tasks (they appear in My Queue)
    if (tabId === "upcoming") {
      filtered = filtered.filter((t) => isGlobalTask(t))
    }

    if (filtered.length === 0) {
      return renderEmptyState(tabId)
    }

    // Sort by priority
    const sortedTasks = [...filtered].sort((a, b) => {
      const aPriority = priorityOrder[a.priority.toLowerCase().trim()] || 999
      const bPriority = priorityOrder[b.priority.toLowerCase().trim()] || 999
      return aPriority - bPriority
    })

    return (
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {sortedTasks.map((task, index) => (
            <TaskItem key={task.id} task={task} index={index} tabId={tabId} />
          ))}
        </AnimatePresence>
      </div>
    )
  }

  const renderEmptyState = (tabId) => {
    const emptyStateConfig = {
      upcoming: {
        icon: Clock,
        title: "No upcoming tasks",
        description: "You're all caught up! No upcoming tasks at the moment.",
        color: "text-blue-500",
      },
      overdue: {
        icon: AlertTriangle,
        title: "No overdue tasks",
        description: "Excellent work! You're staying on top of your deadlines.",
        color: "text-emerald-500",
      },
      flagged: {
        icon: Flag,
        title: "No flagged tasks",
        description: "All clear! No tasks require special attention right now.",
        color: "text-amber-500",
      },
      queue: {
        icon: Users,
        title: "No items in your queue",
        description: "Claim tasks to start reviewing.",
        color: "text-emerald-500",
      },
    }

    const config = emptyStateConfig[tabId] || {
      icon: Clock,
      title: "No items",
      description: "Nothing to show here right now.",
      color: "text-muted-foreground",
    }
    const Icon = config.icon

    return (
      <motion.div
        className="py-12 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <motion.div
          className={`mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mb-4 ${config.color}`}
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Icon className="h-8 w-8" />
        </motion.div>
        <h3 className="text-lg font-semibold mb-2 text-foreground">{config.title}</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto leading-relaxed">{config.description}</p>
        <Button
          size="sm"
          onClick={() => setNewTaskModalOpen(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create New Task
        </Button>
      </motion.div>
    )
  }

  if (loading) {
    return <TaskManagementSkeleton />
  }

  if (error) {
    return (
      <Card className="border-destructive/20">
        <CardContent className="p-8">
          <motion.div
            className="text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-foreground">Failed to load tasks</h3>
            <p className="text-sm text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => fetchTasks()} variant="outline" className="shadow-sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    )
  }

  const openEditDialog = (task) => {
    setTaskToEdit(task)
    setEditedTask({
      ...task,
      dueDate: task.dueDate || "",
      for: task.for || "unassigned",
    })
    setEditDialogOpen(true)
  }

  // Admin-only task lists: exclude hire completion tasks EXCEPT Appraisal tasks (which we want in main area)
  const adminUpcoming = (tasks.upcoming || []).filter((t) => !isHireCompletionTask(t) || isAppraisalTask(t))
  const adminOverdue = (tasks.overdue || []).filter((t) => !isHireCompletionTask(t) || isAppraisalTask(t))
  const adminFlagged = (tasks.flagged || []).filter((t) => !isHireCompletionTask(t) || isAppraisalTask(t))

  const tabCounts = {
    upcoming: adminUpcoming.length,
    overdue: adminOverdue.length,
    flagged: adminFlagged.length,
  }

  // Accurate count for Unclaimed (across all groups, excluding completed which is not returned)
  const unclaimedCount = [
    ...adminUpcoming,
    ...adminOverdue,
    ...adminFlagged,
  ].filter((t) => isGlobalTask(t)).length

  // My Queue: tasks assigned to me (non-global) across all groups
  const myQueue = (() => {
    const all = [...adminUpcoming, ...adminOverdue, ...adminFlagged]
    return all.filter((t) => !isGlobalTask(t))
  })()

  // Month-only picker reused from Applicant Drawer
  function MonthOnlyPicker({ selected, onSelect, currentMonth, onMonthChange, eventsByDate = {} }) {
    const [current, setCurrent] = useState(() => currentMonth || new Date())
    useEffect(() => { if (currentMonth) setCurrent(currentMonth) }, [currentMonth])
    const year = current.getFullYear()
    const month = current.getMonth()
    const monthName = current.toLocaleString("default", { month: "long" })
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstDayOfMonth = new Date(year, month, 1).getDay()

    const totalCells = Math.ceil((daysInMonth + firstDayOfMonth) / 7) * 7
    const cells = Array.from({ length: totalCells }, (_, i) => {
      const dayIndex = i - firstDayOfMonth
      if (dayIndex < 0 || dayIndex >= daysInMonth) {
        const date = new Date(year, month, dayIndex + 1)
        return { isEmpty: true, date, day: date.getDate() }
      }
      const day = dayIndex + 1
      const date = new Date(year, month, day)
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      return { isEmpty: false, date, day, dateString }
    })

    const weeks = []
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

    const isToday = (d) => {
      const t = new Date()
      return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear()
    }

    return (
      <div className="rounded-md border p-3">
        <div className="flex items-center justify-between mb-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { const d = new Date(year, month - 1, 1); setCurrent(d); onMonthChange?.(d) }}>
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
          <div className="text-sm font-medium">{monthName} {year}</div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { const d = new Date(year, month + 1, 1); setCurrent(d); onMonthChange?.(d) }}>
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 text-center mb-1">
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d,i) => (
            <div key={i} className="text-xs text-muted-foreground">{d}</div>
          ))}
        </div>

        <div className="space-y-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 gap-1">
              {week.map((cell, di) => cell.isEmpty ? (
                <div key={`e-${wi}-${di}`} className="h-9" />
              ) : (
                <Button
                  key={cell.dateString}
                  variant="ghost"
                  size="sm"
                  className={`h-9 p-0 relative ${selected === cell.dateString ? "bg-primary text-primary-foreground" : isToday(cell.date) ? "border" : ""}`}
                  onClick={() => onSelect?.(cell.dateString)}
                >
                  <span>{cell.day}</span>
                  {(eventsByDate[cell.dateString]?.length || 0) > 0 && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  )}
                </Button>
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // (hooks moved above early returns)
  // (removed duplicate MonthOnlyPicker and effects relocated above return)
  // Utility: best-effort extraction of a task's created timestamp
  const getCreatedTimestamp = (task) => {
    if (!task) return 0
    const candidates = [
      task.createdTime,
      task.createdAt,
      task.created,
      task["Created Time"],
      task.created_time,
      task.created_date,
      task.createdTimestamp,
    ]
    for (const c of candidates) {
      if (!c) continue
      if (typeof c === "number") return c
      const ms = Date.parse(c)
      if (!Number.isNaN(ms)) return ms
    }
    // Fallback: first seen timestamp from session
    const id = task.id || task.recordId
    if (id && firstSeenMapRef.current[id]) return firstSeenMapRef.current[id]
    return 0
  }

  // Derive hire completion counts (only those not completed)
  const allTasks = [...(tasks.upcoming || []), ...(tasks.overdue || []), ...(tasks.flagged || [])]
  const hireOpen = allTasks.filter((t) => t.applicantId && (String(t.status || "").toLowerCase() !== "completed"))
  const hireOpenCount = hireOpen.length
  const nowMs = Date.now()
  const twentyFourHoursMs = 24 * 60 * 60 * 1000
  const hireRecentCount = hireOpen.reduce((acc, t) => {
    const created = getCreatedTimestamp(t)
    if (created && nowMs - created <= twentyFourHoursMs) return acc + 1
    return acc
  }, 0)

  const nowTs = Date.now()
  const isHireBannerActive = hireOpenCount > 0 && nowTs > (hireBannerSnoozeUntil || 0)

  const snoozeHireBanner = (hours = 4) => {
    const until = Date.now() + hours * 60 * 60 * 1000
    setHireBannerSnoozeUntil(until)
    try {
      sessionStorage.setItem("hireBannerSnoozeUntil", String(until))
    } catch {}
  }

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card className="shadow-sm border-border/50">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold">Task Management</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {tabCounts.upcoming + tabCounts.overdue + tabCounts.flagged} total tasks
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 bg-background border-border/50 focus:border-primary/50"
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowGroupsModal(true)}
                  className={`shadow-sm hover:shadow-md transition-shadow bg-transparent ${isHireBannerActive ? "border-primary/50" : ""}`}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Hire Completions
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={fetchTasks}
                  className="shadow-sm hover:shadow-md transition-shadow bg-transparent"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <Button
                  size="sm"
                  onClick={() => setNewTaskModalOpen(true)}
                  className="shadow-sm hover:shadow-md transition-shadow bg-primary hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Task
                </Button>
              </div>
            </div>
            {isHireBannerActive && (
              <motion.div
                role="button"
                tabIndex={0}
                onClick={() => setShowGroupsModal(true)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setShowGroupsModal(true) }}
                onMouseEnter={() => setIsBannerHovered(true)}
                onMouseLeave={() => setIsBannerHovered(false)}
                className="relative mt-2 flex items-center justify-between gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] cursor-pointer hover:bg-primary/10 transition-colors overflow-hidden"
                initial={{ opacity: 1 }}
                animate={{ opacity: 1 }}
              >
                {hireRecentCount > 0 && (
                  <motion.div
                    className="absolute inset-0 rounded-full bg-primary/20 pointer-events-none"
                    initial={{ opacity: 0.18 }}
                    animate={!isBannerHovered ? { opacity: [0.18, 0.38, 0.18] } : { opacity: 0.18 }}
                    transition={!isBannerHovered ? { duration: 3.8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" } : { duration: 0.2 }}
                  />
                )}
                <div className="text-foreground/90 truncate relative z-10">
                  {hireRecentCount > 0 ? (
                    <>
                      There {hireRecentCount === 1 ? "is" : "are"} <span className="font-medium">{hireRecentCount}</span> NEW onboarding completion{hireRecentCount === 1 ? "" : "s"} ready to be reviewed
                    </>
                  ) : (
                    <>
                      There {hireOpenCount === 1 ? "is" : "are"} <span className="font-medium">{hireOpenCount}</span> onboarding completion{hireOpenCount === 1 ? "" : "s"} ready to be reviewed
                    </>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => { e.stopPropagation(); snoozeHireBanner(4) }}
                  className="h-6 w-6 text-muted-foreground hover:text-muted-foreground/80 hover:bg-transparent opacity-70 relative z-10"
                  aria-label="Dismiss"
                  title="Dismiss"
                >
                  <X className="h-4 w-4" />
                </Button>
              </motion.div>
            )}
          </CardHeader>

          <CardContent className="pt-0">
            <Tabs defaultValue="upcoming" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-6 bg-muted/30 p-1 rounded-lg h-11">
                <TabsTrigger
                  value="upcoming"
                  className="data-[state=active]:bg-background data-[state=active]:shadow-sm flex items-center gap-2"
                >
                  <Clock className="h-4 w-4" />
                  <span className="hidden sm:inline">Unclaimed</span>
                  <Badge className="bg-blue-500 hover:bg-blue-500/90 text-white text-xs" variant="secondary">
                    {unclaimedCount}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="overdue"
                  className="data-[state=active]:bg-background data-[state=active]:shadow-sm flex items-center gap-2"
                >
                  <AlertTriangle className="h-4 w-4" />
                  <span className="hidden sm:inline">Overdue</span>
                  <Badge className="bg-red-500 hover:bg-red-500/90 text-white text-xs" variant="secondary">
                    {tabCounts.overdue}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="flagged"
                  className="data-[state=active]:bg-background data-[state=active]:shadow-sm flex items-center gap-2"
                >
                  <Flag className="h-4 w-4" />
                  <span className="hidden sm:inline">Flagged</span>
                  <Badge className="bg-amber-500 hover:bg-amber-500/90 text-white text-xs" variant="secondary">
                    {tabCounts.flagged}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="queue"
                  className="data-[state=active]:bg-background data-[state=active]:shadow-sm flex items-center gap-2"
                >
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">My Queue</span>
                  <Badge className="bg-emerald-600 hover:bg-emerald-600/90 text-white text-xs" variant="secondary">
                    {myQueue.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upcoming" className="mt-0">
                {renderTaskList(adminUpcoming, "upcoming")}
              </TabsContent>

              <TabsContent value="overdue" className="mt-0">
                {renderTaskList(adminOverdue, "overdue")}
              </TabsContent>

              <TabsContent value="flagged" className="mt-0">
                {renderTaskList(adminFlagged, "flagged")}
              </TabsContent>

              <TabsContent value="queue" className="mt-0">
                {renderTaskList(myQueue, "queue")}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Hire Completions Modal */}
        <AnimatePresence>
          {showGroupsModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2 }}
                className="bg-background border border-border rounded-xl w-full max-w-5xl p-6 shadow-2xl my-4 max-h-[92vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <h2 className="text-lg font-semibold text-foreground">Hire Completions</h2>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setShowGroupsModal(false)} className="h-7 w-7">
                    <X className="h-3 w-3" />
                  </Button>
                </div>

                {applicantGroups.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">No unclaimed tasks from hires.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Left: Applicants */}
                    <div className="md:col-span-1 border rounded-lg p-3 bg-card/50">
                      <div className="space-y-2">
                        {applicantGroups.map((g) => (
                          <button
                            key={g.applicantId}
                            onClick={() => setSelectedApplicantId(g.applicantId)}
                            className={`w-full text-left px-3 py-2 rounded-md border transition ${
                              selectedApplicantId === g.applicantId ? "bg-primary/10 border-primary/30" : "hover:bg-muted/40"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium truncate">{g.applicantName}</span>
                              <Badge className="text-xs bg-blue-500 text-white" variant="secondary">{g.tasks.length}</Badge>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Right: Tasks for selected applicant */}
                    <div className="md:col-span-2 border rounded-lg p-3 bg-card/50">
                      {(() => {
                        const selected = applicantGroups.find((g) => g.applicantId === (selectedApplicantId || (applicantGroups[0] && applicantGroups[0].applicantId)))
                        const tasksForRaw = selected ? selected.tasks : []
                        const tasksFor = groupSearch
                          ? tasksForRaw.filter((t) => (t.title || "").toLowerCase().includes(groupSearch.toLowerCase()))
                          : tasksForRaw
                        const headerName = selected ? selected.applicantName : ""
                        return (
                          <div>
                            <div className="flex items-center justify-between mb-3 gap-3">
                              <div className="min-w-0">
                                <h3 className="text-base font-semibold">{headerName}</h3>
                                <p className="text-xs text-muted-foreground">{tasksFor.length} unclaimed task{tasksFor.length === 1 ? "" : "s"}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="relative">
                                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                  <Input
                                    value={groupSearch}
                                    onChange={(e) => setGroupSearch(e.target.value)}
                                    placeholder="Search tasks..."
                                    className="pl-7 h-8 w-48"
                                  />
                                </div>
                                {selected && (
                                  <Button size="sm" onClick={() => handleClaimAllForApplicant(selected.applicantId)} className="h-8">
                                    <Plus className="h-3 w-3 mr-2" /> Claim All
                                  </Button>
                                )}
                              </div>
                            </div>

                            <div className="space-y-2">
                              {tasksFor.map((t) => (
                                <div key={t.id} className="flex items-center justify-between p-2 rounded-md border bg-background">
                                  <div className="min-w-0">
                                    <div className="text-sm font-medium break-words whitespace-normal leading-5">{t.title}</div>
                                    <div className="text-xs text-muted-foreground truncate">ID: {t.id}</div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      variant="secondary"
                                      className={`text-[10px] px-2 py-0.5 font-medium border-0 whitespace-nowrap ${
                                        isGlobalTask(t)
                                          ? "bg-gray-500/10 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400"
                                          : "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                                      }`}
                                    >
                                      {isGlobalTask(t) ? "Unclaimed" : "Claimed"}
                                    </Badge>
                                    {/* Actions mirroring the main component */}
                                    {isGlobalTask(t) ? (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8"
                                        onClick={() => handleClaimTask(t.id)}
                                      >
                                        <Plus className="h-3 w-3 mr-2" /> Claim
                                      </Button>
                                    ) : (
                                      <>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="h-8"
                                          onClick={() => completeTask(t.id)}
                                        >
                                          <CheckCircle2 className="h-3 w-3 mr-2" /> Complete
                                        </Button>
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button variant="outline" size="sm" className="h-8">
                                              <MoreHorizontal className="h-3 w-3" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end" className="w-44">
                                            <DropdownMenuItem onClick={() => { setSelectedTask(t); setShowTaskDetails(true); }}>
                                              <Eye className="h-3 w-3 mr-2" /> View Details
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => openEditDialog(t)}>
                                              <Pencil className="h-3 w-3 mr-2" /> Edit Task
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => openFlagDialog(t)}>
                                              <Flag className="h-3 w-3 mr-2" /> Flag
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                              onClick={() => {
                                                const key = `unclaim-${t.id}`
                                                const timer = setTimeout(async () => {
                                                  try {
                                                    const res = await fetch(`/api/dashboard/tasks/${t.id}`, {
                                                      method: "PATCH",
                                                      headers: { "Content-Type": "application/json" },
                                                      body: JSON.stringify({ action: "unclaim" }),
                                                    })
                                                    if (!res.ok) {
                                                      const d = await res.json()
                                                      throw new Error(d.error || "Failed to unclaim")
                                                    }
                                                    fetchTasks()
                                                  } catch (e) {
                                                    toast.error(e.message)
                                                  }
                                                }, 4000)
                                                pendingTimersRef.current.set(key, timer)
                                                toast.success("Task will be unclaimed", {
                                                  duration: 4000,
                                                  action: {
                                                    label: "Undo",
                                                    onClick: () => {
                                                      const tt = pendingTimersRef.current.get(key)
                                                      if (tt) { clearTimeout(tt); pendingTimersRef.current.delete(key) }
                                                    },
                                                  },
                                                })
                                              }}
                                            >
                                              <X className="h-3 w-3 mr-2" /> Unclaim
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </>
                                    )}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8"
                                      onClick={() => openFlagDialog(t)}
                                    >
                                      <Flag className="h-3 w-3 mr-2" /> Flag
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Appraisal Modal */}
        <AnimatePresence>
          {appraisalOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2 }}
                className="bg-background border border-border rounded-xl w-full max-w-md p-6 shadow-2xl my-4 max-h-[92vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <CalendarIcon className="h-4 w-4 text-primary" />
                    </div>
                    <h2 className="text-lg font-semibold text-foreground">Set Appraisal Date</h2>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setAppraisalOpen(false)} className="h-7 w-7">
                    <X className="h-3 w-3" />
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">Applicant: <span className="text-foreground">{appraisalApplicantName}</span></div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Appraisal Date</Label>
                    <div className="text-sm">{appraisalDate ? format(parse(appraisalDate, "yyyy-MM-dd", new Date()), "PPP") : "—"}</div>
                  </div>

                  <MonthOnlyPicker
                    selected={appraisalDate}
                    onSelect={(val) => setAppraisalDate(val)}
                    currentMonth={appraisalCalMonth}
                    onMonthChange={setAppraisalCalMonth}
                    eventsByDate={appraisalEventsByDate}
                  />

                  {appraisalDate && (
                    <div className="rounded-md border p-3">
                      <div className="text-sm font-medium mb-2">{appraisalDate}</div>
                      {appraisalDayEvents.length > 0 ? (
                        <div className="space-y-1 mb-3">
                          {appraisalDayEvents.map((ev, i) => (
                            <div key={i} className="text-xs text-muted-foreground">{ev.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {ev.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {ev.title}</div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground mb-3">No events for this day</div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">Start time</Label>
                          <Select value={appraisalStartTime} onValueChange={(v) => {
                            setAppraisalStartTime(v)
                            if (appraisalEndTime && appraisalEndTime <= v) {
                              const next = appraisalTimeOptions.find((t) => t.value > v)
                              setAppraisalEndTime(next ? next.value : "")
                            }
                          }}>
                            <SelectTrigger className="h-9"><SelectValue placeholder="Start time" /></SelectTrigger>
                            <SelectContent>
                              {appraisalTimeOptions.map((t) => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">End time</Label>
                          <Select value={appraisalEndTime} onValueChange={setAppraisalEndTime}>
                            <SelectTrigger className="h-9"><SelectValue placeholder="End time" /></SelectTrigger>
                            <SelectContent>
                              {(appraisalStartTime ? appraisalTimeOptions.filter((t) => t.value > appraisalStartTime) : appraisalTimeOptions).map((t) => (
                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      {appraisalHasConflict && (<div className="mt-2 text-xs text-red-500">Selected time overlaps with an existing event.</div>)}
                      {appraisalStartTime && appraisalEndTime && appraisalEndTime <= appraisalStartTime && (<div className="mt-1 text-xs text-red-500">End time must be after start time.</div>)}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Start time</Label>
                      <Select value={appraisalStartTime} onValueChange={(v) => {
                        setAppraisalStartTime(v)
                        if (appraisalEndTime && appraisalEndTime <= v) {
                          const next = appraisalTimeOptions.find((t) => t.value > v)
                          setAppraisalEndTime(next ? next.value : "")
                        }
                      }}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Start time" /></SelectTrigger>
                        <SelectContent>
                          {appraisalTimeOptions.map((t) => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">End time</Label>
                      <Select value={appraisalEndTime} onValueChange={setAppraisalEndTime}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="End time" /></SelectTrigger>
                        <SelectContent>
                          {(appraisalStartTime ? appraisalTimeOptions.filter((t) => t.value > appraisalStartTime) : appraisalTimeOptions).map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setAppraisalOpen(false)} className="h-8">Cancel</Button>
                    <Button
                      className="h-8"
                      disabled={!appraisalDate || !appraisalStartTime || !appraisalEndTime || appraisalEndTime <= appraisalStartTime || appraisalSaving}
                      onClick={() => setAppraisalConfirmOpen(true)}
                    >
                      Continue
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Appraisal Confirm Dialog */}
        <AnimatePresence>
          {appraisalConfirmOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => { if (!appraisalSaving) setAppraisalConfirmOpen(false) }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2 }}
                className="bg-background border border-border rounded-xl w-full max-w-md p-5 shadow-2xl my-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">Confirm Appraisal</h3>
                  <Button variant="ghost" size="icon" onClick={() => { if (!appraisalSaving) setAppraisalConfirmOpen(false) }} className="h-7 w-7">
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  This will set the appraisal date and create a calendar event for {appraisalApplicantName}.
                  Once confirmed, this task will be marked as completed.
                </p>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setAppraisalConfirmOpen(false)} className="h-8" disabled={appraisalSaving}>Cancel</Button>
                  <Button
                    className="h-8"
                    disabled={appraisalSaving}
                    onClick={async () => {
                      if (!appraisalApplicantId || !appraisalDate || !appraisalStartTime || !appraisalEndTime) return
                      try {
                        setAppraisalSaving(true)
                        // 1) Update appraisal date (also updates Appraisal History server-side)
                        const res = await fetch(`/api/admin/users/${appraisalApplicantId}/appraisal-date`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ date: appraisalDate }),
                        })
                        if (!res.ok) {
                          const err = await res.json().catch(() => ({}))
                          throw new Error(err?.error || "Failed to set appraisal date")
                        }
                        // 2) Create calendar event
                        const startDT = `${appraisalDate}T${appraisalStartTime}:00`
                        const endDT = `${appraisalDate}T${appraisalEndTime}:00`
                        const calRes = await fetch("/api/admin/dashboard/calendar", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            summary: "Appraisal Appointment",
                            description: `Appointment event: Appraisal for applicant ${appraisalApplicantName}`,
                            start: { dateTime: startDT, timeZone: "Europe/London" },
                            end: { dateTime: endDT, timeZone: "Europe/London" },
                            attendees: (appraisalApplicantEmail ? [{ email: appraisalApplicantEmail, displayName: appraisalApplicantName }] : []),
                            createMeet: false,
                          }),
                        })
                        if (!calRes.ok) {
                          const err = await calRes.json().catch(() => ({}))
                          throw new Error(err?.error || "Failed to create calendar appointment")
                        }
                        // 3) Mark task complete
                        if (appraisalTaskId) {
                          await completeTask(appraisalTaskId)
                        }
                        toast.success("Appraisal scheduled and task completed")
                        setAppraisalConfirmOpen(false)
                        setAppraisalOpen(false)
                        fetchTasks()
                      } catch (e) {
                        toast.error(e?.message || "Failed to schedule appraisal")
                      } finally {
                        setAppraisalSaving(false)
                      }
                    }}
                  >
                    {appraisalSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Confirm"}
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Flag Dialog */}
        <AnimatePresence>
          {flagDialogTask && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2 }}
                className="bg-background border border-border rounded-xl w-full max-w-md p-5 shadow-2xl my-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber/10">
                      <Flag className="h-4 w-4 text-amber-600" />
                    </div>
                    <h2 className="text-lg font-semibold">Flag Task</h2>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setFlagDialogTask(null)} className="h-7 w-7">
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm">Reason <span className="text-red-500">*</span></Label>
                    <Textarea value={flagReason} onChange={(e) => setFlagReason(e.target.value)} rows={3} className="mt-1" placeholder="Why is this task being flagged?" />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setFlagDialogTask(null)}>Cancel</Button>
                  <Button onClick={submitFlag}>Flag</Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Resolve Flag Dialog */}
        <AnimatePresence>
          {resolveDialogTask && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2 }}
                className="bg-background border border-border rounded-xl w-full max-w-md p-5 shadow-2xl my-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald/10">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    </div>
                    <h2 className="text-lg font-semibold">Resolve Flag</h2>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setResolveDialogTask(null)} className="h-7 w-7">
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm">Resolution Note (optional)</Label>
                    <Textarea value={resolveNote} onChange={(e) => setResolveNote(e.target.value)} rows={3} className="mt-1" placeholder="What changed or why is this resolved?" />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setResolveDialogTask(null)}>Cancel</Button>
                  <Button
                    variant="outline"
                    onClick={() => { setResolveDialogTask(null); resolveFlag(resolveDialogTask.id, resolveNote); }}
                  >
                    Resolve
                  </Button>
                  <Button
                    onClick={() => {
                      setResolveDialogTask(null)
                      const key = `resolve-complete-${resolveDialogTask.id}`
                      if (pendingTimersRef.current.has(key)) return
                      const timer = setTimeout(async () => {
                        pendingTimersRef.current.delete(key)
                        try {
                          const res = await fetch(`/api/dashboard/tasks/${resolveDialogTask.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ action: "resolveAndComplete", resolutionNote: resolveNote }),
                          })
                          if (!res.ok) {
                            const d = await res.json()
                            throw new Error(d.error || "Failed to resolve & complete")
                          }
                          // Optimistic remove for smooth UX
                          setTasks((prev) => {
                            const next = { upcoming: [...prev.upcoming], overdue: [...prev.overdue], flagged: [...prev.flagged] }
                            for (const group of ["upcoming", "overdue", "flagged"]) {
                              const idx = next[group].findIndex((t) => t.id === resolveDialogTask.id)
                              if (idx !== -1) next[group].splice(idx, 1)
                            }
                            return next
                          })
                        } catch (e) {
                          toast.error(e.message)
                          fetchTasks()
                        }
                      }, 5000)
                      pendingTimersRef.current.set(key, timer)
                      toast.success("Flag will be resolved and task completed", {
                        duration: 5000,
                        action: {
                          label: "Undo",
                          onClick: () => {
                            const t = pendingTimersRef.current.get(key)
                            if (t) {
                              clearTimeout(t)
                              pendingTimersRef.current.delete(key)
                              fetchTasks()
                            }
                          },
                        },
                      })
                    }}
                  >
                    Resolve & Complete
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Monthly Reviews Modal */}
        <AnimatePresence>
          {monthlyReviewsOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2 }}
                className="bg-background border border-border rounded-xl w-full max-w-2xl p-6 shadow-2xl my-4 max-h-[92vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <CalendarIcon className="h-4 w-4 text-primary" />
                    </div>
                    <h2 className="text-lg font-semibold text-foreground">Book Monthly Reviews</h2>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setMonthlyReviewsOpen(false)} className="h-7 w-7">
                    <X className="h-3 w-3" />
                  </Button>
                </div>

                {monthlyReviewsLoading ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">Loading onboarding people…</div>
                ) : monthlyReviewsError ? (
                  <div className="py-10 text-center text-sm text-red-600">{monthlyReviewsError}</div>
                ) : monthlyPeople.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">No people currently onboarding.</div>
                ) : (
                  <div>
                    <p className="text-sm text-muted-foreground mb-3">Select the people you want to include in this month's reviews.</p>
                    <div className="border rounded-md divide-y">
                      {monthlyPeople.map((p) => {
                        const checked = !!monthlySelected[p.id]
                        return (
                          <button
                            key={p.id}
                            type="button"
                            className="w-full text-left"
                            onClick={() => setMonthlySelected((prev) => ({ ...prev, [p.id]: !prev[p.id] }))}
                          >
                            <div className="flex items-center justify-between p-3">
                              <div className="min-w-0">
                                <div className={`text-sm font-medium truncate ${checked ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                  {p.name}
                                  {p.role && (
                                    <span className={`ml-2 text-xs ${checked ? 'text-muted-foreground/70' : 'text-muted-foreground'} font-normal align-middle truncate`}>
                                      {p.role}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(next) =>
                                  setMonthlySelected((prev) => ({ ...prev, [p.id]: Boolean(next) }))
                                }
                                className="h-4 w-4 rounded-md border-primary/60 data-[state=unchecked]:bg-primary/5 focus-visible:ring-2 focus-visible:ring-primary/40"
                              />
                            </div>
                          </button>
                        )
                      })}
                    </div>

                    <div className="flex justify-end gap-2 mt-4">
                      <Button onClick={() => setMonthlyReviewsOpen(false)}>Done</Button>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Task Details Sidebar */}
        <AnimatePresence>
          {showTaskDetails && selectedTask && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end"
              onClick={() => setShowTaskDetails(false)}
            >
              <motion.div
                initial={{ x: 400 }}
                animate={{ x: 0 }}
                exit={{ x: 400 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="w-96 bg-background border-l border-border h-full overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold">Task Details</h3>
                    <Button variant="ghost" size="icon" onClick={() => setShowTaskDetails(false)} className="h-8 w-8">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h4 className="font-medium text-lg mb-2">{selectedTask.title}</h4>
                      <div className="flex items-center gap-2 mb-4">
                        <Badge className={priorityColors[selectedTask.priority.toLowerCase().trim()]}>
                          {selectedTask.priority}
                        </Badge>
                        <Badge className={statusColors[selectedTask.status]} variant="secondary">
                          {selectedTask.status}
                        </Badge>
                      </div>
                    </div>

                    {selectedTask.description && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                        <p className="mt-2 text-sm leading-relaxed">{selectedTask.description}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Assigned To</Label>
                        <div className="mt-2 flex items-center gap-2">
                          {isGlobalTask(selectedTask) ? (
                            <span className="text-sm">Unassigned</span>
                          ) : (
                            <>
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                  {getStaffInitials(selectedTask.for)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{selectedTask.forName || getStaffName(selectedTask.for)}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Due Date</Label>
                        <p className="mt-2 text-sm">{selectedTask.dueDate || "No due date"}</p>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Created By</Label>
                      <div className="mt-2">
                        {staff && staff.length > 0 ? (
                          <p className="text-sm">{getStaffName(selectedTask.createdBy) || "Unknown"}</p>
                        ) : (
                          <Skeleton className="h-4 w-40" />
                        )}
                      </div>
                    </div>

                    {selectedTask.flaggedReason && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Flagged Reason</Label>
                        <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                          <p className="text-sm text-amber-800 dark:text-amber-200">{selectedTask.flaggedReason}</p>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => resolveFlag(selectedTask.id)}>
                            Resolve Flag
                          </Button>
                        </div>
                      </div>
                    )}
                    {!selectedTask.flaggedReason && selectedTask.resolutionNote && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Resolution Note</Label>
                        <div className="mt-2 p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                          <p className="text-sm text-emerald-800 dark:text-emerald-200">{selectedTask.resolutionNote}</p>
                        </div>
                      </div>
                    )}

                    {!isGlobalTask(selectedTask) && (
                      <div className="flex gap-2 pt-4">
                        <Button
                          size="sm"
                          onClick={() => {
                            completeTask(selectedTask.id)
                            setShowTaskDetails(false)
                          }}
                          className="flex-1"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Complete
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            openEditDialog(selectedTask)
                            setShowTaskDetails(false)
                          }}
                          className="flex-1"
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* New Task Modal */}
        <NewTaskModal
          open={newTaskModalOpen}
          onOpenChange={setNewTaskModalOpen}
          onTaskCreate={handleNewTaskCreated}
          userName={currentUser}
        />

        {/* Delete Confirmation Dialog */}
        <AnimatePresence>
          {deleteTaskDialogOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2 }}
                className="bg-background border border-border rounded-xl w-full max-w-md p-6 shadow-2xl"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-destructive/10">
                      <Trash className="h-5 w-5 text-destructive" />
                    </div>
                    <h2 className="text-lg font-semibold text-foreground">Delete Task</h2>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteTaskDialogOpen(false)}
                    className="h-8 w-8 rounded-lg"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <p className="text-muted-foreground mb-6 leading-relaxed">
                  Are you sure you want to delete this task? This action cannot be undone.
                </p>

                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setDeleteTaskDialogOpen(false)} className="shadow-sm">
                    Cancel
                  </Button>
                  <Button
                    onClick={async () => {
                      if (taskToDelete) {
                        await deleteTask(taskToDelete.id)
                        setDeleteTaskDialogOpen(false)
                      }
                    }}
                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-sm"
                  >
                    Delete Task
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Edit Task Dialog */}
        <AnimatePresence>
          {editDialogOpen && editedTask && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2 }}
                className="bg-background border border-border rounded-xl w-full max-w-lg p-4 shadow-2xl my-4 max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <Pencil className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">Edit Task</h2>
                      {hasChanges && (
                        <Badge className="bg-amber-500 text-white font-medium px-2 py-0.5 text-xs mt-1">Unsaved Changes</Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditDialogOpen(false)}
                    className="h-7 w-7 rounded-lg"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>

                <p className="text-muted-foreground text-xs mb-4">ID: {editedTask.id}</p>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title" className="text-foreground mb-1 block font-medium text-sm">
                      Title <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="title"
                      name="title"
                      value={editedTask.title}
                      onChange={handleInputChange}
                      className="bg-background border-border focus:border-primary focus:ring-1 focus:ring-primary/20 h-9"
                      placeholder="Enter task title"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description" className="text-foreground mb-1 block font-medium text-sm">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      name="description"
                      value={editedTask.description}
                      onChange={handleInputChange}
                      className="bg-background border-border focus:border-primary focus:ring-1 focus:ring-primary/20"
                      rows={2}
                      placeholder="Enter task description"
                    />
                  </div>

                  {editedTask.status === "Flagged" && (
                    <div>
                      <Label htmlFor="flaggedReason" className="text-foreground mb-1 block font-medium text-sm">
                        Flagged Reason <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="flaggedReason"
                        name="flaggedReason"
                        value={editedTask.flaggedReason}
                        onChange={handleInputChange}
                        className="bg-background border-border focus:border-primary focus:ring-1 focus:ring-primary/20 h-9"
                        placeholder="Enter reason for flagging"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="priority" className="text-foreground mb-1 block font-medium text-sm">
                        Priority <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={editedTask.priority}
                        onValueChange={(value) => handleSelectChange("priority", value)}
                      >
                        <SelectTrigger className="bg-background border-border focus:ring-1 focus:ring-primary/20 h-9">
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border-border">
                          <SelectItem value="Very High">Very High</SelectItem>
                          <SelectItem value="High">High</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="Low">Low</SelectItem>
                          <SelectItem value="Very Low">Very Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="status" className="text-foreground mb-1 block font-medium text-sm">
                        Status <span className="text-red-500">*</span>
                      </Label>
                      <Select value={editedTask.status} onValueChange={(value) => handleSelectChange("status", value)}>
                        <SelectTrigger className="bg-background border-border focus:ring-1 focus:ring-primary/20 h-9">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border-border">
                          <SelectItem value="In-progress">In-progress</SelectItem>
                          <SelectItem value="Completed">Completed</SelectItem>
                          <SelectItem value="Flagged">Flagged</SelectItem>
                          <SelectItem value=" Overdue">Overdue</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="dueDate" className="text-foreground mb-1 block font-medium text-sm">
                      Due Date <span className="text-muted-foreground">(Optional)</span>
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal bg-background border-border focus:border-primary focus:ring-1 focus:ring-primary/20 h-9"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {editedTask.dueDate && isValid(parse(editedTask.dueDate, "yyyy-MM-dd", new Date()))
                            ? format(parse(editedTask.dueDate, "yyyy-MM-dd", new Date()), "PPP")
                            : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        className="flex w-auto flex-col space-y-2 p-2 pointer-events-auto z-50"
                      >
                        <div className="rounded-md border">
                          <CustomCalendar
                            selected={
                              editedTask.dueDate ? parse(editedTask.dueDate, "yyyy-MM-dd", new Date()) : undefined
                            }
                            onSelect={(date) => {
                              if (date) {
                                const localStr = format(date, "yyyy-MM-dd")
                                setEditedTask((prev) => ({
                                  ...prev,
                                  dueDate: localStr,
                                }))
                                setHasChanges(true)
                              }
                            }}
                          />
                        </div>
                        {editedTask.dueDate && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditedTask((prev) => ({
                                ...prev,
                                dueDate: "",
                              }))
                              setHasChanges(true)
                            }}
                            className="w-full"
                          >
                            Clear Date
                          </Button>
                        )}
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="for" className="text-foreground mb-1 block font-medium text-sm">
                        Assigned To
                      </Label>
                      <Select value={editedTask.for || "unassigned"} onValueChange={(value) => handleSelectChange("for", value)}>
                        <SelectTrigger className="bg-background border-border focus:ring-1 focus:ring-primary/20 h-9">
                          <SelectValue placeholder="Select staff" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border-border">
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {staff.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="createdBy" className="text-foreground mb-1 block font-medium text-sm">
                        Created By
                      </Label>
                      {staff && staff.length > 0 ? (
                        <Input
                          id="createdBy"
                          value={getStaffName(editedTask.createdBy)}
                          disabled
                          className="bg-muted border-border text-muted-foreground cursor-not-allowed h-9"
                        />
                      ) : (
                        <Skeleton className="h-9 w-full rounded-md" />
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border">
                  <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="shadow-sm h-9">
                    Cancel
                  </Button>
                  <Button
                    onClick={saveChanges}
                    disabled={!hasChanges}
                    className={`flex items-center gap-2 shadow-sm h-9 ${
                      hasChanges
                        ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                        : "bg-muted text-muted-foreground cursor-not-allowed"
                    }`}
                  >
                    <Save className="h-4 w-4" />
                    Save Changes
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </TooltipProvider>
  )
}
