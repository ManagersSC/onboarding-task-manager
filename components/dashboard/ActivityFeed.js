"use client"

import { motion } from "framer-motion"
import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@components/ui/card"
import { Button } from "@components/ui/button"
import { Avatar, AvatarFallback } from "@components/ui/avatar"
import { Clock, FileText, UserPlus, CheckCircle, Calendar, MessageSquare } from 'lucide-react'
import { Skeleton } from "@components/ui/skeleton"

export function ActivityFeed() {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)

  // Fetch activities
  const fetchActivities = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/dashboard-activity?limit=15`)
      if (response.ok) {
        const data = await response.json()
        setActivities(data.activities || [])
      }
    } catch (error) {
      console.error("Error fetching activities:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchActivities()
  }, [fetchActivities])

  // Get icon based on activity type
  const getActivityIcon = (type) => {
    switch (type) {
      case "signup":
        return <UserPlus className="h-5 w-5" />
      case "task_completed":
        return <CheckCircle className="h-5 w-5" />
      case "login":
      case "logout":
        return <UserPlus className="h-5 w-5" />
      case "reset_password":
        return <FileText className="h-5 w-5" />
      default:
        return <MessageSquare className="h-5 w-5" />
    }
  }

  // Get icon color based on activity type
  const getActivityIconColor = (type) => {
    switch (type) {
      case "signup":
        return "text-green-500 bg-green-100 dark:bg-green-900/20"
      case "task_completed":
        return "text-blue-500 bg-blue-100 dark:bg-blue-900/20"
      case "login":
      case "logout":
        return "text-purple-500 bg-purple-100 dark:bg-purple-900/20"
      case "reset_password":
        return "text-amber-500 bg-amber-100 dark:bg-amber-900/20"
      default:
        return "text-indigo-500 bg-indigo-100 dark:bg-indigo-900/20"
    }
  }

  // Get action verb based on activity type
  const getActivityAction = (type) => {
    switch (type) {
      case "signup":
        return "added"
      case "task_completed":
        return "completed"
      case "login":
        return "logged in"
      case "logout":
        return "logged out"
      case "reset_password":
        return "reset"
      default:
        return "updated"
    }
  }

  // Limit displayed activities to 6
  const displayedActivities = activities.slice(0, 6)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.9 }}
    >
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Recent Activity</CardTitle>
            <Button variant="ghost" size="sm" className="gap-1">
              <Clock className="h-4 w-4" />
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <div className="absolute top-0 bottom-0 left-6 border-l border-dashed border-muted-foreground/20" />
            <div className="space-y-6">
              {loading ? (
                // Loading skeletons - limit to 6
                Array(6).fill(0).map((_, index) => (
                  <motion.div
                    key={`skeleton-${index}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="relative flex gap-3"
                  >
                    <Skeleton className="z-10 h-12 w-12 rounded-full" />
                    <div className="flex flex-col w-full">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-32" />
                      </div>
                      <Skeleton className="h-4 w-3/4 mt-2" />
                      <Skeleton className="h-3 w-20 mt-1" />
                    </div>
                  </motion.div>
                ))
              ) : displayedActivities.length > 0 ? (
                // Activity items - limited to 6
                displayedActivities.map((activity, index) => (
                  <motion.div
                    key={`activity-${index}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="relative flex gap-3"
                  >
                    <div
                      className={`z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${getActivityIconColor(activity.type)}`}
                    >
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback>
                            {activity.user?.name
                              ? activity.user.name.split(" ").map((n) => n[0]).join("")
                              : activity.user?.email?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm">{activity.user?.name || activity.user?.email?.split("@")[0] || "Unknown"}</span>
                        <span className="text-xs text-muted-foreground">({activity.user?.role || "User"})</span>
                      </div>
                      <p className="text-sm mt-1">
                        <span className="font-medium">{getActivityAction(activity.type)}</span> {activity.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{activity.timeAgo}</p>
                    </div>
                  </motion.div>
                ))
              ) : (
                // No activities
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No recent activity</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}