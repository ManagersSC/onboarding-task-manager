"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@components/ui/card"
import { Button } from "@components/ui/button"
import { Avatar, AvatarFallback } from "@components/ui/avatar"
import { RefreshCw, Filter, User, ExternalLink } from "lucide-react"
import { Skeleton } from "@components/ui/skeleton"
import { ScrollArea } from "@components/ui/scroll-area"
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@components/ui/dropdown-menu"

export function ActivityFeed() {
  const router = useRouter()
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")

  // Fetch activities for the main feed (limited to 15)
  const fetchActivities = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/dashboard-activity?filter=${encodeURIComponent(filter)}&limit=15`)
      if (response.ok) {
        const data = await response.json()
        setActivities(data.activities || [])
      }
    } catch (error) {
      console.error("Error fetching activities:", error)
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch for main feed
  useEffect(() => {
    fetchActivities()
  }, [filter])

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
      case "task_created":
        return "Task Created"
      case "task_assigned":
        return "Task Assigned"
      case "user":
        return "User"
      case "server":
        return "Server"
      default:
        return type || "Activity"
    }
  }

  const getActivityTypeColor = (type, status) => {
    // Simple color scheme: green for success, red for error
    if (status) {
      if (status.toLowerCase() === "success") {
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
      } else if (status.toLowerCase() === "error") {
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
      }
    }

    // Default color for other statuses
    return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
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
          <div className="flex items-baseline gap-1.5 truncate">
            <p className="text-sm font-medium truncate">
              {activity.user?.name || activity.user?.email?.split("@")[0] || "Unknown"}
            </p>
            {activity.user?.name && activity.user?.email && (
              <span className="text-xs text-muted-foreground truncate">({activity.user.email})</span>
            )}
          </div>
          <span className="ml-auto text-xs text-muted-foreground shrink-0">{activity.timeAgo}</span>
        </div>
        <div className="flex flex-col space-y-1">
          <div
            className={`
              inline-flex self-start rounded-2xl rounded-tl-none px-3 py-2 text-sm 
              ${getActivityTypeColor(activity.type, activity.status)}
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

  return (
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
          <Button variant="outline" size="sm" className="h-8" onClick={() => router.push("/admin/activity-logs")}>
            <ExternalLink className="h-3.5 w-3.5 mr-1" />
            <span>View Logs</span>
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
            <div className="space-y-1">{activities.map((activity, index) => renderActivityItem(activity, index))}</div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No recent activity</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
