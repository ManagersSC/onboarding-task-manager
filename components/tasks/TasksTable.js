"use client"

import { useState, useEffect, useCallback } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@components/ui/table"
import { Input } from "@components/ui/input"
import { Button } from "@components/ui/button"
import { ExternalLink, ChevronLeft, ChevronRight, Search, X, Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { FolderBadge } from "./FolderBadge"
import { useDebounce } from "@/hooks/use-debounce"
import { SkeletonRow } from "./SkeletonRow"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@components/ui/select"
import { TaskEditSheet } from "./TaskEditSheet"

// All table filters
function TableFilters({ 
  onSearch, onSubmit, isLoading, week, day, onWeekChange, onDayChange, taskCount 
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
                <SelectItem key={w} value={`${w}`}>Week {w}</SelectItem>
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
                <SelectItem key={d} value={`${d}`}>Day {d}</SelectItem>
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

  // Filters
  const [searchTerm, setSearchTerm] = useState("")
  const [weekFilter, setWeekFilter] = useState("all")
  const [dayFilter, setDayFilter] = useState("all")

  // Task Editing
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

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
    const newSize = parseInt(debouncedPageSize, 10)
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
    [pagination.pageSize, searchTerm, weekFilter, dayFilter]
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

  const renderSkeletonRows = () =>
    Array(Math.min(pagination.pageSize, 5))
      .fill(0)
      .map((_, i) => <SkeletonRow key={i} />)

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

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Week</TableHead>
              <TableHead>Day</TableHead>
              <TableHead>Folder</TableHead>
              <TableHead>Resource</TableHead>
              <TableHead>Edit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
          {loading ? (
              renderSkeletonRows()
            ) : error ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-red-500">
                  Error: {error}
                </TableCell>
              </TableRow>
            ) : tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  {searchTerm ? `No tasks found matching \"${searchTerm}\"` : "No tasks found"}
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">{task.title}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{task.description}</TableCell>
                  <TableCell>{task.week ? `Week ${task.week}` : "—"}</TableCell>
                  <TableCell>{task.day ? `Day ${task.day}` : "—"}</TableCell>
                  <TableCell>{task.folderName ? <FolderBadge name={task.folderName} /> : "—"}</TableCell>
                  <TableCell>
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
                  <TableCell>
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
        <Button
          variant="outline"
          size="sm"
          onClick={handleNextPage}
          disabled={!pagination.hasNextPage || loading}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Task Edit Sheet */}
      <TaskEditSheet taskId={editingTaskId} open={isSheetOpen} onOpenChange={setIsSheetOpen} />
    </div>
  )
}
