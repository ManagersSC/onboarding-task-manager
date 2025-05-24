"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Plus,
  FileText,
  Pencil,
  Trash,
  X,
  CalendarIcon,
  RefreshCw,
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@components/ui/select"
import { Input } from "@components/ui/input"
import { Label } from "@components/ui/label"
import { Textarea } from "@components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs"
import { Button } from "@components/ui/button"
import { Badge } from "@components/ui/badge"
import { Save } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@components/ui/collapsible"
import { TaskManagementSkeleton } from "./skeletons/task-management-skeleton"
import { NewTaskModal } from "./subComponents/new-staff-task-modal"
import { toast, Toaster } from "sonner"
import { Popover, PopoverContent, PopoverTrigger } from "@components/ui/popover"
import { CustomCalendar } from "@components/dashboard/subComponents/custom-calendar"
import { format, parse, isValid } from "date-fns"

// Enhanced priority colors with very high priority
const priorityColors = {
  "very high": "text-white bg-red-600 dark:bg-red-700",
  high: "text-red-500 bg-red-100 dark:bg-red-900/20",
  medium: "text-amber-500 bg-amber-100 dark:bg-amber-900/20",
  low: "text-green-500 bg-green-100 dark:bg-green-900/20",
  "very low": "text-blue-500 bg-blue-100 dark:bg-blue-900/20",
}

// Priority order for sorting
const priorityOrder = {
  "very high": 1,
  high: 2,
  medium: 3,
  low: 4,
  "very low": 5,
}

const statusColors = {
  "in-progress": "text-blue-500 bg-blue-100 dark:bg-blue-900/20",
  today: "text-purple-500 bg-purple-100 dark:bg-purple-900/20",
  overdue: "text-red-500 bg-red-100 dark:bg-red-900/20",
  blocked: "text-amber-500 bg-amber-100 dark:bg-amber-900/20",
}

function getStatusGroup(status) {
  const normalizedStatus = (status || "").toLowerCase().trim()
  if (normalizedStatus === "today" || normalizedStatus === "in-progress") {
    return "upcoming"
  } else if (normalizedStatus === "overdue") {
    return "overdue"
  } else if (normalizedStatus === "blocked") {
    return "blocked"
  }
  return "upcoming" // Default fallback
}

const statusMap = {
  "in-progress": "In-Progress",
  completed: "Completed",
  blocked: "Blocked",
  overdue: "Overdue",
  today: "In-Progress",
}

// Shared normalization functions
const normalizeStatus = (status) => {
  if (!status) return ""
  const key = status.toLowerCase().replace(/\s+/g, "-")
  return statusMap[key] || status
}

const normalizeStaffId = (val, staff) => {
  if (!val) return ""
  // If already an ID, return as is
  if (staff.some((s) => s.id === val)) return val
  // Otherwise, try to find by name
  const found = staff.find((s) => s.name === val)
  return found ? found.id : val
}

const normalizeDueDate = (date) => {
  if (!date) return ""
  try {
    // If it's already in yyyy-MM-dd format, keep it
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date
    return format(parse(date, "yyyy-MM-dd", new Date()), "yyyy-MM-dd")
  } catch {
    return date
  }
}

// Helper to normalize a task object
const normalizeTask = (task, staff) => {
  return {
    ...task,
    title: task.title || "",
    description: task.description || "",
    blockedReason: task.blockedReason || "",
    priority: task.priority || "",
    status: normalizeStatus(task.status),
    dueDate: normalizeDueDate(task.rawDueDate || task.dueDate),
    for: normalizeStaffId(task.for, staff),
  }
}

