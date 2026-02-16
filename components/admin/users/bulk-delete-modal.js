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

export default function BulkDeleteModal({ 
  open, 
  onOpenChange, 
  selectedApplicants = [], 
  onDeleteSuccess 
}) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (selectedApplicants.length === 0) return

    setIsDeleting(true)
    try {
      const response = await fetch('/api/admin/users/bulk-delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          applicantIds: selectedApplicants.map(applicant => applicant.id)
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete applicants')
      }

      if (result.failedCount > 0) {
        toast.warning(
          `Deleted ${result.deletedCount} applicants successfully, but ${result.failedCount} failed to delete.`,
          {
            description: "Some applicants may have dependencies that prevent deletion."
          }
        )
      } else {
        toast.success(
          `Successfully deleted ${result.deletedCount} applicant${result.deletedCount === 1 ? '' : 's'}.`
        )
      }

      onDeleteSuccess?.()
      onOpenChange(false)
    } catch (error) {
      console.error('Error deleting applicants:', error)
      toast.error('Failed to delete applicants', {
        description: error.message
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const selectedNames = selectedApplicants
    .slice(0, 3)
    .map(applicant => applicant.name)
    .join(', ')
  
  const remainingCount = Math.max(0, selectedApplicants.length - 3)

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Delete Selected Applicants
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Are you sure you want to delete <strong>{selectedApplicants.length}</strong> applicant{selectedApplicants.length === 1 ? '' : 's'}?
            </p>
            <p className="text-sm">
              <strong>Selected applicants:</strong>
            </p>
            <div className="text-sm bg-muted p-2 rounded border max-h-32 overflow-y-auto">
              {selectedNames}
              {remainingCount > 0 && (
                <div className="text-muted-foreground">
                  ... and {remainingCount} more
                </div>
              )}
            </div>
            <p className="text-destructive text-sm font-medium">
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
                Delete {selectedApplicants.length} Applicant{selectedApplicants.length === 1 ? '' : 's'}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
