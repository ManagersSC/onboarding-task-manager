"use client"

import { useMemo, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@components/ui/dialog"
import { ScrollArea } from "@components/ui/scroll-area"
import { Separator } from "@components/ui/separator"
import { Input } from "@components/ui/input"
import { Badge } from "@components/ui/badge"
import { Button } from "@components/ui/button"
import { Copy, Check, Search } from "lucide-react"

export function QuizSubmissionAnswersModal({ open, onOpenChange, submission, questionsById }) {
  if (!submission) return null
  const answers = submission?.answers || {}
  const rawEntries = Object.entries(answers)
  const total = Number(submission?.totalScore || 0)
  const score = Number(submission?.score || 0)
  const pct = total > 0 ? Math.round((score / total) * 100) : 0

  const [query, setQuery] = useState("")
  const [copiedKey, setCopiedKey] = useState("")

  const entries = useMemo(() => {
    if (!query.trim()) return rawEntries
    const ql = query.toLowerCase()
    return rawEntries.filter(([qid, ans]) => {
      const qText = questionsById?.[qid]?.content || ""
      return String(qText).toLowerCase().includes(ql) || String(ans).toLowerCase().includes(ql)
    })
  }, [rawEntries, query, questionsById])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-lg">
            {submission?.quizTitle || "Quiz Submission"}
          </DialogTitle>
          <DialogDescription className="mt-1">
            {submission?.submittedAt ? new Date(submission.submittedAt).toLocaleString() : "—"}
          </DialogDescription>
        </DialogHeader>

        {/* Summary strip */}
        <div className="mb-3 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Score</div>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant="outline" className={submission?.passed ? "bg-success-muted text-success border-success/20" : "bg-error-muted text-error border-error/20"}>
                {submission?.passed ? "Passed" : "Failed"}
              </Badge>
              <div className="text-sm font-medium">{score} / {total} ({pct}%)</div>
            </div>
            <div className="mt-2 h-2 w-full rounded bg-muted overflow-hidden">
              <div className={`h-full ${submission?.passed ? "bg-success" : "bg-error"}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Questions</div>
            <div className="mt-1 text-sm font-medium">{entries.length} shown / {rawEntries.length} total</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground mb-1">Search</div>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter by question or answer..."
                className="h-8"
              />
            </div>
          </div>
        </div>

        <ScrollArea className="h-[65vh]">
          <div className="space-y-2 pr-2">
            {entries.length === 0 ? (
              <div className="text-sm text-muted-foreground">No matching answers.</div>
            ) : (
              entries.map(([qid, answer], idx) => {
                const q = questionsById?.[qid]?.content || "Question not found"
                const key = `${qid}-${idx}`
                return (
                  <div key={key} className="rounded-md border p-2 sm:p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[11px] text-muted-foreground">Question {idx + 1}</div>
                        <div className="text-sm font-medium leading-5 line-clamp-3">{q}</div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 shrink-0"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(String(answer || ""))
                            setCopiedKey(key)
                            setTimeout(() => setCopiedKey(""), 1500)
                          } catch {}
                        }}
                        title="Copy answer"
                        aria-label="Copy answer"
                      >
                        {copiedKey === key ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                    <Separator className="my-2" />
                    <div>
                      <div className="rounded-md bg-muted/60 p-2 sm:p-3 text-[13px] whitespace-pre-wrap leading-6">
                        {String(answer || "—")}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}


