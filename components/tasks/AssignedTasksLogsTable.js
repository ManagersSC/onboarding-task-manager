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
  Package, LayoutList, Layers, ChevronsUpDown, Mail, FileText, Clock,
} from "lucide-react"
import { toast } from "sonner"
import { FolderBadge } from "./FolderBadge"
import { useDebounce } from "@/hooks/use-debounce"
import { SkeletonRow } from "./SkeletonRow"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@components/ui/select"
import { DynamicTaskEditSheet } from "./DynamicTaskEditSheet"
import { cn } from "@components/lib/utils"
import { FileViewerModal } from "./files/FileViewerModal"
import { motion, AnimatePresence } from "framer-motion"
import { AnimatedFilterPill } from "./table/AnimatedFilterPills"
import BulkDeleteTasksModal from "./BulkDeleteTasksModal"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@components/ui/tooltip"

// ── Group logs by status ──────────────────────────────────────────────────────
const STATUS_ORDER = ["Assigned", "In Progress", "Overdue", "Completed", "Scheduled"]

function groupLogsByStatus(logs) {
  const groups = {}
  logs.forEach((log) => {
    const key = log.status || "Unassigned"
    if (!groups[key]) groups[key] = []
    groups[key].push(log)
  })

  const sortedKeys = Object.keys(groups).sort((a, b) => {
    const ai = STATUS_ORDER.indexOf(a)
    const bi = STATUS_ORDER.indexOf(b)
    if (ai !== -1 && bi !== -1) return ai - bi
    if (ai !== -1) return -1
    if (bi !== -1) return 1
    if (a === "Unassigned") return 1
    if (b === "Unassigned") return -1
    return a.localeCompare(b)
  })

  return sortedKeys.map((status) => ({ status, logs: groups[status] }))
}

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  "Completed":  "bg-success/15 text-success border-success/25",
  "Assigned":   "bg-info/15 text-info border-info/25",
  "Overdue":    "bg-destructive/15 text-destructive border-destructive/25",
  "Scheduled":  "bg-warning/15 text-warning border-warning/25",
  "In Progress": "bg-info/15 text-info border-info/25",
}

function StatusBadge({ status }) {
  if (!status) return <span className="text-body-sm text-muted-foreground">—</span>
  const cls = STATUS_STYLES[status] ?? "bg-muted text-muted-foreground border-border"
  return (
    <Badge variant="outline" className={cn("text-xs whitespace-nowrap", cls)}>
      {status}
    </Badge>
  )
}

// ── Sort indicator ────────────────────────────────────────────────────────────
function SortIndicator({ column, sortColumn, sortDirection }) {
  const isActive = sortColumn === column
  if (!isActive) return <ChevronsUpDown className="ml-1.5 h-3.5 w-3.5 text-muted-foreground/30" />
  return sortDirection === "asc"
    ? <ChevronUp className="ml-1.5 h-3.5 w-3.5 text-primary" />
    : <ChevronDown className="ml-1.5 h-3.5 w-3.5 text-primary" />
}

