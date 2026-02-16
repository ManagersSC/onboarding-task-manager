"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@components/ui/button"
import { Input } from "@components/ui/input"
import { Label } from "@components/ui/label"
import { Textarea } from "@components/ui/textarea"
import { RefreshCw, X } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@components/ui/select"
import { toast } from "sonner"
import { motion } from "framer-motion"
import { cn } from "@components/lib/utils"

// Dropdown components (same as BulkCreateResourcesForm)
function FolderDropdown({
  value,
  onChange,
  placeholder = "Select folder...",
  disabled = false,
  error = false,
  className = "",
}) {
  const [folders, setFolders] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchFolders()
  }, [])

  const fetchFolders = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/folders")
      if (!response.ok) {
        throw new Error("Failed to fetch folders")
      }
      const data = await response.json()
      setFolders(data.folders || [])
    } catch (error) {
      console.error("Error fetching folders:", error)
      toast.error("Failed to load folders")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={cn(error && "border-red-500", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {loading ? (
          <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading folders...</div>
        ) : folders.length === 0 ? (
          <div className="px-2 py-1.5 text-sm text-muted-foreground">No folders found</div>
        ) : (
          folders.map((folder) => (
            <SelectItem key={folder.id} value={folder.id}>
              {folder.name}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  )
}

function JobDropdown({
  value,
  onChange,
  placeholder = "Select job...",
  disabled = false,
  error = false,
  className = "",
}) {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchJobs()
  }, [])

  const fetchJobs = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/jobs")
      if (!response.ok) {
        throw new Error("Failed to fetch jobs")
      }
      const data = await response.json()
      setJobs(data.jobs || [])
    } catch (error) {
      console.error("Error fetching jobs:", error)
      toast.error("Failed to load jobs")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={cn(error && "border-red-500", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {loading ? (
          <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading jobs...</div>
        ) : jobs.length === 0 ? (
          <div className="px-2 py-1.5 text-sm text-muted-foreground">No jobs found</div>
        ) : (
          jobs.map((job) => (
            <SelectItem key={job.id} value={job.id}>
              {job.title}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  )
}

// Animation variants for staggered children
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24,
    },
  },
}

export function CreateTaskForm({ onSuccess, onCancel, resourcesOnly = false }) {
  // Form state
  const [taskName, setTaskName] = useState("")
  const [taskDescription, setTaskDescription] = useState("")
  const [taskFunction, setTaskFunction] = useState(resourcesOnly ? "Core" : "Core") // "Core" or "Custom"
  const [taskMedium, setTaskMedium] = useState("") // "Document" or "Video"
  const [taskWeek, setTaskWeek] = useState("")
  const [taskDay, setTaskDay] = useState("")
  const [taskLink, setTaskLink] = useState("")
  const [taskUrgency, setTaskUrgency] = useState("Medium")
  const [taskFolder, setTaskFolder] = useState("")
  const [taskJob, setTaskJob] = useState("")
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

    if (!taskJob) {
      errors.taskJob = "Job is required"
    }

    if (taskFunction === "Core") {
      if (!taskWeek) {
        errors.taskWeek = "Week is required"
      }

      if (!taskDay) {
        errors.taskDay = "Day is required"
      }

      if (!taskMedium) {
        errors.taskMedium = "Medium is required"
      }
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
      toast.error(
        <div>
          <div className="font-semibold">Validation Error</div>
          <div className="text-sm opacity-80">Please fix the errors in the form</div>
        </div>,
      )
      return
    }

    setIsCreatingTask(true)

    try {
      const response = await fetch("/api/admin/tasks/create-task", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          taskName,
          taskDescription,
          taskFunction,
          taskMedium: taskFunction === "Core" ? taskMedium : "",
          taskWeek: taskFunction === "Core" ? taskWeek : "",
          taskDay: taskFunction === "Core" ? taskDay : "",
          taskLink,
          taskUrgency: taskFunction === "Custom" ? taskUrgency : "",
          taskFolder: taskFolder || null,
          taskJob: taskJob || null,
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

      toast.success(
        <div>
          <div className="font-semibold">Success</div>
          <div className="text-sm opacity-80">{successMessage}</div>
        </div>,
      )

      // Call the onSuccess callback with the created task data
      if (onSuccess) {
        onSuccess(data)
      }
    } catch (error) {
      console.error("Error creating task:", error)
      toast.error(
        <div>
          <div className="font-semibold">Error</div>
          <div className="text-sm opacity-80">
            {error instanceof Error ? error.message : "An unexpected error occurred"}
          </div>
        </div>,
      )
    } finally {
      setIsCreatingTask(false)
    }
  }

  return (
    <motion.div
      className="space-y-6 py-4 max-h-[80vh] overflow-y-auto custom-scrollbar"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Task Type Toggle */}
        <motion.div
          className="space-y-3 pb-4"
          variants={itemVariants}
        >
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Task Type:</span>
            <div className="flex bg-muted rounded-md p-0.5">
              <Button
                type="button"
                variant={taskFunction === "Core" ? "default" : "ghost"}
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setTaskFunction("Core")}
              >
                Core
              </Button>
              <Button
                type="button"
                variant={taskFunction === "Custom" ? "default" : "ghost"}
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setTaskFunction("Custom")}
              >
                Custom
              </Button>
            </div>
          </div>
        </div>

        {/* Task Type Description */}
        <div className="text-xs text-muted-foreground bg-muted/30 rounded-md p-2 text-center">
          {taskFunction === "Core" ? (
            <span>
              📋 <strong>Core Task:</strong> Standard onboarding task for everyone. Requires week, day, and medium.
            </span>
          ) : (
            <span>
              ⚡ <strong>Custom Task:</strong> One-time task for specific people. Requires at least one assignee.
            </span>
          )}
        </div>
      </motion.div>

      {/* Main Form Fields */}
      <div className="grid gap-6 mt-2">
        {/* Basic Information */}
        <motion.div className="space-y-4" variants={itemVariants}>
          <h4 className="text-sm font-medium text-muted-foreground">Basic Information</h4>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="task-name">Task Name *</Label>
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
                rows={3}
              />
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
          </div>
        </motion.div>

        {/* Task-Specific Fields */}
        <motion.div className="space-y-4" variants={itemVariants}>
          <h4 className="text-sm font-medium text-muted-foreground">
            {taskFunction === "Core" ? "Core Task Details" : "Custom Task Details"}
          </h4>

          {taskFunction === "Core" ? (
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="task-week">Week *</Label>
                  <Select value={taskWeek} onValueChange={setTaskWeek}>
                    <SelectTrigger id="task-week" className={validationErrors.taskWeek ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select week" />
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
                  <Label htmlFor="task-day">Day *</Label>
                  <Select value={taskDay} onValueChange={setTaskDay}>
                    <SelectTrigger id="task-day" className={validationErrors.taskDay ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select day" />
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
                <Label htmlFor="task-medium">Medium *</Label>
                <Select value={taskMedium} onValueChange={setTaskMedium}>
                  <SelectTrigger id="task-medium" className={validationErrors.taskMedium ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select medium" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Document">Document</SelectItem>
                    <SelectItem value="Video">Video</SelectItem>
                  </SelectContent>
                </Select>
                {validationErrors.taskMedium && <p className="text-xs text-red-500">{validationErrors.taskMedium}</p>}
              </div>
            </div>
          ) : (
            <div className="grid gap-2">
              <Label htmlFor="task-urgency">Urgency</Label>
              <Select value={taskUrgency} onValueChange={setTaskUrgency}>
                <SelectTrigger id="task-urgency">
                  <SelectValue placeholder="Select urgency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Critical">Critical</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </motion.div>

        {/* Organization */}
        <motion.div className="space-y-4" variants={itemVariants}>
          <h4 className="text-sm font-medium text-muted-foreground">Organization</h4>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="task-job">Job *</Label>
              <JobDropdown
                value={taskJob}
                onChange={setTaskJob}
                placeholder="Select a job..."
                error={validationErrors.taskJob}
              />
              {validationErrors.taskJob && <p className="text-xs text-red-500">{validationErrors.taskJob}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="task-folder">Folder (Optional)</Label>
              <FolderDropdown
                value={taskFolder}
                onChange={setTaskFolder}
                placeholder="Select a folder..."
                error={validationErrors.taskFolder}
              />
              {validationErrors.taskFolder && <p className="text-xs text-red-500">{validationErrors.taskFolder}</p>}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Assignment */}
      <motion.div className="space-y-4" variants={itemVariants}>
        <h4 className="text-sm font-medium text-muted-foreground">
          Assignment {taskFunction === "Custom" ? "(Required)" : "(Optional)"}
        </h4>
        <div className="grid gap-2">
          <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-background">
            {assigneeEmails.map((email, index) => (
              <motion.div
                key={index}
                className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <span className="text-sm">{email}</span>
                <button
                  type="button"
                  onClick={() => removeEmail(email)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </motion.div>
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
      </motion.div>

      {/* Footer Actions */}
      <motion.div className="flex justify-end gap-3 pt-4 border-t" variants={itemVariants}>
        <Button variant="outline" onClick={onCancel} disabled={isCreatingTask}>
          Cancel
        </Button>
        <Button onClick={handleCreateTask} disabled={isCreatingTask}>
          {isCreatingTask ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            `Create ${taskFunction} Task`
          )}
        </Button>
      </motion.div>
    </motion.div>
  )
}
