"use client"

import { motion } from "framer-motion"
import { CheckCircle, AlertCircle, Info, Clock } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@components/ui/card"
import { Button } from "@components/ui/button"
import { Badge } from "@components/ui/badge"

// Demo data
const notifications = [
  {
    id: 1,
    type: "alert",
    message: "Sarah Chen's security access pending approval",
    time: "10 minutes ago",
  },
  {
    id: 2,
    type: "info",
    message: "Equipment setup completed for Michael Rodriguez",
    time: "1 hour ago",
  },
  {
    id: 3,
    type: "success",
    message: "Alex Johnson completed all required training",
    time: "3 hours ago",
  },
  {
    id: 4,
    type: "reminder",
    message: "Team introduction for James Wilson tomorrow",
    time: "5 hours ago",
  },
]

const typeIcons = {
  alert: AlertCircle,
  info: Info,
  success: CheckCircle,
  reminder: Clock,
}

const typeStyles = {
  alert: "text-red-500 bg-red-100 dark:bg-red-900/20",
  info: "text-blue-500 bg-blue-100 dark:bg-blue-900/20",
  success: "text-green-500 bg-green-100 dark:bg-green-900/20",
  reminder: "text-amber-500 bg-amber-100 dark:bg-amber-900/20",
}

export function NotificationCenter() {
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
                4 new
              </Badge>
            </div>
            <Button variant="ghost" size="sm">
              Mark all as read
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {notifications.map((notification, index) => {
              const Icon = typeIcons[notification.type]

              return (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  className="flex items-start p-3 rounded-lg border hover:shadow-sm transition-shadow cursor-pointer"
                >
                  <div className={`p-2 rounded-full ${typeStyles[notification.type]} mr-3`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{notification.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{notification.time}</p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
