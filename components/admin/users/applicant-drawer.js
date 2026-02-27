"use client"

import { useMemo, useState, useRef, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs"
import { Badge } from "@components/ui/badge"
import { Separator } from "@components/ui/separator"
import { Button } from "@components/ui/button"
import { Avatar, AvatarFallback } from "@components/ui/avatar"
import { ExternalLink, FileText, MessageSquare, Loader2, Eye, RefreshCw, ChevronLeft, Star, X, Pencil, CheckCircle2, Circle, AlertCircle, ChevronDown, ChevronUp, Settings, Plus, Trash2, RotateCcw } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import UploadDropzone from "./upload-dropzone"
import { attachFeedback } from "@/app/admin/users/actions"
import NextStep from "./next-step"
import ProgressStepper from "./progress-stepper"
import { ScrollArea } from "@components/ui/scroll-area"
import { useApplicant } from "@/hooks/useApplicant"
import { useFeedbackDocuments } from "@/hooks/useFeedbackDocuments"
import { ApplicantFileViewerModal } from "./applicant-file-viewer-modal"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@components/ui/select"
import { Input } from "@components/ui/input"
import { Textarea } from "@components/ui/textarea"
import { Label } from "@components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@components/ui/dialog"
import { ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon, Clock as ClockIcon } from "lucide-react"
import { toast } from "sonner"
import { useQuizSubmissions } from "@/hooks/useQuizSubmissions"
import { useApplicantTasks } from "@/hooks/useApplicantTasks"
import { QuizSubmissionAnswersModal } from "./quiz-submission-answers-modal"
import { updateApplicant } from "@/app/admin/users/actions"
import AppraisalQuestionEditor from "./AppraisalQuestionEditor"
import AppraisalQuestionsViewer from "./AppraisalQuestionsViewer"
import { generateColorFromString } from "@/lib/utils/colour-hash"
import Link from "next/link"

function Initials({ name = "" }) {
  const [first, last] = String(name).split(" ")
  const initials = `${(first || "").slice(0, 1)}${(last || "").slice(0, 1)}`.trim().toUpperCase() || "A"
  return <AvatarFallback>{initials}</AvatarFallback>
}

function InfoRow({ label, value }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="text-sm break-words">{value || "—"}</div>
    </div>
  )
}

// Helper function for date formatting
const formatDate = (dateString) => {
  if (!dateString) return "—"
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return "Invalid date"
  }
}

