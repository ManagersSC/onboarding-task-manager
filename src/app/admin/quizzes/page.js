"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@components/ui/tabs"
import { Separator } from "@components/ui/separator"
import { Input } from "@components/ui/input"
import { Button } from "@components/ui/button"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@components/ui/select"
import { Popover, PopoverTrigger, PopoverContent } from "@components/ui/popover"
import { CustomCalendar } from "@components/dashboard/subComponents/custom-calendar"
import useSWR from "swr"
import { Loader2, Eye, X, Filter, CheckCircle2, AlertCircle, Calendar as CalendarIcon } from "lucide-react"
import { Badge } from "@components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@components/ui/dialog"
import { ScrollArea } from "@components/ui/scroll-area"
import { motion, AnimatePresence } from "framer-motion"

export default function AdminQuizzesPage() {
  const params = useSearchParams()
  const router = useRouter()
  const tab = params.get("tab") || "submissions"

  const formatIsoToDmy = (iso) => {
    try {
      const [y, m, d] = String(iso).split("-")
      if (!y || !m || !d) return iso
      return `${d}-${m}-${y}`
    } catch {
      return iso
    }
  }

  const initial = useMemo(() => ({
    applicantId: params.get("applicantId") || "",
    quizId: params.get("quizId") || "",
    passed: params.get("passed") || "",
    from: params.get("from") || "",
    to: params.get("to") || "",
    week: params.get("week") || "",
    search: params.get("search") || "",
    minScore: params.get("minScore") || "",
    maxScore: params.get("maxScore") || "",
  }), [params])

  const [filters, setFilters] = useState(initial)
  useEffect(() => { setFilters(initial) }, [initial])

  const applySearch = (value) => {
    const usp = new URLSearchParams(params.toString())
    if (value) usp.set("search", value)
    else usp.delete("search")
    router.push(`/admin/quizzes?${usp.toString()}`)
  }

  const applyFilters = () => {
    const usp = new URLSearchParams(params.toString())
    Object.entries(filters).forEach(([k, v]) => {
      if (v) usp.set(k, String(v))
      else usp.delete(k)
    })
    usp.set("tab", tab)
    router.push(`/admin/quizzes?${usp.toString()}`)
  }

  const clearFilters = () => {
    const usp = new URLSearchParams(params.toString())
    ;["search","quizId","applicantId","passed","from","to","week","minScore","maxScore"].forEach((k) => usp.delete(k))
    router.push(`/admin/quizzes?${usp.toString()}`)
  }

  const fetcher = async (url) => {
    const res = await fetch(url)
    if (!res.ok) throw new Error("Failed to load submissions")
    return res.json()
  }

  const queryString = useMemo(() => {
    const usp = new URLSearchParams()
    if (filters.applicantId) usp.set("applicantId", filters.applicantId)
    if (filters.quizId) usp.set("quizId", filters.quizId)
    if (filters.passed) usp.set("passed", filters.passed)
    if (filters.from) usp.set("from", filters.from)
    if (filters.to) usp.set("to", filters.to)
    if (filters.week) usp.set("week", filters.week)
    if (filters.search) usp.set("search", filters.search)
    if (filters.minScore) usp.set("minScore", filters.minScore)
    if (filters.maxScore) usp.set("maxScore", filters.maxScore)
    return usp.toString()
  }, [filters])

  const { data, error, isLoading, mutate } = useSWR(
    tab === "submissions" ? `/api/admin/quizzes/submissions${queryString ? `?${queryString}` : ""}` : null,
    fetcher,
    { revalidateOnFocus: true, revalidateOnReconnect: true }
  )

  const submissions = data?.submissions || []
  const questionsById = data?.questionsById || {}
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerSubmission, setViewerSubmission] = useState(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [dateModalOpen, setDateModalOpen] = useState(false)
  const [pickedDate, setPickedDate] = useState(undefined)

  const activeChips = useMemo(() => {
    const chips = []
    if (filters.search) chips.push({ key: "search", label: `Search: ${filters.search}` })
    if (filters.passed) chips.push({ key: "passed", label: filters.passed === "true" ? "Passed" : "Failed" })
    if (filters.from && filters.to && filters.from === filters.to) {
      chips.push({ key: "date", label: `Date: ${formatIsoToDmy(filters.from)}` })
    } else {
      if (filters.from) chips.push({ key: "from", label: `From: ${formatIsoToDmy(filters.from)}` })
      if (filters.to) chips.push({ key: "to", label: `To: ${formatIsoToDmy(filters.to)}` })
    }
    if (filters.week) chips.push({ key: "week", label: `Week: ${filters.week}` })
    return chips
  }, [filters])

  // Helper: update filters and immediately apply to URL
  const setAndApply = (patch) => {
    setFilters((prev) => {
      const next = { ...prev, ...patch }
      const usp = new URLSearchParams(params.toString())
      Object.entries(next).forEach(([k, v]) => {
        if (v) usp.set(k, String(v))
        else usp.delete(k)
      })
      usp.set("tab", tab)
      router.push(`/admin/quizzes?${usp.toString()}`)
      return next
    })
  }

  return (
    <div className="p-5 md:p-6">
      <Tabs value={tab} onValueChange={(v) => {
        const usp = new URLSearchParams(params.toString())
        usp.set("tab", v)
        router.push(`/admin/quizzes?${usp.toString()}`)
      }}>
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Quizzes Admin</h1>
          <TabsList>
            <TabsTrigger value="submissions">Submissions</TabsTrigger>
            <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
          </TabsList>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Input
              className="h-9 w-56 sm:w-72"
              placeholder="Search submissions…"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              onKeyDown={(e) => { if (e.key === "Enter") applyFilters() }}
            />
            <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
              <PopoverTrigger asChild>
                <Button className="h-9" variant="default">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] sm:w-[320px] p-4" align="start">
                <div className="flex items-center justify-end mb-2">
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                    onClick={() => {
                      setPickedDate(undefined)
                      setAndApply({ passed: "", from: "", to: "", week: "" })
                    }}
                  >
                    Clear Filters
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Pass/Fail</div>
                    <Select
                      value={filters.passed || "all"}
                      onValueChange={(v) => setAndApply({ passed: v === "all" ? "" : v })}
                    >
                      <SelectTrigger className="h-9"><SelectValue placeholder="Pass/Fail" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="true">Passed</SelectItem>
                        <SelectItem value="false">Failed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Submission Date</div>
                    <div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => setDateModalOpen(true)}
                      >
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        Pick date
                      </Button>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-2">Week</div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[1,2,3,4,5].map((w) => (
                        <Button
                          key={w}
                          size="sm"
                          variant={String(filters.week) === String(w) ? "default" : "outline"}
                          className="h-8 w-10 p-0"
                          onClick={() => setAndApply({ week: String(w) })}
                        >
                          {w}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div />
        </div>
        <Separator className="my-3" />

        <TabsContent value="submissions" className="mt-4">
          <AnimatePresence initial={false}>
              {activeChips.length > 0 && (
                <motion.div
                  className="mt-3 flex flex-wrap items-center gap-2"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                >
                  {activeChips.map((c) => (
                    <motion.button
                      key={c.key}
                      onClick={() => {
                        if (c.key === "date") {
                          setFilters((f) => ({ ...f, from: "", to: "" }))
                          setPickedDate(undefined)
                        } else {
                          setFilters((f) => ({ ...f, [c.key]: "" }))
                        }
                      }}
                      className="text-xs rounded-full border px-2 py-1 hover:bg-muted transition"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                      title="Remove filter"
                    >
                      <span>{c.label}</span>
                      <X className="inline-block ml-1 h-3 w-3 align-[-2px]" />
                    </motion.button>
                  ))}
                </motion.div>
              )}
          </AnimatePresence>

          <div className="rounded-md border overflow-hidden">
            {error ? (
              <div className="p-4 text-sm text-destructive">Failed to load submissions.</div>
            ) : isLoading ? (
              <div className="p-4">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-16 bg-muted rounded" />
                  <div className="h-16 bg-muted rounded" />
                  <div className="h-16 bg-muted rounded" />
                </div>
              </div>
            ) : submissions.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">No submissions found.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 p-3">
                {submissions.map((s, i) => {
                  const pct = s.totalScore > 0 ? Math.round((s.score / s.totalScore) * 100) : 0
                  const date = s.submittedAt ? new Date(s.submittedAt).toLocaleString() : "—"
                  return (
                    <motion.div
                      key={s.id}
                      className="rounded-lg border p-3 bg-background hover:shadow-sm transition"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.02, 0.2), duration: 0.2 }}
                      whileHover={{ y: -2 }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{s.quizTitle || "Quiz"}</div>
                          <div className="text-xs text-muted-foreground">{date}</div>
                        </div>
                        <Badge variant="outline" className={s.passed ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/20" : "bg-red-500/15 text-red-600 border-red-500/20"}>
                          {s.passed ? "Passed" : "Failed"}
                        </Badge>
                      </div>
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs">
                          <div>Score</div>
                          <div className="font-medium">{s.score} / {s.totalScore} ({pct}%)</div>
                        </div>
                        <div className="mt-1 h-2 w-full rounded bg-muted overflow-hidden">
                          <motion.div
                            className={`h-full ${s.passed ? "bg-emerald-500" : "bg-red-500"}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.4 }}
                          />
                        </div>
                      </div>
                      <div className="mt-3 flex justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8"
                          onClick={() => { setViewerSubmission(s); setViewerOpen(true) }}
                          title="View answers"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>

          <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
              <DialogHeader>
                <DialogTitle className="text-lg">{viewerSubmission?.quizTitle || "Quiz Submission"}</DialogTitle>
                <DialogDescription>
                  {viewerSubmission?.submittedAt ? new Date(viewerSubmission.submittedAt).toLocaleString() : "—"}
                </DialogDescription>
              </DialogHeader>
              <div className="mb-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                <motion.div className="rounded-md border p-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="text-xs text-muted-foreground">Result</div>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="outline" className={viewerSubmission?.passed ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/20" : "bg-red-500/15 text-red-600 border-red-500/20"}>
                      {viewerSubmission?.passed ? "Passed" : "Failed"}
                    </Badge>
                    <div className="text-sm font-medium">
                      {viewerSubmission?.score ?? 0} / {viewerSubmission?.totalScore ?? 0} ({(viewerSubmission?.totalScore ? Math.round((viewerSubmission?.score / viewerSubmission?.totalScore) * 100) : 0)}%)
                    </div>
                  </div>
                  <div className="mt-2 h-2 w-full rounded bg-muted overflow-hidden">
                    <motion.div
                      className={`h-full ${viewerSubmission?.passed ? "bg-emerald-500" : "bg-red-500"}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${(viewerSubmission?.totalScore ? Math.round((viewerSubmission?.score / viewerSubmission?.totalScore) * 100) : 0)}%` }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                </motion.div>
                <motion.div className="rounded-md border p-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="text-xs text-muted-foreground">Respondent</div>
                  <div className="mt-1 text-sm font-medium">{viewerSubmission?.respondentEmail || "—"}</div>
                </motion.div>
                <motion.div className="rounded-md border p-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="text-xs text-muted-foreground">Answers</div>
                  <div className="mt-1 text-sm font-medium">{Object.keys(viewerSubmission?.answers || {}).length}</div>
                </motion.div>
              </div>
              <ScrollArea className="h-[58vh]">
                <div className="space-y-2 pr-2">
                  {Object.entries(viewerSubmission?.answers || {}).map(([qid, ans], i) => {
                    const q = questionsById?.[qid]?.content || "Question not found"
                    const showCheck = typeof ans === "string" ? ans.length > 0 : Array.isArray(ans) ? ans.length > 0 : false
                    return (
                      <motion.div
                        key={`${qid}-${i}`}
                        className="rounded-md border p-3"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-[11px] text-muted-foreground">Question {i + 1}</div>
                            <div className="text-sm font-medium leading-5">{q}</div>
                          </div>
                          {showCheck ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-amber-600" />}
                        </div>
                        <div className="mt-2 rounded-md bg-muted/60 p-2 text-[13px] whitespace-pre-wrap leading-6">
                          {Array.isArray(ans) ? ans.join(", ") : String(ans || "—")}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="quizzes" className="mt-4">
          <div className="rounded-md border p-4 text-sm text-muted-foreground">
            Quizzes manager (list and edit) will go here.
          </div>
        </TabsContent>
      </Tabs>

      {/* Date picker modal (submission date) */}
      <Dialog open={dateModalOpen} onOpenChange={setDateModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Select Submission Date</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md border">
              <CustomCalendar
                selected={pickedDate}
                onSelect={(date) => {
                  if (!date) {
                    setPickedDate(undefined)
                    setFilters((f) => ({ ...f, from: "", to: "" }))
                    return
                  }
                  const y = date.getFullYear()
                  const m = String(date.getMonth() + 1).padStart(2, "0")
                  const day = String(date.getDate()).padStart(2, "0")
                  const iso = `${y}-${m}-${day}`
                  setPickedDate(date)
                  setFilters((f) => ({ ...f, from: iso, to: iso }))
                }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setPickedDate(undefined)
                  setFilters((f) => ({ ...f, from: "", to: "" }))
                  setDateModalOpen(false)
                }}
              >
                Clear
              </Button>
              <Button
                onClick={() => {
                  setDateModalOpen(false)
                  applyFilters()
                }}
              >
                Apply
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}


