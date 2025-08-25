"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@components/ui/dialog"
import { Button } from "@components/ui/button"
import { Badge } from "@components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs"
import { ScrollArea } from "@components/ui/scroll-area"
import { 
  Download, 
  ExternalLink, 
  FileText, 
  ImageIcon, 
  File, 
  AlertCircle, 
  Loader2, 
  Calendar, 
  User, 
  Tag,
  X
} from "lucide-react"
import Image from "next/image"

// File type detection
const getFileType = (file) => {
  if (!file) return "unknown"
  
  const url = file.fileUrl || file.url || ""
  const name = file.name || file.originalName || ""
  const type = file.type || ""
  
  // Check by MIME type first
  if (type.includes("pdf")) return "pdf"
  if (type.startsWith("image/")) return "image"
  if (type.includes("text") || type.includes("document")) return "text"
  
  // Check by file extension
  const extension = name.split(".").pop()?.toLowerCase()
  if (["pdf"].includes(extension)) return "pdf"
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(extension)) return "image"
  if (["txt", "md", "rtf", "doc", "docx"].includes(extension)) return "text"
  
  return "unknown"
}

// File icon component
const FileIcon = ({ file }) => {
  const fileType = getFileType(file)
  
  switch (fileType) {
    case "pdf":
      return <FileText className="h-6 w-6 text-red-500" />
    case "image":
      return <ImageIcon className="h-6 w-6 text-blue-500" />
    case "text":
      return <FileText className="h-6 w-6 text-green-500" />
    default:
      return <File className="h-6 w-6 text-gray-500" />
  }
}

// File preview component
const FilePreview = ({ file, isLoading, error }) => {
  const fileType = getFileType(file)
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading file preview...</p>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px]">
        <AlertCircle className="h-8 w-8 text-destructive mb-4" />
        <p className="text-muted-foreground mb-2">Failed to load file preview</p>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    )
  }
  
  if (!file) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px]">
        <File className="h-16 w-16 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No file selected</p>
      </div>
    )
  }
  
  const fileUrl = file.fileUrl || file.url
  
  if (!fileUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px]">
        <File className="h-16 w-16 text-muted-foreground mb-4" />
        <p className="text-muted-foreground mb-2">File URL not available</p>
        <p className="text-sm text-muted-foreground">Cannot preview this file</p>
      </div>
    )
  }
  
  switch (fileType) {
    case "image":
      return (
        <div className="flex items-center justify-center h-[400px] bg-muted/30 rounded-md overflow-hidden">
          <Image
            src={fileUrl}
            alt={file.name || file.originalName || "Document"}
            className="max-w-full max-h-full object-contain"
            width={400}
            height={400}
            onError={() => {
              // Handle image load error
            }}
          />
        </div>
      )
      
    case "pdf":
      return (
        <div className="h-[400px] bg-muted/30 rounded-md overflow-hidden">
          <iframe
            src={`${fileUrl}#view=FitH`}
            title={file.name || file.originalName || "PDF Document"}
            className="w-full h-full border-0"
            onError={() => {
              // Handle PDF load error
            }}
          />
        </div>
      )
      
    case "text":
      return (
        <div className="h-[400px] bg-muted/30 rounded-md overflow-auto p-4">
          <div className="text-sm text-muted-foreground">
            <p>Text preview not available for this file type.</p>
            <p className="mt-2">Use the download button to view the file content.</p>
          </div>
        </div>
      )
      
    default:
      return (
        <div className="flex flex-col items-center justify-center h-[400px]">
          <div className="p-6 rounded-full bg-muted mb-4">
            <FileIcon file={file} />
          </div>
          <p className="text-muted-foreground mb-2">Preview not available for this file type</p>
          <p className="text-sm text-muted-foreground">{file.type || "Unknown file type"}</p>
        </div>
      )
  }
}

