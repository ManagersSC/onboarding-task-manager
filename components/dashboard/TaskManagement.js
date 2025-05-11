"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronRight, MoreHorizontal } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs"
import { Button } from "@components/ui/button"
import { Badge } from "@components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@components/ui/dropdown-menu"

// Demo data
const tasks = {
  upcoming: [
    {
      id: 1,
      title: "Schedule welcome meeting",
      assignee: "You",
      dueDate: "Today",
      priority: "high",
      newHire: "Sarah Chen",
      department: "Engineering",
    },
    {
      id: 2,
      title: "Prepare workstation",
      assignee: "IT Team",
      dueDate: "Tomorrow",
      priority: "high",
      newHire: "Michael Rodriguez",
      department: "Design",
    },
    {
      id: 3,
      title: "Send benefits package",
      assignee: "HR",
      dueDate: "In 2 days",
      priority: "medium",
      newHire: "Alex Johnson",
      department: "Marketing",
    },
  ],
  overdue: [
    {
      id: 4,
      title: "Complete security training",
      assignee: "You",
      dueDate: "Yesterday",
      priority: "high",
      newHire: "James Wilson",
      department: "Sales",
    },
    {
      id: 5,
      title: "Team introduction email",
      assignee: "You",
      dueDate: "2 days ago",
      priority: "medium",
      newHire: "Emily Parker",
      department: "Finance",
    },
  ],
  blocked: [
    {
      id: 6,
      title: "System access setup",
      assignee: "IT Team",
      dueDate: "Today",
      priority: "high",
      newHire: "David Kim",
      department: "Engineering",
      blockedReason: "Awaiting security clearance",
    },
    {
      id: 7,
      title: "Department orientation",
      assignee: "Department Head",
      dueDate: "Tomorrow",
      priority: "medium",
      newHire: "Lisa Thompson",
      department: "Customer Support",
      blockedReason: "Department head on leave",
    },
  ],
}

const priorityColors = {
  high: "text-red-500 bg-red-100 dark:bg-red-900/20",
  medium: "text-amber-500 bg-amber-100 dark:bg-amber-900/20",
  low: "text-green-500 bg-green-100 dark:bg-green-900/20",
}

export function TaskManagement() {
  const [expandedGroups, setExpandedGroups] = useState({
    high: true,
    medium: true,
    low: true,
  })

  const toggleGroup = (group) => {
    setExpandedGroups({
      ...expandedGroups,
      [group]: !expandedGroups[group],
    })
  }

  const groupTasksByPriority = (taskList) => {
    return taskList.reduce((acc, task) => {
      if (!acc[task.priority]) {
        acc[task.priority] = []
      }
      acc[task.priority].push(task)
      return acc
    }, {})
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
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="bg-card rounded-md p-3 mb-2 border shadow-sm hover:shadow-md transition-shadow"
                  whileHover={{ scale: 1.01 }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <Badge className={`mr-2 ${priorityColors[task.priority]}`} variant="secondary">
                          {task.priority}
                        </Badge>
                        <h5 className="font-medium">{task.title}</h5>
                      </div>
                      <div className="mt-2 text-sm text-muted-foreground">
                        <p>
                          For: <span className="font-medium">{task.newHire}</span> ({task.department})
                        </p>
                        <div className="flex items-center mt-1">
                          <Clock className="h-3 w-3 mr-1" />
                          <span className={tabId === "overdue" ? "text-red-500" : ""}>{task.dueDate}</span>
                          <span className="mx-2">•</span>
                          <span>Assigned to: {task.assignee}</span>
                        </div>
                        {task.blockedReason && (
                          <div className="flex items-center mt-1 text-amber-500">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            <span>{task.blockedReason}</span>
                          </div>
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
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
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
              <span className="mr-1">+</span> New Task
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
              {Object.entries(groupTasksByPriority(tasks.upcoming))
                .sort(([a], [b]) => {
                  const order = { high: 0, medium: 1, low: 2 }
                  return order[a] - order[b]
                })
                .map(([priority, tasks]) => renderTaskGroup(tasks, priority, "upcoming"))}
            </TabsContent>

            <TabsContent value="overdue" className="mt-0">
              {Object.entries(groupTasksByPriority(tasks.overdue))
                .sort(([a], [b]) => {
                  const order = { high: 0, medium: 1, low: 2 }
                  return order[a] - order[b]
                })
                .map(([priority, tasks]) => renderTaskGroup(tasks, priority, "overdue"))}
            </TabsContent>

            <TabsContent value="blocked" className="mt-0">
              {Object.entries(groupTasksByPriority(tasks.blocked))
                .sort(([a], [b]) => {
                  const order = { high: 0, medium: 1, low: 2 }
                  return order[a] - order[b]
                })
                .map(([priority, tasks]) => renderTaskGroup(tasks, priority, "blocked"))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  )
}
