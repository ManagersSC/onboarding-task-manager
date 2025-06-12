"use client"

import { motion } from "framer-motion"
import { CheckCircle, AlertCircle, Info, Clock, Bell, FileText } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@components/ui/card"
import { Button } from "@components/ui/button"
import { Badge } from "@components/ui/badge"
import { Skeleton } from "@components/ui/skeleton"
import { useNotificationData } from "@/hooks/dashboard/useNotificationData"

const typeIcons = {
  "Task Assignment": Bell,
  "Task Completion": CheckCircle,
  "Task Update": Info,
  "Task Deletion": AlertCircle,
  "Document Upload": FileText,
  alert: AlertCircle,
  info: Info,
  success: CheckCircle,
  reminder: Clock,
}

const typeStyles = {
  "Task Assignment": "text-blue-500 bg-blue-100 dark:bg-blue-900/20",
  "Task Completion": "text-green-500 bg-green-100 dark:bg-green-900/20",
  "Task Update": "text-blue-500 bg-blue-100 dark:bg-blue-900/20",
  "Task Deletion": "text-red-500 bg-red-100 dark:bg-red-900/20",
  "Document Upload": "text-amber-500 bg-amber-100 dark:bg-amber-900/20",
  alert: "text-red-500 bg-red-100 dark:bg-red-900/20",
  info: "text-blue-500 bg-blue-100 dark:bg-blue-900/20",
  success: "text-green-500 bg-green-100 dark:bg-green-900/20",
  reminder: "text-amber-500 bg-amber-100 dark:bg-amber-900/20",
}

function formatTime(dateString) {
  const date = new Date(dateString)
  const now = new Date()
  const diff = (now - date) / 1000 // seconds
  if (diff < 60) return "Just now"
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`
  return date.toLocaleString()
}

export function NotificationCenter() {
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAllAsRead,
    markAsRead,
    mutate,
  } = useNotificationData({ limit: 20 })

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.8 }}
    >
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center">
              <CardTitle>Notifications</CardTitle>
              <Badge className="ml-2" variant="secondary">
                {unreadCount} new
              </Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={markAllAsRead} disabled={unreadCount === 0}>
              Mark all as read
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))
            ) : error ? (
              <div className="text-red-500 text-sm">Failed to load notifications.</div>
            ) : notifications.length === 0 ? (
              <div className="text-muted-foreground text-sm">No notifications.</div>
            ) : (
              notifications.map((notification, index) => {
                const Icon = typeIcons[notification.type] || Info
                const style = typeStyles[notification.type] || "text-blue-500 bg-blue-100 dark:bg-blue-900/20"
                return (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    whileHover={{ scale: 1.02 }}
                    className={`flex items-start p-3 rounded-lg border hover:shadow-sm transition-shadow cursor-pointer ${!notification.read ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}
                    onClick={() => !notification.read && markAsRead(notification.id)}
                  >
                    <div className={`p-2 rounded-full ${style} mr-3`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!notification.read ? 'font-semibold' : ''}`}>{notification.title || notification.body}</p>
                      <p className="text-xs text-muted-foreground mt-1">{formatTime(notification.createdAt)}</p>
                    </div>
                    {!notification.read && <span className="ml-2 mt-1 h-2 w-2 rounded-full bg-blue-500" />}
                  </motion.div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
