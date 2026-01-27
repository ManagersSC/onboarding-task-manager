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
          ring: "ring-success/20"
        }
      case "task_completed":
        return {
          bg: "bg-info/10",
          text: "text-info",
          ring: "ring-info/20"
        }
      case "login":
        return {
          bg: "bg-primary/10",
          text: "text-primary",
          ring: "ring-primary/20"
        }
      case "logout":
        return {
          bg: "bg-muted",
          text: "text-muted-foreground",
          ring: "ring-border"
        }
      case "reset_password":
        return {
          bg: "bg-warning/10",
          text: "text-warning",
          ring: "ring-warning/20"
        }
      default:
        return {
          bg: "bg-accent",
          text: "text-accent-foreground",
          ring: "ring-accent/30"
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

  // Limit displayed activities to 6
  const displayedActivities = activities.slice(0, 6)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    >
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
            <Button asChild variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
              <Link href="/admin/audit-logs" aria-label="View all activity (Audit Logs)">
                View All
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Timeline connector line */}
            <div className="absolute top-3 bottom-3 left-[19px] w-0.5 bg-gradient-to-b from-border via-border to-transparent" />

            <div className="space-y-1">
              {loading ? (
                // Loading skeletons - limit to 6
                Array(6).fill(0).map((_, index) => (
                  <motion.div
                    key={`skeleton-${index}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    className="relative flex gap-4 py-3"
                  >
                    <Skeleton className="z-10 h-10 w-10 rounded-full shrink-0" />
                    <div className="flex flex-col flex-1 gap-2">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-5 w-5 rounded-full" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-12" />
                      </div>
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </motion.div>
                ))
              ) : displayedActivities.length > 0 ? (
                // Activity items - limited to 6
                displayedActivities.map((activity, index) => {
                  const iconStyles = getActivityIconStyles(activity.type)
                  const isLast = index === displayedActivities.length - 1

                  return (
                    <motion.div
                      key={`activity-${index}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      className={cn(
                        "relative flex gap-4 py-3 px-2 -mx-2 rounded-lg transition-colors duration-base",
                        hoveredIndex === index && "bg-muted/50"
                      )}
                      onMouseEnter={() => setHoveredIndex(index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    >
                      {/* Timeline dot with icon */}
                      <div className={cn(
                        "z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-background transition-all duration-base",
                        iconStyles.bg,
                        iconStyles.text,
                        iconStyles.ring,
                        hoveredIndex === index && "scale-110"
                      )}>
                        {getActivityIcon(activity.type)}
                      </div>

                      {/* Content */}
                      <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-[10px] bg-muted">
                              {activity.user?.name
                                ? activity.user.name.split(" ").map((n) => n[0]).join("")
                                : activity.user?.email?.charAt(0)?.toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-sm truncate">
                            {activity.user?.name || activity.user?.email?.split("@")[0] || "Unknown"}
                          </span>
                          <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-muted rounded">
                            {activity.user?.role || "User"}
                          </span>
                        </div>

                        <p className="text-sm mt-1 text-muted-foreground">
                          <span className={cn("font-medium", iconStyles.text)}>
                            {getActivityAction(activity.type)}
                          </span>
                          {activity.description && (
                            <span className="text-foreground"> {activity.description}</span>
                          )}
                        </p>

                        {/* Timestamp - shows full on hover */}
                        <p className={cn(
                          "text-xs text-muted-foreground/70 mt-1 transition-colors duration-base",
                          hoveredIndex === index && "text-muted-foreground"
                        )}>
                          {activity.timeAgo}
                        </p>
                      </div>
                    </motion.div>
                  )
                })
              ) : (
                // No activities
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">No recent activity</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">Activity will appear here as users interact with the system</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}