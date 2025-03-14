"use client"

import { useState, useEffect } from "react"
import { DashboardNav } from "@components/DashboardNav"
import { TaskList } from "@components/TaskList"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@components/ui/select"
import { Skeleton } from "@components/ui/skeleton"

// src/app/dashboard/page.js
export default function DashboardPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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

        // Transform the backend data to match the frontend's expected structure
        const tasksArray = data.map((task) => ({
          id: task.id,
          title: Array.isArray(task.title) ? task.title[0] : task.title,
          description: task.description,
          completed: task.completed,
          overdue: task.overdue,
          resourceUrl: Array.isArray(task.resourceUrl) ? task.resourceUrl[0] : task.resourceUrl,
          lastStatusChange: task.lastStatusChange,
          week: task.week,
        }));

        setTasks(tasksArray);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, []);

  const handleComplete = async (taskId) => {
    try {
      const response = await fetch("/api/complete-task", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ taskId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to complete task");
      }

      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === taskId ? { ...task, completed: true } : task
        )
      );
    } catch (e) {
      console.log("Error completing task:", e);
    }
  };

  // Skeleton Loader
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
      <div className="flex items-center justify-center min-h-screen bg-[#f8f9fa]">
        <div className="text-red-500 max-w-md text-center">
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // Filter by Week
  const filterByWeek = tasks.filter((task) => {
    if (!selectedWeek) return true;
    return task.week === selectedWeek.toString();
  });

  // Task Kanban filtering
  const assignedTasks = filterByWeek.filter((task) => !task.completed && !task.overdue);
  const overdueTasks = filterByWeek.filter((task) => task.overdue);
  const completedTasks = filterByWeek.filter((task) => task.completed);

  // Format tasks for TaskList
  const assignedTasksFormatted = assignedTasks.map((task) => ({
    id: task.id,
    title: task.title,
    status: "assigned",
    week: task.week,
    resourceUrl: task.resourceUrl,
  }));

  const overdueTasksFormatted = overdueTasks.map((task) => ({
    id: task.id,
    title: task.title,
    status: "overdue",
    week: task.week,
    resourceUrl: task.resourceUrl,
  }));

  const completedTasksFormatted = completedTasks.map((task) => ({
    id: task.id,
    title: task.title,
    status: "completed",
    week: task.week,
    resourceUrl: task.resourceUrl,
  }));

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
          <TaskList title="Assigned" tasks={assignedTasksFormatted} onComplete={handleComplete} />
          <TaskList title="Overdue" tasks={overdueTasksFormatted} onComplete={handleComplete} />
          <TaskList title="Completed" tasks={completedTasksFormatted} onComplete={handleComplete} />
        </div>
      </main>
    </div>
  );
}

