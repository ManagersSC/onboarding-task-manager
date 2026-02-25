"use client"

import { useCallback, useRef, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle, AlertCircle, Info, Clock, Check, Bell } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import useNotifications from "@/hooks/useNotifications"
import Link from "next/link"

import { Card, CardContent, CardHeader, CardTitle } from "@components/ui/card"
import { Button } from "@components/ui/button"
import { Badge } from "@components/ui/badge"

const typeIcons = {
  Critical: AlertCircle,
  Info: Info,
  Success: CheckCircle,
  Warning: Clock,
}

const typeStyles = {
  Critical: "text-error bg-error-muted",
  Info: "text-info bg-info-muted",
  Success: "text-success bg-success-muted",
  Warning: "text-warning bg-warning-muted",
}

export function NotificationCenter() {
  const router = useRouter()
  const { notifications, loading, isRefreshing, error, unreadCount, markAsRead, markAllAsRead } = useNotifications({
    limit: 20,
  })

  // Track notifications to identify new ones for animation
  const previousNotificationIds = useRef(new Set())
  const [newNotificationIds, setNewNotificationIds] = useState(new Set())
  const previousUnreadCount = useRef(0)

  // Detect new notifications and show toast
  useEffect(() => {
    if (!loading && notifications.length > 0) {
      const currentIds = new Set(notifications.map((n) => n.id))
      const newIds = new Set()

      // Find truly new notifications (not just updated ones)
      currentIds.forEach((id) => {
        if (!previousNotificationIds.current.has(id)) {
          newIds.add(id)
        }
      })

      // Show toast for new unread notifications
      if (newIds.size > 0 && previousNotificationIds.current.size > 0) {
        const newNotifications = notifications.filter((n) => newIds.has(n.id) && !n.read)

        if (newNotifications.length > 0) {
          const message =
            newNotifications.length === 1
              ? `New notification: ${newNotifications[0].title || newNotifications[0].body}`
              : `${newNotifications.length} new notifications received`

          toast.success(message, {
            duration: 4000,
          })
        }
      }

      // Update tracking
      setNewNotificationIds(newIds)
      previousNotificationIds.current = currentIds
      previousUnreadCount.current = unreadCount

      // Clear new notification tracking after animation completes
      if (newIds.size > 0) {
        setTimeout(() => {
          setNewNotificationIds(new Set())
        }, 800)
      }
    }
  }, [notifications, loading, unreadCount])

  const handleNotificationClick = useCallback(
    async (notification) => {
      if (notification.actionUrl) {
        router.push(notification.actionUrl)
      }
    },
    [router],
  )

  const handleMarkAsRead = useCallback(
    async (e, notificationId) => {
      e.stopPropagation()
      try {
        await markAsRead(notificationId)
        toast.success("Notification marked as read")
      } catch (error) {
        toast.error("Failed to mark notification as read")
      }
    },
    [markAsRead],
  )

  const handleMarkAllAsRead = useCallback(async () => {
    if (unreadCount === 0) return

    try {
      await markAllAsRead()
      toast.success("All notifications marked as read")
    } catch (error) {
      toast.error("Failed to mark all notifications as read")
    }
  }, [markAllAsRead, unreadCount])

  const isNewNotification = useCallback((id) => newNotificationIds.has(id), [newNotificationIds])

  // Limit to 4 visible notifications
  const visibleNotifications = notifications.slice(0, 4)
  const hasMore = notifications.length > 4

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.8 }}
    >
      <Card variant="elevated">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-title-sm flex items-center gap-2">
                Notifications
                {isRefreshing && <div className="w-2 h-2 bg-info rounded-full animate-pulse" />}
              </CardTitle>
              {unreadCount > 0 && (
                <Badge variant="info">
                  {unreadCount}
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={loading || unreadCount === 0}
              className="text-body-sm"
            >
              Mark all read
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3 animate-pulse">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded-lg" />
              ))}
            </div>
          ) : error ? (
            <div className="text-error text-center py-8">{error}</div>
          ) : notifications.length === 0 ? (
            <div className="text-muted-foreground text-center py-8 flex flex-col items-center gap-2">
              <Bell className="h-8 w-8 opacity-50" />
              <span className="text-body-sm">No notifications</span>
            </div>
          ) : (
            <>
              <div className="notification-container">
                <AnimatePresence mode="popLayout">
                  {visibleNotifications.map((notification) => {
                    const Icon = typeIcons[notification.severity] || Info
                    const style = typeStyles[notification.severity] || typeStyles.Info
                    const isNew = isNewNotification(notification.id)
                    const isUnread = !notification.read

                    return (
                      <motion.div
                        key={notification.id}
                        layout
                        initial={
                          isNew
                            ? {
                                opacity: 0,
                                y: -30,
                                scale: 0.9,
                                height: 0,
                                backgroundColor: "rgba(59, 130, 246, 0.1)",
                              }
                            : false
                        }
                        animate={{
                          opacity: 1,
                          y: 0,
                          scale: 1,
                          height: "auto",
                          backgroundColor: "transparent",
                        }}
                        exit={{
                          opacity: 0,
                          x: -20,
                          scale: 0.95,
                          height: 0,
                        }}
                        transition={{
                          duration: isNew ? 0.6 : 0.4,
                          type: "spring",
                          stiffness: isNew ? 300 : 400,
                          damping: isNew ? 20 : 25,
                          layout: { duration: 0.3 },
                          backgroundColor: { duration: 1.5, delay: 0.3 },
                        }}
                        className={`
                          group flex items-start gap-3 py-3 border-b border-border/20 last:border-0
                          hover:bg-muted/20 rounded-lg -mx-2 px-2 transition-colors
                          ${notification.actionUrl ? "cursor-pointer" : ""}
                          ${isNew ? "ring-2 ring-info/20 ring-offset-2 ring-offset-background" : ""}
                        `}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        {/* Icon container - 32x32 rounded-lg */}
                        <div className={`w-8 h-8 rounded-lg ${style} flex items-center justify-center flex-shrink-0`}>
                          <Icon className="h-4 w-4" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-body-sm font-medium ${!isUnread ? "opacity-70" : ""}`}>
                            {notification.title || notification.body}
                          </p>
                          {notification.title && notification.body && (
                            <p className="text-caption text-muted-foreground mt-0.5 line-clamp-2">{notification.body}</p>
                          )}
                          <p className="text-caption text-muted-foreground/60 mt-0.5">
                            {notification.createdAt
                              ? formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })
                              : ""}
                          </p>
                        </div>

                        {/* Right side: Mark as read button and unread indicator */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isUnread && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
                              onClick={(e) => handleMarkAsRead(e, notification.id)}
                              title="Mark as read"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          )}
                          {/* Unread indicator dot */}
                          {isUnread && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{
                                scale: 1,
                                ...(isNew && {
                                  boxShadow: [
                                    "0 0 0 0 rgba(59, 130, 246, 0.7)",
                                    "0 0 0 10px rgba(59, 130, 246, 0)",
                                    "0 0 0 0 rgba(59, 130, 246, 0)",
                                  ],
                                }),
                              }}
                              transition={{
                                scale: { duration: 0.3 },
                                boxShadow: isNew
                                  ? {
                                      duration: 2,
                                      repeat: 2,
                                      ease: "easeOut",
                                    }
                                  : {},
                              }}
                              className={`w-2 h-2 rounded-full bg-primary ${isNew ? "animate-pulse" : ""}`}
                            />
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
              {/* View All link */}
              {hasMore && (
                <div className="pt-3 mt-1 border-t border-border/20">
                  <Link
                    href="/dashboard/notifications"
                    className="text-body-sm text-primary hover:text-primary/80 transition-colors font-medium"
                  >
                    View All
                  </Link>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
