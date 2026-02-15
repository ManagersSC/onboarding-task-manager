"use client"

import { useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@components/ui/dialog"
import { ScrollArea } from "@components/ui/scroll-area"
import { Button } from "@components/ui/button"
import { toast } from "sonner"
import { cn } from "@components/lib/utils"
import {
  Download,
  File,
  FileText,
  ImageIcon,
  FileSpreadsheet,
  FileIcon,
  FileCode,
  FileArchive,
  FileAudio,
  FileVideo,
  ChevronRight,
  ChevronLeft,
  Loader2,
  ExternalLink,
  Link2,
  Paperclip,
} from "lucide-react"
import Image from "next/image"

// ── File type detection ──────────────────────────────────────────────
const fileTypeIcons = {
  pdf: <FileIcon className="h-5 w-5" />,
  image: <ImageIcon className="h-5 w-5" />,
  text: <FileText className="h-5 w-5" />,
  spreadsheet: <FileSpreadsheet className="h-5 w-5" />,
  code: <FileCode className="h-5 w-5" />,
  archive: <FileArchive className="h-5 w-5" />,
  audio: <FileAudio className="h-5 w-5" />,
  video: <FileVideo className="h-5 w-5" />,
  default: <File className="h-5 w-5" />,
}

const getFileType = (file) => {
  if (!file) return "default"
  if (file.isLink) return "link"

  const mimeType = file.type || ""
  const extension = file.filename ? file.filename.split(".").pop().toLowerCase() : ""

  if (mimeType.includes("pdf") || extension === "pdf") return "pdf"
  if (mimeType.includes("image") || ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(extension)) return "image"
  if (mimeType.includes("word") || mimeType.includes("officedocument.wordprocessing") || ["doc", "docx"].includes(extension)) return "document"
  if (mimeType.includes("text") || ["txt", "md", "rtf"].includes(extension)) return "text"
  if (mimeType.includes("spreadsheet") || mimeType.includes("officedocument.spreadsheet") || ["xls", "xlsx", "csv"].includes(extension)) return "spreadsheet"
  if (mimeType.includes("presentation") || mimeType.includes("officedocument.presentation") || ["ppt", "pptx"].includes(extension)) return "presentation"
  if (["js", "jsx", "ts", "tsx", "html", "css", "json", "xml", "py", "rb", "java", "php"].includes(extension)) return "code"
  if (mimeType.includes("zip") || ["zip", "rar", "7z", "tar", "gz"].includes(extension)) return "archive"
  if (mimeType.includes("audio") || ["mp3", "wav", "ogg", "flac"].includes(extension)) return "audio"
  if (mimeType.includes("video") || ["mp4", "webm", "avi", "mov", "wmv"].includes(extension)) return "video"
  return "default"
}

const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return "0 Bytes"
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${Number.parseFloat((bytes / Math.pow(1024, i)).toFixed(1))} ${sizes[i]}`
}

// ── Read-only file list item ─────────────────────────────────────────
const FileItem = ({ file, isSelected, onSelect, onDownload }) => {
  const fileType = getFileType(file)
  const icon = file.isLink ? <Link2 className="h-5 w-5" /> : (fileTypeIcons[fileType] || fileTypeIcons.default)

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors",
        isSelected
          ? "bg-primary/10 border border-primary/20"
          : "hover:bg-muted/60 border border-transparent",
        file.isLink && "border-l-2 border-l-info/40",
      )}
      onClick={() => onSelect(file)}
    >
      <div className={cn("flex-shrink-0", file.isLink ? "text-info" : "text-muted-foreground")}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate text-foreground">{file.filename}</div>
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          {file.isLink ? (
            <span className="truncate max-w-[180px]">{file.url}</span>
          ) : (
            <>
              <span>{formatFileSize(file.size)}</span>
              {file.type && (
                <>
                  <span className="text-border">·</span>
                  <span className="truncate">{file.type.split("/").pop()}</span>
                </>
              )}
            </>
          )}
        </div>
      </div>
      {!file.isLink && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation()
            onDownload(file)
          }}
        >
          <Download className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  )
}

// ── Content viewer ───────────────────────────────────────────────────
const ContentViewer = ({ file, content, isLoading }) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Loading preview...</p>
        </div>
      </div>
    )
  }

  if (!file) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="flex flex-col items-center gap-3">
          <Paperclip className="h-10 w-10 opacity-40" />
          <p className="text-sm">Select a file to preview</p>
        </div>
      </div>
    )
  }

  const fileType = getFileType(file)

  // Resource link
  if (fileType === "link") {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4 text-center p-8 max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-info/10 flex items-center justify-center">
            <Link2 className="h-8 w-8 text-info" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-2">Resource Link</p>
            <a
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-info hover:text-info/80 hover:underline text-sm break-all"
            >
              {file.url}
            </a>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => window.open(file.url, "_blank", "noopener,noreferrer")}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in New Tab
          </Button>
        </div>
      </div>
    )
  }

  // Image
  if (fileType === "image") {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <Image
          src={file.url || "/placeholder.svg"}
          alt={file.filename}
          className="max-w-full max-h-full object-contain rounded-lg"
          width={600}
          height={600}
        />
      </div>
    )
  }

  // PDF
  if (fileType === "pdf") {
    return <iframe src={file.url} className="w-full h-full border-0" title={file.filename} />
  }

  // Office documents
  if (fileType === "document" || fileType === "spreadsheet" || fileType === "presentation") {
    const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(file.url)}`
    return (
      <div className="w-full h-full flex flex-col">
        <iframe src={officeViewerUrl} className="w-full flex-1 border-0" title={file.filename} />
        <div className="flex items-center justify-center gap-2 py-2 border-t border-border text-xs text-muted-foreground">
          <span>Preview powered by Office Online</span>
          <span>·</span>
          <a
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-info hover:underline"
          >
            Download original
          </a>
        </div>
      </div>
    )
  }

  // Video
  if (fileType === "video") {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <video controls className="max-w-full max-h-full rounded-lg" src={file.url}>
          Your browser does not support video playback.
        </video>
      </div>
    )
  }

  // Audio
  if (fileType === "audio") {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4 p-8">
          <FileAudio className="h-16 w-16 text-muted-foreground" />
          <audio controls src={file.url}>
            Your browser does not support audio playback.
          </audio>
        </div>
      </div>
    )
  }

  // Text / code
  if (fileType === "text" || fileType === "code") {
    return (
      <ScrollArea className="h-full w-full">
        <div className="p-6">
          <pre className="whitespace-pre-wrap font-mono text-sm text-foreground">
            {content || "No content available"}
          </pre>
        </div>
      </ScrollArea>
    )
  }

  // Unsupported — download fallback
  return (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-4 text-center p-8">
        <File className="h-16 w-16 text-muted-foreground/40" />
        <div>
          <p className="text-sm font-medium text-foreground mb-1">{file.filename}</p>
          <p className="text-xs text-muted-foreground mb-4">Preview not available for this file type</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.open(file.url, "_blank")}>
          <Download className="h-4 w-4 mr-2" />
          Download File
        </Button>
      </div>
    </div>
  )
}