// ── Expanded log detail row ───────────────────────────────────────────────────
function ExpandedLogDetail({ log, onOpenFileViewer, onOpenEditSheet }) {
  return (
    <motion.tr
      key={`${log.id}-detail`}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <TableCell colSpan={6} className="p-0">
        <div className="border-l-2 border-primary/20 bg-muted/5 px-6 py-4 ml-[40px]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Description */}
            {log.description && (
              <div className="md:col-span-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-caption text-muted-foreground font-medium uppercase tracking-wide">Description</span>
                </div>
                <p className="text-body-sm text-foreground/80 leading-relaxed">{log.description}</p>
              </div>
            )}

            {/* Email */}
            {log.email && (
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-caption text-muted-foreground font-medium uppercase tracking-wide">Email</span>
                </div>
                <span className="text-body-sm">{log.email}</span>
              </div>
            )}

            {/* Resource URL */}
            {log.resource && (
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-caption text-muted-foreground font-medium uppercase tracking-wide">Resource</span>
                </div>
                <a
                  href={log.resource}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-body-sm text-primary hover:underline truncate block max-w-md"
                >
                  {log.resource}
                </a>
              </div>
            )}

            {/* Assigned Date */}
            {log.assignedDate && (
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-caption text-muted-foreground font-medium uppercase tracking-wide">Assigned</span>
                </div>
                <span className="text-body-sm text-muted-foreground">
                  {new Date(log.assignedDate).toLocaleDateString("en-GB", {
                    day: "numeric", month: "short", year: "numeric",
                  })}
                </span>
              </div>
            )}
          </div>

          {/* Action row */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/20">
            <Button variant="outline" size="sm" onClick={() => onOpenEditSheet(log.id)} className="h-8">
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => onOpenFileViewer(log.id, log.resource)} className="h-8">
              <Paperclip className="h-3.5 w-3.5 mr-1.5" />
              Files {log.attachmentCount > 0 && `(${log.attachmentCount})`}
            </Button>
            {log.resource && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(log.resource, "_blank", "noopener,noreferrer")}
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

// ── Filter toolbar ────────────────────────────────────────────────────────────
function TableFilters({
  onSearch,
  onSubmit,
  isLoading,
  status,
  folder,
  hasDocuments,
  onStatusChange,
  onFolderChange,
  onHasDocumentsChange,
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

  // Lazy folder options
  const [folderOptions, setFolderOptions] = useState([])
  const [foldersLoading, setFoldersLoading] = useState(false)
  const [foldersFetched, setFoldersFetched] = useState(false)

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
    } catch {
      // swallow
    } finally {
      setFoldersLoading(false)
    }
  }

  useEffect(() => { onSearch(debouncedTerm) }, [debouncedTerm, onSearch])

  const handleChange = (e) => setTerm(e.target.value)
  const handleKeyDown = (e) => { if (e.key === "Enter") onSubmit(term) }
  const handleClear = () => { setTerm(""); onSearch("") }

  const hasActiveFilters = status !== "all" || folder !== "all" || hasDocuments !== "all" || term
  const activeFilterCount = [status !== "all", folder !== "all", hasDocuments !== "all", !!term].filter(Boolean).length

  const clearAllFilters = () => {
    setTerm("")
    onSearch("")
    onStatusChange("all")
    onFolderChange("all")
    onHasDocumentsChange("all")
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3">
        {/* Search */}
        <div className="relative w-full lg:w-72">
          <Search className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-200",
            isFocused ? "text-primary" : "text-muted-foreground"
          )} />
          <Input
            type="text"
            placeholder="Search assignments..."
            value={term}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="pl-9 pr-10 h-10 rounded-lg border-border/40 focus-visible:ring-2 focus-visible:ring-primary/20"
            aria-label="Search assigned tasks"
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
          {isLoading && (
            <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />
          )}
        </div>

        {/* Filter selects + inline pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status */}
          <Select value={status} onValueChange={onStatusChange}>
            <SelectTrigger className="h-9 w-[130px] rounded-lg text-body-sm border-border/40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Assigned">Assigned</SelectItem>
              <SelectItem value="Overdue">Overdue</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Scheduled">Scheduled</SelectItem>
            </SelectContent>
          </Select>

          {/* Folder — lazy loads on first open */}
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

          {/* Has Documents */}
          <Select value={hasDocuments} onValueChange={onHasDocumentsChange}>
            <SelectTrigger className="h-9 w-[150px] rounded-lg text-body-sm border-border/40">
              <div className="flex items-center gap-1.5">
                <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="Documents" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Resources</SelectItem>
              <SelectItem value="yes">Has Documents</SelectItem>
              <SelectItem value="no">No Documents</SelectItem>
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
                {term && (
                  <AnimatedFilterPill label="Search" value={term} onRemove={handleClear} />
                )}
                {status !== "all" && (
                  <AnimatedFilterPill label="Status" value={status} onRemove={() => onStatusChange("all")} />
                )}
                {folder !== "all" && (
                  <AnimatedFilterPill label="Folder" value={folder} onRemove={() => onFolderChange("all")} />
                )}
                {hasDocuments !== "all" && (
                  <AnimatedFilterPill
                    label="Docs"
                    value={hasDocuments === "yes" ? "Has Documents" : "No Documents"}
                    onRemove={() => onHasDocumentsChange("all")}
                  />
                )}
                {activeFilterCount > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="h-6 px-2 text-caption text-muted-foreground hover:text-foreground"
                  >
                    Clear all
                  </Button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right side: view toggle + refresh + delete */}
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
                <TooltipContent side="bottom"><p>Grouped by status</p></TooltipContent>
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

// ── Column → API field map ────────────────────────────────────────────────────
const COLUMN_FIELD_MAP = {
  title:      "Display Title",
  assignedTo: "Applicant Name",
  folder:     "Folder Name",
  status:     "Status",
}

// ── Main component ────────────────────────────────────────────────────────────
export function AssignedTasksLogsTable({ onSelectionChange }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Selection (object map, same pattern as TasksTable)
  const [selected, setSelected] = useState({})
  const selectedLogs = useMemo(() => logs.filter((l) => selected[l.id]), [logs, selected])
  const allChecked = useMemo(() => logs.length > 0 && logs.every((l) => selected[l.id]), [logs, selected])

  // View
  const [viewMode, setViewMode] = useState("list")
  const [collapsedGroups, setCollapsedGroups] = useState({})

  // Row expand
  const [expandedRows, setExpandedRows] = useState({})

  // Filters
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [folderFilter, setFolderFilter] = useState("all")
  const [hasDocumentsFilter, setHasDocumentsFilter] = useState("all")

  // Edit sheet
  const [selectedLogId, setSelectedLogId] = useState(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  // Folder options for edit sheet dropdown
  const [editFolderOptions, setEditFolderOptions] = useState([])
  const [editFoldersFetched, setEditFoldersFetched] = useState(false)
  const [editFoldersLoading, setEditFoldersLoading] = useState(false)

  const fetchEditFolders = useCallback(async () => {
    if (editFoldersFetched || editFoldersLoading) return
    setEditFoldersLoading(true)
    try {
      const res = await fetch("/api/admin/folders?includeInactive=true")
      if (!res.ok) throw new Error("Failed to fetch folders")
      const data = await res.json()
      const names = (data.folders || [])
        .map((f) => f.name)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b))
      setEditFolderOptions(Array.from(new Set(names)))
      setEditFoldersFetched(true)
    } catch {
      // swallow
    } finally {
      setEditFoldersLoading(false)
    }
  }, [editFoldersFetched, editFoldersLoading])

  // File viewer
  const [viewerLogId, setViewerLogId] = useState(null)
  const [viewerResourceUrl, setViewerResourceUrl] = useState(null)
  const [isFileViewerOpen, setIsFileViewerOpen] = useState(false)

  // Bulk delete
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)

  // Column widths
  const [columnWidths, setColumnWidths] = useState({
    checkbox:   40,
    title:      280,
    assignedTo: 200,
    folder:     140,
    status:     100,
    actions:    100,
  })
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)
  const resizingColumnRef = useRef(null)
  const tableRef = useRef(null)

  // Pagination
  const [pagination, setPagination] = useState({
    pageSize: 25,
    hasNextPage: false,
    nextCursor: null,
    cursorHistory: [],
    currentCursor: null,
  })

  // Sorting
  const [sortColumn, setSortColumn] = useState("title")
  const [sortDirection, setSortDirection] = useState("asc")

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
      if (cursor)                         params.append("cursor", cursor)
      if (searchTerm)                     params.append("search", searchTerm)
      if (statusFilter !== "all")         params.append("status", statusFilter)
      if (folderFilter !== "all")         params.append("folder", folderFilter)
      if (hasDocumentsFilter !== "all")   params.append("hasDocuments", hasDocumentsFilter)
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
  }, [pagination.pageSize, searchTerm, statusFilter, folderFilter, hasDocumentsFilter, sortColumn, sortDirection])

  useEffect(() => {
    setPagination((prev) => ({ ...prev, currentCursor: null, nextCursor: null, cursorHistory: [] }))
    fetchLogs(null)
  }, [searchTerm, statusFilter, folderFilter, hasDocumentsFilter, pagination.pageSize, fetchLogs])

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

  // Filter handlers
  const handleSearch = useCallback((term) => setSearchTerm(term), [])
  const handleSubmit = useCallback((term) => setSearchTerm(term), [])
  const handleStatusChange = useCallback((value) => setStatusFilter(value), [])
  const handleFolderChange = useCallback((value) => setFolderFilter(value), [])
  const handleHasDocumentsChange = useCallback((value) => setHasDocumentsFilter(value), [])

  // Edit / file viewer / delete handlers
  const handleOpenEditSheet = useCallback((logId) => {
    setSelectedLogId(logId)
    setIsSheetOpen(true)
    fetchEditFolders()
  }, [fetchEditFolders])

  const handleOpenFileViewer = useCallback((logId, resourceUrl) => {
    setViewerLogId(logId)
    setViewerResourceUrl(resourceUrl || null)
    setIsFileViewerOpen(true)
  }, [])

  const handleRefresh = () => fetchLogs(pagination.currentCursor)
  const handleDeleteSelected = () => setIsBulkDeleteOpen(true)

  // Selection handlers
  const toggleAll = (checked) => {
    const next = {}
    if (checked) logs.forEach((l) => (next[l.id] = true))
    setSelected(next)
  }
  const toggleOne = (id, checked) => {
    setSelected((prev) => ({ ...prev, [id]: checked }))
  }

  useEffect(() => {
    onSelectionChange?.(logs.filter((l) => selected[l.id]))
  }, [selected, logs, onSelectionChange])

  // Clear selection when page changes
  useEffect(() => { setSelected({}) }, [logs])

  // Row expand toggle
  const toggleRowExpand = useCallback((logId) => {
    setExpandedRows((prev) => ({ ...prev, [logId]: !prev[logId] }))
  }, [])

  // Grouped view collapse
  const toggleGroupCollapse = useCallback((status) => {
    setCollapsedGroups((prev) => ({ ...prev, [status]: !prev[status] }))
  }, [])

  const expandAllGroups = useCallback(() => setCollapsedGroups({}), [])
  const collapseAllGroups = useCallback(() => {
    const groups = groupLogsByStatus(logs)
    const collapsed = {}
    groups.forEach((g) => { collapsed[g.status] = true })
    setCollapsedGroups(collapsed)
  }, [logs])

  // Row keyboard handler
  const handleRowKeyDown = useCallback((e, logId) => {
    if (e.key === "Enter") {
      e.preventDefault()
      toggleRowExpand(logId)
    } else if (e.key === " ") {
      e.preventDefault()
      toggleOne(logId, !selected[logId])
    }
  }, [toggleRowExpand, selected])

  // Column resize
  const handleMouseMove = useCallback((e) => {
    const column = resizingColumnRef.current
    if (!column) return
    const newWidth = Math.max(60, startWidthRef.current + (e.clientX - startXRef.current))
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

  const handleResizeStart = useCallback((e, column) => {
    e.preventDefault()
    e.stopPropagation()
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

  // Grouped data
  const groupedData = useMemo(() => groupLogsByStatus(logs), [logs])

  // Stats
  const stats = useMemo(() => {
    const statuses = new Set(logs.map((l) => l.status).filter(Boolean))
    return { total: logs.length, statuses: statuses.size }
  }, [logs])

  // Edit sheet field config — folder uses a dynamic select fed from the folders API
  const logFields = useMemo(() => [
    { name: "name",         label: "Name",         type: "text",     required: true },
    { name: "email",        label: "Email",         type: "text" },
    { name: "title",        label: "Title",         type: "text",     required: true },
    { name: "description",  label: "Description",   type: "textarea" },
    {
      name: "folder",
      label: "Folder",
      type: "select",
      options: editFolderOptions.map((name) => ({ value: name, label: name })),
    },
    { name: "resource",     label: "Resource URL",  type: "url" },
    { name: "attachments",  label: "Attachments",   type: "file" },
    { name: "assignedDate", label: "Assigned Date", type: "date" },
  ], [editFolderOptions])
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

  // ── Header cell renderer ──────────────────────────────────────────────────
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

  // ── Log row renderer ──────────────────────────────────────────────────────
  const renderLogRow = (log, index) => {
    const isExpanded = expandedRows[log.id]
    return (
      <AnimatePresence key={log.id}>
        <motion.tr
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2, delay: index * 0.02, ease: "easeOut" }}
          onClick={() => toggleRowExpand(log.id)}
          tabIndex={0}
          role="row"
          aria-expanded={isExpanded}
          onKeyDown={(e) => handleRowKeyDown(e, log.id)}
          className={cn(
            "border-b border-border/20 transition-colors cursor-pointer group",
            "hover:bg-muted/20 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none focus-visible:ring-inset",
            isExpanded && "bg-muted/10",
            selected[log.id] && "bg-primary/5"
          )}
        >
          {/* Checkbox */}
          <TableCell style={{ width: `${columnWidths.checkbox}px` }} className="h-14">
            <div onClick={(e) => e.stopPropagation()}>
              <Checkbox
                aria-label={`Select ${log.name}`}
                checked={!!selected[log.id]}
                onCheckedChange={(v) => toggleOne(log.id, !!v)}
                disabled={loading}
              />
            </div>
          </TableCell>

          {/* Title */}
          <TableCell style={{ width: `${columnWidths.title}px` }} className="h-14">
            <span className="text-body-sm font-medium truncate block">{log.title || "—"}</span>
          </TableCell>

          {/* Assigned To */}
          <TableCell style={{ width: `${columnWidths.assignedTo}px` }} className="h-14">
            <span className="text-body-sm truncate block">{log.name || "—"}</span>
          </TableCell>

          {/* Folder */}
          <TableCell style={{ width: `${columnWidths.folder}px` }} className="h-14">
            {log.folder ? (
              <FolderBadge name={log.folder} />
            ) : (
              <span className="text-body-sm text-muted-foreground">—</span>
            )}
          </TableCell>

          {/* Status */}
          <TableCell style={{ width: `${columnWidths.status}px` }} className="h-14">
            <StatusBadge status={log.status} />
          </TableCell>

          {/* Actions */}
          <TableCell style={{ width: `${columnWidths.actions}px` }} className="h-14">
            <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                      onClick={() => handleOpenEditSheet(log.id)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom"><p>Edit</p></TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 relative text-muted-foreground hover:text-foreground"
                      onClick={() => handleOpenFileViewer(log.id, log.resource)}
                    >
                      <Paperclip className="h-3.5 w-3.5" />
                      {(log.attachmentCount > 0 || log.resource) && (
                        <span className="absolute -top-0.5 -right-0.5 h-3.5 min-w-[14px] rounded-full bg-primary text-primary-foreground text-[9px] font-medium flex items-center justify-center px-0.5">
                          {log.attachmentCount + (log.resource ? 1 : 0)}
                        </span>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom"><p>Files</p></TooltipContent>
                </Tooltip>

                {log.resource && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                        onClick={() => window.open(log.resource, "_blank", "noopener,noreferrer")}
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

        {/* Expanded detail row */}
        {isExpanded && (
          <ExpandedLogDetail
            log={log}
            onOpenFileViewer={handleOpenFileViewer}
            onOpenEditSheet={handleOpenEditSheet}
          />
        )}
      </AnimatePresence>
    )
  }

  // ── Empty state ───────────────────────────────────────────────────────────
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
          <p className="text-body-sm font-medium mb-1">No assigned tasks found</p>
          <p className="text-caption text-muted-foreground/60 mb-4">
            {searchTerm ? "Try adjusting your search or filters" : "No assignments have been created yet"}
          </p>
          {searchTerm && (
            <Button variant="outline" size="sm" onClick={() => setSearchTerm("")} className="h-8">
              Clear Search
            </Button>
          )}
        </motion.div>
      </TableCell>
    </TableRow>
  )

  // ── Grouped view renderer ─────────────────────────────────────────────────
  const renderGroupedView = () => {
    if (groupedData.length === 0) return renderEmptyState()

    let rowIndex = 0
    return groupedData.map((group) => {
      const isCollapsed = collapsedGroups[group.status]
      return (
        <React.Fragment key={`status-${group.status}`}>
          {/* Group header row */}
          <TableRow
            className="border-b border-border/20 cursor-pointer hover:bg-muted/10 transition-colors"
            onClick={() => toggleGroupCollapse(group.status)}
          >
            <TableCell colSpan={6} className="py-0 px-0">
              <div className="flex items-center gap-3 py-2.5 px-4 bg-muted/10 rounded-md mx-1 my-1">
                <motion.div
                  animate={{ rotate: isCollapsed ? -90 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </motion.div>
                {group.status === "Unassigned"
                  ? <span className="text-body-sm font-semibold">Unassigned</span>
                  : <StatusBadge status={group.status} />
                }
                <Badge variant="secondary" className="text-caption px-1.5 py-0">
                  {group.logs.length}
                </Badge>
              </div>
            </TableCell>
          </TableRow>

          {/* Log rows */}
          <AnimatePresence>
            {!isCollapsed && group.logs.map((log) => {
              const idx = rowIndex++
              return renderLogRow(log, idx)
            })}
          </AnimatePresence>
        </React.Fragment>
      )
    })
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Filter toolbar */}
      <TableFilters
        onSearch={handleSearch}
        onSubmit={handleSubmit}
        isLoading={loading}
        status={statusFilter}
        folder={folderFilter}
        hasDocuments={hasDocumentsFilter}
        onStatusChange={handleStatusChange}
        onFolderChange={handleFolderChange}
        onHasDocumentsChange={handleHasDocumentsChange}
        taskCount={logs.length}
        selectedTasks={selectedLogs}
        onDeleteSelected={handleDeleteSelected}
        onRefresh={handleRefresh}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Expand / Collapse all (grouped view only) */}
      {viewMode === "grouped" && logs.length > 0 && !loading && (
        <div className="flex items-center justify-between">
          <span className="text-caption text-muted-foreground">
            {stats.total} assignments across {stats.statuses} status{stats.statuses !== 1 ? "es" : ""}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={expandAllGroups} className="h-7 text-caption px-2">
              Expand all
            </Button>
            <span className="text-muted-foreground/30">|</span>
            <Button variant="ghost" size="sm" onClick={collapseAllGroups} className="h-7 text-caption px-2">
              Collapse all
            </Button>
          </div>
        </div>
      )}

      {/* Table card */}
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
                {renderHeaderCell("assignedTo", "Assigned To", columnWidths.assignedTo)}
                {renderHeaderCell("folder", "Folder", columnWidths.folder)}
                {renderHeaderCell("status", "Status", columnWidths.status)}
                <TableHead style={{ width: `${columnWidths.actions}px` }} className="h-11 bg-muted/20 sticky top-0 z-10">
                  <span className="text-overline text-muted-foreground/70 uppercase tracking-wider font-medium px-2">
                    Actions
                  </span>
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                Array(Math.min(pagination.pageSize, 6)).fill(0).map((_, i) => <SkeletonRow key={i} />)
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-error">
                    Error: {error}
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                renderEmptyState()
              ) : viewMode === "grouped" ? (
                renderGroupedView()
              ) : (
                <AnimatePresence initial={true}>
                  {logs.map((log, index) => renderLogRow(log, index))}
                </AnimatePresence>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border/20">
          <span className="text-caption text-muted-foreground">
            {!loading && logs.length > 0 && `Showing ${logs.length} assignment${logs.length !== 1 ? "s" : ""}`}
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
        selectedTasks={selectedLogs}
        deleteEndpoint="/api/admin/tasks/assigned-tasks/bulk-delete"
        onDeleteSuccess={() => { setSelected({}); fetchLogs(null) }}
      />

      {/* Attachment viewer */}
      {isFileViewerOpen && (
        <FileViewerModal
          isOpen={isFileViewerOpen}
          onClose={() => setIsFileViewerOpen(false)}
          taskId={viewerLogId}
          resourceUrl={viewerResourceUrl}
          attachmentsEndpoint={viewerLogId ? `/api/admin/tasks/assigned-tasks/${viewerLogId}/attachments` : ""}
          onFilesUpdated={() => fetchLogs(pagination.currentCursor)}
        />
      )}
    </div>
  )
}
