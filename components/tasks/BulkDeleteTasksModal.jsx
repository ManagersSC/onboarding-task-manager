"use client"

import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@components/ui/alert-dialog"
import { Button } from "@components/ui/button"
import { Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"

export default function BulkDeleteTasksModal({
  open,
  onOpenChange,
  selectedTasks = [],
  deleteEndpoint = '/api/admin/tasks/bulk-delete',
  onDeleteSuccess
}) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (selectedTasks.length === 0) return

    setIsDeleting(true)
    try {
      const response = await fetch(deleteEndpoint, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskIds: selectedTasks.map(task => task.id)
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete tasks')
      }

      if (result.failedCount > 0) {
        toast.warning(
          `Deleted ${result.deletedCount} tasks successfully, but ${result.failedCount} failed to delete.`,
          {
            description: "Some tasks may have dependencies that prevent deletion."
          }
        )
      } else {
        toast.success(
          result.testMode 
            ? `TEST MODE: Would delete ${result.deletedCount} task${result.deletedCount === 1 ? '' : 's'}.`
            : `Successfully deleted ${result.deletedCount} task${result.deletedCount === 1 ? '' : 's'}.`
        )
      }

      onDeleteSuccess?.()
      onOpenChange(false)
    } catch (error) {
      console.error('Error deleting tasks:', error)
      toast.error('Failed to delete tasks', {
        description: error.message
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Format task titles with comma and new line separation
  const formatTaskTitles = (tasks) => {
    return tasks
      .map(task => task.title)
      .join(',\n')
  }

  const taskTitles = formatTaskTitles(selectedTasks)
  const remainingCount = Math.max(0, selectedTasks.length - 10) // Show first 10, then "and X more"

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-error" />
            Delete Selected Tasks
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Are you sure you want to delete <strong>{selectedTasks.length}</strong> task{selectedTasks.length === 1 ? '' : 's'}?
            </p>
            <p className="text-sm">
              <strong>Selected tasks:</strong>
            </p>
            <div className="text-sm bg-muted p-3 rounded border max-h-40 overflow-y-auto">
              <pre className="whitespace-pre-wrap font-sans">
                {selectedTasks.slice(0, 10).map(task => task.title).join(',\n')}
                {remainingCount > 0 && (
                  <span className="text-muted-foreground">
                    {remainingCount > 0 && ',\n... and ' + remainingCount + ' more'}
                  </span>
                )}
              </pre>
            </div>
            <p className="text-error text-sm font-medium">
              This action cannot be undone. All associated data will be permanently deleted.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete {selectedTasks.length} Task{selectedTasks.length === 1 ? '' : 's'}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
