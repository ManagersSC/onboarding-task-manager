"use client"

import { useMemo, useState } from "react"
import { Sheet, SheetContent } from "@components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs"
import { Badge } from "@components/ui/badge"
import { Separator } from "@components/ui/separator"
import { Button } from "@components/ui/button"
import { Avatar, AvatarFallback } from "@components/ui/avatar"
import { ExternalLink, FileText, MessageSquare, Loader2, Eye, RefreshCw } from "lucide-react"
import UploadDropzone from "./upload-dropzone"
import { attachFeedback } from "@/app/admin/users/actions"
import NextStep from "./next-step"
import ProgressStepper from "./progress-stepper"
import { ScrollArea } from "@components/ui/scroll-area"
import { useApplicant } from "@/hooks/useApplicant"
import { useFeedbackDocuments } from "@/hooks/useFeedbackDocuments"
import { ApplicantFileViewerModal } from "./applicant-file-viewer-modal"

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
    
    // Just count total documents present
    const present = applicant.allDocuments?.length || 0
    
    return { present }
  }, [applicant])

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
        <SheetContent side="right" className="w-full max-w-3xl p-0">
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

            {/* Progress + Next Step */}
            <div className="space-y-4 border-b px-5 pb-4 pt-3 md:px-6">
              <ProgressStepper currentStage={applicant?.stage || ""} />
              <NextStep applicant={applicant} onUpdated={(row) => {
                onApplicantUpdated?.(row)
                mutate?.() // Refresh the applicant data
              }} />
            </div>

            {/* Scrollable content */}
            <ScrollArea className="flex-1">
              <div className="px-5 py-4 md:px-6">
                <Tabs value={tab} onValueChange={setTab}>
                  <TabsList className="flex w-full flex-wrap gap-2 rounded-lg bg-muted/30 p-1">
                    <TabsTrigger value="overview" className="cursor-pointer rounded-md px-3 py-1.5">
                      Overview
                    </TabsTrigger>
                    <TabsTrigger value="documents" className="cursor-pointer rounded-md px-3 py-1.5">
                      Documents
                    </TabsTrigger>
                    <TabsTrigger value="feedback" className="cursor-pointer rounded-md px-3 py-1.5">
                      Feedback
                    </TabsTrigger>
                  </TabsList>

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

                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" className="cursor-pointer bg-transparent">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Open in Airtable
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="cursor-pointer bg-transparent"
                            onClick={() => setTab("feedback")}
                            title="Submit attachments as feedback"
                          >
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Submit Feedback
                          </Button>
                        </div>
                      </>
                    )}
                  </TabsContent>

                  <TabsContent value="documents" className="mt-4 space-y-4">
                    {isLoading ? (
                      <div className="space-y-4">
                        <div className="h-4 bg-muted animate-pulse rounded" />
                        <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                        <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">All Documents</span>
                          <span className="text-muted-foreground">({docsInfo.present})</span>
                        </div>
                        
                        {/* Show all documents if any exist */}
                        {applicant?.allDocuments && applicant.allDocuments.length > 0 && (
                          <div className="space-y-3">
                            <ul className="divide-y rounded-md border bg-background">
                              {applicant.allDocuments.map((doc, idx) => (
                                <li key={`${doc.id}-${idx}`} className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-muted/50 transition-colors">
                                  <div className="flex min-w-0 items-center gap-2 flex-1">
                                    <FileText className="h-4 w-4 shrink-0" />
                                    <div className="min-w-0 flex-1">
                                      <span className="truncate text-sm block">{doc.name}</span>
                                      <span className="text-xs text-muted-foreground">{doc.category} • {doc.source}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="shrink-0">
                                      {doc.status}
                                    </Badge>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      onClick={() => handleFileClick(doc)}
                                      title="View document"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {/* Show message if no documents */}
                        {(!applicant?.allDocuments || applicant.allDocuments.length === 0) && (
                          <div className="text-center py-8 text-muted-foreground">
                            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>No documents found for this applicant</p>
                          </div>
                        )}
                      </>
                    )}
                  </TabsContent>

                  <TabsContent value="feedback" className="mt-4 space-y-4">
                    {/* Upload Section */}
                    <div className="space-y-4">
                      <div className="text-sm text-muted-foreground">
                        Drop files below to submit feedback. Only attachments are saved.
                      </div>
                      <UploadDropzone
                        onSubmit={async (files) => {
                          const meta = files.map((f) => ({ name: f.name, size: f.size, type: f.type }))
                          await handleSubmitFeedback(meta)
                        }}
                      />
                    </div>
                    
                    {/* Feedback Documents Section */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">Feedback Documents</span>
                          <span className="text-muted-foreground">({feedbackDocuments?.length || 0})</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={refreshFeedback}
                          disabled={feedbackRefreshing}
                          className="h-6 w-6 p-0"
                          title="Refresh feedback documents"
                        >
                          <RefreshCw className={`h-3 w-3 ${feedbackRefreshing ? 'animate-spin' : ''}`} />
                        </Button>
                      </div>

                      {/* Loading state */}
                      {feedbackLoading && (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mr-2" />
                          <span className="text-sm text-muted-foreground">Loading feedback documents...</span>
                        </div>
                      )}

                      {/* Error state */}
                      {feedbackError && (
                        <div className="text-center py-8 text-destructive">
                          <p className="text-sm font-medium mb-2">Error loading feedback documents</p>
                          <p className="text-xs text-muted-foreground">{feedbackError.message || 'Unknown error occurred'}</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={refreshFeedback}
                            className="mt-2"
                          >
                            Try Again
                          </Button>
                        </div>
                      )}

                      {/* Show feedback documents grouped by stage */}
                      {!feedbackLoading && !feedbackError && feedbackDocuments && feedbackDocuments.length > 0 && (
                        <div className="space-y-4">
                          {Object.entries(documentsByStage).map(([stage, docs]) => (
                            <div key={stage} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-medium">{stage}</h4>
                                <Badge variant="secondary" className="text-xs">
                                  {docs.length} document{docs.length !== 1 ? 's' : ''}
                                </Badge>
                              </div>
                              <ul className="divide-y rounded-md border bg-background">
                                {docs.map((doc, idx) => {
                                  // Format the date for display
                                  const uploadDate = new Date(doc.uploadedAt).toLocaleDateString('en-GB', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric'
                                  })
                                  
                                  return (
                                    <li key={`${doc.id}-${idx}`} className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-muted/50 transition-colors">
                                      <div className="flex min-w-0 items-center gap-2 flex-1">
                                        <FileText className="h-4 w-4 shrink-0" />
                                        <div className="min-w-0 flex-1">
                                          <span className="truncate text-sm block">{doc.documentType} - {uploadDate}</span>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 w-8 p-0"
                                          onClick={() => handleFileClick(doc)}
                                          title="View document"
                                        >
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </li>
                                  )
                                })}
                              </ul>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Show message if no feedback documents */}
                      {!feedbackLoading && !feedbackError && (!feedbackDocuments || feedbackDocuments.length === 0) && (
                        <div className="text-center py-8 text-muted-foreground">
                          <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>No feedback documents found for this applicant</p>
                          <p className="text-xs mt-1">Documents from First Interview Questions, Second Interview Questions, and Docs - After Second Interview will appear here</p>
                        </div>
                      )}

                      {/* Cache indicator */}
                      {feedbackFromCache && (
                        <div className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                          Showing cached data • Click refresh to get latest
                        </div>
                      )}
                    </div>
                    
                    {/* Legacy Feedback Files Section (for backward compatibility) */}
                    {feedbackFiles.length > 0 && (
                      <>
                        <Separator className="my-4" />
                        <div className="space-y-3">
                          <div className="text-sm font-medium">Legacy Feedback Files</div>
                          <ul className="divide-y rounded-md border bg-background">
                            {feedbackFiles.map((f, idx) => (
                              <li key={`${f.name}-${idx}`} className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-muted/50 transition-colors">
                                <div className="flex min-w-0 items-center gap-2 flex-1">
                                  <FileText className="h-4 w-4 shrink-0" />
                                  <span className="truncate text-sm">{f.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">{Math.round((f.size || 0) / 1024)} KB</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => handleFileClick(f)}
                                    title="View feedback file"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </>
                    )}
                    
                    <Separator className="my-2" />
                    <div className="text-xs text-muted-foreground">
                      Note: Feedback documents are now stored directly in Airtable Feedback table.
                    </div>
                  </TabsContent>
                </Tabs>
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
