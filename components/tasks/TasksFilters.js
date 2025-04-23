"use client"

import { useState, useCallback } from "react"
import { Button } from "@components/ui/button"
import { Calendar } from "@components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@components/ui/select"
import { Badge } from "@components/ui/badge"
import { format } from "date-fns"
import { CalendarIcon, X } from "lucide-react"
import { cn } from "@components/lib/utils"

export function TasksFilters({
  type = "core",
  onFilterChange,
  statusCounts = { assigned: 0, completed: 0, overdue: 0, total: 0 },
}) {
  const [status, setStatus] = useState("")
  const [week, setWeek] = useState("")
  const [day, setDay] = useState("")
  const [jobRole, setJobRole] = useState("")
  const [dateRange, setDateRange] = useState({ from: undefined, to: undefined })

  // Handle filter changes - memoized to prevent unnecessary re-renders
  const handleStatusChange = useCallback((value) => {
    setStatus(value)
    onFilterChange({ status: value })
  }, [onFilterChange]);

  // Memoize specific status change handlers
  const handleStatusAll = useCallback(() => handleStatusChange(""), [handleStatusChange]);
  const handleStatusAssigned = useCallback(() => handleStatusChange("assigned"), [handleStatusChange]);
  const handleStatusOverdue = useCallback(() => handleStatusChange("overdue"), [handleStatusChange]);
  const handleStatusCompleted = useCallback(() => handleStatusChange("completed"), [handleStatusChange]);

  const handleWeekChange = useCallback((value) => {
    setWeek(value)
    onFilterChange({ week: value })
  }, [onFilterChange]);

  const handleDayChange = useCallback((value) => {
    setDay(value)
    onFilterChange({ day: value })
  }, [onFilterChange]);

  const handleJobRoleChange = useCallback((value) => {
    setJobRole(value)
    onFilterChange({ jobRole: value })
  }, [onFilterChange]);

  const handleDateRangeChange = useCallback((range) => {
    setDateRange(range)

    const startDate = range.from ? format(range.from, "yyyy-MM-dd") : ""
    const endDate = range.to ? format(range.to, "yyyy-MM-dd") : ""

    onFilterChange({
      dateRange: {
        startDate,
        endDate,
      },
    })
  }, [onFilterChange]);

  const handleResetFilters = useCallback(() => {
    setStatus("")
    setWeek("")
    setDay("")
    setJobRole("")
    setDateRange({ from: undefined, to: undefined })

    onFilterChange({
      status: "",
      week: "",
      day: "",
      jobRole: "",
      dateRange: { startDate: "", endDate: "" },
    })
  }, [onFilterChange]);

  // Check if any filters are active
  const hasActiveFilters = status || week || day || jobRole || dateRange.from || dateRange.to

  return (
    <div className="space-y-4">
      {/* Status filter chips - only for assigned tasks */}
      {type === "assigned" && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant={status === "" ? "default" : "outline"}
            size="sm"
            onClick={handleStatusAll}
            className="rounded-full"
          >
            All
            <Badge variant="secondary" className="ml-2 rounded-full">
              {statusCounts.total || 0}
            </Badge>
          </Button>
          <Button
            variant={status === "assigned" ? "default" : "outline"}
            size="sm"
            onClick={handleStatusAssigned}
            className="rounded-full"
          >
            Assigned
            <Badge variant="secondary" className="ml-2 rounded-full">
              {statusCounts.assigned || 0}
            </Badge>
          </Button>
          <Button
            variant={status === "overdue" ? "default" : "outline"}
            size="sm"
            onClick={handleStatusOverdue}
            className="rounded-full"
          >
            Overdue
            <Badge variant="secondary" className="ml-2 rounded-full">
              {statusCounts.overdue || 0}
            </Badge>
          </Button>
          <Button
            variant={status === "completed" ? "default" : "outline"}
            size="sm"
            onClick={handleStatusCompleted}
            className="rounded-full"
          >
            Completed
            <Badge variant="secondary" className="ml-2 rounded-full">
              {statusCounts.completed || 0}
            </Badge>
          </Button>
        </div>
      )}

      {/* Advanced filters */}
      <div className="flex flex-wrap gap-2">
        {/* Week filter */}
        <Select value={week} onValueChange={handleWeekChange}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Week" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Weeks</SelectItem>
            <SelectItem value="1">Week 1</SelectItem>
            <SelectItem value="2">Week 2</SelectItem>
            <SelectItem value="3">Week 3</SelectItem>
            <SelectItem value="4">Week 4</SelectItem>
            <SelectItem value="5">Week 5</SelectItem>
          </SelectContent>
        </Select>

        {/* Day filter */}
        <Select value={day} onValueChange={handleDayChange}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Day" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Days</SelectItem>
            <SelectItem value="1">Day 1</SelectItem>
            <SelectItem value="2">Day 2</SelectItem>
            <SelectItem value="3">Day 3</SelectItem>
            <SelectItem value="4">Day 4</SelectItem>
            <SelectItem value="5">Day 5</SelectItem>
          </SelectContent>
        </Select>

        {/* Job Role filter */}
        <Select value={jobRole} onValueChange={handleJobRoleChange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Job Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="Nurse">Nurse</SelectItem>
            <SelectItem value="Dentist">Dentist</SelectItem>
            <SelectItem value="Receptionist">Receptionist</SelectItem>
          </SelectContent>
        </Select>

        {/* Date Range filter - only for assigned tasks */}
        {type === "assigned" && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={dateRange.from ? "default" : "outline"}
                className={cn("justify-start text-left font-normal", !dateRange.from && "text-muted-foreground")}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  "Date Range"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange.from}
                selected={dateRange}
                onSelect={handleDateRangeChange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        )}

        {/* Reset filters button */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleResetFilters}>
            <X className="mr-2 h-4 w-4" />
            Clear filters
          </Button>
        )}
      </div>
    </div>
  )
}
