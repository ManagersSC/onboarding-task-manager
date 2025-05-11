"use client"

import { motion } from "framer-motion"
import { Plus, UserPlus, FileText, Calendar, Mail } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@components/ui/card"
import { Button } from "@components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@components/ui/dropdown-menu"

const actions = [
  {
    icon: UserPlus,
    label: "Add New Hire",
    description: "Create a new onboarding process",
    color: "text-blue-500 bg-blue-100 dark:bg-blue-900/20",
  },
  {
    icon: FileText,
    label: "Create Template",
    description: "Design a new task template",
    color: "text-purple-500 bg-purple-100 dark:bg-purple-900/20",
  },
  {
    icon: Calendar,
    label: "Schedule Event",
    description: "Plan an onboarding activity",
    color: "text-amber-500 bg-amber-100 dark:bg-amber-900/20",
  },
  {
    icon: Mail,
    label: "Send Update",
    description: "Notify team of progress",
    color: "text-green-500 bg-green-100 dark:bg-green-900/20",
  },
]

export function QuickActions() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.7 }}
    >
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Quick Actions</CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="gap-1">
                  <Plus className="h-4 w-4" />
                  Create New
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>New Onboarding</DropdownMenuItem>
                <DropdownMenuItem>New Task</DropdownMenuItem>
                <DropdownMenuItem>New Template</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {actions.map((action, index) => (
              <motion.div
                key={action.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                whileHover={{ scale: 1.03 }}
                className="flex flex-col items-center p-4 rounded-lg border bg-card hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className={`p-3 rounded-full ${action.color} mb-3`}>
                  <action.icon className="h-5 w-5" />
                </div>
                <h4 className="text-sm font-medium">{action.label}</h4>
                <p className="text-xs text-muted-foreground text-center mt-1">{action.description}</p>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
