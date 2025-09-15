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
import { toast } from "sonner"

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
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const [clearSessionData, setClearSessionData] = useState(null)

  const handleSuccess = useCallback(
    async (data) => {
      try {
        // For bulk mode, call the bulk-create API
        if (currentMode === "bulk") {
          
          const response = await fetch("/api/admin/tasks/bulk-create", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ resources: data }),
          })

          const result = await response.json()

          if (!response.ok) {
            throw new Error(result.error || "Failed to create resources")
          }

          // Show success message
          toast.success(
            <div>
              <div className="font-semibold">Success</div>
              <div className="text-sm opacity-80">{result.message}</div>
            </div>,
          )

          // Note: Session clearing is now handled by BulkCreateResourcesForm component
        }

        // Close dialog after successful API call
        if (onOpenChange) {
          onOpenChange(false)
        }
      } catch (error) {
        console.error("Error creating resources:", error)
        toast.error(
          <div>
            <div className="font-semibold">Error</div>
            <div className="text-sm opacity-80">
              {error instanceof Error ? error.message : "An unexpected error occurred"}
            </div>
          </div>,
        )
        // Don't close dialog on error
      }
    },
    [onOpenChange, currentMode],
  )

  const handleCancel = useCallback(() => {
    if (onOpenChange) {
      onOpenChange(false)
    }
  }, [onOpenChange])

  const handleAutoSaveStateChange = useCallback((saving) => {
    setIsAutoSaving(saving)
  }, [])

  const handleClearSession = useCallback((clearFn) => {
    setClearSessionData(() => clearFn)
  }, [])

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
        // Prevent closing if auto-saving is in progress
        if (isAutoSaving) {
          return
        }
        // Ensure proper cleanup when closing
        setCurrentMode("single")
      }
      if (onOpenChange) {
        onOpenChange(newOpen)
      }
    },
    [onOpenChange, isAutoSaving],
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
        className={currentMode === "bulk" ? "sm:max-w-[900px] max-h-[98vh]" : "sm:max-w-[500px]"}
      >
        {currentMode === "bulk" && (
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
        )}
        
        {currentMode === "single" && (
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
        )}
        {currentMode === "single" ? (
          <CreateTaskForm
            onSuccess={handleSuccess}
            onCancel={handleCancel}
            resourcesOnly={currentMode === "single" && showModeToggle}
          />
        ) : (
          <BulkCreateResourcesForm 
            onSuccess={handleSuccess} 
            onCancel={handleCancel} 
            onAutoSaveStateChange={handleAutoSaveStateChange}
            onClearSession={handleClearSession}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
