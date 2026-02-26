"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@components/ui/table"
import { Input } from "@components/ui/input"
import { Button } from "@components/ui/button"
import { Checkbox } from "@components/ui/checkbox"
import { Badge } from "@components/ui/badge"
import {
  ExternalLink, ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
  Paperclip, Trash2, Loader2, Pencil, RefreshCw, X,
} from "lucide-react"
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
import { FileViewerModal } from "./files/FileViewerModal"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@components/ui/tooltip"

// ── Sort indicator ────────────────────────────────────────────────────────────
function SortIndicator({ column, sortColumn, sortDirection }) {
  if (sortColumn !== column) return null
  return sortDirection === "asc"
    ? <ChevronUp className="ml-1 h-3 w-3 inline shrink-0" />
    : <ChevronDown className="ml-1 h-3 w-3 inline shrink-0" />
}

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  "Completed":   "bg-success/15 text-success border-success/25",
  "In Progress": "bg-info/15 text-info border-info/25",
  "Not Started": "bg-muted text-muted-foreground border-border",
}

function StatusBadge({ status }) {
  if (!status) return <span className="text-muted-foreground">—</span>
  const cls = STATUS_STYLES[status] ?? "bg-muted text-muted-foreground border-border"
  return (
    <Badge variant="outline" className={cn("text-xs whitespace-nowrap", cls)}>
      {status}
    </Badge>
  )
}