export default function ApplicantDrawer({ open, onOpenChange, applicantId, onApplicantUpdated }) {
  const [tab, setTab] = useState("overview")
  const [selectedFile, setSelectedFile] = useState(null)
  const [fileViewerOpen, setFileViewerOpen] = useState(false)
  const [selectedDocType, setSelectedDocType] = useState("")
  const [selectedDocMeta, setSelectedDocMeta] = useState(null)
  const [docCoreOptions, setDocCoreOptions] = useState([])
  const [docDocumentsOptions, setDocDocumentsOptions] = useState([])
  const [docOptionsLoading, setDocOptionsLoading] = useState(false)
  const [showAddDropzone, setShowAddDropzone] = useState(false)
  const addDocRef = useRef(null)
  const [optimisticDocs, setOptimisticDocs] = useState([])
  const dropzoneSubmitRef = useRef(null)
  const [hasPendingFiles, setHasPendingFiles] = useState(false)
  const [wideView, setWideView] = useState(false)
  const scrollRootRef = useRef(null)
  const [showStickyHeader, setShowStickyHeader] = useState(false)
  const [selectedFeedbackStage, setSelectedFeedbackStage] = useState("")
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false)
  const [deleteReviewOpen, setDeleteReviewOpen] = useState(false)
  const [deleteReviewTarget, setDeleteReviewTarget] = useState({ id: "", title: "" })
  const [deletingReview, setDeletingReview] = useState(false)
  const [answersModalOpen, setAnswersModalOpen] = useState(false)
  const [answersModalSubmission, setAnswersModalSubmission] = useState(null)

  // Use the new hook to fetch applicant data
  const { applicant, isLoading, error, mutate } = useApplicant(applicantId)

  // Derived onboarding state and quizzes hook (must come after applicant is defined)
  const isOnboardingActive = useMemo(() => {
    const paused = !!applicant?.onboardingPaused
    const startDate = applicant?.onboardingStartDate ? new Date(applicant.onboardingStartDate) : null
    const started = startDate && !Number.isNaN(startDate.getTime())
    return !!(started && !paused)
  }, [applicant])
  const {
    submissions: quizSubmissions,
    questionsById: quizQuestionsById,
    isLoading: quizLoading,
    error: quizError,
    refresh: refreshQuizzes
  } = useQuizSubmissions(applicant?.id, {
    enabled: !!applicant?.id && isOnboardingActive && (tab === "overview" || wideView),
    revalidateOnFocus: true,
    revalidateOnReconnect: true
  })

  const [appraisalOpen, setAppraisalOpen] = useState(false)
  const [appraisalViewerOpen, setAppraisalViewerOpen] = useState(false)
  const [appraisalViewerData, setAppraisalViewerData] = useState(null)
  const [templateEditorOpen, setTemplateEditorOpen] = useState(false)
  const [templateLoading, setTemplateLoading] = useState(false)
  const [templateData, setTemplateData] = useState(null)
  const applicationTimelineItems = useMemo(() => {
    if (!applicant) return []
    // Parse history (array or JSON string)
    const raw = applicant.stageHistory
    let hist = []
    try {
      if (Array.isArray(raw)) hist = raw
      else if (typeof raw === "string" && raw.trim()) hist = JSON.parse(raw)
    } catch {
      hist = []
    }
    // Build list as recorded in history only
    const items = (hist || [])
      .filter((e) => e && e.stage)
      .map((e, i) => ({
        idx: i,
        label: e.stage,
        at: e.at || e.date || e.timestamp || null,
        ts: (() => {
          const t = Date.parse(e.at || e.date || e.timestamp || "")
          return Number.isNaN(t) ? Infinity : t
        })(),
      }))
    // Sort chronologically; unknown timestamps stay at the end in recorded order
    items.sort((a, b) => {
      if (a.ts === b.ts) return a.idx - b.idx
      return a.ts - b.ts
    })
    return items.map(({ label, at }) => ({ label, at }))
  }, [applicant])

  // Use the feedback documents hook with smart caching
  const {
    documents: feedbackDocuments,
    documentsByStage,
    documentsByType,
    stats: feedbackStats,
    isLoading: feedbackLoading,
    error: feedbackError,
    refresh: refreshFeedback,
    isRefreshing: feedbackRefreshing,
    hasData: hasFeedbackData,
    isFromCache: feedbackFromCache
  } = useFeedbackDocuments(applicantId, {
    enabled: tab === "feedback" || wideView, // Also load when expanded view is active
    refreshInterval: (tab === "feedback" || wideView) ? 30000 : 0,
    revalidateOnFocus: tab === "feedback" || wideView,
    revalidateOnReconnect: tab === "feedback" || wideView,
    onSuccess: (data) => {
      console.log('Feedback documents loaded successfully:', data)
    },
    onError: (error) => {
      console.error('Error loading feedback documents:', error)
    }
  })

  const docsInfo = useMemo(() => {
    if (!applicant) return { present: 0 }
    
    // Count total including optimistic additions
    const present = (applicant.allDocuments?.length || 0) + (optimisticDocs?.length || 0)
    
    return { present }
  }, [applicant, optimisticDocs])

  const feedbackFiles = applicant?.feedbackFiles || []

  const handleSubmitFeedback = async (filesMeta) => {
    if (!applicant) return
    const updated = await attachFeedback({ id: applicant.id, files: filesMeta })
    onApplicantUpdated?.(updated)
    mutate?.() // Refresh the applicant data
    refreshFeedback?.() // Refresh feedback documents
    setTab("feedback")
  }

  const getNextAdminStage = (currentStage) => {
    switch (currentStage) {
      case "New Application":
        return "First Interview Invite Sent"
      case "Under Review":
        return "Second Interview Invite Sent"
      case "Reviewed":
        return "Second Interview Invite Sent"
      case "Reviewed (2nd)":
        return "Hired"
      default:
        return ""
    }
  }

  const [advancing, setAdvancing] = useState(false)
  const nextStage = getNextAdminStage(applicant?.stage)
  const canAdvance = !!applicant?.id && !!nextStage
  const actionLabel = useMemo(() => {
    if (!nextStage) return "Advance Stage"
    if (nextStage === "First Interview Invite Sent") return "Send First Interview Invite"
    if (nextStage === "Second Interview Invite Sent") return "Send Second Interview Invite"
    if (nextStage === "Hired") return "Hire"
    return "Advance Stage"
  }, [nextStage])

  const stageColor = useMemo(() => {
    const col = generateColorFromString(applicant?.stage || "")
    if (!col) return {}
    let isDark = false
    try {
      isDark = typeof window !== "undefined" && document.documentElement.classList.contains("dark")
    } catch {}
    const bg = isDark ? col.dark : col.light
    const text = isDark ? "hsl(0, 0%, 96%)" : "hsl(220, 13%, 18%)"
    return { backgroundColor: bg, color: text, borderColor: bg }
  }, [applicant?.stage])

  const hiredBadgeClass = "bg-success-muted text-success border-success/20"
  const renderStageBadge = () => {
    const label = applicant?.stage || "—"
    if (label === "Hired") {
      return <Badge variant="outline" className={hiredBadgeClass}>{label}</Badge>
    }
    return <Badge variant="secondary" style={stageColor}>{label}</Badge>
  }
  const stageLower = String(applicant?.stage || "").toLowerCase()
  const isHiredStage = stageLower === "hired"
  const isRejectedStage = stageLower.startsWith("rejected")
  const [expandedAppraisals, setExpandedAppraisals] = useState({})
  const [markingStepDone, setMarkingStepDone] = useState(null)

  // Determine if Appraisal History long text exists (string in Airtable)
  const appraisalHistoryRaw = useMemo(() => {
    const val =
      applicant?.appraisalHistory ??
      applicant?.AppraisalHistory ??
      applicant?.appraisal_history ??
      applicant?.["Appraisal History"]
    return typeof val === "string" ? val : ""
  }, [applicant])
  const hasAppraisalHistory = useMemo(() => {
    return !!appraisalHistoryRaw && appraisalHistoryRaw.trim().length > 0
  }, [appraisalHistoryRaw])

  const handleAdvanceStage = async () => {
    if (!canAdvance) return
    setConfirmStage(nextStage)
    setConfirmOpen(true)
  }

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmStage, setConfirmStage] = useState("")
  const [confirming, setConfirming] = useState(false)
  const [overrideOpen, setOverrideOpen] = useState(false)
  const [overrideConfirmed, setOverrideConfirmed] = useState(false)
  const [overrideAction, setOverrideAction] = useState("")
  const [overrideSubmitting, setOverrideSubmitting] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejecting, setRejecting] = useState(false)

  const confirmAndAdvance = async () => {
    if (!applicant?.id || !confirmStage) { setConfirmOpen(false); return }
    try {
      setConfirming(true)
      await updateApplicant({ id: applicant.id, stage: confirmStage })
      toast.success(`Stage updated to ${confirmStage}`)
      setConfirmOpen(false)
      await mutate?.()
      onApplicantUpdated?.()
    } catch (e) {
      toast.error(e?.message || "Failed to change stage")
    } finally {
      setConfirming(false)
    }
  }

  const handleFileClick = (file) => {
    setSelectedFile(file)
    setFileViewerOpen(true)
  }

  const handleFileViewerClose = () => {
    setFileViewerOpen(false)
    setSelectedFile(null)
  }

  // Ensure the add dropzone is scrolled into view when opened
  useEffect(() => {
    if (showAddDropzone && addDocRef.current) {
      try {
        addDocRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" })
      } catch {}
    }
  }, [showAddDropzone])

  // Observe scroll to toggle sticky header appearance
  useEffect(() => {
    if (!wideView) {
      setShowStickyHeader(false)
      return
    }
    const root = scrollRootRef.current
    if (!root) return
    const viewport = root.querySelector('[data-radix-scroll-area-viewport]')
    if (!viewport) return
    const onScroll = () => {
      try {
        setShowStickyHeader((viewport.scrollTop || 0) > 80)
      } catch {}
    }
    onScroll()
    viewport.addEventListener('scroll', onScroll, { passive: true })
    return () => viewport.removeEventListener('scroll', onScroll)
  }, [wideView])

  // Fetch dynamic attachment fields (Core = Applicants, Documents = Documents)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setDocOptionsLoading(true)
        const res = await fetch('/api/admin/users/attachments/fields', { method: 'GET' })
        if (!res.ok) throw new Error('Failed to load document fields')
        const data = await res.json()
        if (cancelled) return
        const core = Array.isArray(data?.core) ? data.core.map((f) => ({ ...f, table: 'Applicants' })) : []
        const docs = Array.isArray(data?.documents) ? data.documents.map((f) => ({ ...f, table: 'Documents' })) : []
        setDocCoreOptions(core)
        setDocDocumentsOptions(docs)
      } catch (e) {
        console.error(e)
        // No toast here to avoid noise; the dropdown will remain empty.
        setDocCoreOptions([])
        setDocDocumentsOptions([])
      } finally {
        if (!cancelled) setDocOptionsLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const handleMarkStepDone = async (stepId) => {
    if (!applicant?.id) return
    setMarkingStepDone(stepId)
    try {
      const res = await fetch(`/api/admin/users/${applicant.id}/appraisal-history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepId }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || "Failed to mark step as done")
      }
      await mutate?.()
      toast.success("Step marked as done")
    } catch (e) {
      toast.error(e?.message || "Failed to mark step as done")
    } finally {
      setMarkingStepDone(null)
    }
  }

  const handleSubmitAppraisal = async (files) => {
    if (!applicant || !files?.length) return
    const formData = new FormData()
    files.forEach((f) => formData.append("files", f))
    const res = await fetch(`/api/admin/users/${applicant.id}/appraisal`, { method: "POST", body: formData })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.error || "Upload failed")
    }
    await mutate?.()
    setShowAddDropzone(false)
    setSelectedDocType("")
  }

  const handleDeleteScheduledReview = async () => {
    if (!applicant?.id || !deleteReviewTarget?.id) return
    try {
      setDeletingReview(true)
      const res = await fetch(`/api/admin/users/${applicant.id}/monthly-reviews/${deleteReviewTarget.id}`, { method: "DELETE" })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || "Failed to delete scheduled review")
      }
      toast.success("Scheduled review deleted")
      setDeleteReviewOpen(false)
      setDeleteReviewTarget({ id: "", title: "" })
      await mutate?.()
    } catch (e) {
      toast.error(e?.message || "Failed to delete scheduled review")
    } finally {
      setDeletingReview(false)
    }
  }



  if (error) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full max-w-3xl p-0">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-error mb-2">Error loading applicant</p>
              <p className="text-sm text-muted-foreground">{error.message}</p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className={`w-[420px] sm:w-[720px] max-w-2xl pl-2 pr-4 md:pl-2 md:pr-6 transition-all duration-slow ease-out-expo border-l border-border/30`}
          style={wideView ? { width: "95vw", maxWidth: "1280px" } : undefined}
        >
          {/* Accessibility: provide required DialogTitle for SheetContent */}
          <SheetHeader className="sr-only">
            <SheetTitle>Applicant Details</SheetTitle>
          </SheetHeader>
          <button
            type="button"
            aria-label={wideView ? "Collapse details" : "Expand details"}
            onClick={() => setWideView((v) => !v)}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-50 h-7 w-7 rounded-full border bg-background shadow-sm flex items-center justify-center hover:bg-muted"
            title={wideView ? "Collapse" : "Expand"}
          >
            <ChevronLeft className={`h-4 w-4 ${wideView ? "rotate-180" : ""}`} />
          </button>
          <div className="flex h-full flex-col">
            {/* Header */}
            {/* Header */}
            {wideView ? (
              <AnimatePresence>
                {showStickyHeader && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center justify-between gap-3 border-b border-border/30 px-4 py-2 md:px-5 sticky top-0 z-30 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Initials name={applicant?.name} />}
                      </Avatar>
                      <div>
                        <h2 className="text-base font-semibold leading-none">{isLoading ? "Loading..." : applicant?.name || "Applicant"}</h2>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" style={stageColor}>{applicant?.stage || "—"}</Badge>
                          {applicant?.job && <Badge variant="outline">{applicant.job}</Badge>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!isHiredStage && (
                        <Button
                          size="sm"
                          disabled={!canAdvance || advancing}
                          onClick={handleAdvanceStage}
                          title={canAdvance ? actionLabel : "No manual next stage available"}
                          className="h-8"
                        >
                          {advancing ? <Loader2 className="h-4 w-4 animate-spin" /> : (canAdvance ? actionLabel : "Advance Stage")}
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Override stage…" onClick={() => { setOverrideOpen(true); setOverrideConfirmed(false); setOverrideAction("") }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {!isHiredStage && !isRejectedStage && (
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-8"
                          title="Reject applicant"
                          onClick={() => setRejectOpen(true)}
                        >
                          Reject
                        </Button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            ) : (
            <div className="border-b border-border/30 px-4 py-4 md:px-5">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14 bg-primary/5">
                  {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <AvatarFallback className="bg-primary/5 text-primary text-title font-bold"><Initials name={applicant?.name} /></AvatarFallback>}
                </Avatar>
                <div className="min-w-0 flex-1">
                  <h2 className="text-title font-semibold leading-tight">
                    {isLoading ? "Loading..." : applicant?.name || "Applicant"}
                  </h2>
                  {!!applicant?.email && (
                    <div className="text-body-sm text-muted-foreground truncate mt-0.5">{applicant.email}</div>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    {renderStageBadge()}
                    {applicant?.job && <Badge variant="outline">{applicant.job}</Badge>}
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Override stage…" onClick={() => { setOverrideOpen(true); setOverrideConfirmed(false); setOverrideAction("") }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
              {/* Action buttons - sticky bottom style */}
              <div className="mt-3 flex items-center gap-2">
                {!isHiredStage && (
                  <Button
                    size="sm"
                    disabled={!canAdvance || advancing}
                    onClick={handleAdvanceStage}
                    title={canAdvance ? actionLabel : "No manual next stage available"}
                    className="h-8"
                  >
                    {advancing ? <Loader2 className="h-4 w-4 animate-spin" /> : (canAdvance ? actionLabel : "Advance Stage")}
                  </Button>
                )}
                {!isHiredStage && !isRejectedStage && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-8"
                    title="Reject applicant"
                    onClick={() => setRejectOpen(true)}
                  >
                    Reject
                  </Button>
                )}
              </div>
            </div>
            )}

            {/* Scrollable content */}
            <ScrollArea ref={scrollRootRef} className="flex-1">
              <div className="px-5 pr-6 py-4 md:px-6 md:pr-8">
                {wideView ? (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    {/* Z - Left vertical summary */}
                    <aside className="md:col-span-3 space-y-4">
                      <div className="rounded-lg border border-border/30 p-4">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10">
                            {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Initials name={applicant?.name} />}
                          </Avatar>
                          <div>
                            <div className="text-base font-semibold leading-none">{applicant?.name || "Applicant"}</div>
                            <div className="text-xs text-muted-foreground">{applicant?.email || "—"}</div>
                            {applicant?.job && (
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <Badge variant="outline">{applicant.job}</Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="rounded-lg border border-border/30 p-4 space-y-3">
                        <div className="text-body-sm font-semibold">Quick Facts</div>
                        <InfoRow label="Phone" value={applicant?.phone} />
                        <InfoRow label="Email" value={applicant?.email} />
                        <InfoRow label="Applied For" value={applicant?.job} />
                        {/* Onboarding status */}
                        {(() => {
                          const paused = !!applicant?.onboardingPaused
                          const start = applicant?.onboardingStartDate ? new Date(applicant.onboardingStartDate) : null
                          const started = start && !Number.isNaN(start.getTime())
                          const status = started ? (paused ? 'Paused' : 'Active') : 'Not started'
                          return (
                            <>
                              <InfoRow label="Onboarding" value={status} />
                              {started && (
                                <>
                                  <InfoRow label="Start" value={formatDate(applicant.onboardingStartDate)} />
                                  {(() => {
                                    const diffDays = Math.max(1, Math.floor((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1)
                                    const week = Math.floor((diffDays - 1) / 7) + 1
                                    return <InfoRow label="Progress" value={`Week ${week} • Day ${diffDays}`} />
                                  })()}
                                </>
                              )}
                            </>
                          )
                        })()}
                        {/* Appraisal quick glance */}
                        {applicant?.appraisalDate && <InfoRow label="Next Appraisal" value={formatDate(applicant.appraisalDate)} />}
                        {applicant?.appraisalCreated && <InfoRow label="Appraisal Created" value="Yes" />}
                        {applicant?.docsStatus && <InfoRow label="Docs Status" value={applicant.docsStatus} />}
                        <Separator />
                        {/* Timeline small */}
                        <div>
                          <div className="text-sm font-semibold mb-2">Application Timeline</div>
                          {applicationTimelineItems.length > 0 ? (
                            <ol className="relative border-l pl-4">
                              {applicationTimelineItems.map((ev, idx) => (
                                <li key={`${ev.label}-${idx}`} className="mb-3 ml-2">
                                  <span className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full bg-foreground" />
                                  <div className="text-sm font-medium">{ev.label}</div>
                                  <div className="text-xs text-muted-foreground">{ev.at ? formatDate(ev.at) : "—"}</div>
                                </li>
                              ))}
                            </ol>
                          ) : (
                            <div className="text-xs text-muted-foreground">No stage history yet.</div>
                          )}
                        </div>
                      </div>
                    </aside>

                    {/* Right main content */}
                    <section className="md:col-span-9 space-y-4">
                      {/* A - Title */}
                      <div className="rounded-lg border border-border/30 px-3 py-2 flex items-center justify-between">
                        <h3 className="text-base font-semibold">Applicant Detail</h3>
                        <div className="flex items-center gap-2">
                          {renderStageBadge()}
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Override stage…" onClick={() => { setOverrideOpen(true); setOverrideConfirmed(false); setOverrideAction("") }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {!isHiredStage && (
                            <Button
                              size="sm"
                              disabled={!canAdvance || advancing}
                              onClick={handleAdvanceStage}
                              title={canAdvance ? actionLabel : "No manual next stage available"}
                              className="h-8"
                            >
                              {advancing ? <Loader2 className="h-4 w-4 animate-spin" /> : (canAdvance ? actionLabel : "Advance Stage")}
                            </Button>
                          )}
                          {!isHiredStage && !isRejectedStage && (
                            <Button
                              variant="destructive"
                              size="sm"
                              className="h-8"
                              title="Reject applicant"
                              onClick={() => setRejectOpen(true)}
                            >
                              Reject
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* B - Applicant Information */}
                      <div className="rounded-lg border border-border/30 p-4">
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                          <InfoRow label="Interview Date" value={applicant?.interviewDate ? formatDate(applicant.interviewDate) : '—'} />
                          <InfoRow label="Second Interview" value={applicant?.secondInterviewDate ? formatDate(applicant.secondInterviewDate) : '—'} />
                          <InfoRow label="Application Date" value={applicant?.createdAt ? formatDate(applicant.createdAt) : '—'} />
                          <InfoRow label="Last Updated" value={applicant?.updatedAt ? formatDate(applicant.updatedAt) : '—'} />
                          <InfoRow label="Address" value={applicant?.address} />
                          <InfoRow label="Post Code" value={applicant?.postCode} />
                          <InfoRow label="Date of Birth" value={applicant?.dateOfBirth} />
                          {!!applicant?.criteriaScore && <InfoRow label="Criteria Score" value={String(applicant.criteriaScore)} />}
                          {String(applicant?.stage || '').toLowerCase().startsWith('rejected') && applicant?.rejectionReason && (
                            <InfoRow label="Rejection Reason" value={applicant.rejectionReason} />
                          )}
                        </div>
                      </div>

                      {/* D - Monthly Review (dynamic) */}
                      {(() => {
                        const paused = !!applicant?.onboardingPaused
                        const startDate = applicant?.onboardingStartDate ? new Date(applicant.onboardingStartDate) : null
                        const started = startDate && !Number.isNaN(startDate.getTime())
                        if (!(started && !paused)) return null
                        const reviews = Array.isArray(applicant?.monthlyReviews) ? [...applicant.monthlyReviews] : []
                        const parsePeriod = (p) => {
                          if (!p) return 0
                          // p expected YYYY-MM
                          const [y, m] = String(p).split('-').map((v) => parseInt(v, 10))
                          if (!y || !m) return 0
                          return y * 100 + m
                        }
                        reviews.sort((a,b) => parsePeriod(b.period) - parsePeriod(a.period))
                        const formatPeriod = (p) => {
                          if (!p) return ''
                          const [y, m] = p.split('-').map((v) => parseInt(v, 10))
                          if (!y || !m) return p
                          const dt = new Date(y, m - 1, 1)
                          return dt.toLocaleString('default', { month: 'short', year: 'numeric' })
                        }
                        return (
                          <div className="rounded-lg border border-border/30 p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-body-sm font-semibold">Monthly Review</h4>
                              <MonthlyReviewActions applicantId={applicant?.id} applicantName={applicant?.name} applicantEmail={applicant?.email} onDone={async () => { await mutate?.() }} />
                            </div>
                            {reviews.length === 0 ? (
                              <div className="text-sm text-muted-foreground">No monthly reviews yet.</div>
                            ) : (
                              <ul className="divide-y divide-border/20 rounded-md border border-border/30 bg-background">
                                {reviews.map((r) => {
                                  const title = r.title || formatPeriod(r.period)
                                  const completed = !!r.hasDocs
                                  return (
                                    <li key={r.id} className="px-3 py-2 flex items-center justify-between gap-3">
                                      <div className="min-w-0">
                                        <div className="text-sm font-medium truncate">{title || formatPeriod(r.period)}</div>
                                        {r.period && (<div className="text-xs text-muted-foreground">{formatPeriod(r.period)}</div>)}
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        {completed ? (
                                          <>
                                            <Badge variant="outline" className="bg-success-muted text-success border-success/20">Completed</Badge>
                                            {Array.isArray(r.docs) && r.docs[0]?.url && (
                                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="View document" onClick={() => {
                                                const d = r.docs[0]
                                                handleFileClick({
                                                  id: `${r.id}-0`,
                                                  name: d.filename || (r.title || formatPeriod(r.period) || 'Review Document'),
                                                  originalName: d.filename,
                                                  type: d.type,
                                                  size: d.size,
                                                  fileUrl: d.url,
                                                  source: 'Monthly Review',
                                                  category: 'Review',
                                                })
                                              }}>
                                                <Eye className="h-4 w-4" />
                                              </Button>
                                            )}
                                          </>
                                        ) : (
                                          <>
                                            <Badge variant="outline" className="bg-warning-muted text-warning border-warning/20">Scheduled</Badge>
                                            <Button size="sm" className="h-8" onClick={() => {
                                              // Open the upload modal prefilled to upload against this scheduled review
                                              // Reuse the existing modal by setting the default title
                                              const monthLabel = title || formatPeriod(r.period)
                                              document.dispatchEvent(new CustomEvent('open-monthly-review-upload', { detail: { applicantId: applicant?.id, uploadTitle: monthLabel, reviewId: r.id } }))
                                            }}>Upload</Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-8 w-8 p-0"
                                              title="Delete scheduled review"
                                              onClick={() => {
                                                setDeleteReviewTarget({ id: r.id, title })
                                                setDeleteReviewOpen(true)
                                              }}
                                            >
                                              <X className="h-4 w-4" />
                                            </Button>
                                          </>
                                        )}
                                      </div>
                                    </li>
                                  )
                                })}
                              </ul>
                            )}
                          </div>
                        )
                      })()}

                      {/* D2 - Onboarding Quizzes (dynamic) - below Monthly Review */}
                      {(() => {
                        if (!isOnboardingActive) return null
                        return (
                          <div className="rounded-lg border border-border/30 p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-body-sm font-semibold">Onboarding Quizzes</h4>
                            <div className="flex items-center gap-1">
                              <Link
                                href={`/admin/quizzes?tab=submissions&applicantId=${encodeURIComponent(applicant?.id || "")}`}
                                className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                                title="View all quiz submissions"
                              >
                                View all
                              </Link>
                              <Button size="sm" className="h-8" variant="ghost" onClick={() => refreshQuizzes?.()}>
                                {quizLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                              </Button>
                            </div>
                            </div>
                            {quizError ? (
                              <div className="text-sm text-error">Failed to load quiz submissions.</div>
                            ) : quizLoading ? (
                              <div className="space-y-2">
                                <div className="h-4 bg-muted animate-pulse rounded" />
                                <div className="h-4 bg-muted animate-pulse rounded w-2/3" />
                                <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
                              </div>
                            ) : (Array.isArray(quizSubmissions) && quizSubmissions.length > 0) ? (
                              <ul className="divide-y divide-border/20 rounded-md border border-border/30 bg-background">
                                {quizSubmissions.map((s) => {
                                  const submitted = s.submittedAt ? new Date(s.submittedAt).toLocaleString() : "—"
                                  const total = s.totalScore || 0
                                  const score = s.score || 0
                                  return (
                                    <li key={s.id} className="px-3 py-2 flex items-center justify-between gap-3">
                                      <div className="min-w-0">
                                        <div className="text-sm font-medium truncate">{s.quizTitle || "Quiz"}</div>
                                        <div className="text-xs text-muted-foreground">{submitted}</div>
                                        <div className="text-xs mt-1">Score: {score} / {total}</div>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        <Badge variant={s.passed ? "outline" : "outline"} className={s.passed ? "bg-success-muted text-success border-success/20" : "bg-error-muted text-error border-error/20"}>{s.passed ? "Passed" : "Failed"}</Badge>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 w-8 p-0"
                                          title="View answers"
                                          onClick={() => { setAnswersModalSubmission(s); setAnswersModalOpen(true) }}
                                        >
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </li>
                                  )
                                })}
                              </ul>
                            ) : (
                              <div className="text-sm text-muted-foreground">No quiz submissions yet.</div>
                            )}
                            <QuizSubmissionAnswersModal
                              open={answersModalOpen}
                              onOpenChange={setAnswersModalOpen}
                              submission={answersModalSubmission}
                              questionsById={quizQuestionsById}
                            />
                          </div>
                        )
                      })()}

                      {/* D3 - Appraisals (visible only when Hired) */}
                      {isHiredStage && (
                        <div className="rounded-lg border border-border/30 p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-body-sm font-semibold">Appraisals</h4>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="Edit template questions"
                                onClick={async () => {
                                  if (!applicant?.id) return
                                  setTemplateLoading(true)
                                  try {
                                    const res = await fetch(`/api/admin/users/${applicant.id}/appraisal-template`)
                                    if (!res.ok) throw new Error("Failed to fetch template")
                                    const data = await res.json()
                                    setTemplateData(data)
                                    setTemplateEditorOpen(true)
                                  } catch (err) {
                                    toast.error(err?.message || "Failed to load template")
                                  } finally {
                                    setTemplateLoading(false)
                                  }
                                }}
                                disabled={templateLoading}
                              >
                                {templateLoading ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Settings className="h-4 w-4" />
                                )}
                              </Button>
                              <Button size="sm" className="h-8" onClick={() => setAppraisalOpen(true)}>Set Date</Button>
                            </div>
                          </div>
                          {(() => {
                            let appraisals = []
                            let parseError = false
                            try {
                              const raw = appraisalHistoryRaw
                              const parsed = typeof raw === "string" ? JSON.parse(raw.trim()) : (raw || {})
                              if (parsed && Array.isArray(parsed.appraisals)) appraisals = parsed.appraisals
                            } catch {
                              if (appraisalHistoryRaw && appraisalHistoryRaw.trim()) parseError = true
                            }
                            if (parseError) return (
                              <div className="rounded-md bg-error-muted border border-error/20 p-3">
                                <div className="flex items-start gap-2">
                                  <AlertCircle className="h-4 w-4 text-error mt-0.5 shrink-0" />
                                  <div className="text-sm text-error">Appraisal history could not be read. The stored data may be corrupt.</div>
                                </div>
                              </div>
                            )

                            // Sort by appraisalDate or updatedAt (newest first)
                            appraisals.sort((a,b) => new Date(b?.appraisalDate || b?.updatedAt || 0) - new Date(a?.appraisalDate || a?.updatedAt || 0))

                            const now = new Date()
                            const getStatus = (a) => {
                              const steps = Array.isArray(a?.steps) ? a.steps : []
                              const total = steps.length
                              const completed = steps.filter((s) => !!s?.completedAt).length
                              const nextIdx = steps.findIndex((s) => !s?.completedAt)
                              const allDone = total > 0 && completed === total
                              const appraisalDt = a?.appraisalDate ? new Date(a.appraisalDate) : null
                              const overdue = !allDone && appraisalDt && appraisalDt < now
                              if (allDone) return { label: "Completed", tone: "success" }
                              if (overdue) return { label: "Overdue", tone: "error" }
                              if (appraisalDt && appraisalDt > now) return { label: "Upcoming", tone: "secondary" }
                              return { label: "In Progress", tone: "info" }
                            }
                            const renderStatusBadge = (status) => {
                              if (status.tone === "success") return <Badge variant="outline" className="bg-success-muted text-success border-success/20">{status.label}</Badge>
                              if (status.tone === "error") return <Badge variant="outline" className="bg-error-muted text-error border-error/20">{status.label}</Badge>
                              if (status.tone === "info") return <Badge variant="outline" className="bg-info-muted text-info border-info/20">{status.label}</Badge>
                              return <Badge variant="secondary">{status.label}</Badge>
                            }

                            return appraisals.length > 0 ? (
                              <ul className="space-y-3">
                                {appraisals.map((a, idx) => {
                                  const steps = Array.isArray(a?.steps) ? a.steps : []
                                  const nextIdx = steps.findIndex((s) => !s?.completedAt)
                                  const currentStep = nextIdx >= 0 ? steps[nextIdx] : null
                                  const status = getStatus(a)
                                  const isCurrent = idx === 0
                                  return (
                                    <li key={`${a?.year || 'y'}-${idx}`} className="rounded-md border border-border/30 p-3">
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-2">
                                            <div className="text-sm font-semibold truncate">Year {a?.year || '—'}</div>
                                            {isCurrent && <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Current</Badge>}
                                          </div>
                                          <div className="text-xs text-muted-foreground">
                                            Appraisal: {a?.appraisalDate ? formatDate(a.appraisalDate) : '—'}
                                            {a?.updatedAt ? ` • Updated ${formatDate(a.updatedAt)}` : ''}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            title="View questions"
                                            onClick={() => {
                                              setAppraisalViewerData({
                                                questions: a?.preappraisalQuestions,
                                                appraisalDate: a?.appraisalDate,
                                                year: a?.year
                                              })
                                              setAppraisalViewerOpen(true)
                                            }}
                                          >
                                            <Eye className="h-4 w-4" />
                                          </Button>
                                          {renderStatusBadge(status)}
                                        </div>
                                      </div>

                                      {isCurrent && currentStep && (
                                        <div className="mt-3 text-xs">
                                          <span className="text-muted-foreground">Current step: </span>
                                          <span className="font-medium">{currentStep?.label || '—'}</span>
                                        </div>
                                      )}

                                      {/* Toggle for non-current appraisals */}
                                      {!isCurrent && steps.length > 0 && (
                                        <div className="mt-3">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 px-2"
                                            onClick={() => setExpandedAppraisals((prev) => ({ ...prev, [idx]: !prev[idx] }))}
                                          >
                                            <ChevronDown className={`h-4 w-4 mr-1 transition-transform ${expandedAppraisals[idx] ? "rotate-180" : ""}`} />
                                            <span className="text-xs">{expandedAppraisals[idx] ? "Hide steps" : "Show steps"}</span>
                                          </Button>
                                        </div>
                                      )}

                                      {(isCurrent || expandedAppraisals[idx]) && steps.length > 0 && (
                                        <div className="mt-3">
                                          <ol className="space-y-2">
                                            {steps.map((s, i) => {
                                              const done = !!s?.completedAt
                                              const isActive = !done && (i === nextIdx)
                                              const textClass = done ? "" : "text-muted-foreground"
                                              const canMarkDone = !done && s?.id !== "set_appraisal_date"
                                              const isMarkingThis = markingStepDone === s?.id
                                              return (
                                                <li key={`${s?.id || 'step'}-${i}`} className="flex items-start justify-between gap-2">
                                                  <div className="flex items-start gap-2 min-w-0">
                                                    <div className="pt-0.5 shrink-0">
                                                      {done ? (
                                                        <CheckCircle2 className="h-4 w-4 text-success" />
                                                      ) : isActive ? (
                                                        <AlertCircle className="h-4 w-4 text-warning" />
                                                      ) : (
                                                        <Circle className="h-4 w-4 text-muted-foreground" />
                                                      )}
                                                    </div>
                                                    <div className="min-w-0">
                                                      <div className={`text-xs font-medium ${textClass}`}>{s?.label || 'Step'}</div>
                                                      {done ? <div className="text-[11px] text-muted-foreground mt-0.5">Completed • {formatDate(s.completedAt)}</div> : null}
                                                    </div>
                                                  </div>
                                                  {canMarkDone && (
                                                    <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      className="h-6 px-2 text-[11px] shrink-0"
                                                      disabled={!!markingStepDone}
                                                      onClick={() => handleMarkStepDone(s.id)}
                                                    >
                                                      {isMarkingThis ? <Loader2 className="h-3 w-3 animate-spin" /> : "Mark done"}
                                                    </Button>
                                                  )}
                                                </li>
                                              )
                                            })}
                                          </ol>
                                        </div>
                                      )}
                                    </li>
                                  )
                                })}
                              </ul>
                            ) : (
                              <div className="text-sm text-muted-foreground">No appraisal history yet.</div>
                            )
                          })()}
                          <Separator className="my-3" />
                          <AppraisalDateSetter
                            open={appraisalOpen}
                            onOpenChange={setAppraisalOpen}
                            applicantId={applicant?.id}
                            applicantName={applicant?.name}
                            applicantEmail={applicant?.email}
                            currentDate={applicant?.appraisalDate}
                            appraisalHistoryRaw={appraisalHistoryRaw}
                            onUpdated={async () => { await mutate?.() }}
                          />
                          
                          {/* Questions Viewer Modal */}
                          <AppraisalQuestionsViewer
                            open={appraisalViewerOpen}
                            onOpenChange={setAppraisalViewerOpen}
                            questions={appraisalViewerData?.questions}
                            appraisalDate={appraisalViewerData?.appraisalDate}
                            year={appraisalViewerData?.year}
                          />
                          
                          {/* Template Editor Modal */}
                          <AppraisalQuestionEditor
                            open={templateEditorOpen}
                            onOpenChange={setTemplateEditorOpen}
                            questions={templateData?.template?.questions || []}
                            roleKey={templateData?.template?.roleKey || templateData?.jobName || "unknown"}
                            isTemplate={true}
                            loading={templateLoading}
                            onSave={async (questions) => {
                              const res = await fetch(`/api/admin/users/${applicant?.id}/appraisal-template`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ questions })
                              })
                              if (!res.ok) {
                                const err = await res.json().catch(() => ({}))
                                throw new Error(err?.error || "Failed to save template")
                              }
                            }}
                          />
                        </div>
                      )}

                      {/* F - Assigned Tasks */}
                      <ApplicantTasksSection applicantId={applicant?.id} enabled={!!applicant?.id && wideView} />

                      {/* E - Feedback Documents */}
                      <div className="rounded-lg border border-border/30 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-body-sm font-semibold">Feedback Documents</div>
                          <div className="flex items-center gap-2">
                            <Select value={selectedFeedbackStage} onValueChange={setSelectedFeedbackStage}>
                              <SelectTrigger className="h-8 w-56"><SelectValue placeholder="Select feedback stage" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="First Interview">First Interview Feedback</SelectItem>
                                <SelectItem value="Second Interview">Second Interview Feedback</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button size="sm" className="h-8" disabled={!selectedFeedbackStage} onClick={() => setFeedbackModalOpen(true)}>+ Add Feedback</Button>
                          </div>
                        </div>
                        {Array.isArray(feedbackDocuments) && feedbackDocuments.length > 0 ? (
                          <div className="space-y-3">
                            {feedbackDocuments.map((doc, idx) => {
                              const stageLabel = doc.interviewStage || doc.stage
                              const friendly =
                                stageLabel === "First Interview" ? "First Interview Doc" :
                                stageLabel === "Second Interview" ? "Second Interview Doc" :
                                (doc.name || doc.documentType || doc.originalName || "Document")
                              const rating = parseInt(doc.rating || 0, 10) || 0
                              const uploadedAt = doc.uploadedAt || doc.createdAt
                              return (
                                <div key={`${doc.id || idx}-${idx}`} className="rounded-md border p-3 w-full">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="text-sm font-medium truncate">{friendly}</div>
                                      <div className="text-xs text-muted-foreground">{stageLabel || 'Feedback'}{uploadedAt ? ` • ${formatDate(uploadedAt)}` : ''}</div>
                                      {!!doc.notes && (
                                        <div className="text-xs text-muted-foreground truncate">{doc.notes}</div>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      {rating > 0 && (
                                        <div className="flex items-center gap-0.5">
                                          {[1,2,3,4,5].map((n) => (
                                            <Star key={n} className={`h-4 w-4 ${n <= rating ? "fill-warning stroke-warning" : "stroke-muted-foreground"}`} />
                                          ))}
                                        </div>
                                      )}
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 shrink-0"
                                        onClick={() => handleFileClick({
                                          id: doc.id || `${idx}`,
                                          name: doc.name || doc.documentType || 'Feedback Document',
                                          originalName: doc.originalName || doc.fileName,
                                          type: doc.type || doc.fileType || 'application/octet-stream',
                                          size: doc.size || doc.fileSize || 0,
                                          fileUrl: doc.fileUrl || doc.url,
                                          source: 'Feedback',
                                          category: stageLabel || 'Interview',
                                        })}
                                        title="View document"
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">No feedback documents yet.</div>
                        )}
                      </div>

                      {/* C - Documents Grid + Add */}
                      <div className="rounded-lg border border-border/30 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-body-sm font-semibold">Documents</div>
                          <div className="flex items-center gap-2">
                            {(() => {
                              const valueKey = selectedDocMeta ? `${selectedDocMeta.table}::${selectedDocMeta.fieldId}` : ""
                              return (
                                <Select
                                  value={valueKey}
                                  onValueChange={(val) => {
                                    const [table, fieldId] = String(val).split("::")
                                    const all = [...docCoreOptions, ...docDocumentsOptions]
                                    const meta = all.find((o) => o.table === table && o.fieldId === fieldId)
                                    setSelectedDocMeta(meta || null)
                                    setSelectedDocType(meta?.label || "")
                                    setShowAddDropzone(true)
                                    setTimeout(() => addDocRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 0)
                                  }}
                                  disabled={docOptionsLoading || (!docCoreOptions.length && !docDocumentsOptions.length)}
                                >
                                  <SelectTrigger className="h-8 w-56"><SelectValue placeholder={docOptionsLoading ? "Loading..." : "Select missing document"} /></SelectTrigger>
                                  <SelectContent>
                                    <div className="px-2 py-1 text-xs text-muted-foreground">Core</div>
                                    {docCoreOptions.map((o) => (
                                      <SelectItem key={`${o.table}::${o.fieldId}`} value={`${o.table}::${o.fieldId}`}>{o.label}</SelectItem>
                                    ))}
                                    <Separator className="my-1" />
                                    <div className="px-2 py-1 text-xs text-muted-foreground">Documents</div>
                                    {docDocumentsOptions.map((o) => (
                                      <SelectItem key={`${o.table}::${o.fieldId}`} value={`${o.table}::${o.fieldId}`}>{o.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )
                            })()}
                            <Button size="sm" disabled={!selectedDocType || !hasPendingFiles} onClick={() => { try { dropzoneSubmitRef.current?.() } catch {} }} className="h-8">+ Add</Button>
                          </div>
                        </div>
                        {selectedDocType && (
                          <div ref={addDocRef} className="mb-3">
                            <div className="text-xs text-muted-foreground mb-2">Upload files for <span className="text-error">{selectedDocType}</span></div>
                            <UploadDropzone registerSubmit={(fn) => { dropzoneSubmitRef.current = fn }} onFilesChange={(files) => setHasPendingFiles(files.length > 0)} showActions={false} onSubmit={async (files) => {
                              const optimistic = files.map((f, i) => ({ id: `optimistic-${Date.now()}-${i}`, name: `${selectedDocType} - ${f.name}`, category: selectedDocMeta?.table || 'Application', source: 'Upload', uploadedAt: new Date().toISOString(), fileUrl: '', status: 'Uploading…', type: f.type || 'Unknown', field: selectedDocType, originalName: f.name, size: f.size || 0 }))
                              setOptimisticDocs((prev) => [...prev, ...optimistic])
                              try {
                                if (!applicant || !files?.length || !selectedDocType || !selectedDocMeta) return
                                const fd = new FormData(); files.forEach((f) => fd.append('files', f)); fd.append('fieldId', selectedDocMeta.fieldId)
                                const endpoint = selectedDocMeta.table === 'Documents'
                                  ? `/api/admin/users/${applicant.id}/documents/attachments`
                                  : `/api/admin/users/${applicant.id}/attachments`
                                const res = await fetch(endpoint, { method: 'POST', body: fd })
                                if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err?.error || 'Upload failed') }
                                await mutate?.()
                              } finally { setOptimisticDocs([]); setHasPendingFiles(false); setSelectedDocType(''); setSelectedDocMeta(null) }
                            }} />
                          </div>
                        )}
                        {(applicant?.allDocuments?.length || 0) + (optimisticDocs?.length || 0) > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {[...(applicant?.allDocuments || []), ...(optimisticDocs || [])].map((doc, idx) => (
                              <div key={`${doc.id}-${idx}`} className="rounded-md border p-3 flex items-center justify-between">
                                <div className="min-w-0 flex items-center gap-2">
                                  <FileText className="h-4 w-4 shrink-0" />
                                  <div className="min-w-0">
                                    <div className="text-sm truncate">{doc.name}</div>
                                    <div className="text-xs text-muted-foreground truncate">{doc.category} • {doc.source}</div>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 shrink-0"
                                  onClick={() => handleFileClick(doc)}
                                  title="View document"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">No documents yet.</div>
                        )}
                      </div>
                    </section>
                  </div>
                ) : (
                <Tabs value={tab} onValueChange={setTab}>

                  <TabsContent value="overview" className="mt-4">
                    {isLoading ? (
                      <div className="space-y-4">
                        <div className="h-4 bg-muted animate-pulse rounded" />
                        <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                        <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                          <InfoRow
                            label="Interview Dates"
                            value={
                              <span>
                                First: {applicant?.interviewDate ? formatDate(applicant.interviewDate) : "—"} {" • "} Second:{" "}
                                {applicant?.secondInterviewDate ? formatDate(applicant.secondInterviewDate) : "—"}
                              </span>
                            }
                          />
                          <InfoRow label="Source" value={applicant?.source} />
                        </div>

                        <Separator className="my-4" />

                        {/* Applicant details shown above timeline; buttons removed */}

                        {/* Timeline (after details) */}
                        <div className="mt-4">
                          <div className="text-sm font-semibold mb-4">Application Timeline</div>
                          {applicationTimelineItems.length > 0 ? (
                            <ol className="relative border-l pl-4">
                              {applicationTimelineItems.map((ev, idx) => (
                                <li key={`${ev.label}-${idx}`} className="mb-4 ml-2">
                                  <span className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full bg-foreground" />
                                  <div className="text-sm font-medium">{ev.label}</div>
                                  <div className="text-xs text-muted-foreground">{ev.at ? formatDate(ev.at) : "—"}</div>
                                </li>
                              ))}
                            </ol>
                          ) : (
                            <div className="text-xs text-muted-foreground">No stage history yet.</div>
                          )}
                        </div>
                      </>
                    )}
                  </TabsContent>

                  {/* Documents section removed with tabs */}

                  {/* Feedback section removed with tabs */}
                </Tabs>
                )}
              </div>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>

      {/* File Viewer Modal - Only render when there's a selected file */}
      {selectedFile && (
        <ApplicantFileViewerModal
          file={selectedFile}
          open={fileViewerOpen}
          onOpenChange={handleFileViewerClose}
        />
      )}

      {/* Confirm Stage Change */}
      <Dialog open={confirmOpen} onOpenChange={(v) => { if (!confirming) setConfirmOpen(v) }}>
        <DialogContent className="rounded-xl">
          <DialogHeader>
            <DialogTitle>Confirm Stage Change</DialogTitle>
            <DialogDescription>
              {confirmStage === "First Interview Invite Sent" && "This will send the first interview invite to the applicant."}
              {confirmStage === "Second Interview Invite Sent" && "This will send the second interview invite to the applicant."}
              {confirmStage === "Hired" && "This will mark the applicant as Hired."}
              {(!["First Interview Invite Sent","Second Interview Invite Sent","Hired"].includes(confirmStage)) && `Change stage to "${confirmStage}"?`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={confirming} className="h-8">Cancel</Button>
            <Button onClick={confirmAndAdvance} disabled={confirming} className="h-8">
              {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Confirmation */}
      <Dialog open={rejectOpen} onOpenChange={(v) => { if (!rejecting) setRejectOpen(v) }}>
        <DialogContent className="rounded-xl">
          <DialogHeader>
            <DialogTitle>Reject Applicant</DialogTitle>
            <DialogDescription>
              This will set the stage to "Rejected". Are you sure?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" className="h-8" onClick={() => setRejectOpen(false)} disabled={rejecting}>Cancel</Button>
            <Button
              variant="destructive"
              className="h-8"
              disabled={rejecting}
              onClick={async () => {
                if (!applicant?.id) return
                try {
                  setRejecting(true)
                  const res = await fetch(`/api/admin/users/${applicant.id}/stage`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ newStage: "Rejected", source: "Applicant Drawer - Reject Button" })
                  })
                  if (!res.ok) {
                    const err = await res.json().catch(() => ({}))
                    throw new Error(err?.error || "Failed to reject applicant")
                  }
                  toast.success("Applicant rejected")
                  setRejectOpen(false)
                  await mutate?.()
                  onApplicantUpdated?.()
                } catch (e) {
                  toast.error(e?.message || "Failed to reject applicant")
                } finally {
                  setRejecting(false)
                }
              }}
            >
              {rejecting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reject"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stage Override Flow */}
      <Dialog open={overrideOpen} onOpenChange={(v) => { if (!overrideSubmitting) { setOverrideOpen(v); if (!v) { setOverrideConfirmed(false); setOverrideAction("") } } }}>
        <DialogContent className="rounded-xl">
          <DialogHeader>
            <DialogTitle>Override Stage</DialogTitle>
            <DialogDescription>
              {overrideConfirmed ? "Choose an action to set the applicant's stage." : "Do you want to override the stage change?"}
            </DialogDescription>
          </DialogHeader>
          {!overrideConfirmed ? (
            <div className="flex justify-end gap-2">
              <Button variant="ghost" className="h-8" onClick={() => setOverrideOpen(false)}>Cancel</Button>
              <Button className="h-8" onClick={() => setOverrideConfirmed(true)}>Proceed</Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Action</Label>
                <Select value={overrideAction} onValueChange={setOverrideAction}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select action" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="First">Send First Interview Invite</SelectItem>
                    <SelectItem value="Second">Send Second Interview</SelectItem>
                    <SelectItem value="Hire">Hire!</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" className="h-8" onClick={() => setOverrideOpen(false)} disabled={overrideSubmitting}>Cancel</Button>
                <Button
                  className="h-8"
                  disabled={!overrideAction || overrideSubmitting}
                  onClick={async () => {
                    if (!applicant?.id) return
                    try {
                      setOverrideSubmitting(true)
                      let newStage = ""
                      if (overrideAction === "First") newStage = "First Interview Invite Sent"
                      else if (overrideAction === "Second") newStage = "Second Interview Invite Sent"
                      else if (overrideAction === "Hire") newStage = "Hired"
                      if (!newStage) throw new Error("Invalid action")
                      const res = await fetch(`/api/admin/users/${applicant.id}/stage`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ newStage, source: "Applicant Drawer - Override" })
                      })
                      if (!res.ok) {
                        const err = await res.json().catch(() => ({}))
                        throw new Error(err?.error || "Failed to change stage")
                      }
                      toast.success(`Stage updated to ${newStage}`)
                      setOverrideOpen(false)
                      setOverrideConfirmed(false)
                      setOverrideAction("")
                      await mutate?.()
                      onApplicantUpdated?.()
                    } catch (e) {
                      toast.error(e?.message || "Failed to change stage")
                    } finally {
                      setOverrideSubmitting(false)
                    }
                  }}
                >
                  {overrideSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Feedback Upload Modal */}
      <FeedbackUploadModal
        open={feedbackModalOpen}
        onOpenChange={(v) => { setFeedbackModalOpen(v); if (!v) { setSelectedFeedbackStage("") } }}
        defaultStage={selectedFeedbackStage}
        applicantId={applicant?.id}
        onDone={async () => { await refreshFeedback?.() }}
      />

      {/* Delete Scheduled Monthly Review */}
      <Dialog open={deleteReviewOpen} onOpenChange={(v) => { if (!deletingReview) setDeleteReviewOpen(v) }}>
        <DialogContent className="rounded-xl">
          <DialogHeader>
            <DialogTitle>Delete scheduled review?</DialogTitle>
            <DialogDescription>
              This will permanently remove the scheduled monthly review{deleteReviewTarget?.title ? ` (“${deleteReviewTarget.title}”)` : ""}. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteReviewOpen(false)} disabled={deletingReview} className="h-8">Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteScheduledReview} disabled={deletingReview} className="h-8">
              {deletingReview ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function RatingStars({ value = 0, onChange }) {
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map((n) => (
        <button key={n} type="button" className="h-6 w-6 flex items-center justify-center" onClick={() => onChange?.(n)} aria-label={`${n} stars`}>
          <Star className={`h-5 w-5 ${n <= value ? "fill-warning stroke-warning" : "stroke-muted-foreground"}`} />
        </button>
      ))}
    </div>
  )
}

function ApplicantTasksSection({ applicantId, enabled }) {
  const { active, overdue, completed, pendingVerification, isLoading, refresh } = useApplicantTasks(applicantId, {
    enabled: enabled && !!applicantId,
    revalidateOnFocus: false,
  })

  const [openGroups, setOpenGroups] = useState({ active: true, overdue: true, completed: false, pendingVerification: true })
  const toggle = (key) => setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }))

  const priorityDotClass = (priority) => {
    const p = (priority || "").toLowerCase()
    if (p === "very high" || p === "high") return "bg-error"
    if (p === "medium") return "bg-warning"
    return "bg-success"
  }

  const fmtDate = (d) => {
    if (!d) return null
    try {
      return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    } catch { return String(d) }
  }

  const totalCount = active.length + overdue.length + completed.length + pendingVerification.length

  const groups = [
    {
      key: "active",
      label: "Active",
      tasks: active,
      accentClass: "text-info",
      badgeClass: "bg-info-muted text-info border-info/20",
      borderClass: "border-l-info",
      emptyText: "No active tasks",
    },
    {
      key: "overdue",
      label: "Overdue",
      tasks: overdue,
      accentClass: "text-error",
      badgeClass: "bg-error-muted text-error border-error/20",
      borderClass: "border-l-error",
      emptyText: "No overdue tasks",
    },
    {
      key: "completed",
      label: "Completed",
      tasks: completed,
      accentClass: "text-success",
      badgeClass: "bg-success-muted text-success border-success/20",
      borderClass: "border-l-success",
      emptyText: "No completed tasks",
    },
    {
      key: "pendingVerification",
      label: "Awaiting Review",
      tasks: pendingVerification,
      accentClass: "text-warning",
      badgeClass: "bg-warning-muted text-warning border-warning/20",
      borderClass: "border-l-warning",
      emptyText: "No tasks awaiting review",
    },
  ]

  return (
    <div className="rounded-lg border border-border/30 p-4">
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-baseline gap-2">
          <h4 className="text-body-sm font-semibold">Assigned Tasks</h4>
          {!isLoading && totalCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {[
                active.length > 0 && `${active.length} active`,
                overdue.length > 0 && `${overdue.length} overdue`,
                completed.length > 0 && `${completed.length} done`,
                pendingVerification.length > 0 && `${pendingVerification.length} awaiting review`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={() => refresh()}
          title="Refresh tasks"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-1.5">
          {[80, 60, 70].map((w, i) => (
            <div key={i} className="flex items-center gap-2 py-1.5">
              <div className="h-2 w-2 rounded-full bg-muted animate-pulse flex-shrink-0" />
              <div
                className="h-3 rounded bg-muted animate-pulse"
                style={{ width: `${w}%`, animationDelay: `${i * 80}ms` }}
              />
            </div>
          ))}
        </div>
      ) : totalCount === 0 ? (
        <p className="text-xs text-muted-foreground py-3 text-center">No tasks linked to this applicant.</p>
      ) : (
        <div className="space-y-1.5">
          {groups.map((g) => (
            <div key={g.key} className="rounded-md overflow-hidden border border-border/20">
              {/* Group toggle header */}
              <button
                type="button"
                onClick={() => toggle(g.key)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-muted/40 transition-colors duration-150 text-left"
              >
                <div className="flex items-center gap-1.5">
                  <span className={`text-[11px] font-semibold tracking-wide uppercase ${g.accentClass}`}>
                    {g.label}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 h-4 font-medium border ${
                      g.tasks.length > 0 ? g.badgeClass : "text-muted-foreground border-border/30"
                    }`}
                  >
                    {g.tasks.length}
                  </Badge>
                </div>
                <motion.div animate={{ rotate: openGroups[g.key] ? 180 : 0 }} transition={{ duration: 0.15 }}>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </motion.div>
              </button>

              {/* Animated group body */}
              <AnimatePresence initial={false}>
                {openGroups[g.key] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="px-2 pb-2 pt-0.5 space-y-1">
                      {g.tasks.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground/60 italic py-1.5 text-center">
                          {g.emptyText}
                        </p>
                      ) : (
                        g.tasks.map((task) => (
                          <div
                            key={task.id}
                            className={`rounded border-l-[3px] ${g.borderClass} pl-2 pr-2 py-1.5 bg-muted/20 hover:bg-muted/40 transition-colors duration-100`}
                          >
                            {/* Main task row */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-1.5 min-w-0 flex-1">
                                {g.key === "pendingVerification" ? (
                                  <ClockIcon className="mt-[3px] h-3 w-3 text-warning flex-shrink-0" />
                                ) : (
                                  <span
                                    className={`mt-[5px] h-1.5 w-1.5 rounded-full flex-shrink-0 ${priorityDotClass(task.priority)}`}
                                    title={task.priority}
                                  />
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm text-foreground leading-tight truncate">{task.title}</p>
                                  {task.taskType && task.taskType !== "Default" && (
                                    <span className="inline-block mt-0.5 text-[10px] px-1.5 py-0 rounded-sm bg-muted text-muted-foreground font-normal leading-4">
                                      {task.taskType}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {/* Due date (admin tasks) */}
                              {g.key !== "pendingVerification" && task.dueDate && (
                                <div
                                  className={`flex items-center gap-0.5 flex-shrink-0 text-[10px] ${
                                    g.key === "overdue" ? "text-error font-medium" : "text-muted-foreground"
                                  }`}
                                >
                                  <ClockIcon className="h-2.5 w-2.5" />
                                  <span>{fmtDate(task.dueDate)}</span>
                                </div>
                              )}
                            </div>

                            {/* Verified-by row — completed tasks only */}
                            {g.key === "completed" && task.completedByName && (
                              <div className="flex items-center gap-1 mt-1 pt-1 border-t border-border/10">
                                <CheckCircle2 className="h-2.5 w-2.5 text-success flex-shrink-0" />
                                <span className="text-[10px] text-muted-foreground leading-none">
                                  Verified by{" "}
                                  <span className="font-medium text-foreground">{task.completedByName}</span>
                                  {task.completedAt && (
                                    <span className="text-muted-foreground/70"> · {fmtDate(task.completedAt)}</span>
                                  )}
                                </span>
                              </div>
                            )}

                            {/* Hire completion row — pending verification tasks only */}
                            {g.key === "pendingVerification" && task.completedAt && (
                              <div className="flex items-center gap-1 mt-1 pt-1 border-t border-border/10">
                                <CheckCircle2 className="h-2.5 w-2.5 text-warning flex-shrink-0" />
                                <span className="text-[10px] text-muted-foreground leading-none">
                                  Completed by hire
                                  <span className="text-muted-foreground/70"> · {fmtDate(task.completedAt)}</span>
                                </span>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function FeedbackUploadModal({ open, onOpenChange, defaultStage = "", applicantId, onDone }) {
  const [stage, setStage] = useState(defaultStage || "")
  const [notesFirst, setNotesFirst] = useState("")
  const [notesSecond, setNotesSecond] = useState("")
  const [rating, setRating] = useState(0)
  const [hasFiles, setHasFiles] = useState(false)
  const submitRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => { if (defaultStage) setStage(defaultStage) }, [defaultStage])

  const handleSubmit = async (files) => {
    const fd = new FormData()
    fd.append('interviewStage', stage)
    const notes = stage === "First Interview" ? notesFirst : stage === "Second Interview" ? notesSecond : ""
    if (notes) fd.append('notes', notes)
    if (rating) fd.append('rating', String(rating))
    for (const f of files || []) fd.append('files', f)
    const res = await fetch(`/api/admin/users/${applicantId}/feedback`, { method: 'POST', body: fd })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.userError || err?.error || "Upload failed")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Interview Feedback</DialogTitle>
          <DialogDescription>Upload a feedback document and optional notes and rating.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Interview Stage</Label>
              <Select value={stage} onValueChange={setStage}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select stage" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="First Interview">First Interview</SelectItem>
                  <SelectItem value="Second Interview">Second Interview</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Rating</Label>
              <RatingStars value={rating} onChange={setRating} />
            </div>
          </div>
          {stage === "First Interview" && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">First Interview Notes (optional)</Label>
              <Input value={notesFirst} onChange={(e) => setNotesFirst(e.target.value)} placeholder="Notes..." className="h-9" />
            </div>
          )}
          {stage === "Second Interview" && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Second Interview Notes (optional)</Label>
              <Input value={notesSecond} onChange={(e) => setNotesSecond(e.target.value)} placeholder="Notes..." className="h-9" />
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              {stage === "Second Interview" ? "Second Interview Doc" : stage === "First Interview" ? "First Interview Doc" : "Feedback Document"}
            </Label>
          </div>
          <UploadDropzone
            registerSubmit={(fn) => { submitRef.current = fn }}
            onFilesChange={(files) => setHasFiles(files.length > 0)}
            showActions={false}
            maxFiles={3}
            onSubmit={async (files) => {
              try {
                await handleSubmit(files)
                toast.success('Feedback uploaded')
                onOpenChange?.(false)
                await onDone?.()
              } catch (e) {
                toast.error(e?.message || 'Upload failed')
              }
            }}
          />
          <div className="flex justify-end">
            <Button size="sm" disabled={!stage || !hasFiles || uploading} onClick={async () => { try { setUploading(true); await submitRef.current?.() } finally { setUploading(false) } }}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Upload'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
function MonthlyReviewActions({ applicantId, applicantName = "Applicant", applicantEmail = "", onDone }) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState("")
  const [confirming, setConfirming] = useState(false)
  const [uploadMode, setUploadMode] = useState(false)
  const [hasFiles, setHasFiles] = useState(false)
  const submitRef = useRef(null)
  const [currentMonth, setCurrentMonth] = useState(() => new Date())
  const [eventsByDate, setEventsByDate] = useState({})
  const [dayEvents, setDayEvents] = useState([])
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [hasConflict, setHasConflict] = useState(false)
  const [title, setTitle] = useState("")
  const [eventType, setEventType] = useState("Meeting")
  const [uploadTitle, setUploadTitle] = useState(() => {
    const d = new Date()
    return `${d.toLocaleString('default', { month: 'long' })} ${d.getFullYear()}`
  })
  const [uploading, setUploading] = useState(false)
  const [targetReviewId, setTargetReviewId] = useState("")

  const timeOptions = useMemo(() => {
    const opts = []
    for (let h = 8; h <= 18; h++) {
      for (const m of [0, 30]) {
        const hh = String(h).padStart(2, '0')
        const mm = String(m).padStart(2, '0')
        opts.push({ value: `${hh}:${mm}`, label: `${((h % 12) || 12)}:${mm} ${h < 12 ? 'AM' : 'PM'}` })
      }
    }
    return opts
  }, [])

  // Fetch month events on open or month change
  useEffect(() => {
    if (!open) return
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const start = new Date(year, month, 1).toISOString()
    const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString()
    ;(async () => {
      try {
        const res = await fetch(`/api/admin/dashboard/calendar?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`)
        if (!res.ok) throw new Error('Failed to fetch events')
        const data = await res.json()
        const map = {}
        for (const ev of data || []) {
          const s = new Date(ev.start?.dateTime || ev.start?.date)
          const e = new Date(ev.end?.dateTime || ev.end?.date)
          const key = s.toISOString().slice(0,10)
          if (!map[key]) map[key] = []
          map[key].push({
            title: ev.summary || 'Event',
            start: s,
            end: e,
          })
        }
        setEventsByDate(map)
      } catch (e) {
        console.error(e)
        setEventsByDate({})
      }
    })()
  }, [open, currentMonth])

  // Allow other components to open upload mode for a specific scheduled review
  useEffect(() => {
    const handler = (e) => {
      const detail = e?.detail || {}
      if (detail?.applicantId !== applicantId) return
      setTargetReviewId(String(detail?.reviewId || ""))
      if (detail?.uploadTitle) setUploadTitle(String(detail.uploadTitle))
      setOpen(true)
      setUploadMode(true)
    }
    document.addEventListener('open-monthly-review-upload', handler)
    return () => document.removeEventListener('open-monthly-review-upload', handler)
  }, [applicantId])

  // Update day events and conflict calc
  useEffect(() => {
    setDayEvents(eventsByDate[date] || [])
  }, [eventsByDate, date])

  useEffect(() => {
    if (!date || !startTime || !endTime) { setHasConflict(false); return }
    const [sh, sm] = startTime.split(':').map(Number)
    const [eh, em] = endTime.split(':').map(Number)
    const start = new Date(`${date}T${startTime}:00`)
    const end = new Date(`${date}T${endTime}:00`)
    if (end <= start) { setHasConflict(true); return }
    const conflict = (eventsByDate[date] || []).some(ev => {
      const s = ev.start, e = ev.end
      return (start < e && end > s)
    })
    setHasConflict(conflict)
  }, [date, startTime, endTime, eventsByDate])

  return (
    <>
      <Button size="sm" className="h-8" onClick={() => { setOpen(true); setUploadMode(false); setTitle(`Monthly Review with ${applicantName || 'Applicant'}`) }}>
        + New Review
      </Button>
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setDate(""); setUploadMode(false); setHasFiles(false) } }}>
        <DialogContent className="rounded-xl">
          <DialogHeader>
            <DialogTitle>New Monthly Review</DialogTitle>
            <DialogDescription>
              Schedule a review date, or{" "}
              <button type="button" className="underline underline-offset-2 text-muted-foreground" onClick={() => setUploadMode(true)}>
                upload a review document
              </button>
            </DialogDescription>
          </DialogHeader>
          {!uploadMode ? (
            <div className="mt-3 space-y-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Event Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`Monthly Review with ${applicantName || 'Applicant'}`} className="h-9" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Event Type</Label>
                  <Select value={eventType} onValueChange={setEventType}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Select event type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Meeting">Meeting</SelectItem>
                      <SelectItem value="Appointment">Appointment</SelectItem>
                      <SelectItem value="Deadline">Deadline</SelectItem>
                      <SelectItem value="Event">Event</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <MonthOnlyPicker
                selected={date}
                onSelect={(val) => setDate(val)}
                currentMonth={currentMonth}
                onMonthChange={setCurrentMonth}
                eventsByDate={eventsByDate}
              />
              {/* Selected day details and time selection */}
              {date && (
                <div className="rounded-md border border-border/30 p-3">
                  <div className="text-sm font-medium mb-2">{date}</div>
                  {dayEvents.length > 0 ? (
                    <div className="space-y-1 mb-3">
                      {dayEvents.map((ev, i) => (
                        <div key={i} className="text-xs text-muted-foreground flex items-center gap-2">
                          <ClockIcon className="h-3 w-3" />
                          {ev.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {ev.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          <span className="opacity-80">• {ev.title}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground mb-3">No events for this day</div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={startTime} onValueChange={(v) => {
                      setStartTime(v)
                      if (endTime && endTime <= v) {
                        const next = timeOptions.find((t) => t.value > v)
                        setEndTime(next ? next.value : "")
                      }
                    }}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Start time" /></SelectTrigger>
                      <SelectContent>
                        {timeOptions.map((t) => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    <Select value={endTime} onValueChange={setEndTime}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="End time" /></SelectTrigger>
                      <SelectContent>
                        {(startTime ? timeOptions.filter((t) => t.value > startTime) : timeOptions).map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {hasConflict && (
                    <div className="mt-2 text-xs text-error">Selected time overlaps with an existing event.</div>
                  )}
                  {startTime && endTime && endTime <= startTime && (
                    <div className="mt-1 text-xs text-error">End time must be after start time.</div>
                  )}
                </div>
              )}
              <div className="flex justify-end">
                <Button
                  disabled={!date || !startTime || !endTime || endTime <= startTime || !title.trim() || confirming || hasConflict}
                  onClick={async () => {
                    try {
                      setConfirming(true)
                      // 1) Update Airtable schedule (audit + notification inside route)
                      const res = await fetch(`/api/admin/users/${applicantId}/monthly-review`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date, startTime, endTime, title }) })
                      if (!res.ok) throw new Error('Failed to schedule')
                      // 2) Create Google Calendar event (same format used in CalendarPreview)
                      const startDT = `${date}T${startTime}:00`
                      const endDT = `${date}T${endTime}:00`
                      const calRes = await fetch('/api/admin/dashboard/calendar', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          summary: `${eventType}: ${title}`,
                          description: `${eventType} for applicant ${applicantName}${applicantEmail ? '' : ' • Attendee: applicant email unavailable (added to description)'} `,
                          start: { dateTime: startDT, timeZone: 'Europe/London' },
                          end: { dateTime: endDT, timeZone: 'Europe/London' },
                          attendees: (applicantEmail ? [{ email: applicantEmail, displayName: applicantName }] : []),
                          createMeet: false,
                        }),
                      })
                      if (!calRes.ok) throw new Error('Calendar creation failed')
                      toast.success('Monthly review scheduled and calendar event created')
                      setOpen(false)
                      await onDone?.()
                    } catch (e) {
                      console.error(e)
                      toast.error(e.message || 'Failed to schedule monthly review')
                    } finally {
                      setConfirming(false)
                    }
                  }}
                >
                  {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <UploadDropzone
                registerSubmit={(fn) => { submitRef.current = fn }}
                onFilesChange={(files) => setHasFiles(files.length > 0)}
                showActions={false}
                maxFiles={1}
                onSubmit={async (files) => {
                  try {
                    let reviewId = targetReviewId
                    if (!reviewId) {
                      // Ensure a Monthly Review exists for this upload (create via schedule endpoint)
                      const now = new Date()
                      const parsed = uploadTitle.match(/^(\w+)\s+(\d{4})$/)
                      let dateStr
                      if (parsed) {
                        const monthName = parsed[1]
                        const year = parseInt(parsed[2], 10)
                        const monthIndex = new Date(`${monthName} 1, ${year}`).getMonth()
                        dateStr = `${year}-${String(monthIndex + 1).padStart(2,'0')}-01`
                      } else {
                        dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`
                      }
                      const scheduleRes = await fetch(`/api/admin/users/${applicantId}/monthly-review`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date: dateStr, title: uploadTitle }) })
                      if (!scheduleRes.ok) throw new Error('Failed to prepare review')
                      const scheduleJson = await scheduleRes.json()
                      reviewId = scheduleJson.reviewId
                      if (!reviewId) throw new Error('Missing review id')
                    }

                    // Upload doc to the Monthly Review
                    const fd = new FormData(); files.forEach((f) => fd.append('files', f)); fd.append('title', uploadTitle)
                    const res = await fetch(`/api/admin/users/${applicantId}/monthly-reviews/${reviewId}/docs`, { method: 'POST', body: fd })
                    if (!res.ok) throw new Error('Upload failed')
                    toast.success('Monthly review document uploaded')
                    setOpen(false)
                    setTargetReviewId("")
                    await onDone?.()
                  } catch (e) {
                    console.error(e)
                    toast.error(e.message || 'Upload failed')
                  }
                }}
              />
              <div className="space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Document Title</Label>
                  <Input value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} className="h-9" />
                </div>
                <div className="text-center">
                  <button type="button" className="text-xs text-muted-foreground underline underline-offset-2" onClick={() => setUploadMode(false)}>
                    back to date scheduling
                  </button>
                </div>
                <div className="flex justify-end">
                  <Button size="sm" disabled={!hasFiles || uploading || !uploadTitle.trim()} onClick={async () => { try { setUploading(true); await submitRef.current?.() } finally { setUploading(false) } }}>
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Upload'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

function MonthOnlyPicker({ selected, onSelect, currentMonth, onMonthChange, eventsByDate = {} }) {
  const [current, setCurrent] = useState(() => currentMonth || new Date())
  useEffect(() => { if (currentMonth) setCurrent(currentMonth) }, [currentMonth])
  const year = current.getFullYear()
  const month = current.getMonth()
  const monthName = current.toLocaleString("default", { month: "long" })
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfMonth = new Date(year, month, 1).getDay()

  const totalCells = Math.ceil((daysInMonth + firstDayOfMonth) / 7) * 7
  const cells = Array.from({ length: totalCells }, (_, i) => {
    const dayIndex = i - firstDayOfMonth
    if (dayIndex < 0 || dayIndex >= daysInMonth) {
      const date = new Date(year, month, dayIndex + 1)
      return { isEmpty: true, date, day: date.getDate() }
    }
    const day = dayIndex + 1
    const date = new Date(year, month, day)
    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return { isEmpty: false, date, day, dateString }
  })

  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  const isToday = (d) => {
    const t = new Date()
    return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear()
  }

  return (
    <div className="rounded-md border border-border/30 p-3">
      <div className="flex items-center justify-between mb-2">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { const d = new Date(year, month - 1, 1); setCurrent(d); onMonthChange?.(d) }}>
          <ChevronLeftIcon className="h-4 w-4" />
        </Button>
        <div className="text-sm font-medium">{monthName} {year}</div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { const d = new Date(year, month + 1, 1); setCurrent(d); onMonthChange?.(d) }}>
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 text-center mb-1">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d,i) => (
          <div key={i} className="text-xs text-muted-foreground">{d}</div>
        ))}
      </div>

      <div className="space-y-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((cell, di) => cell.isEmpty ? (
              <div key={`e-${wi}-${di}`} className="h-9" />
            ) : (
              <Button
                key={cell.dateString}
                variant="ghost"
                size="sm"
                className={`h-9 p-0 relative ${
                  selected === cell.dateString
                    ? "bg-primary text-primary-foreground"
                    : isToday(cell.date)
                      ? "border"
                      : ""
                }`}
                onClick={() => onSelect?.(cell.dateString)}
              >
                <span>{cell.day}</span>
                {(eventsByDate[cell.dateString]?.length || 0) > 0 && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full bg-success" />
                )}
              </Button>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function AppraisalDateSetter({ open, onOpenChange, applicantId, applicantName = "Applicant", applicantEmail = "", currentDate, appraisalHistoryRaw = "", onUpdated }) {
  // Multi-step flow: "date" -> "questions"
  const [step, setStep] = useState("date")

  // Date selection state
  const [date, setDate] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [calMonth, setCalMonth] = useState(() => new Date())
  const [eventsByDate, setEventsByDate] = useState({})
  const [dayEvents, setDayEvents] = useState([])
  const [hasConflict, setHasConflict] = useState(false)

  // Question editor state
  const [pendingQuestions, setPendingQuestions] = useState([])
  const [roleKey, setRoleKey] = useState("unknown")
  const [jobName, setJobName] = useState("")
  const [templateWarning, setTemplateWarning] = useState("")
  const [editingIndex, setEditingIndex] = useState(null)
  const [editingText, setEditingText] = useState("")

  // Loading/saving states
  const [templateLoading, setTemplateLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Template / overwrite state
  const [hasTemplate, setHasTemplate] = useState(false)
  const [inlineTemplateEditorOpen, setInlineTemplateEditorOpen] = useState(false)
  const [existingYearWarning, setExistingYearWarning] = useState("")

  // Initialize date from currentDate
  useEffect(() => {
    if (!open) return
    try {
      if (!currentDate) { setDate(""); return }
      const d = new Date(currentDate)
      if (Number.isNaN(d.getTime())) { setDate(""); return }
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      setDate(`${y}-${m}-${day}`)
    } catch { setDate("") }
  }, [open, currentDate])
  
  // Reset to step 1 when dialog closes
  useEffect(() => {
    if (!open) {
      setStep("date")
      setPendingQuestions([])
      setRoleKey("unknown")
      setJobName("")
      setTemplateWarning("")
      setEditingIndex(null)
      setEditingText("")
      setHasTemplate(false)
      setInlineTemplateEditorOpen(false)
      setExistingYearWarning("")
    }
  }, [open])

  const timeOptions = useMemo(() => {
    const opts = []
    for (let h = 8; h <= 18; h++) {
      for (const m of [0, 30]) {
        const hh = String(h).padStart(2, '0')
        const mm = String(m).padStart(2, '0')
        opts.push({ value: `${hh}:${mm}`, label: `${((h % 12) || 12)}:${mm} ${h < 12 ? 'AM' : 'PM'}` })
      }
    }
    return opts
  }, [])

  // Fetch month events on open or month change
  useEffect(() => {
    if (!open) return
    const year = calMonth.getFullYear()
    const month = calMonth.getMonth()
    const start = new Date(year, month, 1).toISOString()
    const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString()
    ;(async () => {
      try {
        const res = await fetch(`/api/admin/dashboard/calendar?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`)
        if (!res.ok) throw new Error('Failed to fetch events')
        const data = await res.json()
        const map = {}
        for (const ev of data || []) {
          const s = new Date(ev.start?.dateTime || ev.start?.date)
          const e = new Date(ev.end?.dateTime || ev.end?.date)
          const key = s.toISOString().slice(0,10)
          if (!map[key]) map[key] = []
          map[key].push({
            title: ev.summary || 'Event',
            start: s,
            end: e,
          })
        }
        setEventsByDate(map)
      } catch {
        setEventsByDate({})
      }
    })()
  }, [open, calMonth])

  // Update day events
  useEffect(() => { setDayEvents(eventsByDate[date] || []) }, [eventsByDate, date])

  // Compute conflicts
  useEffect(() => {
    if (!date || !startTime || !endTime) { setHasConflict(false); return }
    const start = new Date(`${date}T${startTime}:00`)
    const end = new Date(`${date}T${endTime}:00`)
    if (end <= start) { setHasConflict(true); return }
    const conflict = (eventsByDate[date] || []).some(ev => (start < ev.end && end > ev.start))
    setHasConflict(conflict)
  }, [date, startTime, endTime, eventsByDate])

  // Handle Continue button - fetch template and go to step 2
  const handleContinue = async () => {
    if (!applicantId || !date || !startTime || !endTime) return
    setTemplateLoading(true)
    setTemplateWarning("")
    setExistingYearWarning("")
    try {
      const res = await fetch(`/api/admin/users/${applicantId}/appraisal-template`)
      const data = await res.json().catch(() => ({}))

      const templateQuestions = data?.template?.questions || []
      const templateRoleKey = data?.template?.roleKey || data?.jobName || "unknown"

      setPendingQuestions(templateQuestions)
      setRoleKey(templateRoleKey)
      setJobName(data?.jobName || "")
      setHasTemplate(templateQuestions.length > 0)

      if (data?.warning && templateQuestions.length === 0) {
        setTemplateWarning(data.warning)
      }

      // Check if an appraisal for this year already exists (Fix 4)
      const year = Number(date.slice(0, 4))
      if (appraisalHistoryRaw && appraisalHistoryRaw.trim()) {
        try {
          const histObj = JSON.parse(appraisalHistoryRaw)
          if (Array.isArray(histObj.appraisals)) {
            const existing = histObj.appraisals.find(a => Number(a?.year) === year)
            if (existing) {
              setExistingYearWarning(`An appraisal for ${year} already exists. Confirming will update the date and overwrite the question snapshot.`)
            }
          }
        } catch {}
      }

      setStep("questions")
    } catch (err) {
      toast.error(err?.message || "Failed to load template questions")
    } finally {
      setTemplateLoading(false)
    }
  }

  // Question editing helpers
  const handleAddQuestion = () => {
    const newOrder = pendingQuestions.length + 1
    setPendingQuestions([...pendingQuestions, { order: newOrder, text: "" }])
    setEditingIndex(pendingQuestions.length)
    setEditingText("")
  }

  const handleDeleteQuestion = (index) => {
    const updated = pendingQuestions.filter((_, i) => i !== index)
    // Re-normalize order
    const normalized = updated.map((q, i) => ({ ...q, order: i + 1 }))
    setPendingQuestions(normalized)
    if (editingIndex === index) {
      setEditingIndex(null)
      setEditingText("")
    }
  }

  const handleMoveUp = (index) => {
    if (index === 0) return
    const updated = [...pendingQuestions]
    const temp = updated[index - 1]
    updated[index - 1] = { ...updated[index], order: index }
    updated[index] = { ...temp, order: index + 1 }
    setPendingQuestions(updated)
  }

  const handleMoveDown = (index) => {
    if (index >= pendingQuestions.length - 1) return
    const updated = [...pendingQuestions]
    const temp = updated[index + 1]
    updated[index + 1] = { ...updated[index], order: index + 2 }
    updated[index] = { ...temp, order: index + 1 }
    setPendingQuestions(updated)
  }

  const handleSaveEdit = () => {
    if (editingIndex === null) return
    const trimmed = editingText.trim()
    if (!trimmed) {
      // Delete empty question
      handleDeleteQuestion(editingIndex)
    } else {
      const updated = [...pendingQuestions]
      updated[editingIndex] = { ...updated[editingIndex], text: trimmed }
      setPendingQuestions(updated)
    }
    setEditingIndex(null)
    setEditingText("")
  }

  const handleCancelEdit = () => {
    // If adding new question and cancel, remove it
    if (editingIndex !== null && !pendingQuestions[editingIndex]?.text) {
      handleDeleteQuestion(editingIndex)
    }
    setEditingIndex(null)
    setEditingText("")
  }

  const handleResetToTemplate = async () => {
    setTemplateLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${applicantId}/appraisal-template`)
      const data = await res.json().catch(() => ({}))
      const templateQuestions = data?.template?.questions || []
      setPendingQuestions(templateQuestions)
      setRoleKey(data?.template?.roleKey || data?.jobName || "unknown")
      toast.success("Reset to template questions")
    } catch (err) {
      toast.error("Failed to reset to template")
    } finally {
      setTemplateLoading(false)
    }
  }

  // Save template inline (when no template existed) then reload questions into step 2
  const handleSaveInlineTemplate = async (questions) => {
    const res = await fetch(`/api/admin/users/${applicantId}/appraisal-template`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questions, roleKey }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.error || "Failed to save template")
    }
    const data = await res.json().catch(() => ({}))
    const savedQuestions = data?.template?.questions || questions
    setPendingQuestions(savedQuestions)
    setRoleKey(data?.template?.roleKey || roleKey)
    setHasTemplate(savedQuestions.length > 0)
    setTemplateWarning("")
    setInlineTemplateEditorOpen(false)
    toast.success(`Template saved for ${jobName || "this role"}. You can now customise the questions for this applicant.`)
  }

  // Final confirm - save questions, date, and create calendar event
  const handleConfirmAppraisal = async () => {
    if (!applicantId || !date || !startTime || !endTime) return
    
    // Validate questions
    const validQuestions = pendingQuestions.filter(q => q.text?.trim())
    if (validQuestions.length === 0) {
      toast.error("Please add at least one question")
      return
    }
    
    setSaving(true)
    try {
      // Normalize question order
      const normalizedQuestions = validQuestions.map((q, i) => ({ order: i + 1, text: q.text.trim() }))
      
      // Build the full questions JSON structure
      const questionsJSON = {
        version: 1,
        type: "preappraisal",
        roleKey,
        updatedAt: new Date().toISOString(),
        questions: normalizedQuestions
      }
      
      // 1. Save questions to override field
      const questionsRes = await fetch(`/api/admin/users/${applicantId}/appraisal-questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(questionsJSON)
      })
      if (!questionsRes.ok) {
        const err = await questionsRes.json().catch(() => ({}))
        throw new Error(err?.error || 'Failed to save questions')
      }
      
      // 2. Save date + snapshot to history
      const dateRes = await fetch(`/api/admin/users/${applicantId}/appraisal-date`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          startTime,
          preappraisalQuestions: questionsJSON
        })
      })
      if (!dateRes.ok) {
        const err = await dateRes.json().catch(() => ({}))
        throw new Error(err?.error || 'Failed to set appraisal date')
      }
      
      // 3. Create calendar event
      const startDT = `${date}T${startTime}:00`
      const endDT = `${date}T${endTime}:00`
      const calRes = await fetch('/api/admin/dashboard/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: 'Appraisal Appointment',
          description: `Appraisal for ${applicantName}\nView in admin: ${typeof window !== 'undefined' ? window.location.origin : ''}/admin/users`,
          start: { dateTime: startDT, timeZone: 'Europe/London' },
          end: { dateTime: endDT, timeZone: 'Europe/London' },
          attendees: (applicantEmail ? [{ email: applicantEmail, displayName: applicantName }] : []),
          createMeet: false,
        }),
      })
      if (!calRes.ok) {
        const err = await calRes.json().catch(() => ({}))
        throw new Error(err?.error || 'Failed to create calendar appointment')
      }
      
      toast.success('Appraisal created successfully')
      onOpenChange?.(false)
      await onUpdated?.()
    } catch (e) {
      toast.error(e?.message || 'Failed to create appraisal')
    } finally {
      setSaving(false)
    }
  }

  // Format time for display
  const formatTimeDisplay = (timeStr) => {
    if (!timeStr) return ""
    const [h, m] = timeStr.split(':').map(Number)
    const ampm = h < 12 ? 'AM' : 'PM'
    const hour12 = ((h % 12) || 12)
    return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!saving && !templateLoading) onOpenChange?.(v) }}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Set Appraisal Date</DialogTitle>
          <DialogDescription>
            {step === "date" 
              ? "Step 1 of 2: Select a date and time for the appraisal."
              : "Step 2 of 2: Customize the pre-appraisal questions."}
          </DialogDescription>
        </DialogHeader>
        
        {step === "date" ? (
          // STEP 1: Date/Time Selection
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Appraisal Date</Label>
              <div className="text-sm">{date ? formatDate(date) : "—"}</div>
            </div>
            <MonthOnlyPicker
              selected={date}
              onSelect={(val) => setDate(val)}
              currentMonth={calMonth}
              onMonthChange={setCalMonth}
              eventsByDate={eventsByDate}
            />
            {date && (
              <div className="rounded-md border border-border/30 p-3">
                <div className="text-sm font-medium mb-2">{date}</div>
                {dayEvents.length > 0 ? (
                  <div className="space-y-1 mb-3">
                    {dayEvents.map((ev, i) => (
                      <div key={i} className="text-xs text-muted-foreground">{ev.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {ev.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {ev.title}</div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground mb-3">No events for this day</div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <Select value={startTime} onValueChange={(v) => {
                    setStartTime(v)
                    if (endTime && endTime <= v) {
                      const next = timeOptions.find((t) => t.value > v)
                      setEndTime(next ? next.value : "")
                    }
                  }}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Start time" /></SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((t) => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  <Select value={endTime} onValueChange={setEndTime}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="End time" /></SelectTrigger>
                    <SelectContent>
                      {(startTime ? timeOptions.filter((t) => t.value > startTime) : timeOptions).map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {hasConflict && (<div className="mt-2 text-xs text-error">Selected time overlaps with an existing event.</div>)}
                {startTime && endTime && endTime <= startTime && (<div className="mt-1 text-xs text-error">End time must be after start time.</div>)}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" className="h-8" onClick={() => onOpenChange?.(false)} disabled={templateLoading}>Cancel</Button>
              <Button 
                className="h-8" 
                disabled={!date || !startTime || !endTime || endTime <= startTime || hasConflict || templateLoading} 
                onClick={handleContinue}
              >
                {templateLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Continue
              </Button>
            </div>
          </div>
        ) : (
          // STEP 2: Question Editor
          <div className="space-y-4">
            {/* Date summary */}
            <div className="rounded-md bg-muted/50 p-3">
              <div className="text-sm">
                <span className="font-medium">Date:</span> {formatDate(date)} at {formatTimeDisplay(startTime)} - {formatTimeDisplay(endTime)}
              </div>
              {jobName && (
                <div className="text-xs text-muted-foreground mt-1">
                  Role: {jobName}
                </div>
              )}
            </div>
            
            {/* No-template panel */}
            {!hasTemplate && (
              <div className="rounded-md bg-muted border border-border/40 p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">
                      {jobName ? `No template questions for "${jobName}"` : "No template questions for this role"}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Set template questions for this role first — they will be reused for all future appraisals in this role.
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 h-7 text-xs"
                      onClick={() => setInlineTemplateEditorOpen(true)}
                    >
                      <Settings className="h-3 w-3 mr-1" />
                      Set template questions{jobName ? ` for ${jobName}` : ""}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Warning banner (non-template warnings, e.g. no linked job) */}
            {templateWarning && hasTemplate && (
              <div className="rounded-md bg-warning-muted border border-warning/20 p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                  <div className="text-sm text-warning">{templateWarning}</div>
                </div>
              </div>
            )}

            {/* Existing-year warning */}
            {existingYearWarning && (
              <div className="rounded-md bg-warning-muted border border-warning/20 p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                  <div className="text-sm text-warning">{existingYearWarning}</div>
                </div>
              </div>
            )}

            {/* Questions list */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Pre-Appraisal Questions</Label>
                <div className="flex items-center gap-2">
                  {hasTemplate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={handleResetToTemplate}
                      disabled={templateLoading}
                    >
                      {templateLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RotateCcw className="h-3 w-3 mr-1" />}
                      Reset to Template
                    </Button>
                  )}
                </div>
              </div>
              
              <div className="max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
                <div className="space-y-2">
                  {pendingQuestions.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-md">
                      No questions yet. Click "Add Question" to get started.
                    </div>
                  ) : (
                    pendingQuestions.map((q, idx) => (
                      <div key={idx} className="group rounded-md border p-3 space-y-2">
                        {editingIndex === idx ? (
                          // Edit mode
                          <div className="space-y-2">
                            <Textarea
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              placeholder="Enter question text..."
                              className="min-h-[80px] text-sm"
                              autoFocus
                            />
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="sm" className="h-7" onClick={handleCancelEdit}>Cancel</Button>
                              <Button size="sm" className="h-7" onClick={handleSaveEdit}>Save</Button>
                            </div>
                          </div>
                        ) : (
                          // View mode
                          <>
                            <div className="flex items-start gap-2">
                              <span className="text-xs text-muted-foreground font-medium shrink-0 mt-0.5">{idx + 1}.</span>
                              <p className="text-sm flex-1 whitespace-pre-wrap">{q.text || <span className="text-muted-foreground italic">Empty question</span>}</p>
                            </div>
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7" 
                                onClick={() => handleMoveUp(idx)}
                                disabled={idx === 0}
                              >
                                <ChevronUp className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7" 
                                onClick={() => handleMoveDown(idx)}
                                disabled={idx >= pendingQuestions.length - 1}
                              >
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7" 
                                onClick={() => { setEditingIndex(idx); setEditingText(q.text || "") }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 text-error hover:text-error/80 hover:bg-error-muted" 
                                onClick={() => handleDeleteQuestion(idx)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full h-8"
                onClick={handleAddQuestion}
                disabled={editingIndex !== null}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Question
              </Button>
            </div>
            
            {/* Action buttons */}
            <div className="flex justify-between gap-2 pt-2 border-t">
              <Button 
                variant="ghost" 
                className="h-8" 
                onClick={() => setStep("date")}
                disabled={saving}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" className="h-8" onClick={() => onOpenChange?.(false)} disabled={saving}>Cancel</Button>
                <Button 
                  className="h-8" 
                  onClick={handleConfirmAppraisal}
                  disabled={saving || pendingQuestions.filter(q => q.text?.trim()).length === 0}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Confirm Appraisal
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Inline template editor — opens when no template exists for the role */}
    <AppraisalQuestionEditor
      open={inlineTemplateEditorOpen}
      onOpenChange={setInlineTemplateEditorOpen}
      questions={[]}
      roleKey={roleKey}
      isTemplate={true}
      onSave={handleSaveInlineTemplate}
    />
  )
}
