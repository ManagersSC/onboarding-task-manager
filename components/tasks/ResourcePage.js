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
      {/* H4: Redesigned page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-headline">Resources</h1>
          <p className="text-body-sm text-muted-foreground mt-1">
            Manage task templates and onboarding resources
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="shrink-0">
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
