"use client"

import { useState } from "react"
import { TaskCard } from "@components/TaskCard"
import { Button } from "@components/ui/button"
import { Input } from "@components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@components/ui/select"
import { ArrowUpDown, Search } from "lucide-react"

export default function TaskList({ title, tasks, onComplete }) {
  const [sortBy, setSortBy] = useState("status")
  const [sortDirection, setSortDirection] = useState("asc")
  const [searchQuery, setSearchQuery] = useState("")

  // Filter tasks by search query
  const filteredTasks = tasks.filter(
    (task) =>
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  // Sort tasks
  const sortedTasks = [...filteredTasks].sort((a, b) => {
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
    }

    return sortDirection === "asc" ? comparison : -comparison
  })

  const toggleSortDirection = () => {
    setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="title">Title</SelectItem>
                <SelectItem value="week">Week</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={toggleSortDirection}
              title={sortDirection === "asc" ? "Ascending" : "Descending"}
            >
              <ArrowUpDown className={`h-4 w-4 ${sortDirection === "desc" ? "rotate-180" : ""} transition-transform`} />
            </Button>
          </div>
        </div>
      </div>

      {filteredTasks.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedTasks.map((task) => (
            <TaskCard key={task.id} task={task} onComplete={onComplete} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">No tasks found</p>
        </div>
      )}
    </div>
  )
}
