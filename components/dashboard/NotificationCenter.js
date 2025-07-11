"use client"

import { useCallback, useRef, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle, AlertCircle, Info, Clock, Check, Bell } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import useNotifications from "@/hooks/useNotifications"

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
  Critical: "text-red-500 bg-red-100 dark:bg-red-900/20",
  Info: "text-blue-500 bg-blue-100 dark:bg-blue-900/20",
  Success: "text-green-500 bg-green-100 dark:bg-green-900/20",
  Warning: "text-amber-500 bg-amber-100 dark:bg-amber-900/20",
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.8 }}
    >
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
                {isRefreshing && <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />}
              </CardTitle>
              {unreadCount > 0 && (
                <Badge className="bg-blue-500 hover:bg-blue-600 text-white" variant="default">
                  {unreadCount} new
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={loading || unreadCount === 0}
              className="text-sm"
            >
              Mark all as read
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
            <div className="text-red-500 text-center py-8">{error}</div>
          ) : notifications.length === 0 ? (
            <div className="text-muted-foreground text-center py-8 flex flex-col items-center gap-2">
              <Bell className="h-8 w-8 opacity-50" />
              <span>No notifications</span>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto notification-container">
              <AnimatePresence mode="popLayout">
                {notifications.map((notification) => {
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
                              marginBottom: 0,
                              backgroundColor: "rgba(59, 130, 246, 0.1)", // Blue glow for new notifications
                            }
                          : false
                      }
                      animate={{
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        height: "auto",
                        marginBottom: 12,
                        backgroundColor: "transparent",
                      }}
                      exit={{
                        opacity: 0,
                        x: -20,
                        scale: 0.95,
                        height: 0,
                        marginBottom: 0,
                      }}
                      transition={{
                        duration: isNew ? 0.6 : 0.4, // Longer animation for new notifications
                        type: "spring",
                        stiffness: isNew ? 300 : 400, // Softer spring for new notifications
                        damping: isNew ? 20 : 25,
                        layout: { duration: 0.3 },
                        backgroundColor: { duration: 1.5, delay: 0.3 }, // Fade out the glow
                      }}
                      whileHover={{ scale: 1.01 }}
                      className={`
            relative flex items-start p-4 rounded-lg border transition-all duration-200
            ${
              isUnread
                ? "border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20 shadow-sm hover:shadow-md"
                : "opacity-70 hover:opacity-90 hover:shadow-sm"
            }
            ${notification.actionUrl ? "cursor-pointer" : ""}
            ${isNew ? "ring-2 ring-blue-500/20 ring-offset-2 ring-offset-background" : ""}
          `}
                      onClick={() => handleNotificationClick(notification)}
                    >
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
                          className={`absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full ${isNew ? "animate-pulse" : ""}`}
                        />
                      )}

                      {/* Icon */}
                      <div className={`p-2 rounded-full ${style} mr-3 flex-shrink-0`}>
                        <Icon className="h-4 w-4" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pr-10">
                        <p className={`text-sm ${isUnread ? "font-semibold" : "font-medium"}`}>
                          {notification.title || notification.body}
                        </p>
                        {notification.title && notification.body && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{notification.body}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {notification.createdAt
                            ? formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })
                            : ""}
                        </p>
                      </div>

                      {/* Mark as read button - only show for unread notifications */}
                      {isUnread && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-6 h-8 w-8 p-0 opacity-80 hover:opacity-100 transition-opacity bg-background/60 hover:bg-background/90 border border-border/50"
                          onClick={(e) => handleMarkAsRead(e, notification.id)}
                          title="Mark as read"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
