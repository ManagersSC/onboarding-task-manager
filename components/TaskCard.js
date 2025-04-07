"use client"

import { Check, Clock, ExternalLink, Loader2 } from "lucide-react"
import { Button } from "@components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@components/ui/card"
import { Badge } from "@components/ui/badge"
import { useState } from "react"

export function TaskCard({ task, onComplete }) {
  const [isCompleting, setIsCompleting] = useState(false)

  // Compute status based on task properties if not explicitly provided
  const computedStatus =
    task.status ||
    (task.completed ? "completed" : task.overdue ? "overdue" : "assigned");

  const statusColors = {
    assigned: "bg-blue-50 text-blue-700 border-blue-200",
    overdue: "bg-red-50 text-red-700 border-red-200",
    completed: "bg-green-50 text-green-700 border-green-200",
  }

  const statusIcons = {
    assigned: <Clock className="h-4 w-4" />,
    overdue: <Clock className="h-4 w-4" />,
    completed: <Check className="h-4 w-4" />,
  }

  const handleCompleteClick = async () => {
    setIsCompleting(true);
    try {
      await onComplete(task.id);
    } finally {
      setIsCompleting(false);
    }
  }

  return (
    <Card className="group relative overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="p-4">
        <div className="flex items-start justify-between space-x-4">
          <Badge variant="outline" className={statusColors[computedStatus]}>
            <span className="flex items-center gap-1">
              {statusIcons[computedStatus]}
              {computedStatus.charAt(0).toUpperCase() + computedStatus.slice(1)}
            </span>
          </Badge>
          {task.week && (
            <Badge variant="outline" className="text-gray-600">
              Week {task.week}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <h3 className="font-medium">{task.title}</h3>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <div className="flex items-center justify-between w-full">
          {task.resourceUrl ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-blue-600 hover:text-blue-700"
                onClick={() => window.open(task.resourceUrl, "_blank", "noopener,noreferrer")}
                title={task.resourceUrl}
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                View Resource
              </Button>
            ) : (
              <Button variant="ghost" size="sm" className="text-gray-400 cursor-not-allowed" disabled>
                <ExternalLink className="h-4 w-4 mr-1" />
                No Resource
              </Button>
          )}
          {computedStatus !== "completed" && (
            <Button size="sm" onClick={handleCompleteClick} variant="outline" disabled={isCompleting}>
              {isCompleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Completing...
                </>
              ) : (
                "Complete"
              )}
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
