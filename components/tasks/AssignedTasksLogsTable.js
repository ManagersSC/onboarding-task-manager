"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@components/ui/table"
import { Input } from "@components/ui/input"
import { Button } from "@components/ui/button"
import { Checkbox } from "@components/ui/checkbox"
import { ExternalLink, ChevronLeft, ChevronRight, Paperclip, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { FolderBadge } from "./FolderBadge"
import { useDebounce } from "@/hooks/use-debounce"
import { SkeletonRow } from "./SkeletonRow"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@components/ui/select"
import { DynamicTaskEditSheet } from "./DynamicTaskEditSheet"
import { cn } from "@components/lib/utils"
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
  name,
  folder,
  assignedDate,
  onNameChange,
  onFolderChange,
  onAssignedDateChange,
  taskCount,
}) {
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
        <AnimatedSearchBar
          value={term}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onClear={handleClear}
          isLoading={isLoading}
        />

        {/* Filter Dropdowns */}
        <div className="flex gap-2">
          {/* Name Filter */}
          <Select value={name} onValueChange={onNameChange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Name" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Names</SelectItem>
              {/* Add dynamic name options here if available */}
            </SelectContent>
          </Select>

          {/* Folder Filter */}
          <Select value={folder} onValueChange={onFolderChange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Folder" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Folders</SelectItem>
              {/* Add dynamic folder options here if available */}
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

// Custom header component with sorting and resizing
const AnimatedColumnHeader = ({ children, column, sortColumn, sortDirection, onSort, onResizeStart, isHovered }) => {
  const isSorted = sortColumn === column
  const direction = isSorted ? (sortDirection === "asc" ? "up" : "down") : null

  return (
    <div className="group relative cursor-pointer select-none text-left [&:not([data-state=selected])]:data-[state=inactive]:opacity-70 w-full h-full">
      <button
        type="button"
        onClick={() => onSort(column)}
        className="w-full h-full p-2 font-normal justify-between flex items-center hover:bg-muted/50 text-left"
        style={{ paddingRight: "24px" }} // Space for the sort icon and resizer
      >
        {children}
        {isSorted && <span className="ml-2">{direction === "up" ? "▲" : "▼"}</span>}
      </button>
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

export function AssignedTasksLogsTable({ onOpenCreateTask, onSelectionChange }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [hoveredResizer, setHoveredResizer] = useState(null)

  // Filters
  const [searchTerm, setSearchTerm] = useState("")
  const [nameFilter, setNameFilter] = useState("all")
  const [folderFilter, setFolderFilter] = useState("all")
  const [assignedDateFilter, setAssignedDateFilter] = useState("")

  // Row selection
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)

  // Task Editing
  const [selectedLogId, setSelectedLogId] = useState(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  // Column resizing - using refs instead of state to avoid stale closures
  const [columnWidths, setColumnWidths] = useState({
    checkbox: 48,
    name: 160,
    email: 200,
    title: 200,
    description: 220,
    folder: 140,
    attachments: 140,
    resource: 120,
    assignedDate: 160,
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

  // Sorting
  const [sortColumn, setSortColumn] = useState("assignedDate")
  const [sortDirection, setSortDirection] = useState("desc")

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

  // Add this function to handle sorting
  const handleSort = useCallback(
    (column) => {
      // Map the column names to the field names expected by the API
      const columnToFieldMap = {
        name: "Applicant Name",
        email: "Applicant Email",
        title: "Display Title",
        description: "Display Desc",
        folder: "Folder Name",
        assignedDate: "Created Date",
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

  // Fetch logs
  const fetchLogs = useCallback(
    async (cursor = null) => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({ pageSize: pagination.pageSize.toString() })
        if (cursor) params.append("cursor", cursor)
        if (searchTerm) params.append("search", searchTerm)
        if (nameFilter !== "all") params.append("name", nameFilter)
        if (folderFilter !== "all") params.append("folder", folderFilter)
        if (assignedDateFilter) params.append("assignedDate", assignedDateFilter)

        // Add sorting parameters if a column is selected
        if (sortColumn) {
          // Map the column names to the field names expected by the API
          const columnToFieldMap = {
            name: "Applicant Name",
            email: "Applicant Email",
            title: "Display Title",
            description: "Display Desc",
            folder: "Folder Name",
            assignedDate: "Created Date",
            // Add other mappings as needed
          }

          const apiFieldName = columnToFieldMap[sortColumn] || sortColumn
          params.append("sortBy", apiFieldName)
          params.append("sortDirection", sortDirection)
        }

        const url = `/api/admin/tasks/assigned-tasks?${params.toString()}`
        console.log("🔍 fetching assigned tasks with:", url)
        const res = await fetch(url)
        if (!res.ok) throw new Error(`Error fetching logs: ${res.statusText}`)
        const data = await res.json()
        setLogs(data.logs || [])
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
    [pagination.pageSize, searchTerm, nameFilter, folderFilter, assignedDateFilter, sortColumn, sortDirection],
  )

  // Refetch on filters or pageSize change
  useEffect(() => {
    setPagination((prev) => ({
      ...prev,
      currentCursor: null,
      nextCursor: null,
      cursorHistory: [],
    }))
    fetchLogs(null)
  }, [searchTerm, nameFilter, folderFilter, assignedDateFilter, pagination.pageSize, fetchLogs])

  // Pagination handlers
  const handleNextPage = useCallback(() => {
    if (pagination.hasNextPage && pagination.nextCursor) {
      setPagination((prev) => ({
        ...prev,
        cursorHistory: [...prev.cursorHistory, prev.currentCursor],
      }))
      fetchLogs(pagination.nextCursor)
    }
  }, [pagination, fetchLogs])

  const handlePreviousPage = useCallback(() => {
    const history = [...pagination.cursorHistory]
    const prevCursor = history.pop() || null
    setPagination((prev) => ({ ...prev, cursorHistory: history }))
    fetchLogs(prevCursor)
  }, [pagination.cursorHistory, fetchLogs])

  // Handlers passed to filters
  const handleSearch = useCallback((term) => setSearchTerm(term), [])
  const handleSubmit = useCallback((term) => setSearchTerm(term), [])
  const handleNameChange = useCallback((value) => setNameFilter(value), [])
  const handleFolderChange = useCallback((value) => setFolderFilter(value), [])
  const handleAssignedDateChange = useCallback((value) => setAssignedDateFilter(value), [])

  // Selection helpers
  const allCurrentIds = logs.map((l) => l.id)
  const allSelected = allCurrentIds.length > 0 && allCurrentIds.every((id) => selectedIds.has(id))
  const someSelected = allCurrentIds.some((id) => selectedIds.has(id)) && !allSelected

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        allCurrentIds.forEach((id) => next.delete(id))
        return next
      })
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        allCurrentIds.forEach((id) => next.add(id))
        return next
      })
    }
  }

  const toggleSelectRow = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Notify parent of selection changes
  useEffect(() => {
    if (typeof onSelectionChange === "function") {
      onSelectionChange(logs.filter((l) => selectedIds.has(l.id)))
    }
  }, [selectedIds, logs, onSelectionChange])

  // Clear selection when page changes
  useEffect(() => {
    setSelectedIds(new Set())
  }, [logs])

  // Open edit sheet
  const handleOpenEditSheet = (logId) => {
    setSelectedLogId(logId)
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
      .map((_, i) => <SkeletonRow key={i} colSpan={10} />)

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
  const getAttachmentText = (attachments) => {
    if (!attachments || attachments.length === 0) return "No Files"
    const count = attachments.length
    return `View ${count} ${count === 1 ? "File" : "Files"}`
  }

  // DynamicTaskEditSheet config
  const logFields = [
    { name: "name", label: "Name", type: "text", required: true },
    { name: "email", label: "Email", type: "text" },
    { name: "title", label: "Title", type: "text", required: true },
    { name: "description", label: "Description", type: "textarea" },
    { name: "folder", label: "Folder", type: "text" },
    { name: "resource", label: "Resource", type: "url" },
    { name: "attachments", label: "Attachment", type: "file" },
    { name: "assignedDate", label: "Assigned Date", type: "date" },
  ]
  const mapApiToForm = (log) => ({
    name: log.name,
    email: log.email,
    title: log.title,
    description: log.description,
    folder: log.folder,
    resource: log.resource,
    attachments: log.attachments,
    assignedDate: log.assignedDate,
  })
  const mapFormToApi = (formData) => ({
    "Applicant Name": formData.name,
    "Applicant Email": formData.email,
    "Display Title": formData.title,
    "Display Desc": formData.description,
    "Folder Name": formData.folder,
    "Display Resource Link": formData.resource,
    "File(s)": formData.attachments,
    "Created Date": formData.assignedDate,
  })

  return (
    <PageTransition>
      <div className="space-y-4">
        {/* Search Bar & Filters */}
        <TableFilters
          onSearch={handleSearch}
          onSubmit={handleSubmit}
          isLoading={loading}
          name={nameFilter}
          folder={folderFilter}
          assignedDate={assignedDateFilter}
          onNameChange={handleNameChange}
          onFolderChange={handleFolderChange}
          onAssignedDateChange={handleAssignedDateChange}
          taskCount={logs.length}
        />

        {/* Active Filters */}
        <AnimatePresence>
          <div className="flex flex-wrap gap-2 mt-2">
            {nameFilter !== "all" && (
              <AnimatedFilterPill label="Name" value={nameFilter} onRemove={() => setNameFilter("all")} />
            )}
            {folderFilter !== "all" && (
              <AnimatedFilterPill label="Folder" value={folderFilter} onRemove={() => setFolderFilter("all")} />
            )}
            {assignedDateFilter && (
              <AnimatedFilterPill
                label="Assigned Date"
                value={assignedDateFilter}
                onRemove={() => setAssignedDateFilter("")}
              />
            )}
            {searchTerm && <AnimatedFilterPill label="Search" value={searchTerm} onRemove={() => setSearchTerm("")} />}
          </div>
        </AnimatePresence>

        {/* Table - Added table-fixed class to ensure widths are respected */}
        {/* Bulk action bar */}
        <AnimatePresence>
          {selectedIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-between rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2"
            >
              <span className="text-sm font-medium text-destructive">
                {selectedIds.size} row{selectedIds.size !== 1 ? "s" : ""} selected
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsBulkDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete selected
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="overflow-x-auto rounded-md border" ref={tableRef}>
          <Table className="table-fixed w-full min-w-[1488px]">
            <TableHeader>
              <TableRow>
                <TableHead style={{ width: `${columnWidths.checkbox}px` }} className="px-3">
                  <Checkbox
                    checked={allSelected}
                    data-state={someSelected ? "indeterminate" : allSelected ? "checked" : "unchecked"}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead style={{ width: `${columnWidths.name}px` }}>
                  <div className="group relative cursor-pointer select-none text-left [&:not([data-state=selected])]:data-[state=inactive]:opacity-70">
                    <div
                      onClick={() => handleSort("name")}
                      className="w-full h-full p-2 font-normal justify-between flex items-center hover:bg-muted/50"
                      style={{ paddingRight: "24px" }}
                    >
                      Name
                      {sortColumn === "name" && <span className="ml-2">{sortDirection === "asc" ? "▲" : "▼"}</span>}
                    </div>
                    <div
                      className={cn(
                        "absolute top-0 bottom-0 right-0 w-1 transition-opacity duration-200 bg-border rounded-sm opacity-0 group-hover:opacity-100",
                        hoveredResizer === "name" && "opacity-100",
                      )}
                      onMouseDown={(e) => handleResizeStart(e, "name")}
                    />
                  </div>
                </TableHead>
                <TableHead style={{ width: `${columnWidths.email}px` }}>
                  <div className="group relative cursor-pointer select-none text-left [&:not([data-state=selected])]:data-[state=inactive]:opacity-70">
                    <div
                      onClick={() => handleSort("email")}
                      className="w-full h-full p-2 font-normal justify-between flex items-center hover:bg-muted/50"
                      style={{ paddingRight: "24px" }}
                    >
                      Email
                      {sortColumn === "email" && <span className="ml-2">{sortDirection === "asc" ? "▲" : "▼"}</span>}
                    </div>
                    <div
                      className={cn(
                        "absolute top-0 bottom-0 right-0 w-1 transition-opacity duration-200 bg-border rounded-sm opacity-0 group-hover:opacity-100",
                        hoveredResizer === "email" && "opacity-100",
                      )}
                      onMouseDown={(e) => handleResizeStart(e, "email")}
                    />
                  </div>
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
                <TableHead style={{ width: `${columnWidths.assignedDate}px` }}>
                  <div className="group relative cursor-pointer select-none text-left [&:not([data-state=selected])]:data-[state=inactive]:opacity-70">
                    <div
                      onClick={() => handleSort("assignedDate")}
                      className="w-full h-full p-2 font-normal justify-between flex items-center hover:bg-muted/50"
                      style={{ paddingRight: "24px" }}
                    >
                      Assigned Date
                      {sortColumn === "assignedDate" && <span className="ml-2">{sortDirection === "asc" ? "▲" : "▼"}</span>}
                    </div>
                    <div
                      className={cn(
                        "absolute top-0 bottom-0 right-0 w-1 transition-opacity duration-200 bg-border rounded-sm opacity-0 group-hover:opacity-100",
                        hoveredResizer === "assignedDate" && "opacity-100",
                      )}
                      onMouseDown={(e) => handleResizeStart(e, "assignedDate")}
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
                  <TableCell colSpan={10} className="h-24 text-center text-error">
                    Error: {error}
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-auto py-8">
                    <AnimatedEmptyState
                      message={searchTerm ? `No tasks found matching "${searchTerm}"` : "No assigned tasks found"}
                      actionLabel={searchTerm ? "Clear Search" : "Create Task"}
                      onClearSearch={() => setSearchTerm("")}
                      onOpenCreateTask={onOpenCreateTask}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                <AnimatePresence initial={true}>
                  {logs.map((log, index) => (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{
                        duration: 0.3,
                        delay: index * 0.05,
                        ease: "easeOut",
                      }}
                      className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                      data-state={selectedIds.has(log.id) ? "selected" : undefined}
                    >
                      <TableCell className="px-3" style={{ width: `${columnWidths.checkbox}px` }}>
                        <Checkbox
                          checked={selectedIds.has(log.id)}
                          onCheckedChange={() => toggleSelectRow(log.id)}
                          aria-label={`Select row for ${log.name}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium truncate" style={{ width: `${columnWidths.name}px`, maxWidth: `${columnWidths.name}px` }}>
                        {log.name}
                      </TableCell>
                      <TableCell className="truncate" style={{ width: `${columnWidths.email}px`, maxWidth: `${columnWidths.email}px` }}>{log.email}</TableCell>
                      <TableCell className="truncate" style={{ width: `${columnWidths.title}px`, maxWidth: `${columnWidths.title}px` }}>{log.title}</TableCell>
                      <TableCell className="max-w-[220px] truncate" style={{ width: `${columnWidths.description}px` }}>
                        {log.description}
                      </TableCell>
                      <TableCell style={{ width: `${columnWidths.folder}px` }}>
                        {log.folder && typeof log.folder === "string" && log.folder.trim() !== "" ? (
                          <FolderBadge name={log.folder} />
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell style={{ width: `${columnWidths.attachments}px` }}>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="flex items-center gap-1"
                          onClick={() => {
                            // Handle attachment view action
                            if (log.attachments && log.attachments.length > 0) {
                              // Open attachment viewer or download
                            }
                          }}
                          disabled={!log.attachments || log.attachments.length === 0}
                        >
                          <Paperclip className="h-4 w-4" />
                          <span>{getAttachmentText(log.attachments)}</span>
                        </Button>
                      </TableCell>
                      <TableCell style={{ width: `${columnWidths.resource}px` }}>
                        {log.resource ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => window.open(log.resource, "_blank", "noopener,noreferrer")}
                            title="Open resource"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell style={{ width: `${columnWidths.assignedDate}px` }}>
                        {log.assignedDate ? new Date(log.assignedDate).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell style={{ width: `${columnWidths.edit}px` }}>
                        <Button variant="outline" size="sm" onClick={() => handleOpenEditSheet(log.id)}>
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

        {/* Dynamic Task Edit Sheet */}
        <DynamicTaskEditSheet
          open={isSheetOpen}
          onOpenChange={setIsSheetOpen}
          taskId={selectedLogId}
          getEndpoint={selectedLogId ? `/api/admin/tasks/assigned-tasks/${selectedLogId}` : ""}
          patchEndpoint={selectedLogId ? `/api/admin/tasks/assigned-tasks/${selectedLogId}` : ""}
          deleteEndpoint={selectedLogId ? `/api/admin/tasks/assigned-tasks/${selectedLogId}` : ""}
          fields={logFields}
          mapApiToForm={mapApiToForm}
          mapFormToApi={mapFormToApi}
          onEditSuccess={() => fetchLogs(pagination.currentCursor)}
          onDeleteSuccess={() => fetchLogs(pagination.currentCursor)}
        />

        {/* Bulk delete modal */}
        <BulkDeleteTasksModal
          open={isBulkDeleteOpen}
          onOpenChange={setIsBulkDeleteOpen}
          selectedTasks={logs.filter((l) => selectedIds.has(l.id))}
          deleteEndpoint="/api/admin/tasks/assigned-tasks/bulk-delete"
          onDeleteSuccess={() => {
            setSelectedIds(new Set())
            fetchLogs(null)
          }}
        />
      </div>
    </PageTransition>
  )
}
