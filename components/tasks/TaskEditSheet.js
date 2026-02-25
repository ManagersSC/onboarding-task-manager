"use client"

import { useEffect, useState, useCallback } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { AnimatePresence } from "framer-motion"
import { Button } from "@components/ui/button"
import { Input } from "@components/ui/input"
import { Textarea } from "@components/ui/textarea"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@components/ui/sheet"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@components/ui/form"
import { Skeleton } from "@components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@components/ui/alert-dialog"
import { AlertCircle, Info, LinkIcon, FileIcon, X, Upload, Paperclip } from "lucide-react"
import { cn } from "@components/lib/utils"
import { toast } from "sonner"
import { Badge } from "@components/ui/badge"

// Form validation schema
const taskFormSchema = z.object({
  title: z.string().min(1, "Task name is required"),
  description: z.string().optional(),
  type: z.string().optional(),
  week: z.string().optional(),
  day: z.string().optional(),
  folderName: z.string().optional(),
  jobTitle: z.string().optional(),
  location: z.string().optional(),
  resourceUrl: z.string().url("Must be a valid URL").or(z.string().length(0)).optional(),
  attachments: z.array(z.any()).optional(),
})

// Update the component props to include onEditSuccess
export function TaskEditSheet({ taskId, open, onOpenChange, onEditSuccess }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [folderOptions, setFolderOptions] = useState([])
  const [loadingFolders, setLoadingFolders] = useState(false)
  const [originalData, setOriginalData] = useState(null)
  const [showLinkConfirm, setShowLinkConfirm] = useState(false)
  const [pendingLinkChange, setPendingLinkChange] = useState(null)
  const [attachments, setAttachments] = useState([])
  const [isDragging, setIsDragging] = useState(false)

  // Track if form has been modified
  const [formModified, setFormModified] = useState(false)
  
  // Unsaved changes confirmation modal
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false)
  const [pendingClose, setPendingClose] = useState(false)

  // Form definition
  const form = useForm({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "",
      week: "",
      day: "",
      folderName: "",
      jobTitle: "",
      location: "",
      resourceUrl: "",
      attachments: [],
    },
  })

  // Watch for changes to detect modifications
  const formValues = form.watch()

  // Type options
  const typeOptions = [
    { value: "Doc", label: "Document" },
    { value: "Video", label: "Video" },
    { value: "G.Drive", label: "Google Drive" },
  ]

  // Job options
  const jobOptions = [
    { value: "Nurse", label: "Nurse" },
    { value: "Dentist", label: "Dentist" },
    { value: "Receptionist", label: "Receptionist" },
    { value: "Manager", label: "Manager" },
  ]

  // Location options
  const locationOptions = [
    { value: "Finchley", label: "Finchley" },
    { value: "SJW", label: "SJW" },
  ]

  // Check if a field has been modified
  const isFieldModified = (fieldName) => {
    if (!originalData) return false

    if (fieldName === "attachments") {
      // Only consider attachments modified if there are new ones
      return attachments.some((attachment) => attachment.isNew)
    }

    return originalData[fieldName] !== formValues[fieldName]
  }

  // Reset form to original values
  const resetForm = () => {
    if (originalData) {
      form.reset(originalData)

      // Reset attachments to original state
      if (originalData.attachments && Array.isArray(originalData.attachments)) {
        const originalAttachments = originalData.attachments.map((attachment) => ({
          id: attachment.id || Math.random().toString(36).substring(2, 9),
          name: attachment.filename || attachment.name || "Unknown file",
          size: attachment.size || 0,
          type: attachment.type || "",
          url: attachment.url || "",
          isNew: false,
        }))
        setAttachments(originalAttachments)
        form.setValue("attachments", originalAttachments)
      } else {
        setAttachments([])
        form.setValue("attachments", [])
      }

      setFormModified(false)
    }
  }

  // Handle file drop
  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const newFiles = Array.from(e.dataTransfer.files).map((file) => ({
          id: Math.random().toString(36).substring(2, 9),
          name: file.name,
          size: file.size,
          type: file.type,
          file: file,
          isNew: true,
        }))

        setAttachments((prev) => [...prev, ...newFiles])
        form.setValue("attachments", [...attachments, ...newFiles])
        setFormModified(true)
      }
    },
    [attachments, form],
  )

  const handleFileSelect = useCallback(
    (e) => {
      if (e.target.files && e.target.files.length > 0) {
        const newFiles = Array.from(e.target.files).map((file) => ({
          id: Math.random().toString(36).substring(2, 9),
          name: file.name,
          size: file.size,
          type: file.type,
          file: file,
          isNew: true,
        }))

        setAttachments((prev) => [...prev, ...newFiles])
        form.setValue("attachments", [...attachments, ...newFiles])
        setFormModified(true)
      }
    },
    [attachments, form],
  )

  const removeAttachment = useCallback(
    (id) => {
      setAttachments((prev) => prev.filter((file) => file.id !== id))
      form.setValue(
        "attachments",
        attachments.filter((file) => file.id !== id),
      )
      setFormModified(true)
    },
    [attachments, form],
  )

  // Load task data when sheet opens or taskId changes
  useEffect(() => {
    if (open && taskId) {
      setLoading(true)
      setError(null)
      setFormModified(false)

      fetch(`/api/admin/tasks/core-tasks/${taskId}`)
        .then((res) => {
          if (!res.ok) throw new Error(res.statusText)
          return res.json()
        })
        .then(({ task }) => {
          console.log("Fetched task:", task)
          const formattedData = {
            title: task.title || "",
            description: task.description || "",
            type: task.type || "",
            week: task.week || "",
            day: task.day || "",
            folderName: task.folderName || "",
            jobTitle: task.jobTitle || "",
            location: task.location || "",
            resourceUrl: task.resourceUrl || "",
            attachments: task.attachments || [],
          }

          // Set attachments
          if (task.attachments && Array.isArray(task.attachments)) {
            const formattedAttachments = task.attachments.map((attachment) => ({
              id: attachment.id || Math.random().toString(36).substring(2, 9),
              name: attachment.filename || attachment.name || "Unknown file",
              size: attachment.size || 0,
              type: attachment.type || "",
              url: attachment.url || "",
              isNew: false,
            }))
            setAttachments(formattedAttachments)
            form.setValue("attachments", formattedAttachments)
          } else {
            setAttachments([])
            form.setValue("attachments", [])
          }

          // Store original data for comparison
          setOriginalData(formattedData)

          // Update form with fetched data
          form.reset(formattedData)
        })
        .catch((err) => {
          setError(err.message)
          toast.error("Error loading task: " + err.message)
        })
        .finally(() => setLoading(false))
    }
  }, [open, taskId, form])

  // Check for form modifications
  useEffect(() => {
    if (originalData) {
      // Special handling for attachments to avoid false positives
      const hasAttachmentsChanged = () => {
        // If there are no new attachments (only existing ones), consider it unchanged
        if (
          attachments.every((attachment) => !attachment.isNew) &&
          attachments.length === (originalData.attachments?.length || 0)
        ) {
          return false
        }
        return true
      }

      // Check regular fields
      const hasRegularFieldsChanged = Object.keys(originalData)
        .filter((key) => key !== "attachments") // Skip attachments in this check
        .some((key) => originalData[key] !== formValues[key])

      // Only consider the form modified if regular fields changed OR attachments changed
      setFormModified(hasRegularFieldsChanged || (attachments.length > 0 && hasAttachmentsChanged()))
    }
  }, [formValues, originalData, attachments])

  // Handle resource URL changes with confirmation
  const handleResourceUrlChange = (value) => {
    if (originalData && originalData.resourceUrl && value !== originalData.resourceUrl) {
      setPendingLinkChange(value)
      setShowLinkConfirm(true)
    } else {
      form.setValue("resourceUrl", value)
    }
  }

  // Confirm resource URL change
  const confirmLinkChange = () => {
    if (pendingLinkChange !== null) {
      form.setValue("resourceUrl", pendingLinkChange)
      setShowLinkConfirm(false)
      setPendingLinkChange(null)
    }
  }

  // Cancel resource URL change
  const cancelLinkChange = () => {
    setShowLinkConfirm(false)
    setPendingLinkChange(null)
  }

  // Handle unsaved changes confirmation
  const handleCloseWithUnsavedChanges = (isOpen) => {
    if (!isOpen && formModified) {
      setPendingClose(true)
      setShowUnsavedChangesModal(true)
      return
    }
    onOpenChange(isOpen)
  }

  // Confirm close with unsaved changes
  const confirmCloseWithUnsavedChanges = () => {
    setShowUnsavedChangesModal(false)
    setPendingClose(false)
    onOpenChange(false)
  }

  // Cancel close with unsaved changes
  const cancelCloseWithUnsavedChanges = () => {
    setShowUnsavedChangesModal(false)
    setPendingClose(false)
  }

  // Fetch folder options (simulated)
  useEffect(() => {
    if (open) {
      setLoadingFolders(true)
      // This would be a real API call in production
      setTimeout(() => {
        setFolderOptions([
          { value: "Treatments Overview", label: "Treatments Overview" },
          { value: "Understanding Treatments", label: "Understanding Treatments" },
          { value: "Practice Operations", label: "Practice Operations" },
          { value: "Using Dentally", label: "Using Dentally" },
          { value: "Finance & Payments", label: "Finance & Payments" },
          { value: "Closing", label: "Closing" },
          { value: "New Patient Booking Training Series", label: "New Patient Booking Training Series" },
          { value: "Practice Safety & Operations", label: "Practice Safety & Operations" },
          { value: "Start Learning Scripts", label: "Start Learning Scripts" },
          { value: "Specialists at Smile Cliniq", label: "Specialists at Smile Cliniq" },
          { value: "Dental Implants", label: "Dental Implants" },
          { value: "Teeth Straightening", label: "Teeth Straightening" },
          { value: "Training Video", label: "Training Video" },
          { value: "Outstanding Treatments", label: "Outstanding Treatments" },
          { value: "Communication & Admin", label: "Communication & Admin" },
          { value: "IT & Software", label: "IT & Software" },
          { value: "Lab Work & Clinical Admin", label: "Lab Work & Clinical Admin" },
        ])
        setLoadingFolders(false)
      }, 500)
    }
  }, [open])

  // Update the onSubmit function to call onEditSuccess after a successful edit
  async function onSubmit(data) {
    setLoading(true)
    try {
      // Create FormData for file uploads
      const formData = new FormData()

      // Add regular form fields with proper mapping
      Object.keys(data).forEach((key) => {
        if (key !== "attachments") {
          // Map jobTitle back to job for the API
          const fieldName = key === "jobTitle" ? "job" : key
          formData.append(fieldName, data[key])
        }
      })

      // Add new file attachments
      attachments.forEach((attachment) => {
        if (attachment.isNew && attachment.file) {
          formData.append("files", attachment.file)
        } else if (!attachment.isNew) {
          // Keep existing attachments
          formData.append("existingAttachments", attachment.id)
        }
      })

      const response = await fetch(`/api/admin/tasks/core-tasks/${taskId}`, {
        method: "PATCH",
        body: formData,
      })

      if (!response.ok) {
        let errorMsg = "Failed to update task"
        try {
          const body = await response.json()
          if (body?.error) errorMsg = body.error
        } catch {}
        throw new Error(errorMsg)
      }

      // Update original data to match current data
      setOriginalData({ ...data, attachments })
      setFormModified(false)

      // Sonner success notification
      toast.success("Task updated successfully!", {
        description: "All changes have been saved.",
      })

      // Call onEditSuccess callback to refetch data
      if (typeof onEditSuccess === "function") {
        onEditSuccess()
      }

      onOpenChange(false) // Close the sheet
    } catch (err) {
      // Fixed toast call for sonner
      toast.error("Error updating task: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <AnimatePresence mode="wait">
        {open && (
          <Sheet
            open={open}
            onOpenChange={handleCloseWithUnsavedChanges}
          >
            <SheetContent className="sm:max-w-md overflow-y-auto">
              <SheetHeader className="pb-4 border-b">
                <SheetTitle className="text-xl">
                  {loading ? <Skeleton className="h-8 w-3/4" /> : "Task Details"}
                </SheetTitle>
                <SheetDescription>
                  {loading ? <Skeleton className="h-4 w-full" /> : "View and edit task details."}
                </SheetDescription>
              </SheetHeader>

              {error ? (
                <div className="py-6 text-center">
                  <AlertCircle className="h-10 w-10 text-error mx-auto mb-2" />
                  <p className="text-error font-medium">Error: {error}</p>
                  <Button onClick={() => onOpenChange(false)} variant="outline" className="mt-4">
                    Close
                  </Button>
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-6">
                    {/* Task ID (read-only) */}
                    <div className="text-sm text-muted-foreground flex items-center">
                      {loading ? (
                        <Skeleton className="h-4 w-1/2" />
                      ) : (
                        <>
                          <Info className="h-3.5 w-3.5 mr-1.5" />
                          <span>
                            Task ID: <span className="font-mono text-xs">{taskId}</span>
                          </span>
                        </>
                      )}
                    </div>

                    {/* Basic Information Section */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium text-muted-foreground">Basic Information</h3>

                      {/* Task Name */}
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Task Name</FormLabel>
                            {loading ? (
                              <Skeleton className="h-10 w-full" />
                            ) : (
                              <div className="space-y-1">
                                <FormControl>
                                  <Input
                                    placeholder="Enter task name"
                                    {...field}
                                    className={cn(
                                      isFieldModified("title") && "border-warning bg-warning-muted",
                                    )}
                                  />
                                </FormControl>
                                {isFieldModified("title") && (
                                  <p className="text-xs text-muted-foreground flex items-center">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Original: {originalData.title}
                                  </p>
                                )}
                                <FormMessage />
                              </div>
                            )}
                          </FormItem>
                        )}
                      />

                      {/* Description */}
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            {loading ? (
                              <Skeleton className="h-20 w-full" />
                            ) : (
                              <div className="space-y-1">
                                <FormControl>
                                  <Textarea
                                    placeholder="Task description"
                                    className={cn(
                                      "min-h-[100px] resize-none",
                                      isFieldModified("description") &&
                                        "border-warning bg-warning-muted",
                                    )}
                                    {...field}
                                  />
                                </FormControl>
                                {isFieldModified("description") && (
                                  <p className="text-xs text-muted-foreground flex items-center">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Modified from original
                                  </p>
                                )}
                                <FormMessage />
                              </div>
                            )}
                          </FormItem>
                        )}
                      />

                      {/* Type */}
                      <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Type</FormLabel>
                            {loading ? (
                              <Skeleton className="h-10 w-full" />
                            ) : (
                              <div className="space-y-1">
                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                  <FormControl>
                                    <SelectTrigger
                                      className={cn(
                                        isFieldModified("type") && "border-warning bg-warning-muted",
                                      )}
                                    >
                                      <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {typeOptions.map((option) => (
                                      <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {isFieldModified("type") && (
                                  <p className="text-xs text-muted-foreground flex items-center">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Original: {originalData.type}
                                  </p>
                                )}
                                <FormMessage />
                              </div>
                            )}
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Scheduling Section */}
                    <div className="space-y-4 pt-2">
                      <h3 className="text-sm font-medium text-muted-foreground">Scheduling</h3>

                      <div className="grid grid-cols-2 gap-4">
                        {/* Week */}
                        <FormField
                          control={form.control}
                          name="week"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Week</FormLabel>
                              {loading ? (
                                <Skeleton className="h-10 w-full" />
                              ) : (
                                <div className="space-y-1">
                                  <Select onValueChange={field.onChange} value={field.value || ""}>
                                    <FormControl>
                                      <SelectTrigger
                                        className={cn(
                                          isFieldModified("week") &&
                                            "border-warning bg-warning-muted",
                                        )}
                                      >
                                        <SelectValue placeholder="Select week" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {[1, 2, 3, 4, 5].map((week) => (
                                        <SelectItem key={week} value={week.toString()}>
                                          Week {week}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  {isFieldModified("week") && (
                                    <p className="text-xs text-muted-foreground flex items-center">
                                      <AlertCircle className="h-3 w-3 mr-1" />
                                      Original: Week {originalData.week}
                                    </p>
                                  )}
                                  <FormMessage />
                                </div>
                              )}
                            </FormItem>
                          )}
                        />

                        {/* Day */}
                        <FormField
                          control={form.control}
                          name="day"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Day</FormLabel>
                              {loading ? (
                                <Skeleton className="h-10 w-full" />
                              ) : (
                                <div className="space-y-1">
                                  <Select onValueChange={field.onChange} value={field.value || ""}>
                                    <FormControl>
                                      <SelectTrigger
                                        className={cn(
                                          isFieldModified("day") && "border-warning bg-warning-muted",
                                        )}
                                      >
                                        <SelectValue placeholder="Select day" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {[1, 2, 3, 4, 5].map((day) => (
                                        <SelectItem key={day} value={day.toString()}>
                                          Day {day}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  {isFieldModified("day") && (
                                    <p className="text-xs text-muted-foreground flex items-center">
                                      <AlertCircle className="h-3 w-3 mr-1" />
                                      Original: Day {originalData.day}
                                    </p>
                                  )}
                                  <FormMessage />
                                </div>
                              )}
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Simple Select Version for Folder Name */}
                      <FormField
                        control={form.control}
                        name="folderName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Folder Name</FormLabel>
                            {loading ? (
                              <Skeleton className="h-10 w-full" />
                            ) : (
                              <div className="space-y-1">
                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                  <FormControl>
                                    <SelectTrigger
                                      className={cn(
                                        isFieldModified("folderName") &&
                                          "border-warning bg-warning-muted",
                                      )}
                                    >
                                      <SelectValue placeholder="Select folder..." />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="max-h-[300px] overflow-y-auto z-[9999]">
                                    {loadingFolders ? (
                                      <div className="p-4 text-center">
                                        <Skeleton className="h-5 w-full mb-2" />
                                        <Skeleton className="h-5 w-full mb-2" />
                                        <Skeleton className="h-5 w-full" />
                                      </div>
                                    ) : (
                                      <>
                                        {folderOptions.map((folder) => (
                                          <SelectItem key={folder.value} value={folder.value}>
                                            {folder.label}
                                          </SelectItem>
                                        ))}
                                      </>
                                    )}
                                  </SelectContent>
                                </Select>
                                {isFieldModified("folderName") && (
                                  <p className="text-xs text-muted-foreground flex items-center">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Original: {originalData.folderName}
                                  </p>
                                )}
                                <FormMessage />
                              </div>
                            )}
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Additional Details Section */}
                    <div className="space-y-4 pt-2">
                      <h3 className="text-sm font-medium text-muted-foreground">Additional Details</h3>

                      {/* Job */}
                      <FormField
                        control={form.control}
                        name="jobTitle"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Job</FormLabel>
                            {loading ? (
                              <Skeleton className="h-10 w-full" />
                            ) : (
                              <div className="space-y-1">
                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                  <FormControl>
                                    <SelectTrigger
                                      className={cn(
                                        isFieldModified("jobTitle") && "border-warning bg-warning-muted",
                                      )}
                                    >
                                      <SelectValue placeholder="Select job role" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {jobOptions.map((option) => (
                                      <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {isFieldModified("jobTitle") && (
                                  <p className="text-xs text-muted-foreground flex items-center">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Original: {originalData.jobTitle}
                                  </p>
                                )}
                                <FormMessage />
                              </div>
                            )}
                          </FormItem>
                        )}
                      />

                      {/* Location */}
                      <FormField
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Location</FormLabel>
                            {loading ? (
                              <Skeleton className="h-10 w-full" />
                            ) : (
                              <div className="space-y-1">
                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                  <FormControl>
                                    <SelectTrigger
                                      className={cn(
                                        isFieldModified("location") &&
                                          "border-warning bg-warning-muted",
                                      )}
                                    >
                                      <SelectValue placeholder="Select location" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {locationOptions.map((option) => (
                                      <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {isFieldModified("location") && (
                                  <p className="text-xs text-muted-foreground flex items-center">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Original: {originalData.location}
                                  </p>
                                )}
                                <FormMessage />
                              </div>
                            )}
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Resource Section */}
                    <div className="space-y-4 pt-2">
                      <div className="flex items-center">
                        <h3 className="text-sm font-medium text-muted-foreground">Resource</h3>
                        {isFieldModified("resourceUrl") && (
                          <Badge
                            variant="outline"
                            className="ml-2 bg-warning-muted text-warning border-warning/20"
                          >
                            Modified
                          </Badge>
                        )}
                      </div>

                      {/* Resource Link */}
                      <FormField
                        control={form.control}
                        name="resourceUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center">
                              <LinkIcon className="h-3.5 w-3.5 mr-1.5" />
                              Resource Link
                            </FormLabel>
                            {loading ? (
                              <Skeleton className="h-10 w-full" />
                            ) : (
                              <div className="space-y-1">
                                <FormControl>
                                  <Input
                                    placeholder="https://example.com/resource"
                                    type="url"
                                    {...field}
                                    onChange={(e) => {
                                      // Use custom handler for resource URL changes
                                      handleResourceUrlChange(e.target.value)
                                    }}
                                    className={cn(
                                      isFieldModified("resourceUrl") &&
                                        "border-warning bg-warning-muted",
                                    )}
                                  />
                                </FormControl>
                                {isFieldModified("resourceUrl") && (
                                  <div className="text-xs text-muted-foreground space-y-1 bg-warning-muted p-2 rounded-md border border-warning/20">
                                    <p className="flex items-center font-medium text-warning">
                                      <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
                                      Resource link has been modified
                                    </p>
                                    <p className="pl-5">Original: {originalData.resourceUrl}</p>
                                  </div>
                                )}
                                <FormDescription className="flex items-center text-xs">
                                  <Info className="h-3 w-3 mr-1.5" />
                                  Enter the URL of the resource (leave empty if none)
                                </FormDescription>
                                <FormMessage />
                              </div>
                            )}
                          </FormItem>
                        )}
                      />

                      {/* Resource Attachment(s) */}
                      <FormField
                        control={form.control}
                        name="attachments"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center">
                              <Paperclip className="h-3.5 w-3.5 mr-1.5" />
                              Resource Attachment(s)
                            </FormLabel>
                            {loading ? (
                              <Skeleton className="h-32 w-full" />
                            ) : (
                              <div className="space-y-2">
                                <div
                                  className={cn(
                                    "border-2 border-dashed rounded-md p-6 transition-colors",
                                    isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
                                    isFieldModified("attachments") &&
                                      "border-warning bg-warning-muted",
                                  )}
                                  onDragOver={handleDragOver}
                                  onDragLeave={handleDragLeave}
                                  onDrop={handleDrop}
                                >
                                  <div className="flex flex-col items-center justify-center gap-1 text-center">
                                    <Upload className="h-10 w-10 text-muted-foreground" />
                                    <p className="text-sm font-medium">Drag & drop files here</p>
                                    <p className="text-xs text-muted-foreground">or</p>
                                    <label htmlFor="file-upload" className="cursor-pointer">
                                      <div className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                                        Browse files
                                      </div>
                                      <input
                                        id="file-upload"
                                        type="file"
                                        multiple
                                        className="sr-only"
                                        onChange={handleFileSelect}
                                      />
                                    </label>
                                  </div>
                                </div>

                                {attachments.length > 0 && (
                                  <div className="space-y-2 mt-2">
                                    <p className="text-xs font-medium text-muted-foreground">
                                      {attachments.length} attachment{attachments.length !== 1 ? "s" : ""}
                                    </p>
                                    <ul className="space-y-2 max-h-40 overflow-y-auto p-2 border rounded-md bg-background">
                                      {attachments.map((file) => (
                                        <li
                                          key={file.id}
                                          className="flex items-center justify-between text-sm p-2 rounded-md hover:bg-muted"
                                        >
                                          <div className="flex items-center gap-2 overflow-hidden">
                                            <FileIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                                            <span className="truncate">{file.name}</span>
                                            {file.isNew && (
                                              <Badge
                                                variant="outline"
                                                className="bg-info-muted text-info border-info/20 text-xs"
                                              >
                                                New
                                              </Badge>
                                            )}
                                          </div>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 rounded-full"
                                            onClick={() => removeAttachment(file.id)}
                                          >
                                            <X className="h-3 w-3" />
                                            <span className="sr-only">Remove</span>
                                          </Button>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {isFieldModified("attachments") && (
                                  <p className="text-xs text-muted-foreground flex items-center">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Attachments have been modified
                                  </p>
                                )}
                                <FormDescription className="flex items-center text-xs">
                                  <Info className="h-3 w-3 mr-1.5" />
                                  Upload files to attach to this task
                                </FormDescription>
                                <FormMessage />
                              </div>
                            )}
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Form Actions */}
                    <div className="pt-4 border-t mt-6">
                      {formModified && (
                        <div className="mb-4 p-2 bg-info-muted rounded-md border border-info/20">
                          <p className="text-sm text-info flex items-center">
                            <Info className="h-4 w-4 mr-2" />
                            You have unsaved changes
                          </p>
                        </div>
                      )}

                      <SheetFooter className="flex justify-between sm:justify-between">
                        <div className="flex gap-2">
                          <SheetClose asChild>
                            <Button type="button" variant="outline" disabled={loading}>
                              Cancel
                            </Button>
                          </SheetClose>
                          {formModified && (
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={resetForm}
                              disabled={loading || !formModified}
                            >
                              Reset
                            </Button>
                          )}
                        </div>
                        <Button
                          type="submit"
                          disabled={loading || !formModified}
                          className={!formModified ? "opacity-50" : ""}
                        >
                          {loading ? "Saving..." : "Save changes"}
                        </Button>
                      </SheetFooter>
                    </div>
                  </form>
                </Form>
              )}
            </SheetContent>
          </Sheet>
        )}
      </AnimatePresence>

      {/* Confirmation Dialog for Resource Link Changes */}
      <AlertDialog open={showLinkConfirm} onOpenChange={setShowLinkConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Resource Link?</AlertDialogTitle>
            <AlertDialogDescription>
              Changing the resource link may affect users who rely on this task. Are you sure you want to update it?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-2 p-3 bg-muted rounded-md">
            <p className="text-sm font-medium">Original link:</p>
            <p className="text-sm font-mono break-all">{originalData?.resourceUrl}</p>
            <p className="text-sm font-medium mt-2">New link:</p>
            <p className="text-sm font-mono break-all">{pendingLinkChange}</p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelLinkChange}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLinkChange}>Confirm Change</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unsaved Changes Confirmation Dialog */}
      <AlertDialog open={showUnsavedChangesModal} onOpenChange={setShowUnsavedChangesModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              Unsaved Changes
            </AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes to this task. Are you sure you want to close without saving? All your changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4 p-4 bg-warning-muted rounded-md border border-warning/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-warning">
                  Your changes include:
                </p>
                <ul className="text-sm text-warning space-y-1">
                  {isFieldModified("title") && (
                    <li>• Task name: "{originalData?.title}" → "{formValues.title}"</li>
                  )}
                  {isFieldModified("description") && (
                    <li>• Description has been modified</li>
                  )}
                  {isFieldModified("type") && (
                    <li>• Type: "{originalData?.type}" → "{formValues.type}"</li>
                  )}
                  {isFieldModified("week") && (
                    <li>• Week: "{originalData?.week}" → "{formValues.week}"</li>
                  )}
                  {isFieldModified("day") && (
                    <li>• Day: "{originalData?.day}" → "{formValues.day}"</li>
                  )}
                  {isFieldModified("folderName") && (
                    <li>• Folder: "{originalData?.folderName}" → "{formValues.folderName}"</li>
                  )}
                  {isFieldModified("jobTitle") && (
                    <li>• Job: "{originalData?.jobTitle}" → "{formValues.jobTitle}"</li>
                  )}
                  {isFieldModified("location") && (
                    <li>• Location: "{originalData?.location}" → "{formValues.location}"</li>
                  )}
                  {isFieldModified("resourceUrl") && (
                    <li>• Resource URL has been modified</li>
                  )}
                  {isFieldModified("attachments") && (
                    <li>• Attachments have been modified</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelCloseWithUnsavedChanges}>
              Keep Editing
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmCloseWithUnsavedChanges}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
