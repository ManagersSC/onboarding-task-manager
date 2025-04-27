"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@components/ui/table"
import { Input } from "@components/ui/input"
import { Button } from "@components/ui/button"
import { ExternalLink, ChevronLeft, ChevronRight, Search, X, Loader2, Paperclip } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { FolderBadge } from "./FolderBadge"
import { useDebounce } from "@/hooks/use-debounce"
import { SkeletonRow } from "./SkeletonRow"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@components/ui/select"
import { TaskEditSheet } from "./TaskEditSheet"
import { cn } from "@components/lib/utils"

// All table filters
function TableFilters({ onSearch, onSubmit, isLoading, week, day, onWeekChange, onDayChange, taskCount }) {
  const [term, setTerm] = useState("")
  const debouncedTerm = useDebounce(term, 300)

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
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search tasks..."
            value={term}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            className="pl-9 pr-10"
            aria-label="Search tasks"
          />
          {term && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1 h-7 w-7 p-0"
              onClick={handleClear}
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          {isLoading && <Loader2 className="absolute right-10 top-2.5 h-4 w-4 animate-spin text-primary" />}
        </div>

        {/* Filter Dropdowns */}
        <div className="flex gap-2">
          {/* Week Filter */}
          <Select value={week} onValueChange={onWeekChange}>
            <SelectTrigger className="w-[100px]">
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
        </div>
      </div>

      {/* Task Count */}
      <div className="text-sm text-muted-foreground">
        {taskCount > 0 && !isLoading ? <span>Showing {taskCount} tasks</span> : null}
      </div>
    </div>
  )
}

export function TasksTable() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [hoveredResizer, setHoveredResizer] = useState(null)

  // Filters
  const [searchTerm, setSearchTerm] = useState("")
  const [weekFilter, setWeekFilter] = useState("all")
  const [dayFilter, setDayFilter] = useState("all")

  // Task Editing
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  // Column resizing - using refs instead of state to avoid stale closures
  const [columnWidths, setColumnWidths] = useState({
    title: 200,
    description: 200,
    week: 100,
    day: 100,
    folder: 150,
    attachments: 120, // New column for attachments
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

        const url = `/api/admin/tasks/core-tasks?${params.toString()}`
        console.log("🔍 fetching tasks with:", url)
        const res = await fetch(url)
        if (!res.ok) throw new Error(`Error fetching tasks: ${res.statusText}`)
        const data = await res.json()

        setTasks((data.tasks || []).map((t) => ({ ...t, id: t.id.toString() })))
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
    [pagination.pageSize, searchTerm, weekFilter, dayFilter],
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
  }, [searchTerm, weekFilter, dayFilter, pagination.pageSize, fetchTasks])

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

  // Open edit sheet
  const handleOpenEditSheet = (taskId) => {
    setEditingTaskId(taskId)
    setIsSheetOpen(true)
  }

  // View attachments
  const handleViewAttachments = (taskId) => {
    // For now, just open the edit sheet which has the attachments
    setEditingTaskId(taskId)
    setIsSheetOpen(true)
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
    <div className="relative flex h-full w-full items-center">
      <span>{children}</span>
      <div
        className="absolute right-0 top-0 h-full w-6 cursor-col-resize"
        onMouseEnter={() => !resizingColumnRef.current && setHoveredResizer(column)}
        onMouseLeave={() => !resizingColumnRef.current && setHoveredResizer(null)}
        onMouseDown={(e) => handleResizeStart(e, column)}
        style={{ zIndex: 10 }}
      >
        <div
          className={cn(
            "absolute right-0 top-0 h-full w-[1px] bg-border",
            hoveredResizer === column ? "w-[2px] bg-blue-500" : "",
          )}
        />
      </div>
    </div>
  )

  return (
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
        taskCount={tasks.length}
      />

      {/* Table - Added table-fixed class to ensure widths are respected */}
      <div className="rounded-md border" ref={tableRef}>
        <Table className="table-fixed w-full">
          <TableHeader>
            <TableRow>
              <TableHead style={{ width: `${columnWidths.title}px` }}>
                <ResizableHeader column="title">Title</ResizableHeader>
              </TableHead>
              <TableHead style={{ width: `${columnWidths.description}px` }}>
                <ResizableHeader column="description">Description</ResizableHeader>
              </TableHead>
              <TableHead style={{ width: `${columnWidths.week}px` }}>
                <ResizableHeader column="week">Week</ResizableHeader>
              </TableHead>
              <TableHead style={{ width: `${columnWidths.day}px` }}>
                <ResizableHeader column="day">Day</ResizableHeader>
              </TableHead>
              <TableHead style={{ width: `${columnWidths.folder}px` }}>
                <ResizableHeader column="folder">Folder</ResizableHeader>
              </TableHead>
              {/* New Attachments Column */}
              <TableHead style={{ width: `${columnWidths.attachments}px` }}>
                <ResizableHeader column="attachments">Attachments</ResizableHeader>
              </TableHead>
              <TableHead style={{ width: `${columnWidths.resource}px` }}>
                <ResizableHeader column="resource">Resource</ResizableHeader>
              </TableHead>
              <TableHead style={{ width: `${columnWidths.edit}px` }}>Edit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              renderSkeletonRows()
            ) : error ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-red-500">
                  Error: {error}
                </TableCell>
              </TableRow>
            ) : tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  {searchTerm ? `No tasks found matching \"${searchTerm}\"` : "No tasks found"}
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((task) => (
                <TableRow key={task.id}>
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
                    {task.folderName ? <FolderBadge name={task.folderName} /> : "—"}
                  </TableCell>
                  {/* New Attachments Cell */}
                  <TableCell style={{ width: `${columnWidths.attachments}px` }}>
                    {task.attachments && task.attachments.length > 0 ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="flex items-center gap-1"
                        onClick={() => handleViewAttachments(task.id)}
                      >
                        <Paperclip className="h-4 w-4" />
                        <span>{task.attachments.length}</span>
                      </Button>
                    ) : (
                      "—"
                    )}
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
                </TableRow>
              ))
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
    </div>
  )
}
