"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@components/ui/card"
import { Button } from "@components/ui/button"
import { Avatar, AvatarFallback } from "@components/ui/avatar"
import { RefreshCw, Filter, User, ChevronDown, Search, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { Skeleton } from "@components/ui/skeleton"
import { ScrollArea } from "@components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@components/ui/dialog"
import { Input } from "@components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@components/ui/popover"
import { Calendar as CalendarComponent } from "@components/ui/calendar"
import { format } from "date-fns"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/ui/select"

export function ActivityFeed() {
  const [activities, setActivities] = useState([])
  const [allActivities, setAllActivites] = useState([])
  const [filteredActivities, setFilteredActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [hasMore, setHasMore] = useState(false)

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("")
  const [eventTypeFilter, setEventTypeFilter] = useState("all")
  const [dateRange, setDateRange] = useState({ from: undefined, to: undefined})

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  const fetchActivities = async (limit = 15) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/activity?filter=${encodeURIComponent(filter)}&limit=${encodeURIComponent(limit)}`)
      if (response.ok) {
        const data = await response.json()
        if(limit === 15){
          setActivities(data.activities || [])
          // Check if there might be more activities
          setHasMore(data.activities?.length >= 15)
        } else{
          setAllActivites(data.activities || [])
          setFilteredActivities(activities)
          setCurrentPage(1)
        }
      }
    } catch (error) {
      console.error("Error fetching activities:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchActivities()
  }, [filter])

  // Apply filters when search term, event type, or date range changes
  useEffect(() => {
    if(allActivities.length === 0) return
    let filtered = [...allActivities]

    // Apply search filter
    if(searchTerm){
      const lowerSearchTerm = searchTerm.toLowerCase()
      filtered = filtered.filter(activity => 
        (activity.user?.name?.toLowerCase().includes(lowerSearchTerm) || 
        activity.user?.email?.toLowerCase().includes(lowerSearchTerm) ||
        activity.description?.toLowerCase().includes(lowerSearchTerm))
      )
    }

    // Apply event type filter
    if(eventTypeFilter !== "all"){
      filtered = filtered.filter(activity => activity.type === eventTypeFilter)
    }

    // Apply date range filter
    if(dateRange.from || dateRange.to){
      filtered = filtered.filter(activity => {
        const acitivityDate = new Date(activity.timestamp)

        if(dateRange.from && dateRange.to){
          return acitivityDate >= dateRange.from && acitivityDate <= dateRange.to
        } else if(dateRange.from){
          return acitivityDate >= dateRange.from
        } else if(dateRange.to){
          return acitivityDate <= dateRange.to
        }
        return true
      })
    }

    setFilteredActivities(filtered)
    setCurrentPage(1)
  }, [searchTerm, eventTypeFilter, dateRange, allActivities])

  const handleViewAll = async () => {
    try{
      const response = await fetch(`/api/admin/activity?filter=${encodeURIComponent(filter)}&limit=100`)
      if(response.ok){
        const data = await response.json()
        const activities = data.activities || []
        setAllActivites(activities)
        setFilteredActivities(activities)
      }
    }catch (error){
      console.error("Error fetching all activites: ", error)
    } finally {
      setIsModalOpen(true)
    }
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
        return "bg-green-100 text-green-800"
      case "login":
        return "bg-blue-100 text-blue-800"
      case "logout":
        return "bg-orange-100 text-orange-800"
      case "signup":
        return "bg-purple-100 text-purple-800"
      case "reset_password":
        return "bg-amber-100 text-amber-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const renderActivityItem = (activity, index) => (
    <div key={index} className="flex items-start space-x-3 mb-4">
      <Avatar className="h-9 w-9 border border-gray-200">
        <AvatarFallback className="bg-gray-100 text-gray-600">
          {activity.user?.role === "Admin" ? (
            <User className="h-4 w-4" />
          ) : (
            activity.user?.name?.[0] || activity.user?.email?.[0] || "U"
          )}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-1.5">
        <div className="flex items-baseline">
          <p className="text-sm font-medium">{activity.user?.name || activity.user?.email}</p>
          <span className="ml-auto text-xs text-gray-500">{activity.timeAgo}</span>
        </div>
        <div className="flex flex-col space-y-1">
          <div 
            className={
              `inline-flex self-start rounded-2xl rounded-tl-none px-3 py-2 text-sm 
              ${getActivityTypeColor(activity.type)}`
            }
          >
            {getActivityTypeLabel(activity.type)}: {activity.status}
          </div>
          <div className="inline-flex self-start bg-gray-100 rounded-2xl rounded-tl-none px-3 py-2 text-sm max-w-[90%">
            {activity.description}
          </div>
        </div>
      </div>
    </div>
  )

  // Calculate Pagination
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredActivities.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredActivities.length / itemsPerPage)

  const paginate = (pageNumber) => {
    if(pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber)
    }
  }

  return (
    <>
      <Card className="bg-white border-none shadow-sm">
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
                      className="text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                      View All Activities
                      <ChevronDown className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No recent activity</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle>All Activity</DialogTitle>
            <div className="flex items-center space-x-2 w-full max-w-md mx-auto">
              <div className="relative w-full">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search by name or message..."
                  className="pl-9 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Event Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  <SelectItem value="login">Login</SelectItem>
                  <SelectItem value="logout">Logout</SelectItem>
                  <SelectItem value="signup">Sign Up</SelectItem>
                  <SelectItem value="task_completed">Task Completed</SelectItem>
                  <SelectItem value="reset_password">Reset Password</SelectItem>
                </SelectContent>
              </Select>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <span>
                          {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d")}
                        </span>
                      ) : (
                        <span>{format(dateRange.from, "MMM d")} -</span>
                      )
                    ) : (
                      <span>Date Range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <CalendarComponent
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    initialFocus
                  />
                  <div className="flex items-center justify-between p-3 border-t">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setDateRange({ from: undefined, to: undefined })}
                    >
                      Clear
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={() => document.body.click()}
                    >
                      Apply
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </DialogHeader>
          
          <div className="mt-4">
            <ScrollArea className="h-[55vh] pr-4">
              {currentItems.length > 0 ? (
                <div className="space-y-3">
                  {currentItems.map((activity, index) => renderActivityItem(activity, index))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No activities found</p>
                </div>
              )}
            </ScrollArea>
            
            {/* Pagination */}
            {filteredActivities.length > 0 && (
              <div className="flex items-center justify-between border-t pt-4 mt-4">
                <div className="text-sm text-gray-500">
                  Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredActivities.length)} of {filteredActivities.length} activities
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="sr-only">Previous</span>
                  </Button>
                  <div className="flex items-center">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      // Show pages around current page
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={i}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          className="w-8 h-8 p-0 mx-1"
                          onClick={() => paginate(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                    <span className="sr-only">Next</span>
                  </Button>
                </div>
                <Select 
                  value={itemsPerPage.toString()} 
                  onValueChange={(value) => {
                    setItemsPerPage(Number(value))
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className="w-[110px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 per page</SelectItem>
                    <SelectItem value="10">10 per page</SelectItem>
                    <SelectItem value="20">20 per page</SelectItem>
                    <SelectItem value="50">50 per page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
