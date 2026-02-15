"use client"

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@components/ui/table"
import { Input } from "@components/ui/input"
import { Button } from "@components/ui/button"
import { Checkbox } from "@components/ui/checkbox"
import { Badge } from "@components/ui/badge"
import { Card } from "@components/ui/card"
import {
  ExternalLink, ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
  Search, X, Loader2, Paperclip, Trash2, RefreshCw, Pencil,
  Package, Plus, LayoutList, Layers, ChevronsUpDown,
  Calendar, Briefcase, FileText, Clock
} from "lucide-react"
import { toast } from "sonner"
import { FolderBadge } from "./FolderBadge"
import { useDebounce } from "@/hooks/use-debounce"
import { SkeletonRow } from "./SkeletonRow"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@components/ui/select"
import { TaskEditSheet } from "./TaskEditSheet"
import { cn } from "@components/lib/utils"
import { FileViewerModal } from "./files/FileViewerModal"
import { motion, AnimatePresence } from "framer-motion"
import { AnimatedFilterPill } from "./table/AnimatedFilterPills"
import BulkDeleteTasksModal from "./BulkDeleteTasksModal"
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from "@components/ui/tooltip"

// --- H1: Numeric sort utility ---
function numericSort(tasks, sortColumn, sortDirection) {
  const numericColumns = ["week", "day"]
  if (!numericColumns.includes(sortColumn)) return tasks

  const sorted = [...tasks].sort((a, b) => {
    const aVal = parseInt(a[sortColumn], 10) || 0
    const bVal = parseInt(b[sortColumn], 10) || 0
    return sortDirection === "asc" ? aVal - bVal : bVal - aVal
  })
  return sorted
}

// Default sort: week asc, then day asc (always numeric)
function defaultWeekDaySort(tasks) {
  return [...tasks].sort((a, b) => {
    const weekA = parseInt(a.week, 10) || 0
    const weekB = parseInt(b.week, 10) || 0
    if (weekA !== weekB) return weekA - weekB
    const dayA = parseInt(a.day, 10) || 0
    const dayB = parseInt(b.day, 10) || 0
    return dayA - dayB
  })
}

// --- H2: Group tasks by week/day ---
function groupTasksByWeek(tasks) {
  const groups = {}
  tasks.forEach((task) => {
    const week = task.week || "Unassigned"
    if (!groups[week]) groups[week] = {}
    const day = task.day || "Unassigned"
    if (!groups[week][day]) groups[week][day] = []
    groups[week][day].push(task)
  })

  // Sort week keys numerically
  const sortedWeeks = Object.keys(groups).sort((a, b) => {
    if (a === "Unassigned") return 1
    if (b === "Unassigned") return -1
    return (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0)
  })

  return sortedWeeks.map((week) => {
    const days = groups[week]
    const sortedDays = Object.keys(days).sort((a, b) => {
      if (a === "Unassigned") return 1
      if (b === "Unassigned") return -1
      return (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0)
    })
    const totalTasks = sortedDays.reduce((sum, d) => sum + days[d].length, 0)
    return {
      week,
      totalTasks,
      days: sortedDays.map((day) => ({ day, tasks: days[day] })),
    }
  })
}

