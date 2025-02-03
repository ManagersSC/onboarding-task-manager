"use client"

import { useState, useEffect } from "react"
import TaskList from "../../../components/TaskList"

export default function DashboardPage() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await fetch("/api/get-tasks")
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Failed to load tasks")
        }
        const data = await response.json()
        setTasks(data)
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

      setTasks((prevTasks) => prevTasks.map((task) => (task.id === taskId ? { ...task, completed: true } : task)))
    } catch (e) {
      console.error("Error completing task:", e)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f8f9fa]">
        <div className="animate-pulse text-gray-500">Loading tasks...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f8f9fa]">
        <div className="text-red-500 max-w-md text-center">
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  const assignedTasks = tasks.filter((task) => !task.completed && !task.overdue)
  const overdueTasks = tasks.filter((task) => task.overdue)
  const completedTasks = tasks.filter((task) => task.completed)

  return (
    <div className="min-h-screen bg-[#f8f9fa] py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <h1 className="text-2xl font-semibold mb-8 text-gray-900">Your Tasks</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <TaskList title="Assigned" tasks={assignedTasks} onComplete={handleComplete} />
          <TaskList title="Overdue" tasks={overdueTasks} onComplete={handleComplete} />
          <TaskList title="Completed" tasks={completedTasks} onComplete={handleComplete} />
        </div>
      </div>
    </div>
  )
}

