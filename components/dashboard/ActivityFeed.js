"use client"

import { motion } from "framer-motion"
import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@components/ui/card"
import { Button } from "@components/ui/button"
import { Avatar, AvatarFallback } from "@components/ui/avatar"
import { Clock, FileText, UserPlus, CheckCircle, Calendar, MessageSquare, ArrowRight, LogIn, LogOut, KeyRound } from 'lucide-react'
import { Skeleton } from "@components/ui/skeleton"
import { cn } from "@components/lib/utils"
import { listItemWithIndex } from "@components/lib/utils"

export function ActivityFeed({ initialActivities = [] }) {
  const [activities, setActivities] = useState(initialActivities || [])
  const [loading, setLoading] = useState(!initialActivities || initialActivities.length === 0)
  const [hoveredIndex, setHoveredIndex] = useState(null)

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
    if (!initialActivities || initialActivities.length === 0) {
      fetchActivities()
    }
  }, [fetchActivities, initialActivities])

  // Get icon based on activity type
  const getActivityIcon = (type) => {
    switch (type) {
      case "signup":
        return <UserPlus className="h-4 w-4" />
      case "task_completed":
        return <CheckCircle className="h-4 w-4" />
      case "login":
        return <LogIn className="h-4 w-4" />
      case "logout":
        return <LogOut className="h-4 w-4" />
      case "reset_password":
        return <KeyRound className="h-4 w-4" />
      default:
        return <MessageSquare className="h-4 w-4" />
    }
  }

  // Get icon color based on activity type - using semantic colors
  const getActivityIconStyles = (type) => {
    switch (type) {
      case "signup":
        return {
          bg: "bg-success/10",
          text: "text-success",
        }
      case "task_completed":
        return {
          bg: "bg-info/10",
          text: "text-info",
        }
      case "login":
        return {
          bg: "bg-primary/10",
          text: "text-primary",
        }
      case "logout":
        return {
          bg: "bg-muted",
          text: "text-muted-foreground",
        }
      case "reset_password":
        return {
          bg: "bg-warning/10",
          text: "text-warning",
        }
      default:
        return {
          bg: "bg-accent",
          text: "text-accent-foreground",
        }
    }
  }

  // Get action verb based on activity type
  const getActivityAction = (type) => {
    switch (type) {
      case "signup":
        return "joined"
      case "task_completed":
        return "completed"
      case "login":
        return "logged in"
      case "logout":
        return "logged out"
      case "reset_password":
        return "reset password"
      default:
        return "updated"
    }
  }

  // Limit displayed activities to 5
  const displayedActivities = activities.slice(0, 5)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    >
      <Card variant="elevated" className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-title-sm">Recent Activity</CardTitle>
            <Link
              href="/admin/audit-logs"
              aria-label="View all activity (Audit Logs)"
              className="text-body-sm text-primary hover:underline"
            >
              View All
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div>
            {loading ? (
              // Loading skeletons - 5 rows
              <div>
                {Array(5).fill(0).map((_, index) => (
                  <div
                    key={`skeleton-${index}`}
                    className={cn(
                      "flex items-center gap-3 py-3",
                      index !== 4 && "border-b border-border/30"
                    )}
                  >
                    <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                    <div className="flex flex-col flex-1 gap-1.5">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : displayedActivities.length > 0 ? (
              // Activity items - limited to 5
              <div>
                {displayedActivities.map((activity, index) => {
                  const iconStyles = getActivityIconStyles(activity.type)
                  const isLast = index === displayedActivities.length - 1

                  return (
                    <motion.div
                      key={`activity-${index}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      className={cn(
                        "flex items-center gap-3 py-3 -mx-2 px-2 rounded-lg transition-colors",
                        !isLast && "border-b border-border/30",
                        "hover:bg-muted/20"
                      )}
                      onMouseEnter={() => setHoveredIndex(index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    >
                      {/* Icon container - 36x36 */}
                      <div className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                        iconStyles.bg,
                        iconStyles.text
                      )}>
                        {getActivityIcon(activity.type)}
                      </div>

                      {/* Text block */}
                      <div className="flex flex-col flex-1 min-w-0">
                        <p className="text-body-sm">
                          <span className="font-medium">
                            {activity.user?.name || activity.user?.email?.split("@")[0] || "Unknown"}
                          </span>
                          {" "}
                          <span className={cn("font-medium", iconStyles.text)}>
                            {getActivityAction(activity.type)}
                          </span>
                          {activity.description && (
                            <span> {activity.description}</span>
                          )}
                        </p>
                        <p className="text-caption text-muted-foreground">
                          {activity.user?.role || "User"}
                        </p>
                      </div>

                      {/* Right-aligned relative time badge */}
                      <span className="text-caption text-muted-foreground shrink-0">
                        {activity.timeAgo}
                      </span>
                    </motion.div>
                  )
                })}
              </div>
            ) : (
              // Empty state - centered muted icon + text
              <div className="flex flex-col items-center justify-center py-12">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-body-sm text-muted-foreground">No recent activity</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
