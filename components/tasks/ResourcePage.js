"use client"

import { useState } from "react"
import { Button } from "@components/ui/button"
import { Plus } from "lucide-react"
import { TasksTable } from "./TasksTable"
import { CreateTaskDialog } from "./CreateTaskDialog"

export function ResourcePage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedTasks, setSelectedTasks] = useState([])

  const handleDialogOpenChange = (open) => {
    setIsCreateDialogOpen(open)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks & Resources</h1>
          <p className="text-sm text-muted-foreground">Manage onboarding tasks and resources for your team.</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Resource
        </Button>
      </div>

      <TasksTable onOpenCreateTask={() => setIsCreateDialogOpen(true)} onSelectionChange={setSelectedTasks} />

      <CreateTaskDialog
        open={isCreateDialogOpen}
        onOpenChange={handleDialogOpenChange}
        mode="bulk"
        showModeToggle={true}
      />
    </div>
  )
}
