"use client"

import { useMemo, useState, useRef, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs"
import { Badge } from "@components/ui/badge"
import { Separator } from "@components/ui/separator"
import { Button } from "@components/ui/button"
import { Avatar, AvatarFallback } from "@components/ui/avatar"
import { ExternalLink, FileText, MessageSquare, Loader2, Eye, RefreshCw, ChevronLeft, Star, X } from "lucide-react"
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
import { Label } from "@components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@components/ui/dialog"
import { ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon, Clock as ClockIcon } from "lucide-react"
import { toast } from "sonner"
import { updateApplicant } from "@/app/admin/users/actions"
import { generateColorFromString } from "@/lib/utils/colour-hash"

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

  // Use the new hook to fetch applicant data
  const { applicant, isLoading, error, mutate } = useApplicant(applicantId)

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

  const handleAdvanceStage = async () => {
    if (!canAdvance) return
    setConfirmStage(nextStage)
    setConfirmOpen(true)
  }

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmStage, setConfirmStage] = useState("")
  const [confirming, setConfirming] = useState(false)

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
              <p className="text-destructive mb-2">Error loading applicant</p>
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
          className={`w-[420px] sm:w-[720px] pl-2 pr-4 md:pl-2 md:pr-6 transition-all duration-300`}
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
                    className="flex items-center justify-between gap-3 border-b px-4 py-2 md:px-5 sticky top-0 z-30 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70"
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
                      <Button
                        size="sm"
                        disabled={!canAdvance || advancing}
                        onClick={handleAdvanceStage}
                        title={canAdvance ? actionLabel : "No manual next stage available"}
                        className="h-8"
                      >
                        {advancing ? <Loader2 className="h-4 w-4 animate-spin" /> : (canAdvance ? actionLabel : "Advance Stage")}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            ) : (
            <div className="border-b px-4 py-3 md:px-5">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Initials name={applicant?.name} />}
                </Avatar>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold leading-none">
                    {isLoading ? "Loading..." : applicant?.name || "Applicant"}
                  </h2>
                  {!!applicant?.email && (
                    <div className="text-xs text-muted-foreground truncate">{applicant.email}</div>
                  )}
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="secondary" style={stageColor}>{applicant?.stage || "—"}</Badge>
                {applicant?.job && <Badge variant="outline">{applicant.job}</Badge>}
              </div>
              <div className="mt-2">
                <Button
                  size="sm"
                  disabled={!canAdvance || advancing}
                  onClick={handleAdvanceStage}
                  title={canAdvance ? actionLabel : "No manual next stage available"}
                  className="h-8"
                >
                  {advancing ? <Loader2 className="h-4 w-4 animate-spin" /> : (canAdvance ? actionLabel : "Advance Stage")}
                </Button>
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
                      <div className="rounded-lg border p-4">
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
                      <div className="rounded-lg border p-4 space-y-3">
                        <div className="text-sm font-semibold">Quick Facts</div>
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
                      <div className="rounded-lg border px-3 py-2 flex items-center justify-between">
                        <h3 className="text-base font-semibold">Applicant Detail</h3>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" style={stageColor}>{applicant?.stage || "—"}</Badge>
                          <Button
                            size="sm"
                            disabled={!canAdvance || advancing}
                            onClick={handleAdvanceStage}
                            title={canAdvance ? actionLabel : "No manual next stage available"}
                            className="h-8"
                          >
                            {advancing ? <Loader2 className="h-4 w-4 animate-spin" /> : (canAdvance ? actionLabel : "Advance Stage")}
                          </Button>
                        </div>
                      </div>

                      {/* B - Applicant Information */}
                      <div className="rounded-lg border p-4">
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
                          <div className="rounded-lg border p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-semibold">Monthly Review</h4>
                              <MonthlyReviewActions applicantId={applicant?.id} applicantName={applicant?.name} onDone={async () => { await mutate?.() }} />
                            </div>
                            {reviews.length === 0 ? (
                              <div className="text-sm text-muted-foreground">No monthly reviews yet.</div>
                            ) : (
                              <ul className="divide-y rounded-md border bg-background">
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
                                            <Badge variant="outline" className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20">Completed</Badge>
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
                                            <Badge variant="outline" className="bg-amber-500/15 text-amber-600 border-amber-500/20">Scheduled</Badge>
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

                      {/* E - Feedback Documents */}
                      <div className="rounded-lg border p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-sm font-semibold">Feedback Documents</div>
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
                                            <Star key={n} className={`h-4 w-4 ${n <= rating ? "fill-yellow-400 stroke-yellow-500" : "stroke-muted-foreground"}`} />
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
                      <div className="rounded-lg border p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-sm font-semibold">Documents</div>
                          <div className="flex items-center gap-2">
                            {(() => {
                              const valueKey = selectedDocMeta ? `${selectedDocMeta.table}::${selectedDocMeta.fieldName}` : ""
                              return (
                                <Select
                                  value={valueKey}
                                  onValueChange={(val) => {
                                    const [table, fieldName] = String(val).split("::")
                                    const all = [...docCoreOptions, ...docDocumentsOptions]
                                    const meta = all.find((o) => o.table === table && o.fieldName === fieldName)
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
                                      <SelectItem key={`${o.table}::${o.fieldName}`} value={`${o.table}::${o.fieldName}`}>{o.label}</SelectItem>
                                    ))}
                                    <Separator className="my-1" />
                                    <div className="px-2 py-1 text-xs text-muted-foreground">Documents</div>
                                    {docDocumentsOptions.map((o) => (
                                      <SelectItem key={`${o.table}::${o.fieldName}`} value={`${o.table}::${o.fieldName}`}>{o.label}</SelectItem>
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
                            <div className="text-xs text-muted-foreground mb-2">Upload files for <span className="text-red-500">{selectedDocType}</span></div>
                            <UploadDropzone registerSubmit={(fn) => { dropzoneSubmitRef.current = fn }} onFilesChange={(files) => setHasPendingFiles(files.length > 0)} showActions={false} onSubmit={async (files) => {
                              const optimistic = files.map((f, i) => ({ id: `optimistic-${Date.now()}-${i}`, name: `${selectedDocType} - ${f.name}`, category: selectedDocMeta?.table || 'Application', source: 'Upload', uploadedAt: new Date().toISOString(), fileUrl: '', status: 'Uploading…', type: f.type || 'Unknown', field: selectedDocType, originalName: f.name, size: f.size || 0 }))
                              setOptimisticDocs((prev) => [...prev, ...optimistic])
                              try {
                                if (!applicant || !files?.length || !selectedDocType || !selectedDocMeta) return
                                const fd = new FormData(); files.forEach((f) => fd.append('files', f)); fd.append('fieldName', selectedDocMeta.fieldName)
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Stage Change</DialogTitle>
            <DialogDescription>
              {confirmStage === "First Interview Invite Sent" && "This will send the first interview invite to the applicant."}
              {confirmStage === "Second Interview Invite Sent" && "This will send the second interview invite to the applicant."}
              {confirmStage === "Hired" && "This will mark the applicant as Hired."}
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
        <DialogContent>
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
          <Star className={`h-5 w-5 ${n <= value ? "fill-yellow-400 stroke-yellow-500" : "stroke-muted-foreground"}`} />
        </button>
      ))}
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
function MonthlyReviewActions({ applicantId, applicantName = "Applicant", onDone }) {
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
        <DialogContent>
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
              <MonthOnlyPicker
                selected={date}
                onSelect={(val) => setDate(val)}
                currentMonth={currentMonth}
                onMonthChange={setCurrentMonth}
                eventsByDate={eventsByDate}
              />
              {/* Selected day details and time selection */}
              {date && (
                <div className="rounded-md border p-3">
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
                    <div className="mt-2 text-xs text-red-500">Selected time overlaps with an existing event.</div>
                  )}
                  {startTime && endTime && endTime <= startTime && (
                    <div className="mt-1 text-xs text-red-500">End time must be after start time.</div>
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
                          summary: title,
                          description: `Monthly Review for applicant ${applicantName}`,
                          start: { dateTime: startDT, timeZone: 'Europe/London' },
                          end: { dateTime: endDT, timeZone: 'Europe/London' },
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
    <div className="rounded-md border p-3">
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
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                )}
              </Button>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
