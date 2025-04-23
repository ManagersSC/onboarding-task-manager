"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@components/ui/table"
import { Checkbox } from "@components/ui/checkbox"
import { Button } from "@components/ui/button"
import { Input } from "@components/ui/input"
import { StatusBadge } from "./StatusBadge"
import { UrgencyBadge } from "./UrgencyBadge"
import { TaskTypeBadge } from "./TaskTypeBadge"
import { ExternalLink, ArrowUpDown, Trash2, MoreHorizontal, Search, X } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@components/ui/dropdown-menu"
import { toast } from "@/hooks/use-toast"
import { Pagination } from "./Pagination"
import { useDebounce } from "@/hooks/use-debounce"

export function TasksTable({ type = "core", dateRange }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { startDate, endDate } = dateRange

  // State for data and UI
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedItems, setSelectedItems] = useState([])
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    totalRecords: 0,
    totalPages: 1,
    nextCursor: null,
    cursors: {} // Store cursors for each page to allow backward navigation
  })
  const [statusCounts, setStatusCounts] = useState({
    assigned: 0,
    completed: 0,
    overdue: 0,
    total: 0,
  })

  // Filters and sorting
  const [searchTerm, setSearchTerm] = useState("")
  const debouncedSearchTerm = useDebounce(searchTerm, 500)
  const [sortBy, setSortBy] = useState("createdTime")
  const [sortDirection, setSortDirection] = useState("desc")
  const [statusFilter, setStatusFilter] = useState("")
  const [weekFilter, setWeekFilter] = useState("")
  const [dayFilter, setDayFilter] = useState("")
  const [jobRoleFilter, setJobRoleFilter] = useState("")

  // Use refs to store stable references to functions and state
  const isFetchingRef = useRef(false)
  const fetchTasksRef = useRef(null)
  const paramsRef = useRef({
    type,
    debouncedSearchTerm,
    sortBy,
    sortDirection,
    statusFilter,
    weekFilter,
    dayFilter,
    jobRoleFilter,
    startDate,
    endDate,
    page: pagination.page,
    pageSize: pagination.pageSize
  })
  
  // Track if we need to reset pagination
  const shouldResetPageRef = useRef(false);
  
  // When filters change, mark that we need to reset pagination
  useEffect(() => {
    shouldResetPageRef.current = true;
  }, [debouncedSearchTerm, sortBy, sortDirection,
      statusFilter, weekFilter, dayFilter, jobRoleFilter, startDate, endDate]);
  
  // Handle the actual pagination reset in a separate effect
  useEffect(() => {
    if (shouldResetPageRef.current) {
      shouldResetPageRef.current = false;
      setPagination(p => {
        if (p.page !== 1) {
          return { ...p, page: 1 };
        }
        return p;
      });
    }
  }, [
    shouldResetPageRef.current,
    pagination.page,
    type,
    startDate,
    endDate
  ]);

  // Define the fetchTasks function
  fetchTasksRef.current = async () => {
    setLoading(true)
    setError(null)

    try {
      // Build query parameters
      const params = new URLSearchParams({
        sortBy,
        sortDirection,
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
      })

      // Add cursor for pagination if we're not on the first page
      if (pagination.page > 1) {
        // Use the stored cursor for the current page if available
        const cursor = pagination.cursors[pagination.page]
        if (cursor) {
          params.append("cursor", cursor)
        }
      }

      if (weekFilter) params.append("week", weekFilter)
      if (dayFilter) params.append("day", dayFilter)
      if (jobRoleFilter) params.append("jobRole", jobRoleFilter)

      if (typeof debouncedSearchTerm === "string" && debouncedSearchTerm.trim() !== ""){
        params.append("search", debouncedSearchTerm)
      }

      // Only add status filter for assigned logs
      if (type === "assigned" && statusFilter) {
        params.append("status", statusFilter)
      }

      // Only add date range for assigned logs
      if (type === "assigned" && startDate) {
        params.append("startDate", startDate)
      }
      if (type === "assigned" && endDate) {
        params.append("endDate", endDate)
      }

      // Determine which API endpoint to use
      const endpoint =
        type === "core"
          ? `/api/admin/tasks/core-tasks?${params.toString()}`
          : `/api/admin/tasks/assigned-logs?${params.toString()}`

      const response = await fetch(endpoint)

      if (!response.ok) {
        throw new Error(`Error fetching tasks: ${response.statusText}`)
      }

      const data = await response.json()
      console.log('API Response Data: ', data)

      // Process the response data outside of state updates to minimize render cycles
      const newTasks = type === "core" 
        ? (data.tasks || []).map(t => ({ ...t, id: t.id.toString() })) 
        : (data.taskLogs || []).map(t => ({ ...t, id: t.id.toString() }));
      const validatedTasks = newTasks.map(task => ({
        ...task,
        id: task.id?.toString() || Math.random().toString()
      }))
      const paginationData = data.pagination || {};
      
      // Create new pagination state
      const newPaginationData = {
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalRecords: paginationData.totalRecords || 0,
        totalPages: paginationData.totalPages || 1,
        hasNextPage: paginationData.hasNextPage || false,
        nextCursor: paginationData.nextCursor || null,
        cursors: { ...pagination.cursors }
      };
      
      // Store the cursor for the next page if it exists
      if (paginationData.nextCursor) {
        newPaginationData.cursors[pagination.page + 1] = paginationData.nextCursor;
      }
      
      // Batch state updates to reduce render cycles
      // First update tasks
      setTasks(validatedTasks);
      
      // Then update pagination in a separate cycle
      setTimeout(() => {
        setPagination(prevPagination => {
          // Only update if there are actual changes
          if (JSON.stringify(prevPagination) !== JSON.stringify(newPaginationData)) {
            return newPaginationData;
          }
          return prevPagination;
        });
        
        // Update status counts if available (for assigned logs)
        if (type !== "core" && data.statusCounts) {
          setStatusCounts(data.statusCounts);
        }
      }, 0);
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
  };

  // Fetch tasks based on current filters and pagination
  useEffect(() => {
    // Update the current parameters
    const currentParams = {
      type,
      debouncedSearchTerm,
      sortBy,
      sortDirection,
      statusFilter,
      weekFilter,
      dayFilter,
      jobRoleFilter,
      startDate,
      endDate,
      page: pagination.page,
      pageSize: pagination.pageSize
    };
    
    // Only fetch if parameters have changed
    if (JSON.stringify(paramsRef.current) !== JSON.stringify(currentParams)) {
      // Update the ref with current parameters
      paramsRef.current = currentParams;
      
      // Prevent multiple simultaneous fetches
      if (isFetchingRef.current) return;
      
      // Set fetching flag
      isFetchingRef.current = true;
      
      // Use a timeout to ensure we don't get into a rapid re-render cycle
      const fetchTimeout = setTimeout(() => {
        fetchTasksRef.current().finally(() => {
          // Reset fetching flag when done
          isFetchingRef.current = false;
        });
      }, 0);
      
      // Clean up timeout if component unmounts or dependencies change
      return () => clearTimeout(fetchTimeout);
    }
  }, [
    // Use a stable dependency array to prevent unnecessary re-renders
    // We're using refs to track changes, so we don't need to include all these dependencies
    shouldResetPageRef.current, // This will trigger when filters change
    pagination.page, // This will trigger when page changes
  ]);

  // Memoize event handlers
  const handleOpenResource = useCallback((url) => {
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  const handleBulkDelete = useCallback(async () => {
    if (selectedItems.length === 0) return;

    try {
      const endpoint = type === "core" ? "/api/admin/tasks/core-tasks" : "/api/admin/tasks/assigned-logs";

      const response = await fetch(endpoint, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          [type === "core" ? "taskIds" : "taskLogIds"]: selectedItems,
        }),
      });

      if (!response.ok) {
        throw new Error(`Error deleting tasks: ${response.statusText}`);
      }

      const data = await response.json();

      // Show success toast with undo option
      toast({
        title: "Success",
        description: data.message || `${selectedItems.length} items deleted`,
        action: (
          <Button variant="outline" size="sm" onClick={() => {
            toast({
              title: "Restoring...",
              description: "Attempting to restore deleted items",
            });
            fetchTasksRef.current();
          }}>
            Undo
          </Button>
        ),
      });

      // Clear selection and refresh data
      setSelectedItems([]);
      fetchTasksRef.current();
    } catch (err) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  }, [selectedItems, type]);

  const handleDeleteSingleItem = useCallback((id) => {
    setSelectedItems([id]);
    setTimeout(() => {
      document.querySelector('button[data-delete-button="true"]')?.click();
    }, 0);
  }, []);

  const handleSort = useCallback((field) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortDirection("asc");
    }
  }, [sortBy, sortDirection]);

  const handleSelectAll = useCallback((e) => {
    const checked = e.target.checked;
    if (checked) {
      setSelectedItems(tasks.map((task) => task.id));
    } else {
      setSelectedItems([]);
    }
  }, [tasks]);

  const handleSelectItem = useCallback((e, id) => {
    const checked = e.target.checked;
    if (checked) {
      setSelectedItems(prev => [...prev, id]);
    } else {
      setSelectedItems(prev => prev.filter((itemId) => itemId !== id));
    }
  }, []);

  const handlePageChange = useCallback((newPage) => {
    if (newPage !== pagination.page) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  }, [pagination.page]);

  const handleResetFilters = useCallback(() => {
    setSearchTerm("");
    setStatusFilter("");
    setWeekFilter("");
    setDayFilter("");
    setJobRoleFilter("");
    setSortBy("createdTime");
    setSortDirection("desc");
  }, []);

  const handleSearchChange = useCallback((e) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchTerm("");
  }, []);

  // Render column headers based on table type
  const renderColumnHeaders = useCallback(() => {
    const commonColumns = [
      { id: "select", label: "", sortable: false },
      { id: "title", label: "Title", sortable: true },
      { id: "week", label: "Week", sortable: true },
      { id: "folder", label: "Folder", sortable: true },
    ];

    const coreColumns = [
      ...commonColumns,
      { id: "type", label: "Type", sortable: true },
      { id: "actions", label: "", sortable: false },
    ];

    const assignedColumns = [
      ...commonColumns,
      { id: "status", label: "Status", sortable: true },
      { id: "applicant", label: "Assigned To", sortable: true },
      { id: "urgency", label: "Urgency", sortable: true },
      { id: "actions", label: "", sortable: false },
    ];

    const columns = type === "core" ? coreColumns : assignedColumns;

    return (
      <TableRow>
        {columns.map((column) => (
          <TableHead key={column.id} className={column.id === "select" ? "w-[50px]" : ""}>
            {column.id === "select" ? (
              <Checkbox
                checked={selectedItems.length === tasks.length && tasks.length > 0}
                onChange={handleSelectAll}
                aria-label="Select all"
              />
            ) : column.sortable ? (
              <Button
                variant="ghost"
                onClick={() => handleSort(column.id)}
                className="flex items-center gap-1 hover:bg-transparent p-0 h-auto font-medium"
              >
                {column.label}
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            ) : (
              column.label
            )}
          </TableHead>
        ))}
      </TableRow>
    );
  }, [type, tasks.length, selectedItems.length, handleSelectAll, handleSort]);

  // Render table rows based on data
  const renderTableRows = useCallback(() => {
    if (loading) {
      return (
        <TableRow>
          <TableCell colSpan={type === "core" ? 6 : 8} className="h-24 text-center">
            Loading...
          </TableCell>
        </TableRow>
      );
    }

    if (error) {
      return (
        <TableRow>
          <TableCell colSpan={type === "core" ? 6 : 8} className="h-24 text-center text-red-500">
            Error: {error}
          </TableCell>
        </TableRow>
      );
    }

    if (tasks.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={type === "core" ? 6 : 8} className="h-24 text-center">
            No tasks found
          </TableCell>
        </TableRow>
      );
    }

    return tasks.map((task) => (
      <TableRow key={task.id} className="group">
        <TableCell>
          <Checkbox
            checked={selectedItems.includes(task.id)}
            onChange={(e) => handleSelectItem(e, task.id)}
            aria-label={`Select ${task.title}`}
          />
        </TableCell>
        <TableCell>
          <div className="font-medium">{task.title}</div>
          {task.description && <div className="text-sm text-muted-foreground line-clamp-1">{task.description}</div>}
        </TableCell>
        <TableCell>
          {task.week && <div>Week {task.week}</div>}
          {task.day && <div className="text-sm text-muted-foreground">Day {task.day}</div>}
        </TableCell>
        <TableCell>
          <div className="max-w-[200px] truncate">{task.folderName || "—"}</div>
        </TableCell>

        {type === "core" ? (
          <>
            <TableCell>
              <TaskTypeBadge type={task.type} />
            </TableCell>
          </>
        ) : (
          <>
            <TableCell>
              <StatusBadge status={task.status} />
            </TableCell>
            <TableCell>
              <div>{task.applicantName || "—"}</div>
              {task.applicantEmail && (
                <div className="text-sm text-muted-foreground truncate max-w-[150px]">{task.applicantEmail}</div>
              )}
            </TableCell>
            <TableCell>
              {task.isCustom && task.urgency && task.urgency !== "Medium" && <UrgencyBadge urgency={task.urgency} />}
            </TableCell>
          </>
        )}

        <TableCell>
          <div className="flex items-center justify-end gap-2">
            {task.resourceUrl && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleOpenResource(task.resourceUrl)}
                title="Open resource"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => {
                  // Create a synthetic event object with target.checked = true
                  const syntheticEvent = { target: { checked: true } };
                  handleSelectItem(syntheticEvent, task.id);
                }}>Select</DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-600 dark:text-red-400"
                  onClick={() => handleDeleteSingleItem(task.id)}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </TableCell>
      </TableRow>
    ));
  }, [type, loading, error, tasks, selectedItems, handleSelectItem, handleOpenResource, handleDeleteSingleItem]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-[300px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="pl-9 w-full"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-7 w-7 p-0"
                onClick={handleClearSearch}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          {(searchTerm ||
            statusFilter ||
            weekFilter ||
            dayFilter ||
            jobRoleFilter ||
            dateRange.startDate ||
            dateRange.endDate) && (
            <Button variant="ghost" size="sm" onClick={handleResetFilters}>
              Clear filters
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedItems.length > 0 && (
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleBulkDelete} 
              className="ml-auto"
              data-delete-button="true"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete {selectedItems.length} selected
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>{renderColumnHeaders()}</TableHeader>
          <TableBody>{renderTableRows()}</TableBody>
        </Table>
      </div>

      <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} onPageChange={handlePageChange} />
    </div>
  );
}
