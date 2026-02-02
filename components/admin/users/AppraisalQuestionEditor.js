"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@components/ui/alert-dialog"
import { Button } from "@components/ui/button"
import { Textarea } from "@components/ui/textarea"
import { Label } from "@components/ui/label"
import { Badge } from "@components/ui/badge"
import { Separator } from "@components/ui/separator"
import { ScrollArea } from "@components/ui/scroll-area"
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Save,
  X,
  AlertCircle,
  Loader2,
  GripVertical
} from "lucide-react"
import { toast } from "sonner"

/**
 * AppraisalQuestionEditor - A modal component for editing pre-appraisal questions
 * 
 * @param {Object} props
 * @param {boolean} props.open - Whether the modal is open
 * @param {function} props.onOpenChange - Callback when open state changes
 * @param {Array} props.questions - Initial questions array [{order, text}, ...]
 * @param {string} props.roleKey - The role/job key for display
 * @param {boolean} props.isTemplate - If true, editing job template; if false, editing applicant override
 * @param {function} props.onSave - Async callback with normalized questions array
 * @param {function} props.onReset - Async callback to reset to template (override mode only)
 * @param {boolean} props.loading - External loading state
 * @param {string} props.error - External error message
 */
export default function AppraisalQuestionEditor({
  open,
  onOpenChange,
  questions: initialQuestions = [],
  roleKey = "unknown",
  isTemplate = false,
  onSave,
  onReset,
  loading: externalLoading = false,
  error: externalError = null
}) {
  // Local state for questions being edited
  const [questions, setQuestions] = useState([])
  const [saving, setSaving] = useState(false)
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
  const [deleteConfirmIdx, setDeleteConfirmIdx] = useState(null)

  // Initialize questions when modal opens or initial data changes
  useEffect(() => {
    if (open) {
      const normalized = Array.isArray(initialQuestions)
        ? initialQuestions.map((q, idx) => ({
            order: idx + 1,
            text: String(q?.text || "").trim()
          }))
        : []
      setQuestions(normalized)
    }
  }, [open, initialQuestions])

  // Check if there are unsaved changes
  const isDirty = useMemo(() => {
    if (questions.length !== initialQuestions?.length) return true
    return questions.some((q, idx) => {
      const orig = initialQuestions[idx]
      return q.text !== (orig?.text || "").trim()
    })
  }, [questions, initialQuestions])

  // Validation
  const validation = useMemo(() => {
    const errors = []
    const emptyCount = questions.filter(q => !q.text.trim()).length
    if (emptyCount > 0) {
      errors.push(`${emptyCount} empty question${emptyCount > 1 ? "s" : ""} will be removed on save`)
    }
    const nonEmpty = questions.filter(q => q.text.trim())
    if (nonEmpty.length === 0) {
      errors.push("At least one question is recommended")
    }
    return {
      canSave: true, // Allow saving even with warnings
      warnings: errors
    }
  }, [questions])

  // Handlers
  const handleQuestionTextChange = useCallback((idx, text) => {
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, text } : q))
  }, [])

  const handleAddQuestion = useCallback(() => {
    setQuestions(prev => [
      ...prev,
      { order: prev.length + 1, text: "" }
    ])
  }, [])

  const handleDeleteQuestion = useCallback((idx) => {
    setDeleteConfirmIdx(idx)
  }, [])

  const confirmDeleteQuestion = useCallback(() => {
    if (deleteConfirmIdx !== null) {
      setQuestions(prev => {
        const filtered = prev.filter((_, i) => i !== deleteConfirmIdx)
        // Renumber
        return filtered.map((q, i) => ({ ...q, order: i + 1 }))
      })
      setDeleteConfirmIdx(null)
    }
  }, [deleteConfirmIdx])

  const handleMoveUp = useCallback((idx) => {
    if (idx <= 0) return
    setQuestions(prev => {
      const arr = [...prev]
      const temp = arr[idx]
      arr[idx] = arr[idx - 1]
      arr[idx - 1] = temp
      return arr.map((q, i) => ({ ...q, order: i + 1 }))
    })
  }, [])

  const handleMoveDown = useCallback((idx) => {
    setQuestions(prev => {
      if (idx >= prev.length - 1) return prev
      const arr = [...prev]
      const temp = arr[idx]
      arr[idx] = arr[idx + 1]
      arr[idx + 1] = temp
      return arr.map((q, i) => ({ ...q, order: i + 1 }))
    })
  }, [])

  const handleSave = useCallback(async () => {
    if (!onSave) return
    
    // Filter out empty questions and normalize
    const normalized = questions
      .filter(q => q.text.trim())
      .map((q, idx) => ({ order: idx + 1, text: q.text.trim() }))

    try {
      setSaving(true)
      await onSave(normalized)
      toast.success(isTemplate ? "Template saved" : "Questions saved")
      onOpenChange?.(false)
    } catch (err) {
      toast.error(err?.message || "Failed to save questions")
    } finally {
      setSaving(false)
    }
  }, [questions, onSave, isTemplate, onOpenChange])

  const handleReset = useCallback(async () => {
    if (!onReset) return
    try {
      setSaving(true)
      await onReset()
      toast.success("Reset to template")
      setResetConfirmOpen(false)
    } catch (err) {
      toast.error(err?.message || "Failed to reset to template")
    } finally {
      setSaving(false)
    }
  }, [onReset])

  const handleClose = useCallback(() => {
    if (isDirty && !saving) {
      // Could add unsaved changes warning here
    }
    onOpenChange?.(false)
  }, [isDirty, saving, onOpenChange])

  const isLoading = externalLoading || saving

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!isLoading) onOpenChange?.(v) }}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isTemplate ? "Edit Role Template Questions" : "Edit Pre-Appraisal Questions"}
              {roleKey && roleKey !== "unknown" && (
                <Badge variant="secondary" className="font-normal">
                  {roleKey}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {isTemplate
                ? "Edit the default pre-appraisal questions for this role. Changes will apply to future appraisals only."
                : "Customize the pre-appraisal questions for this applicant. These questions will be sent before the appraisal."
              }
            </DialogDescription>
          </DialogHeader>

          {externalError && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-error-muted text-error text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{externalError}</span>
            </div>
          )}

          {validation.warnings.length > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-warning-muted text-warning text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{validation.warnings.join(". ")}</span>
            </div>
          )}

          <ScrollArea className="flex-1 pr-4 -mr-4">
            <div className="space-y-3 py-2">
              {questions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No questions yet.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={handleAddQuestion}
                    disabled={isLoading}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add First Question
                  </Button>
                </div>
              ) : (
                questions.map((q, idx) => (
                  <div
                    key={idx}
                    className="group relative rounded-lg border bg-card p-3 transition-colors hover:border-primary/20"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex flex-col items-center gap-1 pt-1">
                        <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                        <span className="text-xs font-medium text-muted-foreground w-5 text-center">
                          {idx + 1}
                        </span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <Textarea
                          value={q.text}
                          onChange={(e) => handleQuestionTextChange(idx, e.target.value)}
                          placeholder="Enter question text..."
                          className="min-h-[80px] resize-none"
                          disabled={isLoading}
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleMoveUp(idx)}
                          disabled={idx === 0 || isLoading}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleMoveDown(idx)}
                          disabled={idx === questions.length - 1 || isLoading}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-error hover:text-error/80 hover:bg-error-muted"
                          onClick={() => handleDeleteQuestion(idx)}
                          disabled={isLoading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {questions.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2"
              onClick={handleAddQuestion}
              disabled={isLoading}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Question
            </Button>
          )}

          <Separator className="my-2" />

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {!isTemplate && onReset && (
              <Button
                variant="outline"
                onClick={() => setResetConfirmOpen(true)}
                disabled={isLoading}
                className="sm:mr-auto"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset to Template
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isLoading || !validation.canSave}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              {isTemplate ? "Save Template" : "Save Questions"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmIdx !== null} onOpenChange={(v) => !v && setDeleteConfirmIdx(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Question</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this question? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteQuestion}
              disabled={isLoading}
              className="bg-error hover:bg-error/90 text-error-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset to Template Confirmation Dialog */}
      <AlertDialog open={resetConfirmOpen} onOpenChange={(v) => !isLoading && setResetConfirmOpen(v)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset to Template</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace all custom questions with the default template questions for this role.
              Any changes you've made will be lost. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReset}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : null}
              Reset to Template
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
