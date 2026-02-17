"use client"

import { useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@components/ui/dialog"
import { Button } from "@components/ui/button"
import { Badge } from "@components/ui/badge"
import { ScrollArea } from "@components/ui/scroll-area"
import { Separator } from "@components/ui/separator"
import { AlertCircle, FileText, Calendar } from "lucide-react"

/**
 * Format a date string for display
 */
function formatDate(dateString) {
  if (!dateString) return "—"
  try {
    const d = new Date(dateString)
    if (Number.isNaN(d.getTime())) return "—"
    return d.toLocaleDateString("en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  } catch {
    return "—"
  }
}

/**
 * AppraisalQuestionsViewer - A read-only modal to view pre-appraisal questions from history
 * 
 * @param {Object} props
 * @param {boolean} props.open - Whether the modal is open
 * @param {function} props.onOpenChange - Callback when open state changes
 * @param {Object|null} props.questions - The questions JSON object (or null if missing)
 * @param {string} props.appraisalDate - The appraisal date ISO string
 * @param {number|string} props.year - The appraisal year for display
 */
export default function AppraisalQuestionsViewer({
  open,
  onOpenChange,
  questions,
  appraisalDate,
  year
}) {
  // Parse and validate questions
  const { isValid, parsedQuestions, error, roleKey, questionCount } = useMemo(() => {
    if (!questions) {
      return {
        isValid: false,
        parsedQuestions: [],
        error: "No questions were recorded for this appraisal",
        roleKey: null,
        questionCount: 0
      }
    }

    let data = questions
    // Handle if it's a string
    if (typeof questions === "string") {
      try {
        data = JSON.parse(questions)
      } catch {
        return {
          isValid: false,
          parsedQuestions: [],
          error: "Failed to parse questions data",
          roleKey: null,
          questionCount: 0
        }
      }
    }

    // Validate structure
    if (!data || typeof data !== "object") {
      return {
        isValid: false,
        parsedQuestions: [],
        error: "Invalid questions data format",
        roleKey: null,
        questionCount: 0
      }
    }

    const qArray = Array.isArray(data.questions) ? data.questions : []
    const sorted = [...qArray].sort((a, b) => (a?.order || 0) - (b?.order || 0))

    return {
      isValid: true,
      parsedQuestions: sorted,
      error: null,
      roleKey: data.roleKey || null,
      questionCount: sorted.length
    }
  }, [questions])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Pre-Appraisal Questions
            {year && (
              <Badge variant="secondary" className="font-normal">
                Year {year}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Appraisal Date: {formatDate(appraisalDate)}
            {roleKey && (
              <>
                <span className="text-muted-foreground">•</span>
                <span>Role: {roleKey}</span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <ScrollArea className="flex-1 pr-4 -mr-4">
          {!isValid ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-10 w-10 text-warning mb-3" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Questions may not have been set when this appraisal was created.
              </p>
            </div>
          ) : questionCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileText className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No questions were recorded for this appraisal.</p>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {questionCount} Question{questionCount !== 1 ? "s" : ""}
                </span>
              </div>
              
              <ol className="space-y-3">
                {parsedQuestions.map((q, idx) => (
                  <li
                    key={idx}
                    className="flex gap-3 p-3 rounded-lg border bg-muted/30"
                  >
                    <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-medium shrink-0">
                      {q?.order || idx + 1}
                    </span>
                    <p className="text-sm leading-relaxed pt-0.5">
                      {q?.text || <span className="text-muted-foreground italic">Empty question</span>}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </ScrollArea>

        <Separator />

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={() => onOpenChange?.(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
