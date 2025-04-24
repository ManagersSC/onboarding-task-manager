"use client"

import { useState, useEffect, useCallback } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@components/ui/table"
import { Button } from "@components/ui/button"
import { ExternalLink, ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { FolderBadge } from "./FolderBadge"

export function TasksTable() {
  // State for data and UI
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Pagination state
  const [pagination, setPagination] = useState({
    pageSize: 10,
    hasNextPage: false,
    nextCursor: null,
    cursorHistory: [], // Track previous cursors for "back" functionality
  })

  // Fetch tasks with pagination
  const fetchTasks = useCallback(
    async (cursor = null, isGoingBack = false) => {
      setLoading(true)
      setError(null)

      try {
        // Build query parameters
        const params = new URLSearchParams({
          pageSize: pagination.pageSize.toString(),
        })

        // Add cursor for pagination if provided
        if (cursor) {
          params.append("cursor", cursor)
        }

        const response = await fetch(`/api/admin/tasks/core-tasks?${params.toString()}`)

        if (!response.ok) {
          throw new Error(`Error fetching tasks: ${response.statusText}`)
        }

        const data = await response.json()

        // Process the response data
        const newTasks = (data.tasks || []).map((t) => ({
          ...t,
          id: t.id?.toString() || Math.random().toString(),
        }))

        setTasks(newTasks)

        // Update pagination state based on cursor
        if (!isGoingBack) {
          setPagination((prev) => ({
            ...prev,
            hasNextPage: data.pagination?.hasNextPage || false,
            nextCursor: data.pagination?.nextCursor || null,
            cursorHistory: cursor ? [...prev.cursorHistory, cursor] : prev.cursorHistory,
          }))
        } else {
          // When going back, we don't add to history
          setPagination((prev) => ({
            ...prev,
            hasNextPage: data.pagination?.hasNextPage || false,
            nextCursor: data.pagination?.nextCursor || null,
          }))
        }
      } catch (err) {
        setError(err.message)
        toast({
          title: "Error",
          description: err.message,
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    },
    [pagination.pageSize],
  )

  // Initial data fetch
  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  // Handle going to next page
  const handleNextPage = useCallback(() => {
    if (pagination.hasNextPage && pagination.nextCursor) {
      fetchTasks(pagination.nextCursor)
    }
  }, [pagination.hasNextPage, pagination.nextCursor, fetchTasks])

  // Handle going to previous page
  const handlePreviousPage = useCallback(() => {
    if (pagination.cursorHistory.length > 0) {
      // Remove current cursor from history
      const newHistory = [...pagination.cursorHistory]
      newHistory.pop()

      // Get the previous cursor (or null for first page)
      const previousCursor = newHistory.length > 0 ? newHistory[newHistory.length - 1] : null

      // Fetch with previous cursor
      fetchTasks(previousCursor, true)

      // Update history
      setPagination((prev) => ({
        ...prev,
        cursorHistory: newHistory,
      }))
    } else {
      // If no history, go to first page
      fetchTasks(null, true)
    }
  }, [pagination.cursorHistory, fetchTasks])

  return (
    <div className="space-y-4">
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
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <div className="flex justify-center items-center h-full">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-red-500">
                  Error: {error}
                </TableCell>
              </TableRow>
            ) : tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No tasks found
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
        <Button variant="outline" size="sm" onClick={handleNextPage} disabled={!pagination.hasNextPage || loading}>
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  )
}
