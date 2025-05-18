"use client"

import { useState, useEffect } from "react"
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
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs"
import { Button } from "@components/ui/button"
import { Badge } from "@components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@components/ui/dropdown-menu"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@components/ui/collapsible"
import { TaskManagementSkeleton } from "./skeletons/task-management-skeleton"

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

  useEffect(() => {
    setLoading(true)
    fetch("/api/dashboard/tasks")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch tasks")
        return res.json()
      })
      .then((data) => {
        setTasks(data.tasks || { upcoming: [], overdue: [], blocked: [] })
        setLoading(false)
      })
      .catch((err) => {
        console.error("Error fetching tasks:", err)
        setError(err.message)
        setLoading(false)
      })
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
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Reassign</DropdownMenuItem>
                            <DropdownMenuItem>Edit</DropdownMenuItem>
                            <DropdownMenuItem>Postpone</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
      <Button size="sm" variant="outline">
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
            <Button onClick={() => window.location.reload()} variant="outline">
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
            <Button size="sm">
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
                ? sortPriorityGroups(groupTasksByPriority(tasks.upcoming)).map(([priority, tasks]) =>
                    renderTaskGroup(tasks, priority, "upcoming"),
                  )
                : renderEmptyState("upcoming")}
            </TabsContent>

            <TabsContent value="overdue" className="mt-0">
              {tasks.overdue.length > 0
                ? sortPriorityGroups(groupTasksByPriority(tasks.overdue)).map(([priority, tasks]) =>
                    renderTaskGroup(tasks, priority, "overdue"),
                  )
                : renderEmptyState("overdue")}
            </TabsContent>

            <TabsContent value="blocked" className="mt-0">
              {tasks.blocked.length > 0
                ? sortPriorityGroups(groupTasksByPriority(tasks.blocked)).map(([priority, tasks]) =>
                    renderTaskGroup(tasks, priority, "blocked"),
                  )
                : renderEmptyState("blocked")}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  )
}
