"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@components/ui/card"
import { Button } from "@components/ui/button"
import { Avatar, AvatarFallback } from "@components/ui/avatar"
import { Badge } from "@components/ui/badge"
import { RefreshCw, Filter } from "lucide-react"
import { Skeleton } from "@components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@components/ui/dropdown-menu"

export function ActivityFeed() {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all") // all, user, admin

  const fetchActivities = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/activities?filter=${filter}`)
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

  useEffect(() => {
    fetchActivities()
  }, [filter])

  const getActivityIcon = (type) => {
    switch (type) {
      case "task_completed":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Task Completed
          </Badge>
        )
      case "login":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Login
          </Badge>
        )
      case "signup":
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            Sign Up
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            Activity
          </Badge>
        )
    }
  }

  return (
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
          <Button variant="outline" size="sm" className="h-8" onClick={fetchActivities}>
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="sr-only">Refresh</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start space-x-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {activities.map((activity, index) => (
              <div key={index} className="flex items-start space-x-4 p-4">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>{activity.user?.name?.[0] || activity.user?.email?.[0] || "U"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{activity.user?.name || activity.user?.email}</p>
                    <span className="text-xs text-gray-500">{activity.timeAgo}</span>
                  </div>
                  <p className="text-sm text-gray-500">{activity.description}</p>
                  <div className="pt-1">{getActivityIcon(activity.type)}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center">
            <p className="text-gray-500">No recent activity</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