// File details component
const FileDetails = ({ file }) => {
  if (!file) return null
  
  const formatDate = (dateString) => {
    if (!dateString) return "Unknown"
    try {
      return new Date(dateString).toLocaleDateString()
    } catch {
      return "Invalid date"
    }
  }
  
  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return "Unknown"
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${Math.round((bytes / Math.pow(1024, i)) * 100) / 100} ${sizes[i]}`
  }
  
  return (
    <div className="space-y-4 p-4 h-[400px] overflow-auto">
      {/* Basic File Info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-sm font-medium">File Name</p>
          <p className="text-sm text-muted-foreground break-all">
            {file.name || file.originalName || "Unknown"}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">File Type</p>
          <p className="text-sm text-muted-foreground">{file.type || "Unknown"}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">File Size</p>
          <p className="text-sm text-muted-foreground">
            {formatFileSize(file.size)}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">Upload Date</p>
          <p className="text-sm text-muted-foreground">
            {formatDate(file.uploadedAt)}
          </p>
        </div>
      </div>

      {/* Document Information */}
      {(file.category || file.source || file.status) && (
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-3">Document Information</h4>
          <div className="grid grid-cols-2 gap-4">
            {file.category && (
              <div className="space-y-1">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Tag className="h-3 w-3" />
                  Category
                </p>
                <Badge variant="secondary">{file.category}</Badge>
              </div>
            )}
            {file.source && (
              <div className="space-y-1">
                <p className="text-sm font-medium flex items-center gap-2">
                  <User className="h-3 w-3" />
                  Source
                </p>
                <p className="text-sm text-muted-foreground">{file.source}</p>
              </div>
            )}
            {file.status && (
              <div className="space-y-1">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-3 w-3" />
                  Status
                </p>
                <Badge 
                  variant={file.status === 'Completed' ? 'default' : 'secondary'}
                >
                  {file.status}
                </Badge>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Main modal component
export function ApplicantFileViewerModal({ file, open, onOpenChange }) {
  const [activeTab, setActiveTab] = useState("preview")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  useEffect(() => {
    if (open && file) {
      setLoading(true)
      setError(null)
      
      // Simulate loading for better UX
      const timer = setTimeout(() => {
        setLoading(false)
      }, 500)
      
      return () => clearTimeout(timer)
    }
  }, [open, file])
  
  if (!file) return null
  
  const fileUrl = file.fileUrl || file.url
  const fileName = file.name || file.originalName || "Document"
  
  const handleDownload = async () => {
    if (!fileUrl) {
      setError("Download URL not available")
      return
    }
    
    try {
      setLoading(true)
      
      // Fetch the file as a blob
      const response = await fetch(fileUrl)
      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`)
      }
      
      const blob = await response.blob()
      
      // Create a download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Cleanup
      window.URL.revokeObjectURL(url)
      
    } catch (err) {
      console.error('Download error:', err)
      setError(`Download failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }
  
  const handleOpenInNewTab = () => {
    if (fileUrl) {
      window.open(fileUrl, '_blank', 'noopener,noreferrer')
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <FileIcon file={file} />
            <div className="flex-1 min-w-0">
              <DialogTitle className="truncate">{fileName}</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-muted-foreground">
                  {file.type || "Unknown file type"}
                </span>
                {file.size && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-sm text-muted-foreground">
                      {Math.round(file.size / 1024)} KB
                    </span>
                  </>
                )}
                {file.category && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-sm text-muted-foreground">
                      {file.category}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>
          
          <TabsContent value="preview" className="mt-4">
            <FilePreview 
              file={file} 
              isLoading={loading} 
              error={error} 
            />
          </TabsContent>
          
          <TabsContent value="details" className="mt-4">
            <FileDetails file={file} />
          </TabsContent>
        </Tabs>

        <div className="flex flex-row justify-between items-center gap-2 sm:gap-0 pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {file.uploadedAt && `Uploaded ${formatDate(file.uploadedAt)}`}
          </div>
          
          <div className="flex gap-2">
            {fileUrl && (
              <Button variant="outline" size="sm" onClick={handleOpenInNewTab}>
                <ExternalLink className="h-4 w-4 mr-1" />
                Open
              </Button>
            )}
            <Button 
              size="sm" 
              onClick={handleDownload}
              disabled={loading || !fileUrl}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-1" />
              )}
              Download
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Helper function for date formatting
function formatDate(dateString) {
  if (!dateString) return "Unknown"
  try {
    return new Date(dateString).toLocaleDateString()
  } catch {
    return "Invalid date"
  }
}

