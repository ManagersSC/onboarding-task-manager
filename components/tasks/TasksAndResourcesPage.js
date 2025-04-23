"use client"

import { useState, useCallback } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@components/ui/card"
import { Button } from "@components/ui/button"
import { TasksTable } from "./TasksTable"
import { TasksFilters } from "./TasksFilters"
import { CreateTaskDialog } from "@components/tasks/CreateTaskDialog"
import { PlusCircle } from "lucide-react"

export function TasksAndResourcesPage() {
  const [activeTab, setActiveTab] = useState("core")
  const [filters, setFilters] = useState({
    status: "",
    week: "",
    day: "",
    jobRole: "",
    dateRange: { startDate: "", endDate: "" },
  })

  // Memoize the filter change handler to prevent unnecessary re-renders
  const handleFilterChange = useCallback((newFilters) => {
    setFilters(prevFilters => ({ ...prevFilters, ...newFilters }))
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks & Resources</h1>
          <p className="text-muted-foreground">Manage onboarding tasks and resources for your team</p>
        </div>

        <CreateTaskDialog
          trigger={
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Task
            </Button>
          }
        />
      </div>

      <Tabs defaultValue="core" value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="core">Core Tasks</TabsTrigger>
            <TabsTrigger value="assigned">Assigned Logs</TabsTrigger>
          </TabsList>
        </div>

        <div className="mt-4">
          <TasksFilters type={activeTab} onFilterChange={handleFilterChange} />
        </div>

        <TabsContent value="core" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Core Tasks</CardTitle>
              <CardDescription>Manage the core tasks that are assigned to users during onboarding</CardDescription>
            </CardHeader>
            <CardContent>
              <TasksTable type="core" dateRange={filters.dateRange} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assigned" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Assigned Task Logs</CardTitle>
              <CardDescription>View and manage tasks that have been assigned to specific users</CardDescription>
            </CardHeader>
            <CardContent>
              <TasksTable type="assigned" dateRange={filters.dateRange} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
