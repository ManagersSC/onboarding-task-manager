"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@components/ui/dialog"
import { Button } from "@components/ui/button"
import { CreateTaskForm } from "./CreateTaskForm"
import { BulkCreateResourcesForm } from "./BulkCreateResourcesForm"

export function CreateTaskDialog({
  trigger,
  title = "Create New Task",
  description = "Add a new task for users to complete during onboarding.",
  open,
  onOpenChange,
  mode = "single", // "single" or "bulk"
  showModeToggle = false,
}) {
  const [currentMode, setCurrentMode] = useState(mode)

  const handleSuccess = useCallback(
    (data) => {
      // Close dialog immediately without setTimeout to prevent race conditions
      if (onOpenChange) {
        onOpenChange(false)
      }
    },
    [onOpenChange],
  )

  const handleCancel = useCallback(() => {
    if (onOpenChange) {
      onOpenChange(false)
    }
  }, [onOpenChange])

  // Update mode when prop changes
  useEffect(() => {
    setCurrentMode(mode)
  }, [mode])

  useEffect(() => {
    if (!open) {
      // Reset mode to single when dialog closes
      setCurrentMode("single")

      // Enhanced cleanup to prevent interaction issues
      requestAnimationFrame(() => {
        // Remove any lingering focus traps or overlays
        document.body.style.pointerEvents = ""
        document.body.style.overflow = ""

        // Ensure focus is returned to document
        if (document.activeElement && document.activeElement.blur) {
          document.activeElement.blur()
        }
      })
    }
  }, [open])

  const handleOpenChange = useCallback(
    (newOpen) => {
      if (!newOpen) {
        // Ensure proper cleanup when closing
        setCurrentMode("single")
      }
      if (onOpenChange) {
        onOpenChange(newOpen)
      }
    },
    [onOpenChange],
  )

  // Get dynamic title and description based on mode
  const getTitle = () => {
    if (currentMode === "bulk") return "Bulk Create Resources"
    if (showModeToggle) return "Create Resource"
    return title
  }

  const getDescription = () => {
    if (currentMode === "bulk") return "Create multiple resources at once for your onboarding process."
    if (showModeToggle) return "Add a new resource for your onboarding process."
    return description
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        className={currentMode === "bulk" ? "sm:max-w-[800px] max-h-[90vh]" : "sm:max-w-[500px]"}
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>{getTitle()}</DialogTitle>
              <DialogDescription>{getDescription()}</DialogDescription>
            </div>
            {showModeToggle && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={currentMode === "single" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentMode("single")}
                >
                  Single
                </Button>
                <Button
                  type="button"
                  variant={currentMode === "bulk" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentMode("bulk")}
                >
                  Bulk
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>
        {currentMode === "single" ? (
          <CreateTaskForm
            onSuccess={handleSuccess}
            onCancel={handleCancel}
            resourcesOnly={currentMode === "single" && showModeToggle}
          />
        ) : (
          <BulkCreateResourcesForm onSuccess={handleSuccess} onCancel={handleCancel} />
        )}
      </DialogContent>
    </Dialog>
  )
}
