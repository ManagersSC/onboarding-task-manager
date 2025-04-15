"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@components/ui/card"
import { Button } from "@components/ui/button"
import { Avatar, AvatarFallback } from "@components/ui/avatar"
import { RefreshCw, Filter, User, ChevronDown, Search, ChevronLeft, ChevronRight, CalendarIcon, X } from "lucide-react"
import { Skeleton } from "@components/ui/skeleton"
import { ScrollArea } from "@components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@components/ui/dialog"
import { Input } from "@components/ui/input"
import { Calendar } from "@components/ui/calendar"
import { format } from "date-fns"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@components/ui/select"

export function ActivityFeed() {
  const [activities, setActivities] = useState([])
  const [allActivities, setAllActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalLoading, setModalLoading] = useState(false)
  const [filter, setFilter] = useState("all")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [nextOffset, setNextOffset] = useState(null)

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("")
  const [eventTypeFilter, setEventTypeFilter] = useState("all")
  const [dateRange, setDateRange] = useState({ from: undefined, to: undefined })

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [filteredActivities, setFilteredActivities] = useState([])

  const fetchActivities = async (limit = 15) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/activity?filter=${encodeURIComponent(filter)}&limit=${limit}`)
      if (response.ok) {
        const data = await response.json()
        setActivities(data.activities || [])
        setNextOffset(data.offset)
        setHasMore(!!data.offset || data.activities?.length >= limit)
      }
    } catch (error) {
      console.error("Error fetching activities:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAllActivities = async () => {
    setModalLoading(true)
    setAllActivities([])

    try {
      let offset = null
      let allRecords = []
      let hasMoreRecords = true

      // Fetch first page
      const response = await fetch(`/api/admin/activity?filter=${encodeURIComponent(filter)}&limit=100`)
      if (!response.ok) throw new Error("Failed to fetch activities")

      const data = await response.json()
      allRecords = [...data.activities]
      offset = data.offset

      // Continue fetching if there are more pages
      while (offset && hasMoreRecords) {
        const nextResponse = await fetch(
          `/api/admin/activity?filter=${encodeURIComponent(filter)}&limit=100&offset=${offset}`,
        )
        if (!nextResponse.ok) {
          hasMoreRecords = false
          break
        }

        const nextData = await nextResponse.json()
        allRecords = [...allRecords, ...nextData.activities]
        offset = nextData.offset

        // Safety check to prevent infinite loops
        if (allRecords.length > 1000) {
          console.warn("Reached maximum records limit (1000)")
          hasMoreRecords = false
        }
      }

      setAllActivities(allRecords)
      setFilteredActivities(allRecords)
    } catch (error) {
      console.error("Error fetching all activities:", error)
    } finally {
      setModalLoading(false)
    }
  }

  useEffect(() => {
    fetchActivities()
  }, [filter])

  useEffect(() => {
    if (isModalOpen && allActivities.length === 0) {
      fetchAllActivities()
    }
  }, [isModalOpen])

  // Apply filters and search to activities
  useEffect(() => {
    if (allActivities.length === 0) return

    let filtered = [...allActivities]

    // Apply search term filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (activity) =>
          activity.user?.name?.toLowerCase().includes(term) ||
          activity.user?.email?.toLowerCase().includes(term) ||
          activity.description.toLowerCase().includes(term),
      )
    }

    // Apply event type filter
    if (eventTypeFilter !== "all") {
      filtered = filtered.filter((activity) => activity.type === eventTypeFilter)
    }

    // Apply date range filter
    if (dateRange.from) {
      const fromDate = new Date(dateRange.from)
      fromDate.setHours(0, 0, 0, 0)

      filtered = filtered.filter((activity) => {
        const activityDate = new Date(activity.timestamp)
        return activityDate >= fromDate
      })
    }

    if (dateRange.to) {
      const toDate = new Date(dateRange.to)
      toDate.setHours(23, 59, 59, 999)

      filtered = filtered.filter((activity) => {
        const activityDate = new Date(activity.timestamp)
        return activityDate <= toDate
      })
    }

    setFilteredActivities(filtered)
    setTotalPages(Math.max(1, Math.ceil(filtered.length / itemsPerPage)))
    setCurrentPage(1) // Reset to first page when filters change
  }, [allActivities, searchTerm, eventTypeFilter, dateRange, itemsPerPage])

  const handleViewAll = () => {
    setIsModalOpen(true)
  }

  // Get current page items
  const getCurrentPageItems = () => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredActivities.slice(startIndex, endIndex)
  }

  const getActivityTypeLabel = (type) => {
    switch (type) {
      case "task_completed":
        return "Task Completed"
      case "login":
        return "Login"
      case "logout":
        return "Logout"
      case "signup":
        return "Sign Up"
      case "reset_password":
        return "Reset Password"
      default:
        return "Activity"
    }
  }

  const getActivityTypeColor = (type) => {
    switch (type) {
      case "task_completed":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
      case "login":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
      case "logout":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
      case "signup":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
      case "reset_password":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
    }
  }

  const renderActivityItem = (activity, index) => (
    <div key={index} className="flex items-start space-x-3 mb-4">
      <Avatar className="h-9 w-9 border border-border">
        <AvatarFallback className="bg-muted text-muted-foreground">
          {activity.user?.role === "Admin" ? (
            <User className="h-4 w-4" />
          ) : (
            activity.user?.name?.[0] || activity.user?.email?.[0] || "U"
          )}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-1.5">
        <div className="flex items-baseline">
          <p className="text-sm font-medium">
            {activity.user?.name || activity.user?.email}
          </p>
          {activity.user?.name && activity.user?.email && (
            <span className="text-xs text-muted-foreground truncate">({activity.user.email})</span>
          )}
          <span className="ml-auto text-xs text-muted-foreground">{activity.timeAgo}</span>
        </div>
        <div className="flex flex-col space-y-1">
          <div
            className={`
              inline-flex self-start rounded-2xl rounded-tl-none px-3 py-2 text-sm 
              ${getActivityTypeColor(activity.type)}
            `}
          >
            {getActivityTypeLabel(activity.type)}: {activity.status}
          </div>
          <div className="inline-flex self-start bg-muted rounded-2xl rounded-tl-none px-3 py-2 text-sm max-w-[90%]">
            {activity.description}
          </div>
        </div>
      </div>
    </div>
  )

  // Generate pagination controls
  const renderPagination = () => {
    if (filteredActivities.length === 0) return null

    const startItem = (currentPage - 1) * itemsPerPage + 1
    const endItem = Math.min(currentPage * itemsPerPage, filteredActivities.length)

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0 mt-4 pt-4 border-t border-border">
        <div className="text-sm text-muted-foreground">
          Showing {startItem}-{endItem} of {filteredActivities.length} activities
        </div>

        <div className="flex items-center space-x-2">
          <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Previous page</span>
            </Button>

            {totalPages <= 7 ? (
              // Show all pages if 7 or fewer
              Array.from({ length: totalPages }, (_, i) => (
                <Button
                  key={i + 1}
                  variant={currentPage === i + 1 ? "default" : "outline"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(i + 1)}
                >
                  {i + 1}
                </Button>
              ))
            ) : (
              // Show limited pages with ellipsis for many pages
              <>
                {/* First page */}
                <Button
                  variant={currentPage === 1 ? "default" : "outline"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(1)}
                >
                  1
                </Button>

                {/* Ellipsis or page numbers */}
                {currentPage > 3 && <span className="px-2">...</span>}

                {/* Pages around current */}
                {Array.from({ length: Math.min(3, totalPages - 2) }, (_, i) => {
                  let pageNum
                  if (currentPage <= 3) {
                    pageNum = i + 2
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 1 + i
                  }

                  if (pageNum > 1 && pageNum < totalPages) {
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    )
                  }
                  return null
                })}

                {/* Ellipsis or page numbers */}
                {currentPage < totalPages - 2 && <span className="px-2">...</span>}

                {/* Last page */}
                <Button
                  variant={currentPage === totalPages ? "default" : "outline"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(totalPages)}
                >
                  {totalPages}
                </Button>
              </>
            )}

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next page</span>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-semibold">Activity Feed</CardTitle>
          <div className="flex items-center space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1">
                  <Filter className="h-3.5 w-3.5" />
                  <span>Filter</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuCheckboxItem checked={filter === "all"} onCheckedChange={() => setFilter("all")}>
                  All Activities
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={filter === "user"} onCheckedChange={() => setFilter("user")}>
                  User Activities
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={filter === "admin"} onCheckedChange={() => setFilter("admin")}>
                  Admin Activities
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" className="h-8" onClick={() => fetchActivities()}>
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="sr-only">Refresh</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-start space-x-3">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <div className="flex justify-between">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                      <Skeleton className="h-10 w-3/4 rounded-2xl" />
                      <Skeleton className="h-10 w-1/2 rounded-2xl" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activities.length > 0 ? (
              <div className="space-y-1">
                {activities.map((activity, index) => renderActivityItem(activity, index))}

                {hasMore && (
                  <div className="text-center pt-2">
                    <Button
                      variant="link"
                      onClick={handleViewAll}
                      className="text-sm font-medium text-primary hover:text-primary/80"
                    >
                      View All Activities
                      <ChevronDown className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No recent activity</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* View All Activities Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
            <DialogTitle>All Activity</DialogTitle>

            <div className="flex flex-1 justify-center mx-4">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search activities..."
                  className="pl-9 h-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => setEventTypeFilter("all")} className="justify-between">
                    All Types
                    {eventTypeFilter === "all" && <span>✓</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setEventTypeFilter("login")} className="justify-between">
                    Login
                    {eventTypeFilter === "login" && <span>✓</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setEventTypeFilter("logout")} className="justify-between">
                    Logout
                    {eventTypeFilter === "logout" && <span>✓</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setEventTypeFilter("signup")} className="justify-between">
                    Sign Up
                    {eventTypeFilter === "signup" && <span>✓</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setEventTypeFilter("task_completed")} className="justify-between">
                    Task Completed
                    {eventTypeFilter === "task_completed" && <span>✓</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setEventTypeFilter("reset_password")} className="justify-between">
                    Reset Password
                    {eventTypeFilter === "reset_password" && <span>✓</span>}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <div className="p-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
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
                            <span>Date Range</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                          initialFocus
                          mode="range"
                          defaultMonth={dateRange.from}
                          selected={dateRange}
                          onSelect={setDateRange}
                          numberOfMonths={2}
                        />
                        <div className="flex items-center justify-between p-3 border-t border-border">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDateRange({ from: undefined, to: undefined })}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Clear
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => document.body.click()} // Close the popover
                          >
                            Apply
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </DialogHeader>

          {modalLoading ? (
            <div className="flex items-center justify-center h-[50vh]">
              <div className="flex flex-col items-center space-y-2">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading activities...</p>
              </div>
            </div>
          ) : (
            <>
              <ScrollArea className="h-[60vh] pr-4 mt-4">
                {filteredActivities.length > 0 ? (
                  <div className="space-y-3">
                    {getCurrentPageItems().map((activity, index) => renderActivityItem(activity, index))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No activities found</p>
                  </div>
                )}
              </ScrollArea>

              {renderPagination()}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