// ── Main Modal ───────────────────────────────────────────────────────
export function UserFileViewerModal({ isOpen, onClose, taskId, taskTitle }) {
  const [files, setFiles] = useState([])
  const [selectedFile, setSelectedFile] = useState(null)
  const [fileContent, setFileContent] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isContentLoading, setIsContentLoading] = useState(false)

  // Fetch files when modal opens
  const fetchFiles = useCallback(async () => {
    if (!taskId) return
    setIsLoading(true)
    try {
      const response = await fetch(`/api/user/tasks/${taskId}/files`)
      if (!response.ok) throw new Error("Failed to fetch files")

      const data = await response.json()
      const attachments = (data.attachments || []).map((att) => ({
        id: att.id,
        filename: att.filename,
        size: att.size,
        type: att.type,
        url: att.url,
      }))

      // Add resource link as virtual item
      const resourceUrl = data.resourceUrl
      const items = []
      if (resourceUrl) {
        items.push({
          id: "resource-link",
          filename: "Resource Link",
          size: 0,
          type: "link",
          url: resourceUrl,
          isLink: true,
        })
      }
      items.push(...attachments)

      setFiles(items)
      if (items.length > 0) {
        setSelectedFile((prev) => prev || items[0])
      }
    } catch (err) {
      console.error("Error fetching files:", err)
      toast.error("Failed to load files")
    } finally {
      setIsLoading(false)
    }
  }, [taskId])

  useEffect(() => {
    if (isOpen && taskId) {
      setSelectedFile(null)
      setFiles([])
      fetchFiles()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, taskId])

  // Fetch text content when selecting text/code files
  useEffect(() => {
    if (!selectedFile || !selectedFile.url || selectedFile.isLink) {
      setFileContent("")
      return
    }
    const fileType = getFileType(selectedFile)
    if (fileType !== "text" && fileType !== "code") {
      setFileContent("")
      return
    }
    let cancelled = false
    setIsContentLoading(true)
    fetch(selectedFile.url)
      .then((r) => r.text())
      .then((text) => { if (!cancelled) setFileContent(text) })
      .catch(() => { if (!cancelled) setFileContent("Error loading file content") })
      .finally(() => { if (!cancelled) setIsContentLoading(false) })
    return () => { cancelled = true }
  }, [selectedFile])

  const handleDownload = async (file) => {
    if (!file || !file.url || file.isLink) return
    try {
      const res = await fetch(file.url)
      if (!res.ok) throw new Error(`Download failed: ${res.statusText}`)
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = blobUrl
      link.download = file.filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)
    } catch (err) {
      toast.error(err.message || "Download failed")
    }
  }

  // Navigation
  const currentIndex = selectedFile ? files.findIndex((f) => f.id === selectedFile.id) : -1
  const handlePrev = () => { if (currentIndex > 0) setSelectedFile(files[currentIndex - 1]) }
  const handleNext = () => { if (currentIndex < files.length - 1) setSelectedFile(files[currentIndex + 1]) }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-[90vw] h-[80vh] p-0 gap-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-5 py-3 border-b border-border flex-shrink-0">
          <DialogTitle className="text-base font-medium flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">{taskTitle || "Task Files"}</span>
            {!isLoading && files.length > 0 && (
              <span className="text-muted-foreground font-normal text-sm ml-1">
                ({currentIndex + 1}/{files.length})
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Preview area (left 70%) */}
          <div className="w-[70%] h-full border-r border-border relative bg-muted/20">
            {files.length > 1 && (
              <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 flex justify-between px-3 z-10 pointer-events-none">
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full shadow-md pointer-events-auto h-8 w-8"
                  onClick={handlePrev}
                  disabled={currentIndex <= 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full shadow-md pointer-events-auto h-8 w-8"
                  onClick={handleNext}
                  disabled={currentIndex >= files.length - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
            <ContentViewer
              file={selectedFile}
              content={fileContent}
              isLoading={isLoading || isContentLoading}
            />
          </div>

          {/* File list (right 30%) */}
          <div className="w-[30%] h-full flex flex-col">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm font-medium text-foreground">
                Files {!isLoading && `(${files.length})`}
              </h3>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-0.5">
                {isLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : files.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <Paperclip className="h-8 w-8 opacity-30 mb-2" />
                    <p className="text-sm">No files available</p>
                  </div>
                ) : (
                  files.map((file) => (
                    <FileItem
                      key={file.id}
                      file={file}
                      isSelected={selectedFile?.id === file.id}
                      onSelect={setSelectedFile}
                      onDownload={handleDownload}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
