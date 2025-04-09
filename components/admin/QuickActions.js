"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@components/ui/card"
import { Button } from "@components/ui/button"
import { PlusCircle, FileText, Users, BarChart3 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@components/ui/dialog"
import { Input } from "@components/ui/input"
import { Label } from "@components/ui/label"
import { Textarea } from "@components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@components/ui/select"

export function QuickActions() {
  const router = useRouter()
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false)
  const [isResourceDialogOpen, setIsResourceDialogOpen] = useState(false)

  return (
    <Card className="bg-white border-none shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full justify-start" variant="outline">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
              <DialogDescription>Add a new task for users to complete during onboarding.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="task-name">Task Name</Label>
                <Input id="task-name" placeholder="Enter task name" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="task-description">Description</Label>
                <Textarea id="task-description" placeholder="Enter task description" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="task-week">Week</Label>
                  <Select>
                    <SelectTrigger id="task-week">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Week 1</SelectItem>
                      <SelectItem value="2">Week 2</SelectItem>
                      <SelectItem value="3">Week 3</SelectItem>
                      <SelectItem value="4">Week 4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="task-type">Type</Label>
                  <Select>
                    <SelectTrigger id="task-type">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="core">Core</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                      <SelectItem value="doc">Document</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="task-link">Resource Link (Optional)</Label>
                <Input id="task-link" placeholder="https://" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsTaskDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setIsTaskDialogOpen(false)
                  // Add task creation logic here
                }}
              >
                Create Task
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isResourceDialogOpen} onOpenChange={setIsResourceDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full justify-start" variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Manage Resources
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Manage Resources</DialogTitle>
              <DialogDescription>Add or edit resources for onboarding tasks.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Button
                onClick={() => {
                  setIsResourceDialogOpen(false)
                  router.push("/admin/resources")
                }}
                className="w-full"
              >
                Go to Resource Management
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Button className="w-full justify-start" variant="outline" onClick={() => router.push("/admin/users")}>
          <Users className="mr-2 h-4 w-4" />
          Manage Users
        </Button>

        <Button className="w-full justify-start" variant="outline" onClick={() => router.push("/admin/reports")}>
          <BarChart3 className="mr-2 h-4 w-4" />
          View Reports
        </Button>
      </CardContent>
    </Card>
  )
}
