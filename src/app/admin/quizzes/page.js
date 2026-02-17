"use client"

import { useEffect, useMemo, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@components/ui/tabs"
import { Separator } from "@components/ui/separator"
import { Input } from "@components/ui/input"
import { Button } from "@components/ui/button"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@components/ui/select"
import { Popover, PopoverTrigger, PopoverContent } from "@components/ui/popover"
import { CustomCalendar } from "@components/dashboard/subComponents/custom-calendar"
import useSWR from "swr"
import { Loader2, Eye, X, Filter, CheckCircle2, AlertCircle, Calendar as CalendarIcon, Plus, Trash2 } from "lucide-react"
import { Badge } from "@components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@components/ui/dialog"
import { ScrollArea } from "@components/ui/scroll-area"
import { motion, AnimatePresence } from "framer-motion"
import useSWRImmutable from "swr/immutable"
import PreviewRenderer from "@components/quiz/preview-renderer"
import RichTextEditor from "@components/editor/rich-text-editor"
import { splitOptionsString, joinOptionsArray } from "@/lib/quiz/options"
import { validateAll } from "@/lib/quiz/validation"
import { RadioGroup, RadioGroupItem } from "@components/ui/radio-group"
import { Checkbox } from "@components/ui/checkbox"
import { Label } from "@components/ui/label"
import { Textarea } from "@components/ui/textarea"
import { toast } from "sonner"

function AdminQuizzesPageContent() {
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

  // Quizzes tab data
  const quizzesFetcher = async (url) => {
    const r = await fetch(url); if (!r.ok) throw new Error("Failed to load quizzes"); return r.json()
  }
  const { data: quizzesData, mutate: refreshQuizzes } = useSWRImmutable(
    tab === "quizzes" ? "/api/admin/quizzes" : null,
    quizzesFetcher
  )
  const quizzes = quizzesData?.quizzes || []
  const [editOpen, setEditOpen] = useState(false)
  const [editQuiz, setEditQuiz] = useState(null)
  const [editQuizDirty, setEditQuizDirty] = useState(false)
  const [editItems, setEditItems] = useState([])
  const [editOriginal, setEditOriginal] = useState({ quiz: null, items: [] })
  const [itemsLoading, setItemsLoading] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [conflictOpen, setConflictOpen] = useState(false)
  const [autoResApplied, setAutoResApplied] = useState(false)
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Create quiz state
  const [createOpen, setCreateOpen] = useState(false)
  const [createQuiz, setCreateQuiz] = useState({ title: "", pageTitle: "", passingScore: "", week: "" })
  const [createItems, setCreateItems] = useState([])
  const [createSaving, setCreateSaving] = useState(false)
  const [createPreviewOpen, setCreatePreviewOpen] = useState(false)

  // Delete quiz state
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Helpers to convert between fraction (0-1) and percent (0-100) displays
  const toPercentDisplay = (value) => {
    const n = Number(value)
    if (!Number.isFinite(n)) return ""
    // Airtable percent fields often come as 0..1; display as 0..100
    const pct = n <= 1 ? n * 100 : n
    return String(Math.round(pct))
  }
  const fromPercentInput = (value) => {
    const clean = String(value ?? "").replace(/[^\d.]/g, "")
    const n = Number(clean)
    if (!Number.isFinite(n)) return null
    // Convert 0..100 to 0..1 for storage; if already 0..1, keep it
    return n > 1 ? n / 100 : n
  }
  const formatPassingScoreLabel = (value) => {
    const n = Number(value)
    if (!Number.isFinite(n)) return "—"
    const pct = n <= 1 ? Math.round(n * 100) : Math.round(n)
    return `${pct}%`
  }

  const openEdit = async (quiz) => {
    setEditQuiz({
      id: quiz.id,
      title: quiz.title,
      pageTitle: quiz.pageTitle || "",
      // Normalize to percent number string for editing (e.g., 60 instead of 0.6)
      passingScore: toPercentDisplay(quiz.passingScore)
    })
    setEditQuizDirty(false)
    setEditItems([])
    setEditOriginal({ quiz, items: [] })
    setEditOpen(true)
    try {
      setItemsLoading(true)
      const r = await fetch(`/api/admin/quizzes/${quiz.id}/items`)
      if (!r.ok) throw new Error("Failed to load items")
      const j = await r.json()
      const items = (j.items || []).map((it) => {
        const optionsArray = splitOptionsString(it.options || it.Options || "")
        const correctAnswerArray = String(it.correctAnswer || "").split("<br>").filter(Boolean)
        // Build UI model: options by value, correct by indices
        const uiOptions = Array.isArray(optionsArray) ? [...optionsArray] : []
        const uiCorrectIndices = []
        if (String(it.type || "").toLowerCase() !== "information") {
          for (const ans of correctAnswerArray) {
            const idx = uiOptions.findIndex((o) => o === ans)
            if (idx >= 0) uiCorrectIndices.push(idx)
          }
        }
        return {
          ...it,
          optionsArray, // keep for compatibility
          correctAnswerArray,
          uiOptions,
          uiCorrectIndices,
          _dirty: false
        }
      })
      setEditItems(items)
      setEditOriginal({ quiz, items: j.items || [] })
    } catch {}
    finally {
      setItemsLoading(false)
    }
  }

  const markItemChange = (index, patch) => {
    setEditItems((prev) => {
      const next = [...prev]
      const prevItem = next[index]
      const updated = { ...prevItem, ...patch }
      const pick = (it) => ({
        type: it?.type || "",
        qType: it?.qType || "",
        content: it?.content || "",
        uiOptions: Array.isArray(it?.uiOptions) ? it.uiOptions : [],
        uiCorrectIndices: Array.isArray(it?.uiCorrectIndices) ? it.uiCorrectIndices : [],
        order: String(it?.order ?? ""),
        points: String(it?.points ?? ""),
      })
      const changed = JSON.stringify(pick(prevItem)) !== JSON.stringify(pick(updated))
      next[index] = { ...updated, _dirty: changed ? true : prevItem._dirty }
      return next
    })
  }
  const markItemChangeById = (id, patch) => {
    setEditItems((prev) => {
      return prev.map((prevItem) => {
        if (prevItem.id !== id) return prevItem
        const updated = { ...prevItem, ...patch }
        const pick = (it) => ({
          type: it?.type || "",
          qType: it?.qType || "",
          content: it?.content || "",
          uiOptions: Array.isArray(it?.uiOptions) ? it.uiOptions : [],
          uiCorrectIndices: Array.isArray(it?.uiCorrectIndices) ? it.uiCorrectIndices : [],
          order: String(it?.order ?? ""),
          points: String(it?.points ?? ""),
        })
        const changed = JSON.stringify(pick(prevItem)) !== JSON.stringify(pick(updated))
        return { ...updated, _dirty: changed ? true : prevItem._dirty }
      })
    })
  }

  // Add a new empty item to the edit modal
  const addEditItem = () => {
    const tempId = `_new_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const maxOrder = editItems.reduce((max, it) => Math.max(max, Number(it.order) || 0), 0)
    setEditItems(prev => [...prev, {
      id: tempId,
      _isNew: true,
      type: "Question",
      qType: "Radio",
      content: "",
      uiOptions: [""],
      uiCorrectIndices: [],
      order: maxOrder + 1,
      points: 1,
      _dirty: true
    }])
  }

  const removeEditItem = (id) => {
    setEditItems(prev => prev.filter(it => it.id !== id))
  }

  // Create quiz helpers
  const openCreateModal = () => {
    setCreateQuiz({ title: "", pageTitle: "", passingScore: "", week: "" })
    setCreateItems([])
    setCreateOpen(true)
  }

  const addCreateItem = () => {
    const tempId = `_new_${Date.now()}_${Math.random().toString(36).slice(2)}`
    setCreateItems(prev => [...prev, {
      _tempId: tempId,
      type: "Question",
      qType: "Radio",
      content: "",
      uiOptions: [""],
      uiCorrectIndices: [],
      order: prev.length + 1,
      points: 1,
    }])
  }

  const removeCreateItem = (tempId) => {
    setCreateItems(prev => prev.filter(it => it._tempId !== tempId))
  }

  const updateCreateItem = (tempId, patch) => {
    setCreateItems(prev => prev.map(it => it._tempId === tempId ? { ...it, ...patch } : it))
  }

  const saveNewQuiz = async () => {
    if (!createQuiz.title.trim()) return false

    const itemsPayload = createItems.map(it => {
      const isInfo = String(it.type || "").toLowerCase() === "information"
      const options = isInfo ? [] : (it.uiOptions || []).filter(o => String(o).trim())
      const correctIndices = isInfo ? [] : (it.uiCorrectIndices || [])
      const correct = isInfo ? "" : (
        String(it.qType || "").toLowerCase() === "checkbox"
          ? correctIndices.map(i => options[i]).filter(Boolean).join("<br>")
          : (correctIndices.length > 0 ? options[correctIndices[0]] || "" : "")
      )
      return {
        type: it.type || "Question",
        qType: isInfo ? undefined : (it.qType || "Radio"),
        content: it.content || "",
        options: isInfo ? undefined : options,
        correctAnswer: isInfo ? undefined : correct,
        order: typeof it.order === "number" ? it.order : 1,
        points: isInfo ? undefined : (typeof it.points === "number" ? it.points : 1)
      }
    })

    const normalizedPassing = fromPercentInput(createQuiz.passingScore)

    try {
      const res = await fetch("/api/admin/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: createQuiz.title.trim(),
          pageTitle: createQuiz.pageTitle.trim() || undefined,
          passingScore: normalizedPassing,
          week: createQuiz.week ? Number(createQuiz.week) : undefined,
          items: itemsPayload
        })
      })
      if (!res.ok) return false
      await refreshQuizzes?.()
      setCreateOpen(false)
      return true
    } catch {
      return false
    }
  }

  const deleteQuiz = async (quizId) => {
    try {
      const res = await fetch(`/api/admin/quizzes/${quizId}`, { method: "DELETE" })
      if (!res.ok) return false
      await refreshQuizzes?.()
      return true
    } catch {
      return false
    }
  }

  const saveQuizEdits = async () => {
    if (!editQuiz) return false
    // validate before save
    const dirtyItems = editItems.filter((it) => it._dirty)
    const normalizedDirty = dirtyItems.map((it) => {
      const isInfo = String(it.type || "").toLowerCase() === "information"
      const options = isInfo
        ? []
        : (Array.isArray(it.uiOptions) ? it.uiOptions : (Array.isArray(it.optionsArray) ? it.optionsArray : splitOptionsString(it.options || "")))
      const correct = isInfo
        ? []
        : (String(it.qType || "").toLowerCase() === "checkbox"
            ? (Array.isArray(it.uiCorrectIndices) ? it.uiCorrectIndices.map((i) => options[i]).filter((s) => typeof s === "string") : [])
            : [Array.isArray(it.uiCorrectIndices) && it.uiCorrectIndices.length > 0 ? options[it.uiCorrectIndices[0]] : ""])
      return { ...it, optionsArray: options, correctAnswerArray: correct }
    })
    const validation = validateAll(normalizedDirty)
    if (validation.hasAnyErrors) {
      // if only duplicate orders -> open dialog
      const onlyDups = validation.perItem.every((r) => r.errors.length === 0) && validation.duplicateOrders.size > 0
      if (onlyDups) { setConflictOpen(true); return false }
      // otherwise, focus by just staying open; Save disabled in UI as well
      return false
    }
    try {
      // If auto resequence was applied, persist via batch update first
      if (autoResApplied) {
        const payload = {
          items: editItems.map((it) => ({ id: it.id, order: Number(it.order || 0) }))
        }
        await fetch(`/api/admin/quizzes/items/batch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        })
        setAutoResApplied(false)
      }
      // Save quiz fields if changed
      const originalPassingDisplay = toPercentDisplay(editOriginal.quiz?.passingScore)
      const changedQuiz =
        (editQuiz.pageTitle !== (editOriginal.quiz?.pageTitle || "")) ||
        (String(editQuiz.passingScore ?? "") !== String(originalPassingDisplay))
      if (changedQuiz) {
        const normalizedPassing = fromPercentInput(editQuiz.passingScore)
        await fetch(`/api/admin/quizzes/${editQuiz.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pageTitle: editQuiz.pageTitle, passingScore: normalizedPassing })
        })
      }
      // Save dirty items (update existing, create new)
      for (const it of editItems) {
        if (!it._dirty) continue
        const isInfo = String(it.type || "").toLowerCase() === "information"
        const options = isInfo
          ? []
          : (Array.isArray(it.uiOptions) ? it.uiOptions : (Array.isArray(it.optionsArray) ? it.optionsArray : splitOptionsString(it.options || "")))
        const correct = isInfo
          ? []
          : (String(it.qType || "").toLowerCase() === "checkbox"
              ? (Array.isArray(it.uiCorrectIndices) ? it.uiCorrectIndices.map((i) => options[i]).filter((s) => typeof s === "string") : [])
              : [Array.isArray(it.uiCorrectIndices) && it.uiCorrectIndices.length > 0 ? options[it.uiCorrectIndices[0]] : ""])
        const payload = {
          type: it.type,
          qType: it.qType,
          content: it.content,
          options,
          correctAnswer: String(it.qType || "").toLowerCase() === "checkbox"
            ? correct.join("<br>")
            : (correct[0] || ""),
          order: it.order,
          points: it.points
        }
        if (it._isNew) {
          // Create new item via POST
          await fetch(`/api/admin/quizzes/${editQuiz.id}/items`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          })
        } else {
          // Update existing item via PUT
          await fetch(`/api/admin/quizzes/items/${it.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          })
        }
      }
      await refreshQuizzes?.()
      setEditOpen(false)
      return true
    } catch {
      return false
    }
  }

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
    <div className="p-6 md:p-8 animate-fade-in-up">
      <Tabs value={tab} onValueChange={(v) => {
        const usp = new URLSearchParams(params.toString())
        usp.set("tab", v)
        router.push(`/admin/quizzes?${usp.toString()}`)
      }}>
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Quizzes Admin</h1>
          <div className="flex items-center gap-3">
            {tab === "quizzes" && (
              <Button onClick={openCreateModal} size="sm" className="h-8">
                <Plus className="h-4 w-4 mr-1.5" />
                New Quiz
              </Button>
            )}
            <TabsList>
              <TabsTrigger value="submissions">Submissions</TabsTrigger>
              <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
            </TabsList>
          </div>
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
                        <Badge variant="outline" className={s.passed ? "bg-success-muted text-success border-success/20" : "bg-error-muted text-error border-error/20"}>
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
                            className={`h-full ${s.passed ? "bg-success" : "bg-error"}`}
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
                    <Badge variant="outline" className={viewerSubmission?.passed ? "bg-success-muted text-success border-success/20" : "bg-error-muted text-error border-error/20"}>
                      {viewerSubmission?.passed ? "Passed" : "Failed"}
                    </Badge>
                    <div className="text-sm font-medium">
                      {viewerSubmission?.score ?? 0} / {viewerSubmission?.totalScore ?? 0} ({(viewerSubmission?.totalScore ? Math.round((viewerSubmission?.score / viewerSubmission?.totalScore) * 100) : 0)}%)
                    </div>
                  </div>
                  <div className="mt-2 h-2 w-full rounded bg-muted overflow-hidden">
                    <motion.div
                      className={`h-full ${viewerSubmission?.passed ? "bg-success" : "bg-error"}`}
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
          {(() => {
            const qaReady = !!viewerSubmission && Object.entries(viewerSubmission?.answers || {}).every(([qid]) => !!questionsById?.[qid])
            if (!qaReady) {
              return (
                <div className="h-[58vh] flex items-center justify-center">
                  <motion.div
                    className="flex flex-col items-center gap-3"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <div className="text-xs text-muted-foreground">Loading questions and answers…</div>
                  </motion.div>
                </div>
              )
            }
            return (
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
                          {showCheck ? <CheckCircle2 className="h-4 w-4 text-success" /> : <AlertCircle className="h-4 w-4 text-warning" />}
                        </div>
                        <div className="mt-2 rounded-md bg-muted/60 p-2 text-[13px] whitespace-pre-wrap leading-6">
                          {Array.isArray(ans) ? ans.join(", ") : String(ans || "—")}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </ScrollArea>
            )
          })()}
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="quizzes" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {quizzes.map((q) => (
              <motion.div
                key={q.id}
                className="rounded-md border p-3 bg-background hover:shadow-sm transition"
                whileHover={{ y: -2 }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{q.title || "Untitled Quiz"}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Passing Score: {formatPassingScoreLabel(q.passingScore)}
                      {q.week != null && <span className="ml-2">· Week {q.week}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button size="sm" className="h-8" onClick={() => openEdit(q)}>Edit</Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-muted-foreground hover:text-destructive"
                      onClick={() => { setDeleteTarget(q); setDeleteConfirmOpen(true) }}
                      title="Delete quiz"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
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

      {/* Edit Quiz Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit Quiz</DialogTitle>
            <DialogDescription>Update quiz settings and items. Changes are indicated.</DialogDescription>
          </DialogHeader>
          {editQuiz && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <div className="text-xs text-muted-foreground mb-1">Page Title</div>
                  <Input
                    value={editQuiz.pageTitle}
                    onChange={(e) => {
                      setEditQuiz((q) => ({ ...q, pageTitle: e.target.value }))
                      setEditQuizDirty(true)
                    }}
                    placeholder="Page Title"
                    className="h-9"
                  />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Passing Score</div>
                  <div className="relative">
                    <Input
                      value={String(editQuiz.passingScore ?? "")}
                      onChange={(e) => {
                        // keep numeric value within 0..100 and strip invalid chars
                        const raw = e.target.value.replace(/[^\d.]/g, "")
                        let next = raw
                        const num = Number(raw)
                        if (Number.isFinite(num)) {
                          if (num > 100) next = "100"
                          if (num < 0) next = "0"
                        }
                        setEditQuiz((q) => ({ ...q, passingScore: next }))
                        setEditQuizDirty(true)
                      }}
                      placeholder="e.g., 70"
                      className="h-9 pr-7"
                      inputMode="decimal"
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-muted-foreground text-sm">%</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Questions & Information</div>
                <div className="flex items-center gap-2">
                  {editQuizDirty || editItems.some((i) => i._dirty) ? (
                    <Badge variant="outline" className="bg-warning-muted text-warning border-warning/20">Unsaved changes</Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">No changes</Badge>
                  )}
                  <Button size="sm" variant="secondary" className="h-8" onClick={() => setPreviewOpen(true)}>Preview</Button>
                  <Button
                    size="sm"
                    className="h-8"
                    onClick={() => setConfirmSaveOpen(true)}
                    disabled={(() => {
                      const normalized = editItems.filter((i) => i._dirty).map((it) => {
                        const isInfo = String(it.type || "").toLowerCase() === "information"
                        const options = isInfo
                          ? []
                          : (Array.isArray(it.uiOptions) ? it.uiOptions : (Array.isArray(it.optionsArray) ? it.optionsArray : splitOptionsString(it.options || "")))
                        const correct = isInfo
                          ? []
                          : (String(it.qType || "").toLowerCase() === "checkbox"
                              ? (Array.isArray(it.uiCorrectIndices) ? it.uiCorrectIndices.map((i) => options[i]).filter((s) => typeof s === "string") : [])
                              : [Array.isArray(it.uiCorrectIndices) && it.uiCorrectIndices.length > 0 ? options[it.uiCorrectIndices[0]] : ""])
                        return { ...it, optionsArray: options, correctAnswerArray: correct }
                      })
                      const hasErrors = validateAll(normalized).hasAnyErrors
                      const hasChanges = editQuizDirty || editItems.some((i) => i._dirty)
                      return hasErrors || !hasChanges
                    })()}
                    title={(() => {
                      const normalized = editItems.filter((i) => i._dirty).map((it) => {
                        const isInfo = String(it.type || "").toLowerCase() === "information"
                        const options = isInfo
                          ? []
                          : (Array.isArray(it.uiOptions) ? it.uiOptions : (Array.isArray(it.optionsArray) ? it.optionsArray : splitOptionsString(it.options || "")))
                        const correct = isInfo
                          ? []
                          : (String(it.qType || "").toLowerCase() === "checkbox"
                              ? (Array.isArray(it.uiCorrectIndices) ? it.uiCorrectIndices.map((i) => options[i]).filter((s) => typeof s === "string") : [])
                              : [Array.isArray(it.uiCorrectIndices) && it.uiCorrectIndices.length > 0 ? options[it.uiCorrectIndices[0]] : ""])
                        return { ...it, optionsArray: options, correctAnswerArray: correct }
                      })
                      const hasErrors = validateAll(normalized).hasAnyErrors
                      const hasChanges = editQuizDirty || editItems.some((i) => i._dirty)
                      if (hasErrors) return "Resolve validation errors or duplicate orders"
                      if (!hasChanges) return "No changes to save"
                      return ""
                    })()}
                  >
                    Save
                  </Button>
                </div>
              </div>

              <ScrollArea className="h-[55vh]">
                <div className="space-y-3 pr-2">
                  {itemsLoading ? (
                    <div className="h-[45vh] flex items-center justify-center">
                      <motion.div
                        className="flex flex-col items-center gap-3"
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        <div className="text-xs text-muted-foreground">Loading quiz items…</div>
                      </motion.div>
                    </div>
                  ) : (
                    <>
                      {editItems.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No items found. Add one below.</div>
                      ) : (
                        editItems
                          .slice()
                          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                          .map((it, idx) => {
                        const isInfo = String(it.type || "").toLowerCase() === "information"
                        const normalizedOptions = isInfo
                          ? []
                          : (Array.isArray(it.uiOptions) ? it.uiOptions : (Array.isArray(it.optionsArray) ? it.optionsArray : splitOptionsString(it.options || "")))
                        const normalizedCorrect = isInfo
                          ? []
                          : (String(it.qType || "").toLowerCase() === "checkbox"
                              ? (Array.isArray(it.uiCorrectIndices) ? it.uiCorrectIndices.map((i) => normalizedOptions[i]).filter((s) => typeof s === "string") : [])
                              : [Array.isArray(it.uiCorrectIndices) && it.uiCorrectIndices.length > 0 ? normalizedOptions[it.uiCorrectIndices[0]] : ""])
                        const v = validateAll([{ ...it, optionsArray: normalizedOptions, correctAnswerArray: normalizedCorrect }]).perItem[0]
                            const hasDup = v.hasDuplicateOrder
                            const hasErrs = v.errors.length > 0
                            return (
                            <div key={it.id} className={`rounded-md border p-3 ${it._dirty ? "border-warning/30" : ""} ${hasDup || hasErrs ? "border-error/40" : ""}`}>
                              {it._isNew && (
                                <div className="flex items-center justify-between mb-2">
                                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800">New item</Badge>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2 text-muted-foreground hover:text-destructive"
                                    onClick={() => removeEditItem(it.id)}
                                    title="Remove this item"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              )}
                              <div className="flex flex-col gap-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex flex-wrap items-start gap-3">
                                    <div>
                                      <div className="text-[11px] text-muted-foreground mb-1">Type</div>
                                  <Select value={it.type || "Question"} onValueChange={(v) => markItemChangeById(it.id, { type: v })}>
                                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="Question">Question</SelectItem>
                                          <SelectItem value="Information">Information</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    {String(it.type || "").toLowerCase() !== "information" && (
                                      <div>
                                        <div className="text-[11px] text-muted-foreground mb-1">Question Type</div>
                                    <Select value={it.qType || "Radio"} onValueChange={(v) => markItemChangeById(it.id, { qType: v })}>
                                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="Radio">Radio</SelectItem>
                                            <SelectItem value="Checkbox">Checkbox</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    )}
                                  </div>
                                  <div className="w-44 shrink-0">
                                    <div className={`${hasDup ? "relative" : ""}`}>
                                      <div className="text-[11px] text-muted-foreground mb-1">Order</div>
                                  <Input value={String(it.order ?? "")} onChange={(e) => markItemChangeById(it.id, { order: e.target.value })} className="h-8" />
                                      {hasDup && <div className="text-[11px] text-error mt-1">Duplicate order</div>}
                                    </div>
                                    {String(it.type || "").toLowerCase() !== "information" && (
                                      <div className="mt-2">
                                        <div className="text-[11px] text-muted-foreground mb-1">Points</div>
                                    <Input value={String(it.points ?? "")} onChange={(e) => markItemChangeById(it.id, { points: e.target.value })} className="h-8" />
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[11px] text-muted-foreground mb-1">Content</div>
                                <RichTextEditor
                                  value={it.content || ""}
                                  onChange={(html) => {
                                    if (String(it.content || "") === String(html || "")) return
                                    markItemChangeById(it.id, { content: html })
                                  }}
                                />
                                </div>
                                {String(it.type || "").toLowerCase() !== "information" && (
                                  <>
                                    <div>
                                      <div className="text-[11px] text-muted-foreground mb-1">Options</div>
                                      <div className="space-y-2">
                                    {Array.isArray(it.uiOptions) && it.uiOptions.length > 0 ? it.uiOptions.map((opt, oi) => (
                                          <div key={oi} className="flex items-center gap-2">
                                            <Input
                                              value={opt}
                                              onChange={(e) => {
                                            const next = [...(it.uiOptions || [])]
                                            if (next[oi] === e.target.value) return
                                            next[oi] = e.target.value
                                            markItemChangeById(it.id, { uiOptions: next })
                                              }}
                                              className="h-8 flex-1"
                                              aria-label={`Option ${oi + 1}`}
                                            />
                                            <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => {
                                          const cur = it.uiOptions || []
                                          const arr = cur.filter((_, k) => k !== oi)
                                          // shift down indices after removal
                                          const oldSel = Array.isArray(it.uiCorrectIndices) ? it.uiCorrectIndices : []
                                          const newSel = oldSel
                                            .filter((v) => v !== oi)
                                            .map((v) => (v > oi ? v - 1 : v))
                                          markItemChangeById(it.id, { uiOptions: arr, uiCorrectIndices: newSel })
                                            }} title="Remove option" aria-label={`Remove option ${oi + 1}`}>Remove</Button>
                                            <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => {
                                          const arr = [...(it.uiOptions || [])]
                                          arr.splice(oi + 1, 0, opt)
                                          // shift up indices after insertion
                                          const oldSel = Array.isArray(it.uiCorrectIndices) ? it.uiCorrectIndices : []
                                          const newSel = oldSel.map((v) => (v > oi ? v + 1 : v))
                                          markItemChangeById(it.id, { uiOptions: arr, uiCorrectIndices: newSel })
                                            }} title="Duplicate option" aria-label={`Duplicate option ${oi + 1}`}>Duplicate</Button>
                                          </div>
                                    )) : <div className="text-xs text-muted-foreground">No options. Add some.</div>}
                                        <div className="flex items-center gap-2">
                                      <Button size="sm" variant="secondary" className="h-8" onClick={() => {
                                        const next = [...(it.uiOptions || []), ""]
                                        markItemChangeById(it.id, { uiOptions: next })
                                      }}>+ Add option</Button>
                                          <Popover>
                                            <PopoverTrigger asChild><Button size="sm" variant="outline" className="h-8">Bulk paste</Button></PopoverTrigger>
                                            <PopoverContent className="w-72 p-3">
                                              <div className="text-xs text-muted-foreground mb-1">Paste one option per line</div>
                                              <Textarea className="h-24" onKeyDown={(e) => {
                                                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                                                  const lines = String(e.currentTarget.value || "").split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
                                              if (lines.length) {
                                                const next = [...(it.uiOptions || []), ...lines]
                                                markItemChangeById(it.id, { uiOptions: next })
                                              }
                                                }
                                              }} placeholder="Option 1\nOption 2" />
                                              <div className="mt-2 text-[11px] text-muted-foreground">Press Ctrl/Cmd+Enter to add</div>
                                            </PopoverContent>
                                          </Popover>
                                        </div>
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-[11px] text-muted-foreground mb-1">Correct Answer</div>
                                      {String(it.qType || "").toLowerCase() === "checkbox" ? (
                                        <div className="space-y-2">
                                      {(it.uiOptions || []).map((opt, oi) => {
                                            const id = `cb-${idx}-${oi}`
                                        const checked = Array.isArray(it.uiCorrectIndices) && it.uiCorrectIndices.includes(oi)
                                            return (
                                              <div key={id} className="flex items-center gap-2 text-sm">
                                                <Checkbox
                                                  id={id}
                                                  checked={!!checked}
                                                  onCheckedChange={(c) => {
                                                    const isChecked = !!c
                                                const cur = Array.isArray(it.uiCorrectIndices) ? [...it.uiCorrectIndices] : []
                                                const has = cur.includes(oi)
                                                if (isChecked && !has) cur.push(oi)
                                                if (!isChecked && has) {
                                                  const pos = cur.indexOf(oi)
                                                  if (pos >= 0) cur.splice(pos, 1)
                                                }
                                                // avoid no-op
                                                cur.sort((a,b)=>a-b)
                                                const before = (it.uiCorrectIndices || []).slice().sort((a,b)=>a-b)
                                                if (JSON.stringify(cur) === JSON.stringify(before)) return
                                                markItemChangeById(it.id, { uiCorrectIndices: cur })
                                                  }}
                                                />
                                                <Label htmlFor={id} className="cursor-pointer">
                                                  <span dangerouslySetInnerHTML={{ __html: opt || "" }} />
                                                </Label>
                                              </div>
                                            )
                                          })}
                                        </div>
                                      ) : (
                                        <RadioGroup
                                      value={Array.isArray(it.uiCorrectIndices) && it.uiCorrectIndices.length > 0 ? String(it.uiCorrectIndices[0]) : ""}
                                          onValueChange={(v) => {
                                        const nextIdx = Number(v)
                                        const current = Array.isArray(it.uiCorrectIndices) && it.uiCorrectIndices.length > 0 ? it.uiCorrectIndices[0] : -1
                                        if (current === nextIdx) return
                                        markItemChangeById(it.id, { uiCorrectIndices: Number.isFinite(nextIdx) ? [nextIdx] : [] })
                                          }}
                                        >
                                      {(it.uiOptions || []).map((opt, oi) => {
                                        const id = `ra-${idx}-${oi}`
                                            return (
                                              <div key={id} className="flex items-center gap-2 text-sm">
                                            <RadioGroupItem value={String(oi)} id={id} />
                                                <Label htmlFor={id} className="cursor-pointer">
                                                  <span dangerouslySetInnerHTML={{ __html: opt || "" }} />
                                                </Label>
                                              </div>
                                            )
                                          })}
                                        </RadioGroup>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>)
                          })
                      )}
                      {!itemsLoading && (
                        <motion.div
                          className="pt-3"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.1 }}
                        >
                          <Button size="sm" variant="outline" className="h-9 w-full border-dashed" onClick={addEditItem}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Item
                          </Button>
                        </motion.div>
                      )}
                    </>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editQuiz?.pageTitle || editQuiz?.title || "Quiz Preview"}</DialogTitle>
            <DialogDescription>This is how the quiz will look to users.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            <div className="pr-2">
              <PreviewRenderer items={(editItems || []).map((it) => ({ ...it, options: it.optionsArray }))} />
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Confirm Save Modal */}
      <Dialog open={confirmSaveOpen} onOpenChange={setConfirmSaveOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Save changes?</DialogTitle>
            <DialogDescription>This will update your quiz settings and modified items.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmSaveOpen(false)} disabled={saving}>Cancel</Button>
            <Button
              onClick={async () => {
                setSaving(true)
                const ok = await saveQuizEdits()
                setSaving(false)
                if (ok) {
                  setConfirmSaveOpen(false)
                  toast.success("Changes saved successfully")
                } else {
                  toast.error("Failed to save changes. Please review inputs and try again.")
                }
              }}
              disabled={saving}
            >
              {saving ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</>) : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Duplicate order dialog */}
      <Dialog open={conflictOpen} onOpenChange={setConflictOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Duplicate orders detected</DialogTitle>
            <DialogDescription>Some items share the same Order. Choose how to resolve:</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <div>- Fix manually: You adjust the Order values yourself.</div>
            <div>- Auto-resequence: We will renumber items 1..N in current sort order.</div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConflictOpen(false)}>Fix manually</Button>
            <Button
              onClick={() => {
                // auto resequence on client
                setEditItems((prev) => {
                  const sorted = [...prev].sort((a,b) => (Number(a.order||0)) - (Number(b.order||0)))
                  return sorted.map((it, i) => ({ ...it, order: i + 1, _dirty: true }))
                })
                setAutoResApplied(true)
                setConflictOpen(false)
              }}
            >
              Auto-resequence
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Quiz Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Create New Quiz</DialogTitle>
            <DialogDescription>Set up a new quiz with questions and information items.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Quiz metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Quiz Title <span className="text-destructive">*</span></div>
                <Input
                  value={createQuiz.title}
                  onChange={(e) => setCreateQuiz(q => ({ ...q, title: e.target.value }))}
                  placeholder="e.g., Week 1 – Clinic Policies"
                  className="h-9"
                />
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Page Title</div>
                <Input
                  value={createQuiz.pageTitle}
                  onChange={(e) => setCreateQuiz(q => ({ ...q, pageTitle: e.target.value }))}
                  placeholder="Displayed at the top of the quiz page"
                  className="h-9"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Passing Score</div>
                <div className="relative">
                  <Input
                    value={String(createQuiz.passingScore ?? "")}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^\d.]/g, "")
                      let next = raw
                      const num = Number(raw)
                      if (Number.isFinite(num)) {
                        if (num > 100) next = "100"
                        if (num < 0) next = "0"
                      }
                      setCreateQuiz(q => ({ ...q, passingScore: next }))
                    }}
                    placeholder="e.g., 70"
                    className="h-9 pr-7"
                    inputMode="decimal"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-muted-foreground text-sm">%</span>
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-2">Week</div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[1, 2, 3, 4, 5].map((w) => (
                    <Button
                      key={w}
                      size="sm"
                      variant={String(createQuiz.week) === String(w) ? "default" : "outline"}
                      className="h-8 w-10 p-0"
                      onClick={() => setCreateQuiz(q => ({ ...q, week: q.week === String(w) ? "" : String(w) }))}
                    >
                      {w}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <Separator />

            {/* Items header */}
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">
                Questions & Information
                {createItems.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">({createItems.length} item{createItems.length !== 1 ? "s" : ""})</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {createItems.length > 0 && (
                  <Button size="sm" variant="secondary" className="h-8" onClick={() => setCreatePreviewOpen(true)}>Preview</Button>
                )}
                <Button
                  size="sm"
                  className="h-8"
                  disabled={!createQuiz.title.trim() || createSaving}
                  onClick={async () => {
                    setCreateSaving(true)
                    const ok = await saveNewQuiz()
                    setCreateSaving(false)
                    if (ok) {
                      toast.success("Quiz created successfully")
                    } else {
                      toast.error("Failed to create quiz. Please check the fields and try again.")
                    }
                  }}
                >
                  {createSaving ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating…</>) : "Create Quiz"}
                </Button>
              </div>
            </div>

            {/* Items list */}
            <ScrollArea className="h-[45vh]">
              <div className="space-y-3 pr-2">
                <AnimatePresence initial={false}>
                  {createItems.length === 0 ? (
                    <motion.div
                      className="flex flex-col items-center justify-center py-12 text-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <div className="text-sm text-muted-foreground mb-2">No items yet</div>
                      <div className="text-xs text-muted-foreground mb-4">Add questions or information blocks to your quiz.</div>
                      <Button size="sm" variant="secondary" onClick={addCreateItem}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add First Item
                      </Button>
                    </motion.div>
                  ) : (
                    createItems
                      .slice()
                      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                      .map((it, idx) => {
                        const isInfo = String(it.type || "").toLowerCase() === "information"
                        return (
                          <motion.div
                            key={it._tempId}
                            className="rounded-md border p-3"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="text-xs font-medium text-muted-foreground">Item {idx + 1}</div>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-muted-foreground hover:text-destructive"
                                onClick={() => removeCreateItem(it._tempId)}
                                title="Remove item"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                            <div className="flex flex-col gap-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex flex-wrap items-start gap-3">
                                  <div>
                                    <div className="text-[11px] text-muted-foreground mb-1">Type</div>
                                    <Select value={it.type || "Question"} onValueChange={(v) => updateCreateItem(it._tempId, { type: v })}>
                                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Question">Question</SelectItem>
                                        <SelectItem value="Information">Information</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  {!isInfo && (
                                    <div>
                                      <div className="text-[11px] text-muted-foreground mb-1">Question Type</div>
                                      <Select value={it.qType || "Radio"} onValueChange={(v) => updateCreateItem(it._tempId, { qType: v })}>
                                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="Radio">Radio</SelectItem>
                                          <SelectItem value="Checkbox">Checkbox</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  )}
                                </div>
                                <div className="w-44 shrink-0">
                                  <div>
                                    <div className="text-[11px] text-muted-foreground mb-1">Order</div>
                                    <Input
                                      value={String(it.order ?? "")}
                                      onChange={(e) => updateCreateItem(it._tempId, { order: Number(e.target.value) || 0 })}
                                      className="h-8"
                                    />
                                  </div>
                                  {!isInfo && (
                                    <div className="mt-2">
                                      <div className="text-[11px] text-muted-foreground mb-1">Points</div>
                                      <Input
                                        value={String(it.points ?? "")}
                                        onChange={(e) => updateCreateItem(it._tempId, { points: Number(e.target.value) || 0 })}
                                        className="h-8"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div>
                                <div className="text-[11px] text-muted-foreground mb-1">Content</div>
                                <RichTextEditor
                                  value={it.content || ""}
                                  onChange={(html) => {
                                    if (String(it.content || "") === String(html || "")) return
                                    updateCreateItem(it._tempId, { content: html })
                                  }}
                                />
                              </div>
                              {!isInfo && (
                                <>
                                  <div>
                                    <div className="text-[11px] text-muted-foreground mb-1">Options</div>
                                    <div className="space-y-2">
                                      {Array.isArray(it.uiOptions) && it.uiOptions.length > 0 ? it.uiOptions.map((opt, oi) => (
                                        <div key={oi} className="flex items-center gap-2">
                                          <Input
                                            value={opt}
                                            onChange={(e) => {
                                              const next = [...(it.uiOptions || [])]
                                              next[oi] = e.target.value
                                              updateCreateItem(it._tempId, { uiOptions: next })
                                            }}
                                            className="h-8 flex-1"
                                            placeholder={`Option ${oi + 1}`}
                                          />
                                          <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => {
                                            const arr = (it.uiOptions || []).filter((_, k) => k !== oi)
                                            const oldSel = Array.isArray(it.uiCorrectIndices) ? it.uiCorrectIndices : []
                                            const newSel = oldSel.filter((v) => v !== oi).map((v) => (v > oi ? v - 1 : v))
                                            updateCreateItem(it._tempId, { uiOptions: arr, uiCorrectIndices: newSel })
                                          }} title="Remove option">
                                            <X className="h-3.5 w-3.5" />
                                          </Button>
                                        </div>
                                      )) : <div className="text-xs text-muted-foreground">No options. Add some below.</div>}
                                      <Button size="sm" variant="secondary" className="h-8" onClick={() => {
                                        const next = [...(it.uiOptions || []), ""]
                                        updateCreateItem(it._tempId, { uiOptions: next })
                                      }}>+ Add option</Button>
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-[11px] text-muted-foreground mb-1">Correct Answer</div>
                                    {String(it.qType || "").toLowerCase() === "checkbox" ? (
                                      <div className="space-y-2">
                                        {(it.uiOptions || []).map((opt, oi) => {
                                          const cbId = `create-cb-${idx}-${oi}`
                                          const checked = Array.isArray(it.uiCorrectIndices) && it.uiCorrectIndices.includes(oi)
                                          return (
                                            <div key={cbId} className="flex items-center gap-2 text-sm">
                                              <Checkbox
                                                id={cbId}
                                                checked={!!checked}
                                                onCheckedChange={(c) => {
                                                  const cur = Array.isArray(it.uiCorrectIndices) ? [...it.uiCorrectIndices] : []
                                                  if (c && !cur.includes(oi)) cur.push(oi)
                                                  if (!c && cur.includes(oi)) cur.splice(cur.indexOf(oi), 1)
                                                  cur.sort((a, b) => a - b)
                                                  updateCreateItem(it._tempId, { uiCorrectIndices: cur })
                                                }}
                                              />
                                              <Label htmlFor={cbId} className="cursor-pointer">{opt || `Option ${oi + 1}`}</Label>
                                            </div>
                                          )
                                        })}
                                      </div>
                                    ) : (
                                      <RadioGroup
                                        value={Array.isArray(it.uiCorrectIndices) && it.uiCorrectIndices.length > 0 ? String(it.uiCorrectIndices[0]) : ""}
                                        onValueChange={(v) => {
                                          updateCreateItem(it._tempId, { uiCorrectIndices: [Number(v)] })
                                        }}
                                      >
                                        {(it.uiOptions || []).map((opt, oi) => {
                                          const raId = `create-ra-${idx}-${oi}`
                                          return (
                                            <div key={raId} className="flex items-center gap-2 text-sm">
                                              <RadioGroupItem value={String(oi)} id={raId} />
                                              <Label htmlFor={raId} className="cursor-pointer">{opt || `Option ${oi + 1}`}</Label>
                                            </div>
                                          )
                                        })}
                                      </RadioGroup>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          </motion.div>
                        )
                      })
                  )}
                </AnimatePresence>

                {createItems.length > 0 && (
                  <motion.div
                    className="pt-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <Button size="sm" variant="outline" className="h-9 w-full border-dashed" onClick={addCreateItem}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </motion.div>
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Quiz Preview Modal */}
      <Dialog open={createPreviewOpen} onOpenChange={setCreatePreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{createQuiz.pageTitle || createQuiz.title || "Quiz Preview"}</DialogTitle>
            <DialogDescription>This is how the quiz will look to users.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            <div className="pr-2">
              <PreviewRenderer items={(createItems || []).map((it) => ({ ...it, options: it.uiOptions }))} />
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Delete Quiz Confirmation Modal */}
      <Dialog open={deleteConfirmOpen} onOpenChange={(open) => { if (!deleting) { setDeleteConfirmOpen(open); if (!open) setDeleteTarget(null) } }}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Delete quiz</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-medium text-foreground">{deleteTarget?.title || "this quiz"}</span>? This will also remove all associated questions and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setDeleteConfirmOpen(false); setDeleteTarget(null) }} disabled={deleting}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={async () => {
                if (!deleteTarget) return
                setDeleting(true)
                const ok = await deleteQuiz(deleteTarget.id)
                setDeleting(false)
                if (ok) {
                  setDeleteConfirmOpen(false)
                  setDeleteTarget(null)
                  toast.success("Quiz deleted successfully")
                } else {
                  toast.error("Failed to delete quiz")
                }
              }}
            >
              {deleting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting…</>) : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}


export default function AdminQuizzesPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 md:p-8">
          <div className="rounded-md border p-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        </div>
      }
    >
      <AdminQuizzesPageContent />
    </Suspense>
  )
}
