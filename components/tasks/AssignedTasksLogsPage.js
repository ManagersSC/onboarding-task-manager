"use client"

import { useState } from "react"
import { Button } from "@components/ui/button"
import { Plus } from "lucide-react"
import { AssignedTasksLogsTable } from "./AssignedTasksLogsTable"
import { CreateTaskDialog } from "./CreateTaskDialog"

export function AssignedTasksLogsPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assigned Tasks</h1>
          <p className="text-sm text-muted-foreground">View onboarding tasks assigned to applicants and managers.</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Task
        </Button>
      </div>
      <AssignedTasksLogsTable />
      <CreateTaskDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} />
    </div>
  )
} 