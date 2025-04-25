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
  // State for data and UI
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Controlled search term (emitted by SearchBar)
  const [searchTerm, setSearchTerm] = useState("")
  const [weekFilter, setWeekFilter] = useState("all")
  const [dayFilter, setDayFilter] = useState("all")

  // Pagination state
  const [pagination, setPagination] = useState({
    pageSize: 10,
    hasNextPage: false,
    nextCursor: null,
    cursorHistory: [],
    currentCursor: null,
  })

  // Fetch tasks (includes searchTerm)
  const fetchTasks = useCallback(
    async (cursor = null) => {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          pageSize: pagination.pageSize.toString(),
        })
        if (cursor) params.append('cursor', cursor)
        if (searchTerm) params.append('search', searchTerm)
        if (weekFilter !== "all") params.append("week", weekFilter)
        if (dayFilter !== "all") params.append("day", dayFilter)

        const url = `/api/admin/tasks/core-tasks?${params.toString()}`
        console.log("🔍 fetching tasks with:", url);
        const response = await fetch(url)
        if (!response.ok) throw new Error(`Error fetching tasks: ${response.statusText}`)
        const data = await response.json()

        const newTasks = (data.tasks || []).map((t) => ({ ...t, id: t.id.toString() }))
        setTasks(newTasks)

        setPagination((prev) => ({
          ...prev,
          hasNextPage: data.pagination?.hasNextPage || false,
          nextCursor: data.pagination?.nextCursor || null,
          currentCursor: cursor,
        }))
      } catch (err) {
        setError(err.message)
        toast({ title: 'Error', description: err.message, variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    },
    [pagination.pageSize, searchTerm, weekFilter, dayFilter]
  )

  // Initial fetch and refetch on searchTerm change (resets pagination)
  useEffect(() => {
    setPagination((prev) => ({
      ...prev,
      currentCursor: null,
      nextCursor: null,
      cursorHistory: [],
    }))
    fetchTasks(null)
  }, [searchTerm, weekFilter, dayFilter, fetchTasks])

  const handleNextPage = useCallback(() => {
    if (pagination.hasNextPage && pagination.nextCursor) {
      fetchTasks(pagination.nextCursor)
      setPagination((prev) => ({
        ...prev,
        cursorHistory: [...prev.cursorHistory, prev.currentCursor],
      }))
    }
  }, [pagination, fetchTasks])

  const handlePreviousPage = useCallback(() => {
    const history = [...pagination.cursorHistory]
    const prevCursor = history.pop() || null
    fetchTasks(prevCursor)
    setPagination((prev) => ({
      ...prev,
      cursorHistory: history,
    }))
  }, [pagination.cursorHistory, fetchTasks])

  // Handlers passed to filters
  const handleSearch = useCallback((term) => setSearchTerm(term), [])
  const handleSubmit = useCallback((term) => setSearchTerm(term), [])
  const handleWeekChange = useCallback((value) => setWeekFilter(value), [])
  const handleDayChange = useCallback((value) => setDayFilter(value), [])

  // Generate skeleton rows based on page size
  const renderSkeletonRows = () => {
    const skeletonCount = Math.min(pagination.pageSize, 5)
    return Array(skeletonCount)
      .fill(0)
      .map((_, index) => <SkeletonRow key={`skeleton-${index}`} />)
  }

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
            </TableRow>
          </TableHeader>
          <TableBody>
          {loading ? (
              renderSkeletonRows()
            ) : error ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-red-500">
                  Error: {error}
                </TableCell>
              </TableRow>
            ) : tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
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
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
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
    </div>
  )
}
