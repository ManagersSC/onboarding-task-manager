"use client"

import { useState, useCallback } from "react"
import { Button } from "@components/ui/button"
import { Input } from "@components/ui/input"
import { Label } from "@components/ui/label"
import { Textarea } from "@components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@components/ui/select"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Trash2, Copy, ChevronUp } from "lucide-react"

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
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

const rowVariants = {
  hidden: { opacity: 0, x: -20 },
  show: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24,
    },
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: {
      duration: 0.2,
    },
  },
}

export function BulkCreateResourcesForm({ onSuccess, onCancel }) {
  // Form state - array of resource objects
  const [resources, setResources] = useState([
    {
      id: 1,
      taskName: "",
      taskDescription: "",
      taskWeek: "",
      taskDay: "",
      taskMedium: "",
      taskLink: "",
    },
  ])

  const [isCreating, setIsCreating] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})
  const [showPreview, setShowPreview] = useState(false)

  const resetForm = useCallback(() => {
    console.log("BulkCreateResourcesForm: resetForm called")
    setResources([
      {
        id: 1,
        taskName: "",
        taskDescription: "",
        taskWeek: "",
        taskDay: "",
        taskMedium: "",
        taskLink: "",
      },
    ])
    setValidationErrors({})
    setShowPreview(false)
    setIsCreating(false)
    console.log("BulkCreateResourcesForm: resetForm completed")
  }, [])

  const handleCancel = useCallback(() => {
    resetForm()
    if (onCancel) {
      onCancel()
    }
  }, [resetForm, onCancel])

  // Generate unique ID for new resources
  const generateId = () => Math.max(...resources.map((r) => r.id), 0) + 1

  // Add a new resource row
  const addResource = () => {
    const lastResource = resources[resources.length - 1]
    const newResource = {
      id: generateId(),
      taskName: "",
      taskDescription: "",
      taskWeek: lastResource.taskWeek || "",
      taskDay: lastResource.taskDay || "",
      taskMedium: lastResource.taskMedium || "",
      taskLink: "",
    }
    setResources([...resources, newResource])
  }

  // Add multiple resources at once
  const addMultipleResources = (count = 5) => {
    const newResources = []
    const lastResource = resources[resources.length - 1]

    for (let i = 0; i < count; i++) {
      newResources.push({
        id: generateId() + i,
        taskName: "",
        taskDescription: "",
        taskWeek: lastResource.taskWeek || "",
        taskDay: lastResource.taskDay || "",
        taskMedium: lastResource.taskMedium || "",
        taskLink: "",
      })
    }
    setResources([...resources, ...newResources])
  }

  // Remove a resource row
  const removeResource = (id) => {
    if (resources.length > 1) {
      setResources(resources.filter((r) => r.id !== id))
      // Clear validation errors for removed resource
      const newErrors = { ...validationErrors }
      delete newErrors[`resource_${id}`]
      setValidationErrors(newErrors)
    }
  }

  // Clear all resources
  const clearAllResources = () => {
    setResources([
      {
        id: 1,
        taskName: "",
        taskDescription: "",
        taskWeek: "",
        taskDay: "",
        taskMedium: "",
        taskLink: "",
      },
    ])
    setValidationErrors({})
  }

  // Update a specific resource field
  const updateResource = (id, field, value) => {
    setResources(resources.map((r) => (r.id === id ? { ...r, [field]: value } : r)))

    // Clear validation error for this field
    const errorKey = `resource_${id}_${field}`
    if (validationErrors[errorKey]) {
      setValidationErrors({
        ...validationErrors,
        [errorKey]: "",
      })
    }
  }

  // Copy values from previous row
  const copyFromPrevious = (currentIndex) => {
    if (currentIndex > 0) {
      const previousResource = resources[currentIndex - 1]
      const currentResource = resources[currentIndex]

      setResources(
        resources.map((r, index) =>
          index === currentIndex
            ? {
                ...r,
                taskName: previousResource.taskName,
                taskDescription: previousResource.taskDescription,
                taskWeek: previousResource.taskWeek,
                taskDay: previousResource.taskDay,
                taskMedium: previousResource.taskMedium,
                taskLink: previousResource.taskLink,
              }
            : r,
        ),
      )
    }
  }

  // Auto-increment week/day
  const autoIncrement = (currentIndex, field) => {
    if (currentIndex > 0) {
      const previousResource = resources[currentIndex - 1]
      const currentValue = Number.parseInt(previousResource[field]) || 0
      const newValue = (currentValue + 1).toString()

      updateResource(resources[currentIndex].id, field, newValue)
    }
  }

  // Validate all resources
  const validateAllResources = () => {
    const errors = {}
    let hasErrors = false

    resources.forEach((resource, index) => {
      const resourceErrors = {}

      if (!resource.taskName.trim()) {
        resourceErrors.taskName = "Task name is required"
        hasErrors = true
      }

      if (!resource.taskWeek) {
        resourceErrors.taskWeek = "Week is required"
        hasErrors = true
      }

      if (!resource.taskDay) {
        resourceErrors.taskDay = "Day is required"
        hasErrors = true
      }

      if (!resource.taskMedium) {
        resourceErrors.taskMedium = "Medium is required"
        hasErrors = true
      }

      if (Object.keys(resourceErrors).length > 0) {
        errors[`resource_${resource.id}`] = resourceErrors
      }
    })

    setValidationErrors(errors)
    return !hasErrors
  }

  const handleBulkCreate = async () => {
    if (!validateAllResources()) {
      toast.error(
        <div>
          <div className="font-semibold">Validation Error</div>
          <div className="text-sm opacity-80">Please fix the errors in the form</div>
        </div>,
      )
      return
    }

    setIsCreating(true)

    try {
      const response = await fetch("/api/admin/tasks/bulk-create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resources: resources.map((r) => ({
            taskName: r.taskName,
            taskDescription: r.taskDescription,
            taskWeek: r.taskWeek,
            taskDay: r.taskDay,
            taskMedium: r.taskMedium,
            taskLink: r.taskLink,
          })),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create resources")
      }

      const successMessage = data.testMode
        ? `TEST MODE: Would create ${data.createdIds.length} resource${data.createdIds.length === 1 ? "" : "s"}`
        : `Successfully created ${data.createdIds.length} resource${data.createdIds.length === 1 ? "" : "s"}`

      toast.success(
        <div>
          <div className="font-semibold">Success</div>
          <div className="text-sm opacity-80">{successMessage}</div>
        </div>,
      )

      console.log("BulkCreateResourcesForm: Resetting form state")
      resetForm()

      console.log("BulkCreateResourcesForm: Calling onSuccess")
      if (onSuccess) {
        onSuccess(data)
      }
    } catch (error) {
      console.error("Error creating resources:", error)
      toast.error(
        <div>
          <div className="font-semibold">Error</div>
          <div className="text-sm opacity-80">
            {error instanceof Error ? error.message : "An unexpected error occurred"}
          </div>
        </div>,
      )
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="show">
      {/* Bulk action buttons */}
      <motion.div className="flex gap-2 flex-wrap" variants={itemVariants}>
        <Button type="button" variant="outline" size="sm" onClick={addResource}>
          <Plus className="h-4 w-4 mr-2" />
          Add Row
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => addMultipleResources(5)}>
          <Plus className="h-4 w-4 mr-2" />
          Add 5 Rows
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={clearAllResources}>
          <Trash2 className="h-4 w-4 mr-2" />
          Clear All
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)}>
          {showPreview ? "Hide Summary" : "Show Summary"}
        </Button>
      </motion.div>

      {/* Resource rows */}
      <div className="space-y-4 max-h-96 overflow-y-auto">
        <AnimatePresence>
          {resources.map((resource, index) => (
            <motion.div
              key={resource.id}
              variants={rowVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              className="border rounded-lg p-4 space-y-4 bg-muted/20"
            >
              {/* Row header */}
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Resource {index + 1}</h4>
                <div className="flex gap-2">
                  {index > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => copyFromPrevious(index)}
                      title="Copy from previous row"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                  {resources.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeResource(resource.id)}
                      title="Remove this row"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Form fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Task Name */}
                <div className="space-y-2">
                  <Label htmlFor={`task-name-${resource.id}`}>Task Name</Label>
                  <Input
                    id={`task-name-${resource.id}`}
                    placeholder="Enter task name"
                    value={resource.taskName}
                    onChange={(e) => updateResource(resource.id, "taskName", e.target.value)}
                    className={validationErrors[`resource_${resource.id}`]?.taskName ? "border-red-500" : ""}
                  />
                  {validationErrors[`resource_${resource.id}`]?.taskName && (
                    <p className="text-xs text-red-500">{validationErrors[`resource_${resource.id}`].taskName}</p>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor={`task-description-${resource.id}`}>Description</Label>
                  <Textarea
                    id={`task-description-${resource.id}`}
                    placeholder="Enter task description"
                    value={resource.taskDescription}
                    onChange={(e) => updateResource(resource.id, "taskDescription", e.target.value)}
                    rows={2}
                  />
                </div>

                {/* Week */}
                <div className="space-y-2">
                  <Label htmlFor={`task-week-${resource.id}`}>Week</Label>
                  <div className="flex gap-2">
                    <Input
                      id={`task-week-${resource.id}`}
                      placeholder="1"
                      value={resource.taskWeek}
                      onChange={(e) => updateResource(resource.id, "taskWeek", e.target.value)}
                      className={validationErrors[`resource_${resource.id}`]?.taskWeek ? "border-red-500" : ""}
                    />
                    {index > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => autoIncrement(index, "taskWeek")}
                        title="Auto-increment from previous"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {validationErrors[`resource_${resource.id}`]?.taskWeek && (
                    <p className="text-xs text-red-500">{validationErrors[`resource_${resource.id}`].taskWeek}</p>
                  )}
                </div>

                {/* Day */}
                <div className="space-y-2">
                  <Label htmlFor={`task-day-${resource.id}`}>Day</Label>
                  <div className="flex gap-2">
                    <Input
                      id={`task-day-${resource.id}`}
                      placeholder="1"
                      value={resource.taskDay}
                      onChange={(e) => updateResource(resource.id, "taskDay", e.target.value)}
                      className={validationErrors[`resource_${resource.id}`]?.taskDay ? "border-red-500" : ""}
                    />
                    {index > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => autoIncrement(index, "taskDay")}
                        title="Auto-increment from previous"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {validationErrors[`resource_${resource.id}`]?.taskDay && (
                    <p className="text-xs text-red-500">{validationErrors[`resource_${resource.id}`].taskDay}</p>
                  )}
                </div>

                {/* Medium Type */}
                <div className="space-y-2">
                  <Label htmlFor={`task-medium-${resource.id}`}>Medium Type</Label>
                  <Select
                    value={resource.taskMedium}
                    onValueChange={(value) => updateResource(resource.id, "taskMedium", value)}
                  >
                    <SelectTrigger
                      className={validationErrors[`resource_${resource.id}`]?.taskMedium ? "border-red-500" : ""}
                    >
                      <SelectValue placeholder="Select medium type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Document">Document</SelectItem>
                      <SelectItem value="Video">Video</SelectItem>
                    </SelectContent>
                  </Select>
                  {validationErrors[`resource_${resource.id}`]?.taskMedium && (
                    <p className="text-xs text-red-500">{validationErrors[`resource_${resource.id}`].taskMedium}</p>
                  )}
                </div>

                {/* Resource Link */}
                <div className="space-y-2">
                  <Label htmlFor={`task-link-${resource.id}`}>Resource Link</Label>
                  <Input
                    id={`task-link-${resource.id}`}
                    placeholder="https://example.com"
                    value={resource.taskLink}
                    onChange={(e) => updateResource(resource.id, "taskLink", e.target.value)}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Preview section */}
      {showPreview && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="border rounded-lg p-4 bg-muted/10"
        >
          <h4 className="font-medium mb-3">Preview ({resources.length} resources)</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {resources.map((resource, index) => (
              <div key={resource.id} className="text-sm p-2 bg-background rounded border">
                <strong>{index + 1}.</strong> {resource.taskName || "Untitled Resource"}
                {resource.taskWeek && resource.taskDay && (
                  <span className="text-muted-foreground">
                    {" "}
                    - Week {resource.taskWeek}, Day {resource.taskDay}
                  </span>
                )}
                {resource.taskMedium && <span className="text-muted-foreground"> - {resource.taskMedium}</span>}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Action buttons */}
      <motion.div className="flex justify-end gap-2 pt-4 border-t" variants={itemVariants}>
        <Button type="button" variant="outline" onClick={handleCancel} disabled={isCreating}>
          Cancel
        </Button>
        <Button type="button" onClick={handleBulkCreate} disabled={isCreating}>
          {isCreating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Creating {resources.length} Resources...
            </>
          ) : (
            `Create ${resources.length} Resource${resources.length === 1 ? "" : "s"}`
          )}
        </Button>
      </motion.div>
    </motion.div>
  )
}