// --- H5: Table filters (redesigned) ---
function TableFilters({
  onSearch,
  onSubmit,
  isLoading,
  week,
  day,
  onWeekChange,
  onDayChange,
  job,
  folder,
  onJobChange,
  onFolderChange,
  taskCount,
  selectedTasks,
  onDeleteSelected,
  onRefresh,
  viewMode,
  onViewModeChange,
}) {
  const [term, setTerm] = useState("")
  const debouncedTerm = useDebounce(term, 300)
  const [isFocused, setIsFocused] = useState(false)

  // Lazy options
  const [jobOptions, setJobOptions] = useState([])
  const [folderOptions, setFolderOptions] = useState([])
  const [jobsLoading, setJobsLoading] = useState(false)
  const [foldersLoading, setFoldersLoading] = useState(false)
  const [jobsFetched, setJobsFetched] = useState(false)
  const [foldersFetched, setFoldersFetched] = useState(false)

  const fetchJobs = async () => {
    if (jobsFetched || jobsLoading) return
    setJobsLoading(true)
    try {
      const res = await fetch("/api/admin/jobs?includeClosed=true")
      if (!res.ok) throw new Error("Failed to fetch jobs")
      const data = await res.json()
      const titles = (data.jobs || [])
        .map((j) => j.title)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b))
      setJobOptions(Array.from(new Set(titles)))
      setJobsFetched(true)
    } catch (e) {
      // swallow
    } finally {
      setJobsLoading(false)
    }
  }

  const fetchFolders = async () => {
    if (foldersFetched || foldersLoading) return
    setFoldersLoading(true)
    try {
      const res = await fetch("/api/admin/folders?includeInactive=true")
      if (!res.ok) throw new Error("Failed to fetch folders")
      const data = await res.json()
      const names = (data.folders || [])
        .map((f) => f.name)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b))
      setFolderOptions(Array.from(new Set(names)))
      setFoldersFetched(true)
    } catch (e) {
      // swallow
    } finally {
      setFoldersLoading(false)
    }
  }

  useEffect(() => {
    onSearch(debouncedTerm)
  }, [debouncedTerm, onSearch])

  const handleChange = (e) => setTerm(e.target.value)
  const handleKeyDown = (e) => { if (e.key === "Enter") onSubmit(term) }
  const handleClear = () => { setTerm(""); onSearch("") }

  const hasActiveFilters = week !== "all" || day !== "all" || job !== "all" || folder !== "all" || term
  const activeFilterCount = [
    week !== "all", day !== "all", job !== "all", folder !== "all", term
  ].filter(Boolean).length

  const clearAllFilters = () => {
    setTerm("")
    onSearch("")
    onWeekChange("all")
    onDayChange("all")
    onJobChange("all")
    onFolderChange("all")
  }

  return (
    <div className="space-y-3">
      {/* Main toolbar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3">
        {/* Search */}
        <div className="relative w-full lg:w-72">
          <Search className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-200",
            isFocused ? "text-primary" : "text-muted-foreground"
          )} />
          <Input
            type="text"
            placeholder="Search resources..."
            value={term}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="pl-9 pr-10 h-10 rounded-lg border-border/40 focus-visible:ring-2 focus-visible:ring-primary/20"
            aria-label="Search resources"
          />
          {term && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              onClick={handleClear}
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
          {isLoading && <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />}
        </div>

        {/* Filter selects */}
        <div className="flex flex-wrap items-center gap-2">
          <Select value={week} onValueChange={onWeekChange}>
            <SelectTrigger className="h-9 w-[100px] rounded-lg text-body-sm border-border/40">
              <SelectValue placeholder="Week" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Weeks</SelectItem>
              {[1, 2, 3, 4, 5].map((w) => (
                <SelectItem key={w} value={`${w}`}>Week {w}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={day} onValueChange={onDayChange}>
            <SelectTrigger className="h-9 w-[90px] rounded-lg text-body-sm border-border/40">
              <SelectValue placeholder="Day" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Days</SelectItem>
              {[1, 2, 3, 4, 5].map((d) => (
                <SelectItem key={d} value={`${d}`}>Day {d}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={job} onValueChange={onJobChange} onOpenChange={(open) => { if (open) fetchJobs() }}>
            <SelectTrigger className="h-9 w-[140px] rounded-lg text-body-sm border-border/40">
              <SelectValue placeholder="Job" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Jobs</SelectItem>
              {jobsLoading ? (
                <div className="px-2 py-1.5 text-body-sm text-muted-foreground">Loading...</div>
              ) : jobOptions.length === 0 ? (
                <div className="px-2 py-1.5 text-body-sm text-muted-foreground">No jobs</div>
              ) : (
                jobOptions.map((title) => (
                  <SelectItem key={title} value={title}>{title}</SelectItem>
                ))
              )}
            </SelectContent>
          </Select>

          <Select value={folder} onValueChange={onFolderChange} onOpenChange={(open) => { if (open) fetchFolders() }}>
            <SelectTrigger className="h-9 w-[140px] rounded-lg text-body-sm border-border/40">
              <SelectValue placeholder="Folder" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Folders</SelectItem>
              {foldersLoading ? (
                <div className="px-2 py-1.5 text-body-sm text-muted-foreground">Loading...</div>
              ) : folderOptions.length === 0 ? (
                <div className="px-2 py-1.5 text-body-sm text-muted-foreground">No folders</div>
              ) : (
                folderOptions.map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))
              )}
            </SelectContent>
          </Select>

          {/* Active filter pills — inline */}
          <AnimatePresence>
            {hasActiveFilters && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-wrap items-center gap-1.5"
              >
                {week !== "all" && (
                  <AnimatedFilterPill label="Week" value={`Week ${week}`} onRemove={() => onWeekChange("all")} />
                )}
                {day !== "all" && (
                  <AnimatedFilterPill label="Day" value={`Day ${day}`} onRemove={() => onDayChange("all")} />
                )}
                {term && (
                  <AnimatedFilterPill label="Search" value={term} onRemove={handleClear} />
                )}
                {job !== "all" && (
                  <AnimatedFilterPill label="Job" value={job} onRemove={() => onJobChange("all")} />
                )}
                {folder !== "all" && (
                  <AnimatedFilterPill label="Folder" value={folder} onRemove={() => onFolderChange("all")} />
                )}
                {activeFilterCount > 1 && (
                  <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-6 px-2 text-caption text-muted-foreground hover:text-foreground">
                    Clear all
                  </Button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right side: view toggle, refresh, delete */}
        <div className="flex items-center gap-2 ml-auto">
          {/* View mode toggle */}
          <div className="inline-flex items-center rounded-lg border border-border/40 p-0.5">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === "list" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => onViewModeChange("list")}
                    className={cn("h-7 w-7 p-0 rounded-md", viewMode === "list" && "shadow-sm")}
                    aria-label="List view"
                  >
                    <LayoutList className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>List view</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === "grouped" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => onViewModeChange("grouped")}
                    className={cn("h-7 w-7 p-0 rounded-md", viewMode === "grouped" && "shadow-sm")}
                    aria-label="Grouped view"
                  >
                    <Layers className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>Grouped by week</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRefresh}
                  disabled={isLoading}
                  className="h-8 w-8 p-0"
                  aria-label="Refresh"
                >
                  <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p>Refresh data</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {selectedTasks.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onDeleteSelected}
              disabled={isLoading}
              className="h-8"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Delete ({selectedTasks.length})
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// --- H6: Sort indicator icon ---
function SortIndicator({ column, sortColumn, sortDirection }) {
  const isActive = sortColumn === column
  if (!isActive) return (
    <ChevronsUpDown className="ml-1.5 h-3.5 w-3.5 text-muted-foreground/30" />
  )
  return sortDirection === "asc" ? (
    <ChevronUp className="ml-1.5 h-3.5 w-3.5 text-primary" />
  ) : (
    <ChevronDown className="ml-1.5 h-3.5 w-3.5 text-primary" />
  )
}

// --- H3: Expandable row detail ---
function ExpandedRowDetail({ task, onOpenFileViewer, onOpenEditSheet }) {
  return (
    <motion.tr
      key={`${task.id}-detail`}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <TableCell colSpan={6} className="p-0">
        <div className="border-l-2 border-primary/20 bg-muted/5 px-6 py-4 ml-[40px]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Description */}
            {task.description && (
              <div className="md:col-span-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-caption text-muted-foreground font-medium uppercase tracking-wide">Description</span>
                </div>
                <p className="text-body-sm text-foreground/80 leading-relaxed">{task.description}</p>
              </div>
            )}

            {/* Job */}
            {task.jobTitle && (
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-caption text-muted-foreground font-medium uppercase tracking-wide">Job</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-body-sm">{task.jobTitle}</span>
                  {task.jobInfo?.jobStatus && (
                    <Badge variant="secondary" className="text-caption">{task.jobInfo.jobStatus}</Badge>
                  )}
                </div>
              </div>
            )}

            {/* Type */}
            {task.type && (
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-caption text-muted-foreground font-medium uppercase tracking-wide">Type</span>
                </div>
                <span className="text-body-sm">{task.type}</span>
              </div>
            )}

            {/* Resource URL */}
            {task.resourceUrl && (
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-caption text-muted-foreground font-medium uppercase tracking-wide">Resource</span>
                </div>
                <a
                  href={task.resourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-body-sm text-primary hover:underline truncate block max-w-md"
                >
                  {task.resourceUrl}
                </a>
              </div>
            )}

            {/* Created */}
            {task.createdTime && (
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-caption text-muted-foreground font-medium uppercase tracking-wide">Created</span>
                </div>
                <span className="text-body-sm text-muted-foreground">
                  {new Date(task.createdTime).toLocaleDateString("en-GB", {
                    day: "numeric", month: "short", year: "numeric"
                  })}
                </span>
              </div>
            )}
          </div>

          {/* Actions row */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/20">
            <Button variant="outline" size="sm" onClick={() => onOpenEditSheet(task.id)} className="h-8">
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => onOpenFileViewer(task.id)} className="h-8">
              <Paperclip className="h-3.5 w-3.5 mr-1.5" />
              Files {task.attachmentCount > 0 && `(${task.attachmentCount})`}
            </Button>
            {task.resourceUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(task.resourceUrl, "_blank", "noopener,noreferrer")}
                className="h-8"
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Open Link
              </Button>
            )}
          </div>
        </div>
      </TableCell>
    </motion.tr>
  )
}

// ============================================================
// Main TasksTable component
// ============================================================
export function TasksTable({ onOpenCreateTask, onSelectionChange }) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Selection
  const [selected, setSelected] = useState({})
  const selectedTasks = useMemo(() => tasks.filter((task) => selected[task.id]), [tasks, selected])
  const allChecked = useMemo(() => tasks.length > 0 && tasks.every((task) => selected[task.id]), [tasks, selected])

  // H3: Expanded rows
  const [expandedRows, setExpandedRows] = useState({})

  // H2: View mode
  const [viewMode, setViewMode] = useState("grouped")
  const [collapsedWeeks, setCollapsedWeeks] = useState({})

  // Column resizing
  const [columnWidths, setColumnWidths] = useState({
    checkbox: 40,
    title: 320,
    week: 72,
    day: 72,
    folder: 140,
    actions: 100,
  })
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)
  const resizingColumnRef = useRef(null)
  const tableRef = useRef(null)

  // Filters
  const [searchTerm, setSearchTerm] = useState("")
  const [weekFilter, setWeekFilter] = useState("all")
  const [dayFilter, setDayFilter] = useState("all")
  const [jobFilter, setJobFilter] = useState("all")
  const [folderFilter, setFolderFilter] = useState("all")

  // Task Editing
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  // File Viewer Modal
  const [isFileViewerOpen, setIsFileViewerOpen] = useState(false)
  const [currentTaskId, setCurrentTaskId] = useState(null)

  // Bulk Delete Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  // Pagination
  const [pagination, setPagination] = useState({
    pageSize: 25,
    hasNextPage: false,
    nextCursor: null,
    cursorHistory: [],
    currentCursor: null,
  })

  // Sorting — H1: default to week asc
  const [sortColumn, setSortColumn] = useState("week")
  const [sortDirection, setSortDirection] = useState("asc")

  const handleSort = useCallback(
    (column) => {
      if (sortColumn === column) {
        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
      } else {
        setSortColumn(column)
        setSortDirection("asc")
      }
    },
    [sortColumn],
  )

  // --- Data fetching ---
  const fetchTasks = useCallback(
    async (cursor = null) => {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({ pageSize: pagination.pageSize.toString() })
        if (cursor) params.append("cursor", cursor)
        if (searchTerm) params.append("search", searchTerm)
        if (weekFilter !== "all") params.append("week", weekFilter)
        if (dayFilter !== "all") params.append("day", dayFilter)
        if (jobFilter !== "all") params.append("jobTitle", jobFilter.trim())
        if (folderFilter !== "all") params.append("folderName", folderFilter.trim())

        if (sortColumn) {
          const columnToFieldMap = {
            title: "Task",
            description: "Task Body",
            week: "Week Number",
            day: "Day Number",
            folder: "Folder Name",
            type: "Type",
            resource: "Link",
          }
          const apiFieldName = columnToFieldMap[sortColumn] || sortColumn
          params.append("sortBy", apiFieldName)
          params.append("sortDirection", sortDirection)
        }

        const url = `/api/admin/tasks/core-tasks?${params.toString()}`
        const res = await fetch(url)
        if (!res.ok) throw new Error(`Error fetching tasks: ${res.statusText}`)
        const data = await res.json()

        let fetchedTasks = (data.tasks || []).map((t) => ({ ...t, id: t.id.toString() }))

        // H1: Apply client-side numeric sort for week/day
        if (sortColumn === "week" || sortColumn === "day") {
          fetchedTasks = numericSort(fetchedTasks, sortColumn, sortDirection)
        } else if (!sortColumn) {
          fetchedTasks = defaultWeekDaySort(fetchedTasks)
        }

        setTasks(fetchedTasks)
        setPagination((prev) => ({
          ...prev,
          hasNextPage: data.pagination?.hasNextPage || false,
          nextCursor: data.pagination?.nextCursor || null,
          currentCursor: cursor,
        }))
      } catch (err) {
        setError(err.message)
        toast({ title: "Error", description: err.message, variant: "destructive" })
      } finally {
        setLoading(false)
      }
    },
    [pagination.pageSize, searchTerm, weekFilter, dayFilter, jobFilter, folderFilter, sortColumn, sortDirection],
  )

  useEffect(() => {
    setPagination((prev) => ({
      ...prev,
      currentCursor: null,
      nextCursor: null,
      cursorHistory: [],
    }))
    fetchTasks(null)
  }, [searchTerm, weekFilter, dayFilter, jobFilter, folderFilter, pagination.pageSize, fetchTasks])

  // Pagination handlers
  const handleNextPage = useCallback(() => {
    if (pagination.hasNextPage && pagination.nextCursor) {
      setPagination((prev) => ({
        ...prev,
        cursorHistory: [...prev.cursorHistory, prev.currentCursor],
      }))
      fetchTasks(pagination.nextCursor)
    }
  }, [pagination, fetchTasks])

  const handlePreviousPage = useCallback(() => {
    const history = [...pagination.cursorHistory]
    const prevCursor = history.pop() || null
    setPagination((prev) => ({ ...prev, cursorHistory: history }))
    fetchTasks(prevCursor)
  }, [pagination.cursorHistory, fetchTasks])

  // Filter handlers
  const handleSearch = useCallback((term) => setSearchTerm(term), [])
  const handleSubmit = useCallback((term) => setSearchTerm(term), [])
  const handleWeekChange = useCallback((value) => setWeekFilter(value), [])
  const handleDayChange = useCallback((value) => setDayFilter(value), [])
  const handleJobChange = useCallback((value) => setJobFilter(value), [])
  const handleFolderChange = useCallback((value) => setFolderFilter(value), [])

  // Edit/File/Delete handlers
  const handleOpenEditSheet = useCallback((taskId) => {
    setEditingTaskId(taskId)
    setIsSheetOpen(true)
  }, [])

  const handleOpenFileViewer = useCallback((taskId) => {
    setCurrentTaskId(taskId)
    setIsFileViewerOpen(true)
  }, [])

  const handleFilesUpdated = () => fetchTasks(pagination.currentCursor)
  const handleDeleteSelected = () => setIsDeleteModalOpen(true)
  const handleDeleteSuccess = () => { setSelected({}); fetchTasks(pagination.currentCursor) }
  const handleRefresh = () => fetchTasks(pagination.currentCursor)

  // Selection
  const toggleAll = (checked) => {
    const next = {}
    if (checked) tasks.forEach((task) => (next[task.id] = true))
    setSelected(next)
  }
  const toggleOne = (id, checked) => {
    setSelected((prev) => ({ ...prev, [id]: checked }))
  }

  useEffect(() => {
    onSelectionChange?.(tasks.filter((task) => selected[task.id]))
  }, [selected, tasks, onSelectionChange])

  // H3: Row expand toggle
  const toggleRowExpand = useCallback((taskId) => {
    setExpandedRows((prev) => ({ ...prev, [taskId]: !prev[taskId] }))
  }, [])

  // H2: Week collapse toggle
  const toggleWeekCollapse = useCallback((week) => {
    setCollapsedWeeks((prev) => ({ ...prev, [week]: !prev[week] }))
  }, [])

  const expandAllWeeks = useCallback(() => setCollapsedWeeks({}), [])
  const collapseAllWeeks = useCallback(() => {
    const groups = groupTasksByWeek(tasks)
    const collapsed = {}
    groups.forEach((g) => { collapsed[g.week] = true })
    setCollapsedWeeks(collapsed)
  }, [tasks])

  // Column resize handlers
  const handleMouseMove = useCallback((e) => {
    const column = resizingColumnRef.current
    if (!column) return
    const diff = e.clientX - startXRef.current
    const newWidth = Math.max(60, startWidthRef.current + diff)
    setColumnWidths((prev) => ({ ...prev, [column]: newWidth }))
    e.preventDefault()
  }, [])

  const handleMouseUp = useCallback(() => {
    resizingColumnRef.current = null
    document.removeEventListener("mousemove", handleMouseMove)
    document.removeEventListener("mouseup", handleMouseUp)
    document.body.style.removeProperty("cursor")
    document.body.style.removeProperty("user-select")
  }, [handleMouseMove])

  const handleResizeStart = useCallback(
    (e, column) => {
      e.preventDefault()
      e.stopPropagation()
      startXRef.current = e.clientX
      startWidthRef.current = columnWidths[column]
      resizingColumnRef.current = column
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      document.body.style.cursor = "col-resize"
      document.body.style.userSelect = "none"
    },
    [columnWidths, handleMouseMove, handleMouseUp],
  )

  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      document.body.style.removeProperty("cursor")
      document.body.style.removeProperty("user-select")
    }
  }, [handleMouseMove, handleMouseUp])

  // H8: Row keyboard handler
  const handleRowKeyDown = useCallback((e, taskId) => {
    if (e.key === "Enter") {
      e.preventDefault()
      toggleRowExpand(taskId)
    } else if (e.key === " ") {
      e.preventDefault()
      toggleOne(taskId, !selected[taskId])
    }
  }, [toggleRowExpand, toggleOne, selected])

  // --- H2: Computed grouped data ---
  const sortedTasks = useMemo(() => {
    if (sortColumn === "week" || sortColumn === "day") {
      return numericSort(tasks, sortColumn, sortDirection)
    }
    return tasks
  }, [tasks, sortColumn, sortDirection])

  const groupedData = useMemo(() => groupTasksByWeek(sortedTasks), [sortedTasks])

  // Stats for ResourcePage
  const stats = useMemo(() => {
    const folders = new Set(tasks.map((t) => t.folderName).filter(Boolean))
    const weeks = new Set(tasks.map((t) => t.week).filter(Boolean))
    return { total: tasks.length, folders: folders.size, weeks: weeks.size }
  }, [tasks])

  // --- H6: Header cell renderer ---
  const renderHeaderCell = (column, label, width) => (
    <TableHead
      style={{ width: `${width}px` }}
      className="h-11 bg-muted/20 sticky top-0 z-10"
      aria-sort={sortColumn === column ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
    >
      <div className="group relative select-none">
        <div
          onClick={() => handleSort(column)}
          className="flex items-center cursor-pointer px-2 py-1 text-overline text-muted-foreground/70 uppercase tracking-wider font-medium hover:text-foreground transition-colors"
        >
          {label}
          <SortIndicator column={column} sortColumn={sortColumn} sortDirection={sortDirection} />
        </div>
        <div
          className="absolute top-0 bottom-0 right-0 w-0.5 bg-transparent hover:bg-primary/30 cursor-col-resize opacity-0 group-hover:opacity-100 transition-opacity"
          onMouseDown={(e) => handleResizeStart(e, column)}
        />
      </div>
    </TableHead>
  )

  // --- H3: Task row renderer ---
  const renderTaskRow = (task, index) => {
    const isExpanded = expandedRows[task.id]
    return (
      <AnimatePresence key={task.id}>
        <motion.tr
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2, delay: index * 0.02, ease: "easeOut" }}
          onClick={() => toggleRowExpand(task.id)}
          tabIndex={0}
          role="row"
          aria-expanded={isExpanded}
          onKeyDown={(e) => handleRowKeyDown(e, task.id)}
          className={cn(
            "border-b border-border/20 transition-colors cursor-pointer group",
            "hover:bg-muted/20 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none focus-visible:ring-inset",
            isExpanded && "bg-muted/10",
            selected[task.id] && "bg-primary/5"
          )}
        >
          {/* Checkbox */}
          <TableCell style={{ width: `${columnWidths.checkbox}px` }} className="h-14">
            <div onClick={(e) => e.stopPropagation()}>
              <Checkbox
                aria-label={`Select ${task.title}`}
                checked={!!selected[task.id]}
                onCheckedChange={(v) => toggleOne(task.id, !!v)}
                disabled={loading}
              />
            </div>
          </TableCell>

          {/* Title */}
          <TableCell style={{ width: `${columnWidths.title}px` }} className="h-14">
            <span className="text-body-sm font-medium truncate block">{task.title}</span>
          </TableCell>

          {/* Week */}
          <TableCell style={{ width: `${columnWidths.week}px` }} className="h-14 hidden md:table-cell">
            <span className="text-body-sm text-muted-foreground">
              {task.week ? task.week : "—"}
            </span>
          </TableCell>

          {/* Day */}
          <TableCell style={{ width: `${columnWidths.day}px` }} className="h-14 hidden md:table-cell">
            <span className="text-body-sm text-muted-foreground">
              {task.day ? task.day : "—"}
            </span>
          </TableCell>

          {/* Folder */}
          <TableCell style={{ width: `${columnWidths.folder}px` }} className="h-14">
            {task.folderName ? (
              <FolderBadge
                name={task.folderName}
                usageCount={task.folderInfo?.usage_count}
                isSystem={task.folderInfo?.is_system}
              />
            ) : (
              <span className="text-body-sm text-muted-foreground">—</span>
            )}
          </TableCell>

          {/* Actions */}
          <TableCell style={{ width: `${columnWidths.actions}px` }} className="h-14">
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleOpenEditSheet(task.id)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom"><p>Edit</p></TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 relative" onClick={() => handleOpenFileViewer(task.id)}>
                      <Paperclip className="h-3.5 w-3.5" />
                      {task.attachmentCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 h-3.5 min-w-[14px] rounded-full bg-primary text-primary-foreground text-[9px] font-medium flex items-center justify-center px-0.5">
                          {task.attachmentCount}
                        </span>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom"><p>Files</p></TooltipContent>
                </Tooltip>

                {task.resourceUrl && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => window.open(task.resourceUrl, "_blank", "noopener,noreferrer")}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom"><p>Open resource</p></TooltipContent>
                  </Tooltip>
                )}
              </TooltipProvider>
            </div>
          </TableCell>
        </motion.tr>

        {/* H3: Expanded detail row */}
        {isExpanded && (
          <ExpandedRowDetail
            task={task}
            onOpenFileViewer={handleOpenFileViewer}
            onOpenEditSheet={handleOpenEditSheet}
          />
        )}
      </AnimatePresence>
    )
  }

  // --- H6: Empty state ---
  const renderEmptyState = () => (
    <TableRow>
      <TableCell colSpan={6} className="h-auto py-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center justify-center text-center"
        >
          <div className="w-12 h-12 rounded-xl bg-muted/40 flex items-center justify-center mb-4">
            <Package className="h-6 w-6 text-muted-foreground/40" />
          </div>
          <p className="text-body-sm font-medium mb-1">No resources found</p>
          <p className="text-caption text-muted-foreground/60 mb-4">
            {searchTerm ? "Try adjusting your search or filters" : "Create a new resource to get started"}
          </p>
          <div className="flex gap-2">
            {searchTerm && (
              <Button variant="outline" size="sm" onClick={() => setSearchTerm("")} className="h-8">
                Clear Search
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onOpenCreateTask} className="h-8">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Create Resource
            </Button>
          </div>
        </motion.div>
      </TableCell>
    </TableRow>
  )

  // --- H2: Grouped view renderer ---
  const renderGroupedView = () => {
    if (groupedData.length === 0) return renderEmptyState()

    let rowIndex = 0
    return groupedData.map((group) => {
      const isCollapsed = collapsedWeeks[group.week]
      return (
        <React.Fragment key={`week-${group.week}`}>
          {/* Week header row */}
          <TableRow
            className="border-b border-border/20 cursor-pointer hover:bg-muted/10 transition-colors"
            onClick={() => toggleWeekCollapse(group.week)}
          >
            <TableCell colSpan={6} className="py-0 px-0">
              <div className="flex items-center gap-3 py-2.5 px-4 bg-muted/10 rounded-md mx-1 my-1">
                <motion.div
                  animate={{ rotate: isCollapsed ? -90 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </motion.div>
                <span className="text-body-sm font-semibold">
                  {group.week === "Unassigned" ? "Unassigned" : `Week ${group.week}`}
                </span>
                <Badge variant="secondary" className="text-caption px-1.5 py-0">
                  {group.totalTasks}
                </Badge>
              </div>
            </TableCell>
          </TableRow>

          {/* Day sub-groups */}
          <AnimatePresence>
            {!isCollapsed && group.days.map((dayGroup) => (
              <React.Fragment key={`week-${group.week}-day-${dayGroup.day}`}>
                {/* Day sub-header */}
                <TableRow className="border-b border-border/10">
                  <TableCell colSpan={6} className="py-0 px-0">
                    <div className="text-caption text-muted-foreground font-medium uppercase tracking-wide pl-12 py-1.5 border-b border-border/10">
                      {dayGroup.day === "Unassigned" ? "Unassigned" : `Day ${dayGroup.day}`}
                      <span className="ml-2 text-muted-foreground/50">({dayGroup.tasks.length})</span>
                    </div>
                  </TableCell>
                </TableRow>

                {/* Task rows */}
                {dayGroup.tasks.map((task) => {
                  const idx = rowIndex++
                  return renderTaskRow(task, idx)
                })}
              </React.Fragment>
            ))}
          </AnimatePresence>
        </React.Fragment>
      )
    })
  }

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* H5: Filters */}
      <TableFilters
        onSearch={handleSearch}
        onSubmit={handleSubmit}
        isLoading={loading}
        week={weekFilter}
        day={dayFilter}
        onWeekChange={handleWeekChange}
        onDayChange={handleDayChange}
        job={jobFilter}
        folder={folderFilter}
        onJobChange={handleJobChange}
        onFolderChange={handleFolderChange}
        taskCount={tasks.length}
        selectedTasks={selectedTasks}
        onDeleteSelected={handleDeleteSelected}
        onRefresh={handleRefresh}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* H2: Expand/Collapse all (grouped view only) */}
      {viewMode === "grouped" && tasks.length > 0 && !loading && (
        <div className="flex items-center justify-between">
          <span className="text-caption text-muted-foreground">
            {stats.total} resources across {stats.weeks} weeks
          </span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={expandAllWeeks} className="h-7 text-caption px-2">
              Expand all
            </Button>
            <span className="text-muted-foreground/30">|</span>
            <Button variant="ghost" size="sm" onClick={collapseAllWeeks} className="h-7 text-caption px-2">
              Collapse all
            </Button>
          </div>
        </div>
      )}

      {/* H6: Table in elevated card */}
      <Card variant="elevated" className="overflow-hidden">
        <div className="overflow-x-auto" ref={tableRef}>
          <Table className="w-full">
            <TableHeader>
              <TableRow className="border-b border-border/20">
                <TableHead style={{ width: `${columnWidths.checkbox}px` }} className="h-11 bg-muted/20 sticky top-0 z-10">
                  <Checkbox
                    aria-label="Select all"
                    checked={allChecked}
                    onCheckedChange={(v) => toggleAll(!!v)}
                    disabled={loading}
                  />
                </TableHead>
                {renderHeaderCell("title", "Title", columnWidths.title)}
                <TableHead style={{ width: `${columnWidths.week}px` }} className="h-11 bg-muted/20 sticky top-0 z-10 hidden md:table-cell"
                  aria-sort={sortColumn === "week" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
                >
                  <div className="group relative select-none">
                    <div
                      onClick={() => handleSort("week")}
                      className="flex items-center cursor-pointer px-2 py-1 text-overline text-muted-foreground/70 uppercase tracking-wider font-medium hover:text-foreground transition-colors"
                    >
                      Week
                      <SortIndicator column="week" sortColumn={sortColumn} sortDirection={sortDirection} />
                    </div>
                  </div>
                </TableHead>
                <TableHead style={{ width: `${columnWidths.day}px` }} className="h-11 bg-muted/20 sticky top-0 z-10 hidden md:table-cell"
                  aria-sort={sortColumn === "day" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
                >
                  <div className="group relative select-none">
                    <div
                      onClick={() => handleSort("day")}
                      className="flex items-center cursor-pointer px-2 py-1 text-overline text-muted-foreground/70 uppercase tracking-wider font-medium hover:text-foreground transition-colors"
                    >
                      Day
                      <SortIndicator column="day" sortColumn={sortColumn} sortDirection={sortDirection} />
                    </div>
                  </div>
                </TableHead>
                {renderHeaderCell("folder", "Folder", columnWidths.folder)}
                <TableHead style={{ width: `${columnWidths.actions}px` }} className="h-11 bg-muted/20 sticky top-0 z-10">
                  <span className="text-overline text-muted-foreground/70 uppercase tracking-wider font-medium px-2">
                    Actions
                  </span>
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                Array(Math.min(pagination.pageSize, 6))
                  .fill(0)
                  .map((_, i) => <SkeletonRow key={i} />)
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-error">
                    Error: {error}
                  </TableCell>
                </TableRow>
              ) : tasks.length === 0 ? (
                renderEmptyState()
              ) : viewMode === "grouped" ? (
                renderGroupedView()
              ) : (
                <AnimatePresence initial={true}>
                  {sortedTasks.map((task, index) => renderTaskRow(task, index))}
                </AnimatePresence>
              )}
            </TableBody>
          </Table>
        </div>

        {/* H6: Pagination footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border/20">
          <span className="text-caption text-muted-foreground">
            {!loading && tasks.length > 0 && `Showing ${tasks.length} resources`}
          </span>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousPage}
                disabled={pagination.cursorHistory.length === 0 || loading}
                className="h-8"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={!pagination.hasNextPage || loading}
                className="h-8"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>

            <div className="flex items-center gap-2 text-caption text-muted-foreground">
              <span>Per page</span>
              <Select
                value={pagination.pageSize.toString()}
                onValueChange={(val) => {
                  const size = parseInt(val, 10)
                  setPagination((prev) => ({
                    ...prev,
                    pageSize: size,
                    currentCursor: null,
                    nextCursor: null,
                    cursorHistory: [],
                  }))
                }}
              >
                <SelectTrigger className="h-7 w-[70px] rounded-md text-caption border-border/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 25, 50, 100].map((s) => (
                    <SelectItem key={s} value={`${s}`}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      {/* Modals & sheets (preserved) */}
      <TaskEditSheet
        taskId={editingTaskId}
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        onEditSuccess={() => fetchTasks(pagination.currentCursor)}
      />
      {isFileViewerOpen && (
        <FileViewerModal
          isOpen={isFileViewerOpen}
          onClose={() => setIsFileViewerOpen(false)}
          taskId={currentTaskId}
          onFilesUpdated={handleFilesUpdated}
        />
      )}
      <BulkDeleteTasksModal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        selectedTasks={selectedTasks}
        onDeleteSuccess={handleDeleteSuccess}
      />
    </div>
  )
}
