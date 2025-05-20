"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Plus,
  FileText,
  Pencil,
  Trash,
  X
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@components/ui/dialog" 
import { Card, CardContent, CardHeader, CardTitle } from "@components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs"
import { Button } from "@components/ui/button"
import { Badge } from "@components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@components/ui/dropdown-menu"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@components/ui/collapsible"
import { TaskManagementSkeleton } from "./skeletons/task-management-skeleton"
import { NewTaskModal } from "./subComponents/new-staff-task-modal"
import { toast } from "sonner"

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
  const normalizedStatus = (status || "").toLowerCase().trim();
  if (normalizedStatus === "today" || normalizedStatus === "in-progress") {
    return "upcoming";
  } else if (normalizedStatus === "overdue") {
    return "overdue";
  } else if (normalizedStatus === "blocked") {
    return "blocked";
  }
  return "upcoming"; // Default fallback
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
  
  const fetchTasks = () => {
    setLoading(true)
    fetch("/api/dashboard/tasks")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch tasks")
        return res.json()
      })
      .then((data) => {
        console.log("Fetched tasks:", data.tasks);
        setTasks(data.tasks || { upcoming: [], overdue: [], blocked: [] })
        setLoading(false)
      })
      .catch((err) => {
        console.error("Error fetching tasks:", err)
        setError(err.message)
        setLoading(false)
      })
  }

  const completeTask = async(taskId) => {
    console.log("PATCHing taskId:", taskId);
    const response = await fetch(`/api/dashboard/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json"},
      body: JSON.stringify({ action: "complete" })
    })
    if (response.ok) {
      fetchTasks(); // Refresh the list after completion
    }
  }

  const deleteTask = (taskId) => {
    // Find and remove from UI
    let deletedTask;
    const newTasks = { ...tasks };
    for (const key of Object.keys(newTasks)) {
      const idx = newTasks[key].findIndex((t) => t.id === taskId);
      if (idx !== -1) {
        deletedTask = newTasks[key][idx];
        newTasks[key] = [
          ...newTasks[key].slice(0, idx),
          ...newTasks[key].slice(idx + 1),
        ];
        break;
      }
    }
    setTasks(newTasks);

    toast(
      <div>
        <span>Task deleted.</span>
        <Button onClick={() => handleUndoDelete(deletedTask)} size="sm" variant="outline" className="ml-2">Undo</Button>
      </div>,
      {
        duration: 10000,
        onAutoClose: async () => {
          if (deletedTask) {
            console.log("Deleting task:", deletedTask);
            await fetch(`/api/dashboard/tasks/${deletedTask.id}`, { method: 'DELETE' });
          }
        }
      }
    );
  };

  const handleUndoDelete = (task) => {
    if (!task) return;
    const group = getStatusGroup(task.status);
    setTasks((prev) => ({
      ...prev,
      [group]: [task, ...prev[group]]
    }));
    toast.dismiss();
  };

  useEffect(() => {
    fetchTasks()

    // In a real app, you would fetch the current user here
    // Example:
    // fetchCurrentUser().then(user => setCurrentUser(user.name))
  }, [])

  useEffect(() => {
    fetch("/api/admin/staff")
      .then((res) => res.json())
      .then((data) => setStaff(data))
      .catch(() => setStaff([]));
  }, []);

  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    };
  }, []);

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
      });
      if (!response.ok) throw new Error("Failed to create task");
      fetchTasks(); // Refresh the list after creating
      // Find staff name
      let staffName = "Unknown";
      if (taskData.assignTo) {
        const staffObj = staff.find((s) => s.id === taskData.assignTo);
        if (staffObj) staffName = staffObj.name;
      }
      toast.success(
        <div>
          <div className="font-semibold">Task Created Successfully</div>
          <div className="text-sm opacity-80">"{taskData.title}" assigned to {staffName}</div>
        </div>,
        { duration: 5000 }
      );
    } catch (err) {
      toast.error(
        <div>
          <div className="font-semibold">Error Creating Task</div>
          <div className="text-sm opacity-80">{err.message}</div>
        </div>,
        { duration: 5000 }
      );
    }
  };

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
                          {task.blockedReason && (
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
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                          console.log("Completing task:", task);
                          completeTask(task.id);
                        }}>
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Task Management</CardTitle>
            <Button size="sm" onClick={() => setNewTaskModalOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              New Task
            </Button>
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
    </motion.div>
  )
}