// ── Resizable + sortable column header ───────────────────────────────────────
function ResizableColHeader({ children, column, sortColumn, sortDirection, onSort, onResizeStart, isHovered }) {
  return (
    <div className="group relative cursor-pointer select-none text-left w-full h-full">
      <button
        type="button"
        onClick={() => onSort(column)}
        className="w-full h-full p-2 font-normal flex items-center hover:bg-muted/50 text-left"
        style={{ paddingRight: "24px" }}
      >
        {children}
        <SortIndicator column={column} sortColumn={sortColumn} sortDirection={sortDirection} />
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

// ── Column to API field map ───────────────────────────────────────────────────
const COLUMN_FIELD_MAP = {
  name:         "Applicant Name",
  email:        "Applicant Email",
  title:        "Display Title",
  description:  "Display Desc",
  folder:       "Folder Name",
  status:       "Status",
  assignedDate: "Created Date",
}

// ── Filters bar ───────────────────────────────────────────────────────────────
function TableFilters({
  onSearch, onSubmit, isLoading,
  folder, status, hasDocuments,
  onFolderChange, onStatusChange, onHasDocumentsChange,
  taskCount, onRefresh,
  searchTerm, onClearSearch,
}) {
  const [term, setTerm] = useState(searchTerm ?? "")

  // Keep internal term in sync if parent clears it
  useEffect(() => { setTerm(searchTerm ?? "") }, [searchTerm])

  const debouncedTerm = useDebounce(term, 300)
  useEffect(() => { onSearch(debouncedTerm) }, [debouncedTerm, onSearch])

  const handleClear = () => { setTerm(""); onSearch("") }

  // Lazy folder loading
  const [folderOptions, setFolderOptions] = useState([])
  const [foldersLoading, setFoldersLoading] = useState(false)
  const [foldersFetched, setFoldersFetched] = useState(false)

  const fetchFolders = async () => {
    if (foldersFetched || foldersLoading) return
    setFoldersLoading(true)
    try {
      const res = await fetch("/api/admin/folders?includeInactive=true")
      if (!res.ok) throw new Error("Failed to load folders")
      const data = await res.json()
      setFolderOptions((data.folders || []).map((f) => f.name).filter(Boolean).sort())
      setFoldersFetched(true)
    } catch {
      toast.error("Could not load folder list")
    } finally {
      setFoldersLoading(false)
    }
  }

  const activeFilterCount = [folder !== "all", status !== "all", hasDocuments !== "all"].filter(Boolean).length
  const clearAllFilters = () => { onFolderChange("all"); onStatusChange("all"); onHasDocumentsChange("all") }

  return (
    <div className="space-y-3">
      {/* Row 1 — search + dropdowns + refresh */}
      <div className="flex flex-col sm:flex-row justify-between gap-3 items-start sm:items-center w-full">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto flex-wrap">
          <AnimatedSearchBar
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") onSubmit(term) }}
            onClear={handleClear}
            isLoading={isLoading}
          />

          {/* Folder — lazy loads on first open */}
          <Select value={folder} onValueChange={onFolderChange} onOpenChange={(open) => { if (open) fetchFolders() }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Folder" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Folders</SelectItem>
              {foldersLoading && (
                <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Loading…
                </div>
              )}
              {folderOptions.map((name) => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status */}
          <Select value={status} onValueChange={onStatusChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Not Started">Not Started</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          {/* Has Documents */}
          <Select value={hasDocuments} onValueChange={onHasDocumentsChange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Documents" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Resources</SelectItem>
              <SelectItem value="yes">Has Documents</SelectItem>
              <SelectItem value="no">No Documents</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Task count + refresh */}
        <div className="flex items-center gap-2 shrink-0">
          {taskCount > 0 && !isLoading && (
            <span className="text-sm text-muted-foreground">
              Showing {taskCount} task{taskCount !== 1 ? "s" : ""}
            </span>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={onRefresh} disabled={isLoading} className="h-9 w-9">
                  <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Row 2 — active filter pills */}
      <AnimatePresence>
        {(activeFilterCount > 0 || searchTerm) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="flex flex-wrap items-center gap-2"
          >
            {searchTerm && <AnimatedFilterPill label="Search" value={searchTerm} onRemove={onClearSearch} />}
            {folder !== "all" && <AnimatedFilterPill label="Folder" value={folder} onRemove={() => onFolderChange("all")} />}
            {status !== "all" && <AnimatedFilterPill label="Status" value={status} onRemove={() => onStatusChange("all")} />}
            {hasDocuments !== "all" && (
              <AnimatedFilterPill
                label="Documents"
                value={hasDocuments === "yes" ? "Has Documents" : "No Documents"}
                onRemove={() => onHasDocumentsChange("all")}
              />
            )}
            {activeFilterCount > 1 && (
              <Button variant="ghost" size="sm" className="h-6 gap-1 text-xs text-muted-foreground" onClick={clearAllFilters}>
                <X className="h-3 w-3" /> Clear all
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function AssignedTasksLogsTable({ onOpenCreateTask, onSelectionChange }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [hoveredResizer, setHoveredResizer] = useState(null)

  // Filters
  const [searchTerm, setSearchTerm] = useState("")
  const [folderFilter, setFolderFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [hasDocumentsFilter, setHasDocumentsFilter] = useState("all")

  // Row selection
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)

  // Task editing
  const [selectedLogId, setSelectedLogId] = useState(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  // Attachment viewer
  const [viewerLogId, setViewerLogId] = useState(null)
  const [isViewerOpen, setIsViewerOpen] = useState(false)

  // Column widths
  const [columnWidths, setColumnWidths] = useState({
    checkbox:     48,
    name:         160,
    email:        190,
    title:        190,
    description:  200,
    folder:       140,
    status:       130,
    attachments:  130,
    resource:     100,
    assignedDate: 150,
    edit:          80,
  })
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)
  const resizingColumnRef = useRef(null)
  const tableRef = useRef(null)

  // Pagination
  const [pagination, setPagination] = useState({
    pageSize: 10, hasNextPage: false, nextCursor: null, cursorHistory: [], currentCursor: null,
  })
  const [pageSizeInput, setPageSizeInput] = useState("10")
  const debouncedPageSize = useDebounce(pageSizeInput, 500)

  // Sorting
  const [sortColumn, setSortColumn] = useState("assignedDate")
  const [sortDirection, setSortDirection] = useState("desc")

  // Sync page size input
  useEffect(() => { setPageSizeInput(pagination.pageSize.toString()) }, [pagination.pageSize])
  useEffect(() => {
    const newSize = parseInt(debouncedPageSize, 10)
    if (debouncedPageSize !== "" && !isNaN(newSize) && newSize > 0 && newSize <= 100 && newSize !== pagination.pageSize) {
      setPagination((prev) => ({ ...prev, pageSize: newSize, currentCursor: null, nextCursor: null, cursorHistory: [] }))
    }
  }, [debouncedPageSize, pagination.pageSize])

  // Sort
  const handleSort = useCallback((column) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }, [sortColumn])

  // Fetch
  const fetchLogs = useCallback(async (cursor = null) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ pageSize: pagination.pageSize.toString() })
      if (cursor)                       params.append("cursor", cursor)
      if (searchTerm)                   params.append("search", searchTerm)
      if (folderFilter !== "all")       params.append("folder", folderFilter)
      if (statusFilter !== "all")       params.append("status", statusFilter)
      if (hasDocumentsFilter !== "all") params.append("hasDocuments", hasDocumentsFilter)
      if (sortColumn) {
        params.append("sortBy", COLUMN_FIELD_MAP[sortColumn] || sortColumn)
        params.append("sortDirection", sortDirection)
      }
      const res = await fetch(`/api/admin/tasks/assigned-tasks?${params.toString()}`)
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
      toast.error("Error loading tasks", { description: err.message })
    } finally {
      setLoading(false)
    }
  }, [pagination.pageSize, searchTerm, folderFilter, statusFilter, hasDocumentsFilter, sortColumn, sortDirection])

  useEffect(() => {
    setPagination((prev) => ({ ...prev, currentCursor: null, nextCursor: null, cursorHistory: [] }))
    fetchLogs(null)
  }, [searchTerm, folderFilter, statusFilter, hasDocumentsFilter, pagination.pageSize, fetchLogs])

  // Pagination handlers
  const handleNextPage = useCallback(() => {
    if (pagination.hasNextPage && pagination.nextCursor) {
      setPagination((prev) => ({ ...prev, cursorHistory: [...prev.cursorHistory, prev.currentCursor] }))
      fetchLogs(pagination.nextCursor)
    }
  }, [pagination, fetchLogs])

  const handlePreviousPage = useCallback(() => {
    const history = [...pagination.cursorHistory]
    const prevCursor = history.pop() || null
    setPagination((prev) => ({ ...prev, cursorHistory: history }))
    fetchLogs(prevCursor)
  }, [pagination.cursorHistory, fetchLogs])

  // Selection
  const allCurrentIds = logs.map((l) => l.id)
  const allSelected = allCurrentIds.length > 0 && allCurrentIds.every((id) => selectedIds.has(id))
  const someSelected = allCurrentIds.some((id) => selectedIds.has(id)) && !allSelected

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allSelected) allCurrentIds.forEach((id) => next.delete(id))
      else allCurrentIds.forEach((id) => next.add(id))
      return next
    })
  }
  const toggleSelectRow = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  useEffect(() => {
    if (typeof onSelectionChange === "function") onSelectionChange(logs.filter((l) => selectedIds.has(l.id)))
  }, [selectedIds, logs, onSelectionChange])

  useEffect(() => { setSelectedIds(new Set()) }, [logs])

  // Column resize
  const handleMouseMove = useCallback((e) => {
    const column = resizingColumnRef.current
    if (!column) return
    setColumnWidths((prev) => ({ ...prev, [column]: Math.max(80, startWidthRef.current + (e.clientX - startXRef.current)) }))
    e.preventDefault()
  }, [])

  const handleMouseUp = useCallback(() => {
    resizingColumnRef.current = null
    document.removeEventListener("mousemove", handleMouseMove)
    document.removeEventListener("mouseup", handleMouseUp)
    document.body.style.removeProperty("cursor")
    document.body.style.removeProperty("user-select")
  }, [handleMouseMove])

  const handleResizeStart = useCallback((e, column) => {
    e.preventDefault(); e.stopPropagation()
    startXRef.current = e.clientX
    startWidthRef.current = columnWidths[column]
    resizingColumnRef.current = column
    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
  }, [columnWidths, handleMouseMove, handleMouseUp])

  useEffect(() => () => {
    document.removeEventListener("mousemove", handleMouseMove)
    document.removeEventListener("mouseup", handleMouseUp)
    document.body.style.removeProperty("cursor")
    document.body.style.removeProperty("user-select")
  }, [handleMouseMove, handleMouseUp])

  const renderSkeletonRows = () =>
    Array(Math.min(pagination.pageSize, 5)).fill(0).map((_, i) => <SkeletonRow key={i} colSpan={11} />)

  // Shorthand for resizable header
  const RH = ({ children, column }) => (
    <ResizableColHeader
      column={column}
      sortColumn={sortColumn}
      sortDirection={sortDirection}
      onSort={handleSort}
      onResizeStart={(e) => handleResizeStart(e, column)}
      isHovered={hoveredResizer === column}
    >
      {children}
    </ResizableColHeader>
  )

  // Edit sheet config
  const logFields = [
    { name: "name",         label: "Name",         type: "text",     required: true },
    { name: "email",        label: "Email",         type: "text" },
    { name: "title",        label: "Title",         type: "text",     required: true },
    { name: "description",  label: "Description",   type: "textarea" },
    { name: "folder",       label: "Folder",        type: "text" },
    { name: "resource",     label: "Resource URL",  type: "url" },
    { name: "attachments",  label: "Attachments",   type: "file" },
    { name: "assignedDate", label: "Assigned Date", type: "date" },
  ]
  const mapApiToForm = (log) => ({
    name: log.name, email: log.email, title: log.title, description: log.description,
    folder: log.folder, resource: log.resource, attachments: log.attachments, assignedDate: log.assignedDate,
  })
  const mapFormToApi = (formData) => ({
    "Applicant Name": formData.name, "Applicant Email": formData.email,
    "Display Title": formData.title, "Display Desc": formData.description,
    "Folder Name": formData.folder, "Display Resource Link": formData.resource,
    "File(s)": formData.attachments, "Created Date": formData.assignedDate,
  })

  const minTableWidth = Object.values(columnWidths).reduce((a, b) => a + b, 0)

  return (
    <PageTransition>
      <div className="space-y-4">

        {/* Filters */}
        <TableFilters
          onSearch={setSearchTerm}
          onSubmit={setSearchTerm}
          isLoading={loading}
          folder={folderFilter}
          status={statusFilter}
          hasDocuments={hasDocumentsFilter}
          onFolderChange={setFolderFilter}
          onStatusChange={setStatusFilter}
          onHasDocumentsChange={setHasDocumentsFilter}
          taskCount={logs.length}
          onRefresh={() => fetchLogs(pagination.currentCursor)}
          searchTerm={searchTerm}
          onClearSearch={() => setSearchTerm("")}
        />

        {/* Bulk action bar */}
        <AnimatePresence>
          {selectedIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
              className="flex items-center justify-between rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2"
            >
              <span className="text-sm font-medium text-destructive">
                {selectedIds.size} row{selectedIds.size !== 1 ? "s" : ""} selected
              </span>
              <Button variant="destructive" size="sm" onClick={() => setIsBulkDeleteOpen(true)}>
                <Trash2 className="h-4 w-4 mr-2" /> Delete selected
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Table */}
        <div className="overflow-x-auto rounded-md border" ref={tableRef}>
          <Table className="table-fixed w-full" style={{ minWidth: `${minTableWidth}px` }}>
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
                <TableHead style={{ width: `${columnWidths.name}px` }}><RH column="name">Name</RH></TableHead>
                <TableHead style={{ width: `${columnWidths.email}px` }}><RH column="email">Email</RH></TableHead>
                <TableHead style={{ width: `${columnWidths.title}px` }}><RH column="title">Title</RH></TableHead>
                <TableHead style={{ width: `${columnWidths.description}px` }}><RH column="description">Description</RH></TableHead>
                <TableHead style={{ width: `${columnWidths.folder}px` }}><RH column="folder">Folder</RH></TableHead>
                <TableHead style={{ width: `${columnWidths.status}px` }}><RH column="status">Status</RH></TableHead>
                <TableHead style={{ width: `${columnWidths.attachments}px` }} className="p-2 font-normal">Attachments</TableHead>
                <TableHead style={{ width: `${columnWidths.resource}px` }} className="p-2 font-normal">Resource</TableHead>
                <TableHead style={{ width: `${columnWidths.assignedDate}px` }}><RH column="assignedDate">Assigned Date</RH></TableHead>
                <TableHead style={{ width: `${columnWidths.edit}px` }} className="p-2 font-normal text-center">Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                renderSkeletonRows()
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-24 text-center text-error">Error: {error}</TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-auto py-8">
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
                      transition={{ duration: 0.3, delay: index * 0.04, ease: "easeOut" }}
                      className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                      data-state={selectedIds.has(log.id) ? "selected" : undefined}
                    >
                      {/* Checkbox */}
                      <TableCell className="px-3" style={{ width: `${columnWidths.checkbox}px` }}>
                        <Checkbox
                          checked={selectedIds.has(log.id)}
                          onCheckedChange={() => toggleSelectRow(log.id)}
                          aria-label={`Select row for ${log.name}`}
                        />
                      </TableCell>

                      {/* Name */}
                      <TableCell className="font-medium truncate" style={{ width: `${columnWidths.name}px`, maxWidth: `${columnWidths.name}px` }}>
                        {log.name || "—"}
                      </TableCell>

                      {/* Email */}
                      <TableCell className="truncate" style={{ width: `${columnWidths.email}px`, maxWidth: `${columnWidths.email}px` }}>
                        {log.email || "—"}
                      </TableCell>

                      {/* Title */}
                      <TableCell className="truncate" style={{ width: `${columnWidths.title}px`, maxWidth: `${columnWidths.title}px` }}>
                        {log.title || "—"}
                      </TableCell>

                      {/* Description */}
                      <TableCell className="truncate" style={{ width: `${columnWidths.description}px`, maxWidth: `${columnWidths.description}px` }}>
                        {log.description || "—"}
                      </TableCell>

                      {/* Folder */}
                      <TableCell style={{ width: `${columnWidths.folder}px` }}>
                        {log.folder ? <FolderBadge name={log.folder} /> : <span className="text-muted-foreground">—</span>}
                      </TableCell>

                      {/* Status */}
                      <TableCell style={{ width: `${columnWidths.status}px` }}>
                        <StatusBadge status={log.status} />
                      </TableCell>

                      {/* Attachments */}
                      <TableCell style={{ width: `${columnWidths.attachments}px` }}>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm" variant="ghost"
                                className="flex items-center gap-1.5 text-xs"
                                disabled={!log.attachmentCount}
                                onClick={() => { setViewerLogId(log.id); setIsViewerOpen(true) }}
                              >
                                <Paperclip className="h-3.5 w-3.5" />
                                {log.attachmentCount > 0 ? `${log.attachmentCount} file${log.attachmentCount !== 1 ? "s" : ""}` : "No files"}
                              </Button>
                            </TooltipTrigger>
                            {log.attachmentCount > 0 && <TooltipContent>View attachments</TooltipContent>}
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>

                      {/* Resource */}
                      <TableCell style={{ width: `${columnWidths.resource}px` }}>
                        {log.resource ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-8 w-8"
                                  onClick={() => window.open(log.resource, "_blank", "noopener,noreferrer")}>
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Open resource</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span className="text-muted-foreground px-2">—</span>
                        )}
                      </TableCell>

                      {/* Assigned Date */}
                      <TableCell style={{ width: `${columnWidths.assignedDate}px` }}>
                        {log.assignedDate ? new Date(log.assignedDate).toLocaleDateString() : "—"}
                      </TableCell>

                      {/* Edit */}
                      <TableCell style={{ width: `${columnWidths.edit}px` }} className="text-center">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8"
                                onClick={() => { setSelectedLogId(log.id); setIsSheetOpen(true) }}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit record</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Items per page:</span>
            <Input type="text" value={pageSizeInput} onChange={(e) => setPageSizeInput(e.target.value)} className="w-16 h-8" aria-label="Page size" />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePreviousPage} disabled={pagination.cursorHistory.length === 0 || loading}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <Button variant="outline" size="sm" onClick={handleNextPage} disabled={!pagination.hasNextPage || loading}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>

        {/* Edit sheet */}
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

        {/* Bulk delete */}
        <BulkDeleteTasksModal
          open={isBulkDeleteOpen}
          onOpenChange={setIsBulkDeleteOpen}
          selectedTasks={logs.filter((l) => selectedIds.has(l.id))}
          deleteEndpoint="/api/admin/tasks/assigned-tasks/bulk-delete"
          onDeleteSuccess={() => { setSelectedIds(new Set()); fetchLogs(null) }}
        />

        {/* Attachment viewer */}
        <FileViewerModal
          isOpen={isViewerOpen}
          onClose={() => setIsViewerOpen(false)}
          taskId={viewerLogId}
          attachmentsEndpoint={viewerLogId ? `/api/admin/tasks/assigned-tasks/${viewerLogId}/attachments` : ""}
          onFilesUpdated={() => fetchLogs(pagination.currentCursor)}
        />
      </div>
    </PageTransition>
  )
}
