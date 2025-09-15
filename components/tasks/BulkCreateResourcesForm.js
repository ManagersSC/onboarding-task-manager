"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@components/ui/button"
import { Input } from "@components/ui/input"
import { Label } from "@components/ui/label"
import { Textarea } from "@components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@components/ui/select"
import { Badge } from "@components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@components/ui/collapsible"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@components/ui/dialog"
import { toast } from "sonner"
import { motion } from "framer-motion"
import {
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Folder,
  FileText,
  ChevronDown,
  ChevronRight,
  Link,
  FileText as DescriptionIcon,
  X,
} from "lucide-react"
import { cn } from "@components/lib/utils"

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

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
  const [open, setOpen] = useState(false)
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

  const selectedJob = jobs.find((job) => job.id === value)

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

export function BulkCreateResourcesForm({ onSuccess, onCancel, onAutoSaveStateChange, onClearSession }) {
  const [jobGroups, setJobGroups] = useState([]) // Array of job groups with nested folder groups
  const [expandedGroups, setExpandedGroups] = useState(new Set())
  const [isCreating, setIsCreating] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})
  const [jobs, setJobs] = useState([])
  const [folders, setFolders] = useState([])
  const [showNewGroupDialog, setShowNewGroupDialog] = useState(false)
  const [newGroupJob, setNewGroupJob] = useState("")
  const [newGroupFolder, setNewGroupFolder] = useState("")
  const [showAddFolderDialog, setShowAddFolderDialog] = useState(false)
  const [addFolderJobId, setAddFolderJobId] = useState("")
  const [addFolderFolderId, setAddFolderFolderId] = useState("")
  const [lastSaved, setLastSaved] = useState(null) // Track when data was last saved
  const [isAutoSaving, setIsAutoSaving] = useState(false) // Track auto-save status
  const [showPreviewModal, setShowPreviewModal] = useState(false) // Track preview modal

  // Auto-save functions
  const saveToSessionStorage = useCallback(async (data) => {
    setIsAutoSaving(true)
    try {
      // Simulate a small delay to show the spinner
      await new Promise(resolve => setTimeout(resolve, 300))
      
      const saveData = {
        jobGroups: data,
        expandedGroups: Array.from(expandedGroups),
        timestamp: Date.now()
      }
      sessionStorage.setItem('bulkCreateResourcesDraft', JSON.stringify(saveData))
      setLastSaved(Date.now())
    } catch (error) {
      console.error('Failed to save draft to session storage:', error)
    } finally {
      setIsAutoSaving(false)
    }
  }, [expandedGroups])

  const loadFromSessionStorage = useCallback(() => {
    try {
      const saved = sessionStorage.getItem('bulkCreateResourcesDraft')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.jobGroups && Array.isArray(parsed.jobGroups)) {
          setJobGroups(parsed.jobGroups)
          if (parsed.expandedGroups && Array.isArray(parsed.expandedGroups)) {
            setExpandedGroups(new Set(parsed.expandedGroups))
          }
          setLastSaved(parsed.timestamp)
          return true
        }
      }
    } catch (error) {
      console.error('Failed to load draft from session storage:', error)
    }
    return false
  }, [])

  const clearDraft = useCallback(() => {
    try {
      sessionStorage.removeItem('bulkCreateResourcesDraft')
      setLastSaved(null)
    } catch (error) {
      console.error('Failed to clear draft from session storage:', error)
    }
  }, [])

  const clearAllData = useCallback(() => {
    clearDraft()
    setJobGroups([])
    setExpandedGroups(new Set())
    setLastSaved(null)
  }, [clearDraft])

  // Expose clear function to parent component
  useEffect(() => {
    if (onClearSession) {
      onClearSession(clearAllData)
    }
  }, [onClearSession, clearAllData])

  // Load draft on component mount
  useEffect(() => {
    loadFromSessionStorage()
  }, [loadFromSessionStorage])

  // Notify parent component of auto-save state changes
  useEffect(() => {
    if (onAutoSaveStateChange) {
      onAutoSaveStateChange(isAutoSaving)
    }
  }, [isAutoSaving, onAutoSaveStateChange])

  // Auto-save when jobGroups change
  useEffect(() => {
    if (jobGroups.length > 0) {
      const timeoutId = setTimeout(() => {
        saveToSessionStorage(jobGroups)
      }, 3000) // Debounce saves by 3 seconds

      return () => clearTimeout(timeoutId)
    }
  }, [jobGroups, saveToSessionStorage])

  useEffect(() => {
    const fetchJobsAndFolders = async () => {
      try {
        const [jobsResponse, foldersResponse] = await Promise.all([
          fetch("/api/admin/jobs"),
          fetch("/api/admin/folders"),
        ])

        if (jobsResponse.ok) {
          const jobsData = await jobsResponse.json()
          setJobs(jobsData.jobs || [])
        }

        if (foldersResponse.ok) {
          const foldersData = await foldersResponse.json()
          setFolders(foldersData.folders || [])
        }
      } catch (error) {
        console.error("Error fetching jobs/folders:", error)
      }
    }

    fetchJobsAndFolders()
  }, [])

  const organizedGroups = jobGroups.reduce((acc, jobGroup) => {
    acc[jobGroup.id] = jobGroup.folders || []
    return acc
  }, {})

  const validateResource = useCallback((resource) => {
    const errors = {}
    if (!resource.taskName?.trim()) errors.taskName = "Task name is required"
    if (!resource.taskWeek || isNaN(resource.taskWeek)) errors.taskWeek = "Valid week number is required"
    if (!resource.taskDay || isNaN(resource.taskDay)) errors.taskDay = "Valid day number is required"
    if (!resource.taskMedium) errors.taskMedium = "Medium type is required"
    if (!resource.taskLink?.trim()) errors.taskLink = "Resource link is required"
    
    // Validate URL format if link is provided
    if (resource.taskLink?.trim()) {
      try {
        new URL(resource.taskLink)
      } catch {
        errors.taskLink = "Please enter a valid URL (e.g., https://example.com)"
      }
    }
    
    return errors
  }, [])

  const validateAllResources = useCallback(() => {
    const errors = {}
    jobGroups.forEach((jobGroup) => {
      (jobGroup.folders || []).forEach((folderGroup) => {
        (folderGroup.resources || []).forEach((resource) => {
          const resourceErrors = validateResource(resource)
          if (Object.keys(resourceErrors).length > 0) {
            errors[`resource_${resource.id}`] = resourceErrors
          }
        })
      })
    })
    setValidationErrors(errors)
    return errors
  }, [jobGroups, validateResource])

  const addResource = (jobGroupId, folderGroupId) => {
    const newResource = {
      id: Date.now() + Math.random(),
      taskName: "",
      taskDescription: "",
      taskWeek: "",
      taskDay: "",
      taskMedium: "",
      taskLink: "",
    }
    
    setJobGroups((prev) => prev.map((jobGroup) => 
      jobGroup.id === jobGroupId 
        ? {
            ...jobGroup,
            folders: (jobGroup.folders || []).map((folderGroup) =>
              folderGroup.id === folderGroupId
                ? { ...folderGroup, resources: [...(folderGroup.resources || []), newResource] }
                : folderGroup
            )
          }
        : jobGroup
    ))
  }

  const createNewGroup = () => {
    if (!newGroupJob) {
      toast.error("Please select a job for the new group")
      return
    }

    const job = jobs.find(j => j.id === newGroupJob)
    const folder = folders.find(f => f.id === newGroupFolder)
    
    // Check if job group already exists
    const existingJobGroup = jobGroups.find(jg => jg.jobId === newGroupJob)
    
    if (existingJobGroup) {
      // Add folder to existing job group
      const newFolderGroup = {
        id: Date.now() + Math.random(),
        folderId: newGroupFolder === "no-folder" ? null : newGroupFolder,
        folderName: newGroupFolder === "no-folder" ? "No Folder" : (folder?.name || "No Folder"),
        resources: []
      }
      
      setJobGroups((prev) => prev.map((jobGroup) => 
        jobGroup.id === existingJobGroup.id
          ? { ...jobGroup, folders: [...(jobGroup.folders || []), newFolderGroup] }
          : jobGroup
      ))
      
      setExpandedGroups((prev) => new Set([...prev, newFolderGroup.id]))
      toast.success(`Added folder "${newGroupFolder === "no-folder" ? "No Folder" : (folder?.name || "No Folder")}" to ${job?.title}`)
    } else {
      // Create new job group with folder
      const newJobGroup = {
        id: Date.now() + Math.random(),
        jobId: newGroupJob,
        jobName: job?.title || "",
        folders: [{
          id: Date.now() + Math.random() + 1,
          folderId: newGroupFolder === "no-folder" ? null : newGroupFolder,
          folderName: newGroupFolder === "no-folder" ? "No Folder" : (folder?.name || "No Folder"),
          resources: []
        }]
      }
      
      setJobGroups((prev) => [...prev, newJobGroup])
      setExpandedGroups((prev) => new Set([...prev, newJobGroup.id, newJobGroup.folders[0].id]))
      toast.success(`Created new job group: ${job?.title}`)
    }

    setShowNewGroupDialog(false)
    setNewGroupJob("")
    setNewGroupFolder("")
  }

  const addFolderToJob = () => {
    if (!addFolderFolderId) {
      toast.error("Please select a folder")
      return
    }

    const folder = folders.find(f => f.id === addFolderFolderId)
    const jobGroup = jobGroups.find(jg => jg.id === addFolderJobId)
    
    const newFolderGroup = {
      id: Date.now() + Math.random(),
      folderId: addFolderFolderId === "no-folder" ? null : addFolderFolderId,
      folderName: addFolderFolderId === "no-folder" ? "No Folder" : (folder?.name || "No Folder"),
      resources: []
    }
    
    setJobGroups((prev) => prev.map((jobGroup) => 
      jobGroup.id === addFolderJobId
        ? { ...jobGroup, folders: [...(jobGroup.folders || []), newFolderGroup] }
        : jobGroup
    ))
    
    setExpandedGroups((prev) => new Set([...prev, newFolderGroup.id]))
    setShowAddFolderDialog(false)
    setAddFolderJobId("")
    setAddFolderFolderId("")
    toast.success(`Added folder "${folder?.name || 'No Folder'}" to ${jobGroup?.jobName}`)
  }

  const updateResource = (jobGroupId, folderGroupId, resourceId, field, value) => {
    setJobGroups((prev) => {
      const updatedJobGroups = prev.map((jobGroup) => 
        jobGroup.id === jobGroupId 
          ? {
              ...jobGroup,
              folders: (jobGroup.folders || []).map((folderGroup) =>
                folderGroup.id === folderGroupId
                  ? {
                      ...folderGroup,
                      resources: (folderGroup.resources || []).map((resource) => 
                        resource.id === resourceId ? { ...resource, [field]: value } : resource
                      )
                    }
                  : folderGroup
              )
            }
          : jobGroup
      )
      
      // Find the updated resource and validate it immediately
      const updatedResource = updatedJobGroups
        .find(jg => jg.id === jobGroupId)
        ?.folders?.find(fg => fg.id === folderGroupId)
        ?.resources?.find(r => r.id === resourceId)
      
      if (updatedResource) {
        const resourceErrors = validateResource(updatedResource)
        setValidationErrors(prev => {
          const newErrors = { ...prev }
          if (Object.keys(resourceErrors).length > 0) {
            newErrors[`resource_${resourceId}`] = resourceErrors
          } else {
            delete newErrors[`resource_${resourceId}`]
          }
          return newErrors
        })
      }
      
      return updatedJobGroups
    })
  }

  const removeResource = (jobGroupId, folderGroupId, resourceId) => {
    setJobGroups((prev) => prev.map((jobGroup) => 
      jobGroup.id === jobGroupId 
        ? {
            ...jobGroup,
            folders: (jobGroup.folders || []).map((folderGroup) =>
              folderGroup.id === folderGroupId
                ? {
                    ...folderGroup,
                    resources: (folderGroup.resources || []).filter((resource) => resource.id !== resourceId)
                  }
                : folderGroup
            )
          }
        : jobGroup
    ))
  }

  const removeFolderGroup = (jobGroupId, folderGroupId) => {
    setJobGroups((prev) => prev.map((jobGroup) => 
      jobGroup.id === jobGroupId 
        ? {
            ...jobGroup,
            folders: (jobGroup.folders || []).filter((folderGroup) => folderGroup.id !== folderGroupId)
          }
        : jobGroup
    ))
    
    setExpandedGroups((prev) => {
      const newSet = new Set(prev)
      newSet.delete(folderGroupId)
      return newSet
    })
  }

  const removeJobGroup = (jobGroupId) => {
    setJobGroups((prev) => prev.filter((jobGroup) => jobGroup.id !== jobGroupId))
    setExpandedGroups((prev) => {
      const newSet = new Set(prev)
      newSet.delete(jobGroupId)
      return newSet
    })
  }

  const toggleGroupExpansion = (groupKey) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey)
      } else {
        newSet.add(groupKey)
      }
      return newSet
    })
  }


  const handleBulkCreate = async () => {
    const errors = validateAllResources()
    if (Object.keys(errors).length > 0) {
      toast.error("Please fix validation errors before creating resources")
      return
    }

    const allResources = jobGroups.flatMap(jobGroup => 
      (jobGroup.folders || []).flatMap(folderGroup =>
        (folderGroup.resources || []).map(resource => ({
          ...resource,
          taskJob: jobGroup.jobId || null,
          taskFolder: folderGroup.folderId || null
        }))
      )
    )


    if (allResources.length === 0) {
      toast.error("Please add at least one resource")
      return
    }

    setIsCreating(true)
    try {
      await onSuccess(allResources)
      // Clear local state and session data on successful API call
      clearAllData()
    } catch (error) {
      // Don't clear session data on error - preserve user's work
      toast.error("Failed to create resources")
    } finally {
      setIsCreating(false)
    }
  }

  const handleCancel = () => {
    onCancel()
  }

  const totalResources = jobGroups.reduce((total, jobGroup) => 
    total + (jobGroup.folders || []).reduce((folderTotal, folderGroup) => 
      folderTotal + (folderGroup.resources || []).length, 0
    ), 0
  )
  const resourcesWithErrors = Object.keys(validationErrors).length
  const validResources = totalResources - resourcesWithErrors

  return (
    <div className="max-h-[80vh] flex flex-col">
      <motion.div
        className="flex-1 space-y-6 overflow-hidden"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={itemVariants}>
          <div className="flex items-center justify-between mb-6 mt-4">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-foreground">Resource Groups</h3>
              {isAutoSaving ? (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                  Auto-saving...
                </div>
              ) : lastSaved ? (
                <span className="text-xs text-muted-foreground">
                  Last saved: {new Date(lastSaved).toLocaleTimeString()}
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={resourcesWithErrors > 0 ? "destructive" : "default"} className="gap-1.5 px-2 py-1">
                {resourcesWithErrors > 0 ? <AlertCircle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                {validResources}/{totalResources} Valid
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNewGroupDialog(true)}
                className="gap-1.5 h-7 px-3 text-xs border-dashed hover:border-solid"
              >
                <Plus className="h-3 w-3" />
                New Group
              </Button>
            </div>
          </div>
        </motion.div>

        {jobGroups.map((jobGroup) => (
          <motion.div key={jobGroup.id} variants={itemVariants} className="space-y-4">
            <div className="border rounded-lg overflow-hidden bg-card">
              <Collapsible
                open={expandedGroups.has(jobGroup.id)}
                onOpenChange={() => toggleGroupExpansion(jobGroup.id)}
              >
                <CollapsibleTrigger asChild>
                  <div className="cursor-pointer hover:bg-muted/30 transition-colors p-4 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {expandedGroups.has(jobGroup.id) ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <Briefcase className="h-4 w-4 text-blue-500" />
                        <div>
                          <h4 className="font-semibold text-sm">{jobGroup.jobName}</h4>
                          <p className="text-xs text-muted-foreground">
                            {(jobGroup.folders || []).length} folder{(jobGroup.folders || []).length !== 1 ? "s" : ""} • 
                            {(jobGroup.folders || []).reduce((total, folder) => total + (folder.resources || []).length, 0)} resources
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs font-mono">
                          {(jobGroup.folders || []).reduce((total, folder) => total + (folder.resources || []).length, 0)}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setAddFolderJobId(jobGroup.id)
                            setShowAddFolderDialog(true)
                          }}
                          className="h-7 w-7 p-0 hover:bg-primary/10 hover:text-primary"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeJobGroup(jobGroup.id)
                          }}
                          className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="p-4 space-y-4 max-h-64 overflow-y-auto custom-scrollbar">
                    {(jobGroup.folders || []).map((folderGroup) => (
                      <div key={folderGroup.id} className="border rounded-md bg-background/50">
                        <Collapsible
                          open={expandedGroups.has(folderGroup.id)}
                          onOpenChange={() => toggleGroupExpansion(folderGroup.id)}
                        >
                          <CollapsibleTrigger asChild>
                            <div className="cursor-pointer hover:bg-muted/30 transition-colors p-3 border-b">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {expandedGroups.has(folderGroup.id) ? (
                                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                                  )}
                                  <Folder className="h-3.5 w-3.5 text-amber-500" />
                                  <span className="text-sm font-medium">{folderGroup.folderName}</span>
                                  <Badge variant="secondary" className="text-xs">
                                    {(folderGroup.resources || []).length} resources
                                  </Badge>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    removeFolderGroup(jobGroup.id, folderGroup.id)
                                  }}
                                  className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="p-3 space-y-3">
                          {(folderGroup.resources || []).map((resource, index) => (
                            <div key={resource.id} className="border rounded-md p-3 space-y-3 bg-background/30">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-sm font-medium">{resource.taskName || `Resource ${index + 1}`}</span>
                                  {validationErrors[`resource_${resource.id}`] && (
                                    <Badge variant="destructive" className="gap-1 text-xs h-5">
                                      <AlertCircle className="h-2.5 w-2.5" />
                                      Invalid
                                    </Badge>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeResource(jobGroup.id, folderGroup.id, resource.id)}
                                  className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Task Name</Label>
                                  <Input
                                    placeholder="Enter task name"
                                    value={resource.taskName}
                                    onChange={(e) => updateResource(jobGroup.id, folderGroup.id, resource.id, "taskName", e.target.value)}
                                    className={cn(
                                      "h-7 text-xs",
                                      validationErrors[`resource_${resource.id}`]?.taskName ? "border-destructive" : "",
                                    )}
                                  />
                                </div>

                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Description</Label>
                                  <Textarea
                                    placeholder="Enter description"
                                    value={resource.taskDescription}
                                    onChange={(e) => updateResource(jobGroup.id, folderGroup.id, resource.id, "taskDescription", e.target.value)}
                                    rows={1}
                                    className="min-h-7 resize-none text-xs"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Week</Label>
                                  <Input
                                    placeholder="1"
                                    value={resource.taskWeek}
                                    onChange={(e) => updateResource(jobGroup.id, folderGroup.id, resource.id, "taskWeek", e.target.value)}
                                    className={cn(
                                      "h-7 text-xs",
                                      validationErrors[`resource_${resource.id}`]?.taskWeek ? "border-destructive" : "",
                                    )}
                                  />
                                </div>

                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Day</Label>
                                  <Input
                                    placeholder="1"
                                    value={resource.taskDay}
                                    onChange={(e) => updateResource(jobGroup.id, folderGroup.id, resource.id, "taskDay", e.target.value)}
                                    className={cn(
                                      "h-7 text-xs",
                                      validationErrors[`resource_${resource.id}`]?.taskDay ? "border-destructive" : "",
                                    )}
                                  />
                                </div>

                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Medium</Label>
                                  <Select
                                    value={resource.taskMedium}
                                    onValueChange={(value) => updateResource(jobGroup.id, folderGroup.id, resource.id, "taskMedium", value)}
                                  >
                                    <SelectTrigger
                                      className={cn(
                                        "h-7 text-xs",
                                        validationErrors[`resource_${resource.id}`]?.taskMedium ? "border-destructive" : "",
                                      )}
                                    >
                                      <SelectValue placeholder="Select medium" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Document">Document</SelectItem>
                                      <SelectItem value="Video">Video</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Resource Link *</Label>
                                  <Input
                                    placeholder="https://example.com"
                                    value={resource.taskLink}
                                    onChange={(e) => updateResource(jobGroup.id, folderGroup.id, resource.id, "taskLink", e.target.value)}
                                    className={cn(
                                      "h-7 text-xs",
                                      validationErrors[`resource_${resource.id}`]?.taskLink ? "border-destructive" : "",
                                    )}
                                  />
                                  {validationErrors[`resource_${resource.id}`]?.taskLink && (
                                    <p className="text-xs text-destructive">
                                      {validationErrors[`resource_${resource.id}`].taskLink}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => addResource(jobGroup.id, folderGroup.id)}
                                className="w-full gap-2 h-8 border-dashed hover:border-solid bg-transparent"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                Add Resource to {folderGroup.folderName}
                              </Button>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </motion.div>
        ))}


        <motion.div className="flex justify-between items-center pt-4 border-t" variants={itemVariants}>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowPreviewModal(true)}
            disabled={totalResources === 0}
            className="px-4 gap-2"
          >
            <FileText className="h-4 w-4" />
            Generate Preview
          </Button>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isCreating}
              className="px-6 bg-transparent"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleBulkCreate}
              disabled={isCreating || resourcesWithErrors > 0 || totalResources === 0}
              className="px-6"
            >
              {isCreating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Creating {totalResources} Resources...
                </>
              ) : (
                `Create ${totalResources} Resource${totalResources !== 1 ? "s" : ""}`
              )}
            </Button>
          </div>
        </motion.div>
      </motion.div>

      {/* New Group Creation Dialog */}
      <Dialog open={showNewGroupDialog} onOpenChange={setShowNewGroupDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Group</DialogTitle>
            <DialogDescription>Select a job and optional folder for the new resource group.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Job *</Label>
              <JobDropdown
                value={newGroupJob}
                onChange={setNewGroupJob}
                placeholder="Select a job..."
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Folder (Optional)</Label>
              <Select value={newGroupFolder} onValueChange={setNewGroupFolder}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a folder..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-folder">No Folder</SelectItem>
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      {folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowNewGroupDialog(false)
                setNewGroupJob("")
                setNewGroupFolder("")
              }}
            >
              Cancel
            </Button>
            <Button type="button" onClick={createNewGroup} disabled={!newGroupJob}>
              Create Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Folder to Job Dialog */}
      <Dialog open={showAddFolderDialog} onOpenChange={setShowAddFolderDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Folder to Job</DialogTitle>
            <DialogDescription>Select a folder to add to this job group.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Folder</Label>
              <Select value={addFolderFolderId} onValueChange={setAddFolderFolderId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a folder..." />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    const currentJobGroup = jobGroups.find(jg => jg.id === addFolderJobId)
                    const hasNoFolderGroup = currentJobGroup?.folders?.some(fg => fg.folderId === null)
                    
                    return (
                      <>
                        {!hasNoFolderGroup && <SelectItem value="no-folder">No Folder</SelectItem>}
                        {folders.map((folder) => (
                          <SelectItem key={folder.id} value={folder.id}>
                            {folder.name}
                          </SelectItem>
                        ))}
                      </>
                    )
                  })()}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAddFolderDialog(false)
                setAddFolderJobId("")
                setAddFolderFolderId("")
              }}
            >
              Cancel
            </Button>
            <Button type="button" onClick={addFolderToJob} disabled={!addFolderFolderId}>
              Add Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Resource Preview</DialogTitle>
            <DialogDescription>
              Review all {totalResources} resource{totalResources !== 1 ? "s" : ""} before creating them.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto custom-scrollbar">
              <div className="space-y-2 p-2">
                {jobGroups.map((jobGroup) => (
                  <div key={jobGroup.id} className="space-y-1">
                    {/* Job Level */}
                    <div className="flex items-center gap-2 p-2 bg-primary/10 rounded border-l-2 border-primary">
                      <Briefcase className="h-4 w-4 text-primary" />
                      <span className="font-medium">{jobGroup.jobName}</span>
                      <span className="text-sm text-muted-foreground">
                        ({(jobGroup.folders || []).reduce((total, folder) => total + (folder.resources || []).length, 0)} resources)
                      </span>
                    </div>
                    
                    {/* Folder Level */}
                    {(jobGroup.folders || []).map((folderGroup) => (
                      <div key={folderGroup.id} className="ml-4 space-y-1">
                        <div className="flex items-center gap-2 p-1.5 bg-muted/50 rounded border-l border-muted-foreground/30">
                          <Folder className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm">{folderGroup.folderName}</span>
                          <span className="text-xs text-muted-foreground">
                            ({(folderGroup.resources || []).length} resources)
                          </span>
                        </div>
                        
                        {/* Resource Level */}
                        <div className="ml-4 space-y-0.5">
                          {(folderGroup.resources || []).map((resource, index) => {
                            const errors = validationErrors[`resource_${resource.id}`] || {}
                            const hasErrors = Object.keys(errors).length > 0
                            
                            return (
                              <div 
                                key={resource.id} 
                                className={`px-2 py-1 rounded border-l-2 ${
                                  hasErrors 
                                    ? "border-red-500 bg-red-50 dark:bg-red-950/20" 
                                    : "border-green-500 bg-green-50 dark:bg-green-950/20"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <div className="flex-shrink-0">
                                    {resource.taskMedium === "Document" ? (
                                      <FileText className="h-3 w-3 text-blue-600" />
                                    ) : (
                                      <div className="h-3 w-3 text-purple-600">▶</div>
                                    )}
                                  </div>
                                  
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-xs">
                                        {resource.taskName || `Resource ${index + 1}`}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        W{resource.taskWeek}D{resource.taskDay}
                                      </span>
                                      <div className={`flex items-center ${resource.taskDescription ? 'text-green-600' : 'text-red-600'}`}>
                                        <DescriptionIcon className="h-3 w-3" />
                                      </div>
                                      <div className={`flex items-center ${resource.taskLink && !errors.taskLink ? 'text-green-600' : 'text-red-600'}`}>
                                        {resource.taskLink && !errors.taskLink ? (
                                          <Link className="h-3 w-3" />
                                        ) : (
                                          <X className="h-3 w-3" />
                                        )}
                                      </div>
                                      {hasErrors && (
                                        <span className="text-xs text-red-600 font-medium">
                                          Missing: {Object.keys(errors).join(', ')}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPreviewModal(false)}
            >
              Close Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
