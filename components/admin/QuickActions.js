"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@components/ui/card"
import { Button } from "@components/ui/button"
import { Input } from "@components/ui/input"
import { Label } from "@components/ui/label"
import { Textarea } from "@components/ui/textarea"
import { PlusCircle, FileText, Users, BarChart3, RefreshCw, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@components/ui/select"
import { toast } from "@/hooks/use-toast"

export function QuickActions() {
  const router = useRouter()
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false)
  const [isResourceDialogOpen, setIsResourceDialogOpen] = useState(false)

  // Add state for task creation form
  const [taskName, setTaskName] = useState("")
  const [taskDescription, setTaskDescription] = useState("")
  const [taskFunction, setTaskFunction] = useState("Core") // "Core" or "Custom"
  const [taskMedium, setTaskMedium] = useState("") // "Document" or "Video"
  const [taskWeek, setTaskWeek] = useState("")
  const [taskDay, setTaskDay] = useState("")
  const [taskLink, setTaskLink] = useState("")
  const [currentEmail, setCurrentEmail] = useState("")
  const [assigneeEmails, setAssigneeEmails] = useState([])
  const [isCreatingTask, setIsCreatingTask] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})

  const emailInputRef = useRef(null)

  // Email validation function
  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  // Handle adding an email
  const addEmail = () => {
    const email = currentEmail.trim()

    if (!email) return

    if (!isValidEmail(email)) {
      setValidationErrors({
        ...validationErrors,
        email: "Please enter a valid email address",
      })
      return
    }

    if (assigneeEmails.includes(email)) {
      setValidationErrors({
        ...validationErrors,
        email: "This email has already been added",
      })
      return
    }

    setAssigneeEmails([...assigneeEmails, email])
    setCurrentEmail("")
    setValidationErrors({
      ...validationErrors,
      email: "",
    })
  }

  // Handle key press in email input
  const handleEmailKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault()
      addEmail()
    }
  }

  // Remove an email from the list
  const removeEmail = (emailToRemove) => {
    setAssigneeEmails(assigneeEmails.filter((email) => email !== emailToRemove))
  }

  // Validate the form based on task function
  const validateForm = () => {
    const errors = {}

    if (!taskName.trim()) {
      errors.taskName = "Task name is required"
    }

    if (!taskWeek) {
      errors.taskWeek = "Week is required"
    }

    if (!taskDay) {
      errors.taskDay = "Day is required"
    }

    if (!taskMedium) {
      errors.taskMedium = "Medium is required"
    }

    // If task function is Custom, at least one email is required
    if (taskFunction === "Custom" && assigneeEmails.length === 0) {
      errors.email = "At least one email is required for custom tasks"
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle task creation with assignment
  const handleCreateTask = async () => {
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form",
        variant: "destructive",
      })
      return
    }

    setIsCreatingTask(true)

    try {
      const response = await fetch("/api/admin/create-task", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          taskName,
          taskDescription,
          taskFunction,
          taskMedium,
          taskWeek,
          taskDay,
          taskLink,
          assigneeEmails: assigneeEmails.length > 0 ? assigneeEmails : null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create task")
      }

      let successMessage = ""
      if (data.successfulAssignments && data.successfulAssignments.length > 0) {
        successMessage = `Task "${taskName}" created and assigned to ${data.successfulAssignments.length} recipient(s)`

        if (data.failedAssignments && data.failedAssignments.length > 0) {
          successMessage += `. Failed to assign to ${data.failedAssignments.length} recipient(s).`
        }
      } else {
        successMessage = `Task "${taskName}" created successfully`
      }

      toast({
        title: "Success",
        description: successMessage,
      })

      setIsTaskDialogOpen(false)
      resetTaskForm()
    } catch (error) {
      console.error("Error creating task:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsCreatingTask(false)
    }
  }

  // Reset form fields
  const resetTaskForm = () => {
    setTaskName("")
    setTaskDescription("")
    setTaskFunction("Core")
    setTaskMedium("")
    setTaskWeek("")
    setTaskDay("")
    setTaskLink("")
    setCurrentEmail("")
    setAssigneeEmails([])
    setValidationErrors({})
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Dialog
          open={isTaskDialogOpen}
          onOpenChange={(open) => {
            setIsTaskDialogOpen(open)
            if (!open) resetTaskForm()
          }}
        >
          <DialogTrigger asChild>
            <Button className="w-full justify-start" variant="outline">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
              <DialogDescription>Add a new task for users to complete during onboarding.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* Task Function Selection */}
              <div className="grid gap-2">
                <Label>Task Function</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={taskFunction === "Core" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setTaskFunction("Core")}
                  >
                    Core
                  </Button>
                  <Button
                    type="button"
                    variant={taskFunction === "Custom" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setTaskFunction("Custom")}
                  >
                    Custom
                  </Button>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="task-name">Task Name</Label>
                <Input
                  id="task-name"
                  placeholder="Enter task name"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  required
                  className={validationErrors.taskName ? "border-red-500" : ""}
                />
                {validationErrors.taskName && <p className="text-xs text-red-500">{validationErrors.taskName}</p>}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="task-description">Description</Label>
                <Textarea
                  id="task-description"
                  placeholder="Enter task description"
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="task-week">Week</Label>
                  <Select value={taskWeek} onValueChange={setTaskWeek}>
                    <SelectTrigger id="task-week" className={validationErrors.taskWeek ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Week 1</SelectItem>
                      <SelectItem value="2">Week 2</SelectItem>
                      <SelectItem value="3">Week 3</SelectItem>
                      <SelectItem value="4">Week 4</SelectItem>
                      <SelectItem value="5">Week 5</SelectItem>
                    </SelectContent>
                  </Select>
                  {validationErrors.taskWeek && <p className="text-xs text-red-500">{validationErrors.taskWeek}</p>}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="task-day">Day</Label>
                  <Select value={taskDay} onValueChange={setTaskDay}>
                    <SelectTrigger id="task-day" className={validationErrors.taskDay ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Day 1</SelectItem>
                      <SelectItem value="2">Day 2</SelectItem>
                      <SelectItem value="3">Day 3</SelectItem>
                      <SelectItem value="4">Day 4</SelectItem>
                      <SelectItem value="5">Day 5</SelectItem>
                    </SelectContent>
                  </Select>
                  {validationErrors.taskDay && <p className="text-xs text-red-500">{validationErrors.taskDay}</p>}
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="task-medium">Medium</Label>
                <Select value={taskMedium} onValueChange={setTaskMedium}>
                  <SelectTrigger id="task-medium" className={validationErrors.taskMedium ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Document">Document</SelectItem>
                    <SelectItem value="Video">Video</SelectItem>
                  </SelectContent>
                </Select>
                {validationErrors.taskMedium && <p className="text-xs text-red-500">{validationErrors.taskMedium}</p>}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="task-link">Resource Link (Optional)</Label>
                <Input
                  id="task-link"
                  placeholder="https://"
                  value={taskLink}
                  onChange={(e) => setTaskLink(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="assignee-email">
                  Assign to Email {taskFunction === "Custom" ? "(Required)" : "(Optional)"}
                </Label>
                <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-background">
                  {assigneeEmails.map((email, index) => (
                    <div key={index} className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md">
                      <span className="text-sm">{email}</span>
                      <button
                        type="button"
                        onClick={() => removeEmail(email)}
                        className="ttext-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <Input
                    ref={emailInputRef}
                    id="assignee-email"
                    type="email"
                    placeholder="Enter email and press Enter"
                    value={currentEmail}
                    onChange={(e) => setCurrentEmail(e.target.value)}
                    onKeyDown={handleEmailKeyPress}
                    className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
                <div className="flex justify-between items-center">
                  {validationErrors.email && <p className="text-xs text-red-500">{validationErrors.email}</p>}
                  <Button type="button" variant="ghost" size="sm" onClick={addEmail} className="ml-auto text-xs">
                    Add Email
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsTaskDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTask} disabled={isCreatingTask}>
                {isCreatingTask ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Task"
                )}
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
