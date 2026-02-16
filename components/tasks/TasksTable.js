"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@components/ui/table"
import { Input } from "@components/ui/input"
import { Button } from "@components/ui/button"
import { Checkbox } from "@components/ui/checkbox"
import { Badge } from "@components/ui/badge"
import { ExternalLink, ChevronLeft, ChevronRight, Search, X, Loader2, Paperclip, Trash2, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { FolderBadge } from "./FolderBadge"
import { useDebounce } from "@/hooks/use-debounce"
import { SkeletonRow } from "./SkeletonRow"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@components/ui/select"
import { TaskEditSheet } from "./TaskEditSheet"
import { cn } from "@components/lib/utils"
import { FileViewerModal } from "./files/FileViewerModal"
import { motion, AnimatePresence } from "framer-motion"
import { PageTransition } from "./table/PageTransition"
import { AnimatedSearchBar } from "./table/AnimatedSearchBar"
import { AnimatedFilterPill } from "./table/AnimatedFilterPills"
import { AnimatedEmptyState } from "./table/AnimatedEmptyState"
import BulkDeleteTasksModal from "./BulkDeleteTasksModal"

// All table filters
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
  onRefresh
}) {
  const [term, setTerm] = useState("")
  const debouncedTerm = useDebounce(term, 300)

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
      // swallow - UI will just show empty list
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
      // swallow - UI will just show empty list
    } finally {
      setFoldersLoading(false)
    }
  }

  // Emit debounced value when it changes
  useEffect(() => {
    onSearch(debouncedTerm)
  }, [debouncedTerm, onSearch])

  const handleChange = (e) => {
    setTerm(e.target.value)
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      onSubmit(term)
    }
  }

  const handleClear = () => {
    setTerm("")
    onSearch("")
  }

  return (
    <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center w-full">
      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
        {/* Search Bar */}
        <AnimatedSearchBar
          value={term}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onClear={handleClear}
          isLoading={isLoading}
        />

        {/* Filter Dropdowns */}
        <div className="flex gap-2">
          {/* Week Filter */}
          <Select value={week} onValueChange={onWeekChange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Week" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Weeks</SelectItem>
              {[1, 2, 3, 4, 5].map((w) => (
                <SelectItem key={w} value={`${w}`}>
                  Week {w}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Day Filter */}
          <Select value={day} onValueChange={onDayChange}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Day" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Days</SelectItem>
              {[1, 2, 3, 4, 5].map((d) => (
                <SelectItem key={d} value={`${d}`}>
                  Day {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Job Filter (by Title) */}
          <Select value={job} onValueChange={onJobChange} onOpenChange={(open) => { if (open) fetchJobs() }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Job" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Jobs</SelectItem>
              {jobsLoading ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading jobs...</div>
              ) : jobOptions.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">No jobs found</div>
              ) : (
                jobOptions.map((title) => (
                  <SelectItem key={title} value={title}>
                    {title}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>

          {/* Folder Filter (by Name) */}
          <Select value={folder} onValueChange={onFolderChange} onOpenChange={(open) => { if (open) fetchFolders() }}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Folder" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Folders</SelectItem>
              {foldersLoading ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading folders...</div>
              ) : folderOptions.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">No folders found</div>
              ) : (
                folderOptions.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Task Count, Refresh Button, and Delete Button */}
      <div className="flex items-center gap-3">
        <div className="text-sm text-muted-foreground">
          {taskCount > 0 && !isLoading ? <span>Showing {taskCount} tasks</span> : null}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          title="Refresh data"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        {selectedTasks.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={onDeleteSelected}
            disabled={isLoading}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete ({selectedTasks.length})
          </Button>
        )}
      </div>
    </div>
  )
}

// Custom header component with sorting and resizing
const AnimatedColumnHeader = ({ children, column, sortColumn, sortDirection, onSort, onResizeStart, isHovered }) => {
  const isSorted = sortColumn === column
  const direction = isSorted ? (sortDirection === "asc" ? "up" : "down") : null

  return (
    <div className="group relative cursor-pointer select-none text-left [&:not([data-state=selected])]:data-[state=inactive]:opacity-70">
      <div
        onClick={() => onSort(column)}
        className="w-full h-full p-2 font-normal justify-between flex items-center hover:bg-muted/50"
        style={{ paddingRight: "24px" }} // Space for the sort icon and resizer
      >
        {children}
        {isSorted && <span className="ml-2">{direction === "up" ? "▲" : "▼"}</span>}
      </div>
      <div
        className={cn(
          "absolute top-0 bottom-0 right-0 w-1 transition-opacity duration-200 bg-border rounded-sm opacity-0 group-hover:opacity-100",
          isHovered && "opacity-100",
        )}
        onMouseDown={onResizeStart}
      />
    </div>
  )
}

export function TasksTable({ onOpenCreateTask, onSelectionChange }) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Selection state
  const [selected, setSelected] = useState({})
  const selectedTasks = useMemo(() => tasks.filter(task => selected[task.id]), [tasks, selected])
  const allChecked = useMemo(() => tasks.length > 0 && tasks.every(task => selected[task.id]), [tasks, selected])

  const [hoveredResizer, setHoveredResizer] = useState(null)
  // const [sortColumn, setSortColumn] = useState(null)
  // const [sortDirection, setSortDirection] = useState("asc")

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

  // Column resizing - using refs instead of state to avoid stale closures
  const [columnWidths, setColumnWidths] = useState({
    checkbox: 48,
    title: 200,
    description: 200,
    week: 100,
    day: 100,
    folder: 150,
    job: 150,
    attachments: 120,
    resource: 100,
    edit: 100,
  })
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)
  const resizingColumnRef = useRef(null)
  const tableRef = useRef(null)

  // Page size with controlled input
  const [pagination, setPagination] = useState({
    pageSize: 10,
    hasNextPage: false,
    nextCursor: null,
    cursorHistory: [],
    currentCursor: null,
  })

  // Track attachment counts for each task
  const [pageSizeInput, setPageSizeInput] = useState(pagination.pageSize.toString())
  const debouncedPageSize = useDebounce(pageSizeInput, 500)

  // Sync input when pageSize changes
  useEffect(() => {
    setPageSizeInput(pagination.pageSize.toString())
  }, [pagination.pageSize])

  // Commit debounced page size
  useEffect(() => {
    const newSize = Number.parseInt(debouncedPageSize, 10)
    if (
      debouncedPageSize !== "" &&
      !isNaN(newSize) &&
      newSize > 0 &&
      newSize <= 100 &&
      newSize !== pagination.pageSize
    ) {
      setPagination((prev) => ({
        ...prev,
        pageSize: newSize,
        currentCursor: null,
        nextCursor: null,
        cursorHistory: [],
      }))
    }
  }, [debouncedPageSize, pagination.pageSize])


  const [sortColumn, setSortColumn] = useState(null)
  const [sortDirection, setSortDirection] = useState("asc")

  // Add this function to handle sorting
  const handleSort = useCallback(
    (column) => {
      // Map the column names to the field names expected by the API
      const columnToFieldMap = {
        title: "Task",
        description: "Task Body",
        week: "Week Number",
        day: "Day Number",
        folder: "Folder Name",
        type: "Type",
        resource: "Link",
        // Add other mappings as needed
      }

      const apiFieldName = columnToFieldMap[column] || column

      if (sortColumn === column) {
        // Toggle direction if clicking the same column
        const newDirection = sortDirection === "asc" ? "desc" : "asc"
        setSortDirection(newDirection)
      } else {
        // Set new column and default to ascending
        setSortColumn(column)
        setSortDirection("asc")
      }
    },
    [sortColumn, sortDirection],
  )

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

        // Add sorting parameters if a column is selected
        if (sortColumn) {
          // Map the column names to the field names expected by the API
          const columnToFieldMap = {
            title: "Task",
            description: "Task Body",
            week: "Week Number",
            day: "Day Number",
            folder: "Folder Name",
            type: "Type",
            resource: "Link",
            // Add other mappings as needed
          }

          const apiFieldName = columnToFieldMap[sortColumn] || sortColumn
          params.append("sortBy", apiFieldName)
          params.append("sortDirection", sortDirection)
        }

        const url = `/api/admin/tasks/core-tasks?${params.toString()}`
        console.log("🔍 fetching tasks with:", url)
        const res = await fetch(url)
        if (!res.ok) throw new Error(`Error fetching tasks: ${res.statusText}`)
        const data = await res.json()

        const fetchedTasks = (data.tasks || []).map((t) => ({ ...t, id: t.id.toString() }))
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

  // Refetch on filters or pageSize change
  useEffect(() => {
    setPagination((prev) => ({
      ...prev,
      currentCursor: null,
      nextCursor: null,
      cursorHistory: [],
    }))
    fetchTasks(null)
  }, [searchTerm, weekFilter, dayFilter, jobFilter, folderFilter, pagination.pageSize, fetchTasks])

  // Pagination
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

  // Handlers passed to filters
  const handleSearch = useCallback((term) => setSearchTerm(term), [])
  const handleSubmit = useCallback((term) => setSearchTerm(term), [])
  const handleWeekChange = useCallback((value) => setWeekFilter(value), [])
  const handleDayChange = useCallback((value) => setDayFilter(value), [])
  const handleJobChange = useCallback((value) => setJobFilter(value), [])
  const handleFolderChange = useCallback((value) => setFolderFilter(value), [])

  // Open edit sheet
  const handleOpenEditSheet = (taskId) => {
    setEditingTaskId(taskId)
    setIsSheetOpen(true)
  }

  // Handle file viewer open
  const handleOpenFileViewer = (taskId) => {
    setCurrentTaskId(taskId)
    setIsFileViewerOpen(true)
  }

  // Handle file updates
  const handleFilesUpdated = () => {
    // Refresh the task list to get updated attachment counts
    fetchTasks(pagination.currentCursor)
  }

  // Selection handlers
  const toggleAll = (checked) => {
    const next = {}
    if (checked) tasks.forEach((task) => (next[task.id] = true))
    setSelected(next)
  }
  
  const toggleOne = (id, checked) => {
    setSelected((prev) => ({ ...prev, [id]: checked }))
  }

  const getSelectedTasks = (selectionState = selected) => {
    return tasks.filter(task => selectionState[task.id])
  }

  // Use useEffect to call onSelectionChange after state updates
  useEffect(() => {
    onSelectionChange?.(getSelectedTasks())
  }, [selected, tasks, onSelectionChange])

  // Handle bulk delete
  const handleDeleteSelected = () => {
    setIsDeleteModalOpen(true)
  }

  // Handle successful deletion
  const handleDeleteSuccess = () => {
    setSelected({}) // Clear selection
    fetchTasks(pagination.currentCursor) // Refresh the task list
  }

  // Handle refresh - maintains current search parameters and pagination
  const handleRefresh = () => {
    fetchTasks(pagination.currentCursor)
  }

  // Column resize handlers - completely rewritten to use refs
  const handleMouseMove = useCallback((e) => {
    const column = resizingColumnRef.current
    if (!column) return

    const diff = e.clientX - startXRef.current
    const newWidth = Math.max(80, startWidthRef.current + diff)

    setColumnWidths((prev) => ({
      ...prev,
      [column]: newWidth,
    }))

    // Prevent text selection
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

      // Capture initial values in refs
      startXRef.current = e.clientX
      startWidthRef.current = columnWidths[column]
      resizingColumnRef.current = column

      // Register global listeners
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)

      // Change cursor & disable selection
      document.body.style.cursor = "col-resize"
      document.body.style.userSelect = "none"
    },
    [columnWidths, handleMouseMove, handleMouseUp],
  )

  // Cleanup event listeners on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      document.body.style.removeProperty("cursor")
      document.body.style.removeProperty("user-select")
    }
  }, [handleMouseMove, handleMouseUp])

  const renderSkeletonRows = () =>
    Array(Math.min(pagination.pageSize, 5))
      .fill(0)
      .map((_, i) => <SkeletonRow key={i} />)

  // Custom resizable header component
  const ResizableHeader = ({ children, column }) => (
    <AnimatedColumnHeader
      column={column}
      sortColumn={sortColumn}
      sortDirection={sortDirection}
      onSort={handleSort}
      onResizeStart={(e) => handleResizeStart(e, column)}
      isHovered={hoveredResizer === column}
    >
      {children}
    </AnimatedColumnHeader>
  )

  // Get attachment count text based on count
  const getAttachmentText = (count) => {
    if (count === undefined || count === null) return "View Files"
    if (count === 0) return "No Files"
    return `View ${count} ${count === 1 ? "File" : "Files"}`
  }

  return (
    <PageTransition>
      <div className="space-y-4">
        {/* Search Bar & Filters */}
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
        />

        {/* Active Filters */}
        <AnimatePresence>
          <div className="flex flex-wrap gap-2 mt-2">
            {weekFilter !== "all" && (
              <AnimatedFilterPill 
                label="Week" 
                value={`Week ${weekFilter}`} 
                onRemove={() => setWeekFilter("all")} 
              />
            )}
            {dayFilter !== "all" && (
              <AnimatedFilterPill 
                label="Day" 
                value={`Day ${dayFilter}`} 
                onRemove={() => setDayFilter("all")} 
              />
            )}
            {searchTerm && (
              <AnimatedFilterPill 
                label="Search" 
                value={searchTerm} 
                onRemove={() => setSearchTerm("")} 
              />
            )}
            {jobFilter !== "all" && (
              <AnimatedFilterPill 
                label="Job" 
                value={jobFilter} 
                onRemove={() => setJobFilter("all")} 
              />
            )}
            {folderFilter !== "all" && (
              <AnimatedFilterPill 
                label="Folder" 
                value={folderFilter} 
                onRemove={() => setFolderFilter("all")} 
              />
            )}
          </div>
        </AnimatePresence>

        {/* Table - Added table-fixed class to ensure widths are respected */}
        <div className="rounded-md border" ref={tableRef}>
          <Table className="table-fixed w-full">
            <TableHeader>
              <TableRow>
                <TableHead style={{ width: `${columnWidths.checkbox}px` }}>
                  <Checkbox 
                    aria-label="Select all" 
                    checked={allChecked} 
                    onCheckedChange={(v) => toggleAll(!!v)}
                    disabled={loading}
                  />
                </TableHead>
                <TableHead style={{ width: `${columnWidths.title}px` }}>
                  <div className="group relative cursor-pointer select-none text-left [&:not([data-state=selected])]:data-[state=inactive]:opacity-70">
                    <div
                      onClick={() => handleSort("title")}
                      className="w-full h-full p-2 font-normal justify-between flex items-center hover:bg-muted/50"
                      style={{ paddingRight: "24px" }}
                    >
                      Title
                      {sortColumn === "title" && <span className="ml-2">{sortDirection === "asc" ? "▲" : "▼"}</span>}
                    </div>
                    <div
                      className={cn(
                        "absolute top-0 bottom-0 right-0 w-1 transition-opacity duration-200 bg-border rounded-sm opacity-0 group-hover:opacity-100",
                        hoveredResizer === "title" && "opacity-100",
                      )}
                      onMouseDown={(e) => handleResizeStart(e, "title")}
                    />
                  </div>
                </TableHead>
                <TableHead style={{ width: `${columnWidths.description}px` }}>
                  <div className="group relative cursor-pointer select-none text-left [&:not([data-state=selected])]:data-[state=inactive]:opacity-70">
                    <div
                      onClick={() => handleSort("description")}
                      className="w-full h-full p-2 font-normal justify-between flex items-center hover:bg-muted/50"
                      style={{ paddingRight: "24px" }}
                    >
                      Description
                      {sortColumn === "description" && <span className="ml-2">{sortDirection === "asc" ? "▲" : "▼"}</span>}
                    </div>
                    <div
                      className={cn(
                        "absolute top-0 bottom-0 right-0 w-1 transition-opacity duration-200 bg-border rounded-sm opacity-0 group-hover:opacity-100",
                        hoveredResizer === "description" && "opacity-100",
                      )}
                      onMouseDown={(e) => handleResizeStart(e, "description")}
                    />
                  </div>
                </TableHead>
                <TableHead style={{ width: `${columnWidths.week}px` }}>
                  <div className="group relative cursor-pointer select-none text-left [&:not([data-state=selected])]:data-[state=inactive]:opacity-70">
                    <div
                      onClick={() => handleSort("week")}
                      className="w-full h-full p-2 font-normal justify-between flex items-center hover:bg-muted/50"
                      style={{ paddingRight: "24px" }}
                    >
                      Week
                      {sortColumn === "week" && <span className="ml-2">{sortDirection === "asc" ? "▲" : "▼"}</span>}
                    </div>
                    <div
                      className={cn(
                        "absolute top-0 bottom-0 right-0 w-1 transition-opacity duration-200 bg-border rounded-sm opacity-0 group-hover:opacity-100",
                        hoveredResizer === "week" && "opacity-100",
                      )}
                      onMouseDown={(e) => handleResizeStart(e, "week")}
                    />
                  </div>
                </TableHead>
                <TableHead style={{ width: `${columnWidths.day}px` }}>
                  <div className="group relative cursor-pointer select-none text-left [&:not([data-state=selected])]:data-[state=inactive]:opacity-70">
                    <div
                      onClick={() => handleSort("day")}
                      className="w-full h-full p-2 font-normal justify-between flex items-center hover:bg-muted/50"
                      style={{ paddingRight: "24px" }}
                    >
                      Day
                      {sortColumn === "day" && <span className="ml-2">{sortDirection === "asc" ? "▲" : "▼"}</span>}
                    </div>
                    <div
                      className={cn(
                        "absolute top-0 bottom-0 right-0 w-1 transition-opacity duration-200 bg-border rounded-sm opacity-0 group-hover:opacity-100",
                        hoveredResizer === "day" && "opacity-100",
                      )}
                      onMouseDown={(e) => handleResizeStart(e, "day")}
                    />
                  </div>
                </TableHead>
                <TableHead style={{ width: `${columnWidths.folder}px` }}>
                  <div className="group relative cursor-pointer select-none text-left [&:not([data-state=selected])]:data-[state=inactive]:opacity-70">
                    <div
                      onClick={() => handleSort("folder")}
                      className="w-full h-full p-2 font-normal justify-between flex items-center hover:bg-muted/50"
                      style={{ paddingRight: "24px" }}
                    >
                      Folder
                      {sortColumn === "folder" && <span className="ml-2">{sortDirection === "asc" ? "▲" : "▼"}</span>}
                    </div>
                    <div
                      className={cn(
                        "absolute top-0 bottom-0 right-0 w-1 transition-opacity duration-200 bg-border rounded-sm opacity-0 group-hover:opacity-100",
                        hoveredResizer === "folder" && "opacity-100",
                      )}
                      onMouseDown={(e) => handleResizeStart(e, "folder")}
                    />
                  </div>
                </TableHead>
                <TableHead style={{ width: `${columnWidths.job}px` }}>
                  <div className="group relative cursor-pointer select-none text-left [&:not([data-state=selected])]:data-[state=inactive]:opacity-70">
                    <div
                      onClick={() => handleSort("job")}
                      className="w-full h-full p-2 font-normal justify-between flex items-center hover:bg-muted/50"
                      style={{ paddingRight: "24px" }}
                    >
                      Job
                      {sortColumn === "job" && <span className="ml-2">{sortDirection === "asc" ? "▲" : "▼"}</span>}
                    </div>
                    <div
                      className={cn(
                        "absolute top-0 bottom-0 right-0 w-1 transition-opacity duration-200 bg-border rounded-sm opacity-0 group-hover:opacity-100",
                        hoveredResizer === "job" && "opacity-100",
                      )}
                      onMouseDown={(e) => handleResizeStart(e, "job")}
                    />
                  </div>
                </TableHead>
                <TableHead style={{ width: `${columnWidths.attachments}px` }}>
                  <div className="group relative cursor-pointer select-none text-left [&:not([data-state=selected])]:data-[state=inactive]:opacity-70">
                    <div
                      onClick={() => handleSort("attachments")}
                      className="w-full h-full p-2 font-normal justify-between flex items-center hover:bg-muted/50"
                      style={{ paddingRight: "24px" }}
                    >
                      Attachments
                      {sortColumn === "attachments" && <span className="ml-2">{sortDirection === "asc" ? "▲" : "▼"}</span>}
                    </div>
                    <div
                      className={cn(
                        "absolute top-0 bottom-0 right-0 w-1 transition-opacity duration-200 bg-border rounded-sm opacity-0 group-hover:opacity-100",
                        hoveredResizer === "attachments" && "opacity-100",
                      )}
                      onMouseDown={(e) => handleResizeStart(e, "attachments")}
                    />
                  </div>
                </TableHead>
                <TableHead style={{ width: `${columnWidths.resource}px` }}>
                  <div className="group relative cursor-pointer select-none text-left [&:not([data-state=selected])]:data-[state=inactive]:opacity-70">
                    <div
                      onClick={() => handleSort("resource")}
                      className="w-full h-full p-2 font-normal justify-between flex items-center hover:bg-muted/50"
                      style={{ paddingRight: "24px" }}
                    >
                      Resource
                      {sortColumn === "resource" && <span className="ml-2">{sortDirection === "asc" ? "▲" : "▼"}</span>}
                    </div>
                    <div
                      className={cn(
                        "absolute top-0 bottom-0 right-0 w-1 transition-opacity duration-200 bg-border rounded-sm opacity-0 group-hover:opacity-100",
                        hoveredResizer === "resource" && "opacity-100",
                      )}
                      onMouseDown={(e) => handleResizeStart(e, "resource")}
                    />
                  </div>
                </TableHead>
                <TableHead style={{ width: `${columnWidths.edit}px` }}>Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                renderSkeletonRows()
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-red-500">
                    Error: {error}
                  </TableCell>
                </TableRow>
              ) : tasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-auto py-8">
                    <AnimatedEmptyState 
                      message={searchTerm ? `No tasks found matching "${searchTerm}"` : "No tasks found"} 
                      actionLabel={searchTerm ? "Clear Search" : "Create Task"}
                      onClearSearch={() => setSearchTerm("")}
                      onOpenCreateTask={onOpenCreateTask}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                <AnimatePresence initial={true}>
                  {tasks.map((task, index) => (
                    <motion.tr
                      key={task.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0}}
                      exit={{ opacity: 0, height: 0}}
                      transition={{
                        duration: 0.3,
                        delay: index * 0.05,
                        ease: "easeOut",
                      }}
                      className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                    >
                      <TableCell style={{ width: `${columnWidths.checkbox}px` }}>
                        <Checkbox
                          aria-label={`Select ${task.title}`}
                          checked={!!selected[task.id]}
                          onCheckedChange={(v) => toggleOne(task.id, !!v)}
                          disabled={loading}
                        />
                      </TableCell>
                      <TableCell className="font-medium" style={{ width: `${columnWidths.title}px` }}>
                        {task.title}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" style={{ width: `${columnWidths.description}px` }}>
                        {task.description}
                      </TableCell>
                      <TableCell style={{ width: `${columnWidths.week}px` }}>
                        {task.week ? `Week ${task.week}` : "—"}
                      </TableCell>
                      <TableCell style={{ width: `${columnWidths.day}px` }}>{task.day ? `Day ${task.day}` : "—"}</TableCell>
                      <TableCell style={{ width: `${columnWidths.folder}px` }}>
                        {task.folderName ? (
                          <FolderBadge 
                            name={task.folderName} 
                            usageCount={task.folderInfo?.usage_count}
                            isSystem={task.folderInfo?.is_system}
                          />
                        ) : "—"}
                      </TableCell>
                      <TableCell style={{ width: `${columnWidths.job}px` }}>
                        {task.jobTitle ? (
                          <div className="flex items-center gap-2">
                            <span className="truncate">{task.jobTitle}</span>
                            {task.jobInfo?.jobStatus && (
                              <Badge variant="secondary" className="text-xs">
                                {task.jobInfo.jobStatus}
                              </Badge>
                            )}
                          </div>
                        ) : "—"}
                      </TableCell>
                      {/* Attachments Cell */}
                      <TableCell style={{ width: `${columnWidths.attachments}px` }}>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="flex items-center gap-1"
                          onClick={() => handleOpenFileViewer(task.id)}
                        >
                          <Paperclip className="h-4 w-4" />
                          <span>{getAttachmentText(task.attachmentCount)}</span>
                        </Button>
                      </TableCell>
                      <TableCell style={{ width: `${columnWidths.resource}px` }}>
                        {task.resourceUrl ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => window.open(task.resourceUrl, "_blank", "noopener,noreferrer")}
                            title="Open resource"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell style={{ width: `${columnWidths.edit}px` }}>
                        <Button variant="outline" size="sm" onClick={() => handleOpenEditSheet(task.id)}>
                          Open
                        </Button>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </TableBody>
          </Table>
        </div>
        {/* Pagination Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Items per page:</span>
            <Input
              type="text"
              placeholder={pagination.pageSize.toString()}
              value={pageSizeInput}
              onChange={(e) => setPageSizeInput(e.target.value)}
              className="w-16 h-8"
              aria-label="Page size"
            />
          </div>
        </div>
        <div className="flex items-center justify-end space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousPage}
            disabled={pagination.cursorHistory.length === 0 || loading}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <Button variant="outline" size="sm" onClick={handleNextPage} disabled={!pagination.hasNextPage || loading}>
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        {/* Task Edit Sheet */}
        <TaskEditSheet
          taskId={editingTaskId}
          open={isSheetOpen}
          onOpenChange={setIsSheetOpen}
          onEditSuccess={() => fetchTasks(pagination.currentCursor)}
        />
        {/* File Viewer Modal */}
        {isFileViewerOpen && (
          <FileViewerModal
            isOpen={isFileViewerOpen}
            onClose={() => setIsFileViewerOpen(false)}
            taskId={currentTaskId}
            onFilesUpdated={handleFilesUpdated}
          />
        )}

        {/* Bulk Delete Modal */}
        <BulkDeleteTasksModal
          open={isDeleteModalOpen}
          onOpenChange={setIsDeleteModalOpen}
          selectedTasks={selectedTasks}
          onDeleteSuccess={handleDeleteSuccess}
        />
      </div>
    </PageTransition>
  )
}
