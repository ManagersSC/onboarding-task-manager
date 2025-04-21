"use client"

import { useState } from "react"
import { TaskCard } from "@components/TaskCard"
import { Button } from "@components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@components/ui/select"
import { ArrowUpDown } from "lucide-react"

export default function TaskList({ tasks, onComplete }) {
  const [sortBy, setSortBy] = useState("status")
  const [sortDirection, setSortDirection] = useState("asc")

  // Sort tasks
  const sortedTasks = [...tasks].sort((a, b) => {
    let comparison = 0

    if (sortBy === "title") {
      comparison = a.title.localeCompare(b.title)
    } else if (sortBy === "week") {
      comparison = (a.week || 0) - (b.week || 0)
    } else if (sortBy === "status") {
      // Sort by status priority: overdue > assigned > completed
      const statusPriority = { overdue: 0, assigned: 1, completed: 2 }
      const statusA = a.status || (a.completed ? "completed" : a.overdue ? "overdue" : "assigned")
      const statusB = b.status || (b.completed ? "completed" : b.overdue ? "overdue" : "assigned")
      comparison = statusPriority[statusA] - statusPriority[statusB]
    } else if (sortBy === "urgency") {
      // Sort by urgency priority: Critical > High > Medium > Low
      const urgencyPriority = { Critical: 0, High: 1, Medium: 2, Low: 3 }
      const urgencyA = urgencyPriority[a.urgency || "Medium"]
      const urgencyB = urgencyPriority[b.urgency || "Medium"]
      comparison = urgencyA - urgencyB
    } else if (sortBy === "type") {
      // Sort by type: custom first, then standard
      comparison = (b.isCustom ? 1 : 0) - (a.isCustom ? 1 : 0)
    }

    return sortDirection === "asc" ? comparison : -comparison
  })

  const toggleSortDirection = () => {
    setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-foreground">
          {tasks.length} {tasks.length === 1 ? "Task" : "Tasks"}
        </h2>

        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="title">Title</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="urgency">Urgency</SelectItem>
              <SelectItem value="type">Type</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={toggleSortDirection}
            title={sortDirection === "asc" ? "Ascending" : "Descending"}
          >
            <ArrowUpDown
              className={"h-4 w-4 " + (sortDirection === "desc" ? "rotate-180" : "") + " transition-transform"}
            />
          </Button>
        </div>
      </div>

      {sortedTasks.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedTasks.map((task) => {
            // Ensure each task has a proper status
            const taskWithStatus = {
              ...task,
              status: task.status || (task.completed ? "completed" : task.overdue ? "overdue" : "assigned"),
            }
            return <TaskCard key={task.id} task={taskWithStatus} onComplete={onComplete} />
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">No tasks found</p>
        </div>
      )}
    </div>
  )
}
