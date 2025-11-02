"use client"

import { useMemo, useState, useRef, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs"
import { Badge } from "@components/ui/badge"
import { Separator } from "@components/ui/separator"
import { Button } from "@components/ui/button"
import { Avatar, AvatarFallback } from "@components/ui/avatar"
import { ExternalLink, FileText, MessageSquare, Loader2, Eye, RefreshCw, ChevronLeft } from "lucide-react"
import UploadDropzone from "./upload-dropzone"
import { attachFeedback } from "@/app/admin/users/actions"
import NextStep from "./next-step"
import ProgressStepper from "./progress-stepper"
import { ScrollArea } from "@components/ui/scroll-area"
import { useApplicant } from "@/hooks/useApplicant"
import { useFeedbackDocuments } from "@/hooks/useFeedbackDocuments"
import { ApplicantFileViewerModal } from "./applicant-file-viewer-modal"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@components/ui/select"

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
  const [showAddDropzone, setShowAddDropzone] = useState(false)
  const addDocRef = useRef(null)
  const [optimisticDocs, setOptimisticDocs] = useState([])
  const dropzoneSubmitRef = useRef(null)
  const [hasPendingFiles, setHasPendingFiles] = useState(false)
  const [wideView, setWideView] = useState(false)

  // Use the new hook to fetch applicant data
  const { applicant, isLoading, error, mutate } = useApplicant(applicantId)

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
    enabled: tab === "feedback", // Only load when feedback tab is active
    refreshInterval: tab === "feedback" ? 30000 : 0, // Only refresh when tab is active
    revalidateOnFocus: tab === "feedback", // Only revalidate on focus when tab is active
    revalidateOnReconnect: tab === "feedback", // Only revalidate on reconnect when tab is active
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
            <div className="flex items-start justify-between gap-3 border-b px-5 py-4 md:px-6">
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10">
                  {isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <Initials name={applicant?.name} />
                  )}
                </Avatar>
                <div>
                  <h2 className="text-base font-semibold leading-none">
                    {isLoading ? "Loading..." : applicant?.name || "Applicant"}
                  </h2>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{applicant?.stage || "—"}</Badge>
                    {applicant?.job && <Badge variant="outline">{applicant.job}</Badge>}
                  </div>
                </div>
              </div>
            </div>

            {/* Scrollable content */}
            <ScrollArea className="flex-1">
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
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <Badge variant="secondary">{applicant?.stage || "—"}</Badge>
                              {applicant?.job && <Badge variant="outline">{applicant.job}</Badge>}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-lg border p-4 space-y-3">
                        <div className="text-sm font-semibold">Quick Facts</div>
                        <InfoRow label="Phone" value={applicant?.phone} />
                        <InfoRow label="Email" value={applicant?.email} />
                        <InfoRow label="Source" value={applicant?.source} />
                        <InfoRow label="Applied For" value={applicant?.job} />
                        <Separator />
                        {/* Timeline small */}
                        {(() => {
                          const items = []
                          if (applicant?.interviewDate) items.push({ label: 'First Interview Booked', date: applicant.interviewDate })
                          if (applicant?.secondInterviewDate) items.push({ label: 'Second Interview Booked', date: applicant.secondInterviewDate })
                          if (applicant?.createdAt) items.push({ label: 'Application Submitted', date: applicant.createdAt })
                          if (items.length === 0) return null
                          items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                          return (
                            <div>
                              <div className="text-sm font-semibold mb-2">Timeline</div>
                              <ol className="relative border-l pl-4">
                                {items.map((ev, idx) => (
                                  <li key={`${ev.label}-${idx}`} className="mb-3 ml-2">
                                    <span className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full bg-foreground" />
                                    <div className="text-sm font-medium">{ev.label}</div>
                                    <div className="text-xs text-muted-foreground">{formatDate(ev.date)}</div>
                                  </li>
                                ))}
                              </ol>
                            </div>
                          )
                        })()}
                      </div>
                    </aside>

                    {/* Right main content */}
                    <section className="md:col-span-9 space-y-4">
                      {/* A - Title */}
                      <div className="rounded-lg border p-4 flex items-center justify-between">
                        <h3 className="text-base font-semibold">Applicant Detail</h3>
                      </div>

                      {/* B - Applicant Information */}
                      <div className="rounded-lg border p-4">
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                          <InfoRow label="Email" value={applicant?.email} />
                          <InfoRow label="Phone" value={applicant?.phone} />
                          <InfoRow label="Interview Date" value={applicant?.interviewDate ? formatDate(applicant.interviewDate) : '—'} />
                          <InfoRow label="Second Interview" value={applicant?.secondInterviewDate ? formatDate(applicant.secondInterviewDate) : '—'} />
                          <InfoRow label="Source" value={applicant?.source} />
                          <InfoRow label="Application Date" value={applicant?.createdAt ? formatDate(applicant.createdAt) : '—'} />
                        </div>
                      </div>

                      {/* D - Monthly Review (demo) */}
                      {(() => {
                        const isOnboarding = String(applicant?.stage || '').toLowerCase() === 'hired'
                        if (!isOnboarding) return null
                        const demoReviews = [
                          { id: 'rev-1', month: 'Oct 2025', status: 'Completed', notes: 'Good progress on onboarding tasks.' },
                          { id: 'rev-2', month: 'Sep 2025', status: 'Completed', notes: 'KPI meets expectations.' },
                        ]
                        return (
                          <div className="rounded-lg border p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-semibold">Monthly Review</h4>
                              <Button size="sm" className="h-8">+ New Review</Button>
                            </div>
                            <ul className="divide-y rounded-md border bg-background">
                              {demoReviews.map((r) => (
                                <li key={r.id} className="px-3 py-2 flex items-center justify-between">
                                  <div className="min-w-0">
                                    <div className="text-sm font-medium">{r.month}</div>
                                    <div className="text-xs text-muted-foreground truncate">{r.notes}</div>
                                  </div>
                                  <Badge variant="secondary" className="shrink-0">{r.status}</Badge>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )
                      })()}

                      {/* C - Documents Grid + Add */}
                      <div className="rounded-lg border p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-sm font-semibold">Documents</div>
                          <div className="flex items-center gap-2">
                            <Select
                              value={selectedDocType}
                              onValueChange={(val) => { setSelectedDocType(val); setShowAddDropzone(true); setTimeout(() => addDocRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 0) }}
                            >
                              <SelectTrigger className="h-8 w-56"><SelectValue placeholder="Select missing document" /></SelectTrigger>
                              <SelectContent>
                                {['CV','Portfolio of Cases','Testimonials','Reference 1','Reference 2','DBS Check','DISC PDF','Appraisal Doc'].map((n) => (
                                  <SelectItem key={n} value={n}>{n}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button size="sm" disabled={!selectedDocType || !hasPendingFiles} onClick={() => { try { dropzoneSubmitRef.current?.() } catch {} }} className="h-8">+ Add</Button>
                          </div>
                        </div>
                        {selectedDocType && (
                          <div ref={addDocRef} className="mb-3">
                            <div className="text-xs text-muted-foreground mb-2">Upload files for <span className="text-red-500">{selectedDocType}</span></div>
                            <UploadDropzone registerSubmit={(fn) => { dropzoneSubmitRef.current = fn }} onFilesChange={(files) => setHasPendingFiles(files.length > 0)} showActions={false} onSubmit={async (files) => {
                              const optimistic = files.map((f, i) => ({ id: `optimistic-${Date.now()}-${i}`, name: `${selectedDocType} - ${f.name}`, category: 'Application', source: 'Initial Application', uploadedAt: new Date().toISOString(), fileUrl: '', status: 'Uploading…', type: f.type || 'Unknown', field: selectedDocType, originalName: f.name, size: f.size || 0 }))
                              setOptimisticDocs((prev) => [...prev, ...optimistic])
                              try {
                                if (!applicant || !files?.length || !selectedDocType) return
                                const fd = new FormData(); files.forEach((f) => fd.append('files', f)); fd.append('fieldName', selectedDocType)
                                const res = await fetch(`/api/admin/users/${applicant.id}/attachments`, { method: 'POST', body: fd })
                                if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err?.error || 'Upload failed') }
                                await mutate?.()
                              } finally { setOptimisticDocs([]); setHasPendingFiles(false); setSelectedDocType('') }
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
                                <Badge variant="outline" className="shrink-0">{doc.status}</Badge>
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
                          <InfoRow label="Email" value={applicant?.email} />
                          <InfoRow label="Phone" value={applicant?.phone} />
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
                        {(() => {
                          const items = []
                          if (applicant?.interviewDate) items.push({ label: 'First Interview Booked', date: applicant.interviewDate })
                          if (applicant?.secondInterviewDate) items.push({ label: 'Second Interview Booked', date: applicant.secondInterviewDate })
                          if (applicant?.createdAt) items.push({ label: 'Application Submitted', date: applicant.createdAt })
                          if (items.length === 0) return null
                          items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                          return (
                            <div className="mt-4">
                              <div className="text-sm font-semibold mb-2">Timeline</div>
                              <ol className="relative border-l pl-4">
                                {items.map((ev, idx) => (
                                  <li key={`${ev.label}-${idx}`} className="mb-4 ml-2">
                                    <span className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full bg-foreground" />
                                    <div className="text-sm font-medium">{ev.label}</div>
                                    <div className="text-xs text-muted-foreground">{formatDate(ev.date)}</div>
                                  </li>
                                ))}
                              </ol>
                            </div>
                          )
                        })()}
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
    </>
  )
}
