"use client"

import { useState, useEffect } from "react"
import TaskList from "../../../components/TaskList"

export default function DashboardPage() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedWeek, setSelectedWeek] = useState("");

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await fetch("/api/get-tasks");

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to load tasks");
        }

        const data = await response.json();

        // Determine if the data is directly an array (when tasks exist)
        // or an object with a `tasks` property (when no tasks exist)
        const tasksArray = Array.isArray(data) 
        ? data // If it's already an array, use it directly
        : (Array.isArray(data.tasks) ? data.tasks: []); // Otherwise, extract tasks or default to an empty array
        
        // update the state with the array of tasks, which will trigger a re-render
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

      setTasks((prevTasks) => prevTasks.map((task) => (task.id === taskId ? { ...task, completed: true } : task)))
    } catch (e) {
      console.log("Error completing task:", e)
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

  // Filter by Week
  const filterByWeek = tasks.filter((task) => {
    if(!selectedWeek) return true;
    return task.week === selectedWeek;
  })

  // Task Kanban filtering
  const assignedTasks = filterByWeek.filter((task) => !task.completed && !task.overdue)
  const overdueTasks = filterByWeek.filter((task) => task.overdue)
  const completedTasks = filterByWeek.filter((task) => task.completed)

  return (
    <div className="min-h-screen bg-[#f8f9fa] py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Title + Week dropdown in same row */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Your Tasks</h1>
          <div>
            <label htmlFor="weekSelect" className="mr-2 text-gray-900">
              Filter by Week:
            </label>
            <select
              id="weekSelect"
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-gray-900"
            >
              <option value="">All</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
            </select>
          </div>
        </div>

        { tasks.length > 0 ? (
          <>
            {/* Kanban columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <TaskList title="Assigned" tasks={assignedTasks} onComplete={handleComplete} />
              <TaskList title="Overdue" tasks={overdueTasks} onComplete={handleComplete} />
              <TaskList title="Completed" tasks={completedTasks} onComplete={handleComplete} />
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center min-h-screen bg-[#f8f9fa]">
            <p className="text-gray-500">No tasks assigned yet.</p>
          </div>
        ) }

        
      </div>
    </div>
  )
}