// Helper to compare only editable fields
function isTaskChanged(original, edited, staff) {
  if (!original || !edited) return false

  // Normalize both tasks using the same logic
  const normalizedOriginal = normalizeTask(original, staff)
  const normalizedEdited = normalizeTask(edited, staff)

  const fields = ["title", "description", "blockedReason", "priority", "status", "dueDate", "for"]

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
  const [expandedGroups, setExpandedGroups] = useState({
    "very high": true,
    high: true,
    medium: true,
    low: true,
    "very low": true,
  })
  const [expandedTasks, setExpandedTasks] = useState({})
  const [tasks, setTasks] = useState({ upcoming: [], overdue: [], blocked: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [newTaskModalOpen, setNewTaskModalOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState("John Doe")
  const [staff, setStaff] = useState([])

  const [deleteTaskDialogOpen, setDeleteTaskDialogOpen] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState(null)
  const [recentlyDeletedTask, setRecentlyDeletedTask] = useState(null)
  const undoTimeoutRef = useRef(null)

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [taskToEdit, setTaskToEdit] = useState(null)
  const [editedTask, setEditedTask] = useState(null)
  const [hasChanges, setHasChanges] = useState(false)

  const fetchTasks = () => {
    setLoading(true)
    fetch("/api/dashboard/tasks")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch tasks")
        return res.json()
      })
      .then((data) => {
        console.log("Fetched tasks:", data.tasks)
        setTasks(data.tasks || { upcoming: [], overdue: [], blocked: [] })
        setLoading(false)
      })
      .catch((err) => {
        console.error("Error fetching tasks:", err)
        setError(err.message)
        setLoading(false)
      })
  }

  const completeTask = async (taskId) => {
    try {
      const response = await fetch(`/api/dashboard/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete" }),
      })
      if (!response.ok) throw new Error("Failed to complete task")
      fetchTasks() // Refresh the list after completion
      toast.success("Task marked as complete!")
    } catch (err) {
      toast.error("Error completing task: " + err.message)
    }
  }

  const deleteTask = (taskId) => {
    // Find and remove from UI
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

    toast(
      <div>
        <span>Task deleted.</span>
        <Button onClick={() => handleUndoDelete(deletedTask)} size="sm" variant="outline" className="ml-2">
          Undo
        </Button>
      </div>,
      {
        duration: 10000,
        onAutoClose: async () => {
          if (deletedTask) {
            try {
              const res = await fetch(`/api/dashboard/tasks/${deletedTask.id}`, { method: "DELETE" })
              if (!res.ok) throw new Error("Failed to delete task")
              toast.success("Task permanently deleted.")
            } catch (err) {
              toast.error("Error deleting task: " + err.message)
            }
          }
        },
      },
    )
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
      const response = await fetch(`/api/dashboard/tasks/${editedTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit",
          title: editedTask.title,
          description: editedTask.description,
          blockedReason: editedTask.blockedReason,
          priority: editedTask.priority,
          status: editedTask.status,
          dueDate: editedTask.dueDate,
          for: editedTask.for ? [editedTask.for] : [], // always send array of staff ID
        }),
      })
      if (!response.ok) throw new Error("Failed to update task")
      fetchTasks() // Refresh the list from backend
      setEditDialogOpen(false)
      setHasChanges(false)
      toast.success("Task updated!")
    } catch (err) {
      toast.error("Error updating task: " + err.message)
    }
  }

  useEffect(() => {
    if (taskToEdit && editedTask && staff.length > 0) {
      setHasChanges(isTaskChanged(taskToEdit, editedTask, staff))
    }
  }, [editedTask, taskToEdit, staff])

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
    return () => {
      const timeout = undoTimeoutRef.current
      if (timeout) clearTimeout(timeout)
    }
  }, [])

  const toggleGroup = (group) => {
    setExpandedGroups({
      ...expandedGroups,
      [group]: !expandedGroups[group],
    })
  }

  const toggleTaskDescription = (taskId) => {
    setExpandedTasks({
      ...expandedTasks,
      [taskId]: !expandedTasks[taskId],
    })
  }

  const handleNewTaskCreated = async (taskData) => {
    try {
      const response = await fetch("/api/dashboard/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskData),
      })
      if (!response.ok) throw new Error("Failed to create task")
      fetchTasks() // Refresh the list after creating
      // Find staff name
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

  const groupTasksByPriority = (taskList) => {
    return taskList.reduce((acc, task) => {
      const priority = task.priority.toLowerCase().trim()
      if (!acc[priority]) {
        acc[priority] = []
      }
      acc[priority].push(task)
      return acc
    }, {})
  }

  const sortPriorityGroups = (groups) => {
    return Object.entries(groups).sort(([a], [b]) => {
      // Use the priorityOrder mapping for correct sorting
      return (priorityOrder[a] || 999) - (priorityOrder[b] || 999)
    })
  }

  const renderTaskGroup = (tasks, priority, tabId) => {
    if (!tasks || tasks.length === 0) return null

    return (
      <div className="mb-2">
        <motion.div
          className="flex items-center cursor-pointer py-2"
          onClick={() => toggleGroup(priority)}
          whileHover={{ scale: 1.01 }}
        >
          {expandedGroups[priority] ? (
            <ChevronDown className="h-4 w-4 mr-2" />
          ) : (
            <ChevronRight className="h-4 w-4 mr-2" />
          )}
          <h4 className="text-sm font-medium capitalize">{priority} Priority</h4>
          <Badge variant="outline" className="ml-2">
            {tasks.length}
          </Badge>
        </motion.div>

        <AnimatePresence>
          {expandedGroups[priority] && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              {tasks.map((task) => (
                <Collapsible
                  key={task.id}
                  open={expandedTasks[task.id]}
                  onOpenChange={() => toggleTaskDescription(task.id)}
                >
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="bg-card rounded-md p-3 mb-2 border shadow-sm hover:shadow-md transition-shadow"
                    whileHover={{ scale: 1.01 }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center flex-wrap gap-2">
                          <Badge
                            className={
                              priorityColors[task.priority.toLowerCase().trim()] || "bg-gray-100 text-gray-500"
                            }
                            variant="secondary"
                          >
                            {task.priority}
                          </Badge>
                          <Badge
                            className={statusColors[task.status] || "bg-gray-100 text-gray-500"}
                            variant="secondary"
                          >
                            {task.status}
                          </Badge>
                          <h5 className="font-medium">{task.title}</h5>
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          <p>
                            For: <span className="font-medium">{task.for || "Unassigned"}</span>
                          </p>
                          <div className="flex items-center mt-1">
                            <Clock className="h-3 w-3 mr-1" />
                            <span className={tabId === "overdue" ? "text-red-500" : ""}>
                              {task.dueDate || "No due date"}
                            </span>
                            <span className="mx-2">•</span>
                            <span>Created by: {task.createdBy || "Unknown"}</span>
                          </div>
                          {tabId === "blocked" && task.blockedReason && (
                            <div className="flex items-center mt-1 text-amber-500">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              <span>{task.blockedReason}</span>
                            </div>
                          )}
                          {task.description && (
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm" className="mt-2 p-0 h-auto">
                                <FileText className="h-3 w-3 mr-1" />
                                <span>{expandedTasks[task.id] ? "Hide details" : "Show details"}</span>
                              </Button>
                            </CollapsibleTrigger>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            console.log("Completing task:", task)
                            completeTask(task.id)
                          }}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(task)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                          onClick={() => {
                            setDeleteTaskDialogOpen(true)
                            setTaskToDelete(task)
                          }}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {task.description && (
                      <CollapsibleContent>
                        <div className="mt-3 pt-3 border-t text-sm">
                          <p className="whitespace-pre-line">{task.description}</p>
                        </div>
                      </CollapsibleContent>
                    )}
                  </motion.div>
                </Collapsible>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  const renderEmptyState = (tabId) => (
    <div className="py-8 text-center">
      <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
        {tabId === "upcoming" && <Clock className="h-6 w-6 text-muted-foreground" />}
        {tabId === "overdue" && <AlertCircle className="h-6 w-6 text-muted-foreground" />}
        {tabId === "blocked" && <AlertCircle className="h-6 w-6 text-muted-foreground" />}
      </div>
      <h3 className="text-lg font-medium mb-1">No {tabId} tasks</h3>
      <p className="text-sm text-muted-foreground mb-4">
        {tabId === "upcoming" && "You don't have any upcoming tasks at the moment."}
        {tabId === "overdue" && "You don't have any overdue tasks. Great job!"}
        {tabId === "blocked" && "You don't have any blocked tasks right now."}
      </p>
      <Button size="sm" variant="outline" onClick={() => setNewTaskModalOpen(true)}>
        <Plus className="h-4 w-4 mr-1" />
        Create Task
      </Button>
    </div>
  )

  if (loading) {
    return <TaskManagementSkeleton />
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Failed to load tasks</h3>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => fetchTasks()} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const openEditDialog = (task) => {
    setTaskToEdit(task)
    setEditedTask({
      ...task,
      dueDate: task.dueDate || "",
      for: task.for || "",
    })
    setEditDialogOpen(true)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Toaster position="top-right" richColors />
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Task Management</CardTitle>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={fetchTasks} title="Refresh tasks">
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
              <Button size="sm" onClick={() => setNewTaskModalOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                New Task
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="upcoming">
                Upcoming
                <Badge className="ml-2 bg-blue-500 hover:bg-blue-500/90" variant="secondary">
                  {tasks.upcoming.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="overdue">
                Overdue
                <Badge className="ml-2 bg-red-500 hover:bg-red-500/90" variant="secondary">
                  {tasks.overdue.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="blocked">
                Blocked
                <Badge className="ml-2 bg-amber-500 hover:bg-amber-500/90" variant="secondary">
                  {tasks.blocked.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="mt-0">
              {tasks.upcoming.length > 0
                ? sortPriorityGroups(groupTasksByPriority(tasks.upcoming)).map(([priority, tasks]) => (
                    <div key={`upcoming-${priority}`}>{renderTaskGroup(tasks, priority, "upcoming")}</div>
                  ))
                : renderEmptyState("upcoming")}
            </TabsContent>

            <TabsContent value="overdue" className="mt-0">
              {tasks.overdue.length > 0
                ? sortPriorityGroups(groupTasksByPriority(tasks.overdue)).map(([priority, tasks]) => (
                    <div key={`overdue-${priority}`}>{renderTaskGroup(tasks, priority, "overdue")}</div>
                  ))
                : renderEmptyState("overdue")}
            </TabsContent>

            <TabsContent value="blocked" className="mt-0">
              {tasks.blocked.length > 0
                ? sortPriorityGroups(groupTasksByPriority(tasks.blocked)).map(([priority, tasks]) => (
                    <div key={`blocked-${priority}`}>{renderTaskGroup(tasks, priority, "blocked")}</div>
                  ))
                : renderEmptyState("blocked")}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0f1729] text-white rounded-lg w-full max-w-md p-6 relative"
            >
              <button
                onClick={() => setDeleteTaskDialogOpen(false)}
                className="absolute right-4 top-4 text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>

              <h2 className="text-xl font-semibold mb-2">Delete Task</h2>
              <p className="text-gray-400 mb-6">Are you sure you want to delete this task?</p>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setDeleteTaskDialogOpen(false)}
                  className="bg-primary text-black border-none"
                >
                  No
                </Button>
                <Button
                  onClick={() => {
                    if (taskToDelete) {
                      deleteTask(taskToDelete.id)
                      setDeleteTaskDialogOpen(false)
                    }
                  }}
                  className="bg-[#9e2a2b] hover:bg-[#801f20] text-white border-none"
                >
                  Yes
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Task Dialog */}
      <AnimatePresence>
        {editDialogOpen && editedTask && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-background text-white rounded-lg w-full max-w-2xl p-6 relative"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold">Edit Task</h2>
                  {hasChanges && (
                    <Badge className="bg-orange-500 text-white font-medium px-3 py-1">Unsaved Changes</Badge>
                  )}
                </div>
                <button onClick={() => setEditDialogOpen(false)} className="text-gray-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <p className="text-gray-400 italic mb-5 text-sm">ID: {editedTask.id}</p>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="title" className="text-gray-300 mb-1.5 block">
                    Title
                  </Label>
                  <Input
                    id="title"
                    name="title"
                    value={editedTask.title}
                    onChange={handleInputChange}
                    className="bg-background border-[#334155] text-white focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]"
                  />
                </div>

                <div>
                  <Label htmlFor="description" className="text-gray-300 mb-1.5 block">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={editedTask.description}
                    onChange={handleInputChange}
                    className="bg-background border-[#334155] text-white focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="blockedReason" className="text-gray-300 mb-1.5 block">
                    Blocked Reason (if any)
                  </Label>
                  <Input
                    id="blockedReason"
                    name="blockedReason"
                    value={editedTask.blockedReason}
                    onChange={handleInputChange}
                    className="bg-background border-[#334155] text-white focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="priority" className="text-gray-300 mb-1.5 block">
                      Priority
                    </Label>
                    <Select
                      value={editedTask.priority}
                      onValueChange={(value) => handleSelectChange("priority", value)}
                    >
                      <SelectTrigger className="bg-background border-[#334155] text-white focus:ring-1 focus:ring-[#3B82F6]">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border-[#334155] text-white">
                        <SelectItem value="Very High">Very High</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Very Low">Very Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="status" className="text-gray-300 mb-1.5 block">
                      Status
                    </Label>
                    <Select value={editedTask.status} onValueChange={(value) => handleSelectChange("status", value)}>
                      <SelectTrigger className="bg-background border-[#334155] text-white focus:ring-1 focus:ring-[#3B82F6]">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border-[#334155] text-white">
                        <SelectItem value="In-Progress">In-Progress</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="Blocked">Blocked</SelectItem>
                        <SelectItem value="Overdue">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="dueDate" className="text-gray-300 mb-1.5 block">
                    Due Date
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal bg-background border-[#334155] text-white focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]"
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
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label htmlFor="for" className="text-gray-300 mb-1.5 block">
                    Assigned To
                  </Label>
                  <Select value={editedTask.for || ""} onValueChange={(value) => handleSelectChange("for", value)}>
                    <SelectTrigger className="bg-background border-[#334155] text-white focus:ring-1 focus:ring-[#3B82F6]">
                      <SelectValue placeholder="Select staff" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-[#334155] text-white">
                      {staff.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="createdBy" className="text-gray-300 mb-1.5 block">
                    Created By
                  </Label>
                  <Input
                    id="createdBy"
                    value={editedTask.createdBy}
                    disabled
                    className="bg-background border-[#334155] text-gray-400 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setEditDialogOpen(false)}
                  className="bg-transparent hover:bg-gray-700 text-white border-gray-600"
                >
                  Cancel
                </Button>
                <Button
                  onClick={saveChanges}
                  disabled={!hasChanges}
                  className={`flex items-center gap-2 ${
                    hasChanges
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-gray-600 text-gray-300 cursor-not-allowed"
                  }`}
                >
                  <Save size={16} />
                  Save Changes
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
