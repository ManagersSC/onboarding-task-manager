"use client"

import { useState, useEffect } from "react"
import { DashboardNav } from "@components/DashboardNav"
import { TaskList } from "@components/TaskList"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@components/ui/select"
import { Skeleton } from "@components/ui/skeleton"

export default function DashboardPage() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedWeek, setSelectedWeek] = useState("")

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await fetch("/api/get-tasks")
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Failed to load tasks")
        }
        const data = await response.json()
        const tasksArray = Array.isArray(data) ? data : Array.isArray(data.tasks) ? data.tasks : []
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ taskId }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to complete task")
      }

      setTasks((prevTasks) => prevTasks.map((task) => (task.id === taskId ? { ...task, status: "completed" } : task)))
    } catch (e) {
      console.error("Error completing task:", e)
    }
  }

  // Filter tasks by week
  const filteredTasks = tasks.filter((task) => {
    if (!selectedWeek) return true
    return task.week === selectedWeek
  })

  // Group tasks by status
  const assignedTasks = filteredTasks.filter((task) => task.status === "assigned")
  const overdueTasks = filteredTasks.filter((task) => task.status === "overdue")
  const completedTasks = filteredTasks.filter((task) => task.status === "completed")

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardNav />
        <main className="container mx-auto px-4 py-8">
          <div className="mb-8 flex items-center justify-between">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-10 w-48" />
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="h-8 w-24" />
                {[...Array(2)].map((_, j) => (
                  <Skeleton key={j} className="h-32 w-full" />
                ))}
              </div>
            ))}
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardNav />
        <main className="container mx-auto px-4 py-8">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-red-800">{error}</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Your Tasks</h1>
          <Select value={selectedWeek} onValueChange={setSelectedWeek}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by Week" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Weeks</SelectItem>
              {[1, 2, 3, 4, 5].map((week) => (
                <SelectItem key={week} value={week.toString()}>
                  Week {week}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          <TaskList title="Assigned" tasks={assignedTasks} onComplete={handleComplete} />
          <TaskList title="Overdue" tasks={overdueTasks} onComplete={handleComplete} />
          <TaskList title="Completed" tasks={completedTasks} onComplete={handleComplete} />
        </div>
      </main>
    </div>
  )
}

