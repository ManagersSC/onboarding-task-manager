"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Download, ExternalLink, FileText, ImageIcon, File, AlertCircle, Loader2 } from "lucide-react"
import { formatBytes } from "@/lib/utils/format"
import Image from "next/image"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@components/ui/dialog"
import { Button } from "@components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs"

export function FileViewerModal({ file, open, onOpenChange }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState("preview")
  const [textContent, setTextContent] = useState("")

  useEffect(() => {
    if (open && file) {
      setLoading(true)
      setError(null)
      setTextContent("")
      // For text files, fetch the content
      if (
        file.mimeType &&
        (file.mimeType.includes("text") ||
          file.mimeType.includes("javascript") ||
          file.mimeType.includes("json") ||
          file.mimeType.includes("html") ||
          file.mimeType.includes("css"))
      ) {
        fetch(file.url)
          .then((res) => res.text())
          .then((txt) => {
            setTextContent(txt)
            setLoading(false)
          })
          .catch(() => {
            setError("Failed to load text content.")
            setLoading(false)
          })
      } else {
        // Simulate loading for other types
        const timer = setTimeout(() => {
          setLoading(false)
        }, 1000)
        return () => clearTimeout(timer)
      }
    }
  }, [open, file])

  if (!file) return null

  const getFileIcon = () => {
    if (!file.mimeType) return <File className="h-6 w-6" />

    if (file.mimeType.startsWith("image/")) {
      return <ImageIcon className="h-6 w-6" />
    } else if (file.mimeType.includes("pdf") || file.mimeType.includes("document") || file.mimeType.includes("text")) {
      return <FileText className="h-6 w-6" />
    }

    return <File className="h-6 w-6" />
  }

  const renderFilePreview = () => {
    if (loading) {
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

    // Handle different file types
    if (!file.mimeType) {
      return (
        <div className="flex flex-col items-center justify-center h-[400px]">
          <File className="h-16 w-16 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Preview not available</p>
        </div>
      )
    }

    if (file.mimeType.startsWith("image/")) {
      return (
        <div className="flex items-center justify-center h-[400px] bg-muted/30 rounded-md overflow-hidden">
          <Image
            src={file.url || "/placeholder.svg"}
            alt={file.title}
            className="max-w-full max-h-full object-contain"
            width={400}
            height={400}
            onError={() => setError("Failed to load image")}
          />
        </div>
      )
    } else if (file.mimeType.includes("pdf")) {
      return (
        <div className="h-[400px] bg-muted/30 rounded-md overflow-hidden">
          <iframe
            src={`${file.url}#view=FitH`}
            title={file.title}
            className="w-full h-full border-0"
            onError={() => setError("Failed to load PDF")}
          />
        </div>
      )
    } else if (
      file.mimeType.includes("text") ||
      file.mimeType.includes("javascript") ||
      file.mimeType.includes("json") ||
      file.mimeType.includes("html") ||
      file.mimeType.includes("css")
    ) {
      return (
        <div className="h-[400px] bg-muted/30 rounded-md overflow-auto p-4">
          <pre className="text-sm whitespace-pre-wrap max-h-[350px] overflow-auto m-0">
            <code className="break-all">{textContent || "(No content)"}</code>
          </pre>
        </div>
      )
    } else {
      return (
        <div className="flex flex-col items-center justify-center h-[400px]">
          <div className="p-6 rounded-full bg-muted mb-4">{getFileIcon()}</div>
          <p className="text-muted-foreground mb-2">Preview not available for this file type</p>
          <p className="text-sm text-muted-foreground">{file.mimeType || "Unknown file type"}</p>
        </div>
      )
    }
  }

  const renderFileDetails = () => {
    return (
      <div className="space-y-4 p-4 h-[400px] overflow-auto">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <p className="text-sm font-medium">File Name</p>
            <p className="text-sm text-muted-foreground break-all">{file.title}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">File Type</p>
            <p className="text-sm text-muted-foreground">{file.mimeType || "Unknown"}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">File Size</p>
            <p className="text-sm text-muted-foreground">{file.size ? formatBytes(file.size) : "Unknown"}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Last Updated</p>
            <p className="text-sm text-muted-foreground">
              {file.updatedAt ? new Date(file.updatedAt).toLocaleString() : "Unknown"}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {getFileIcon()}
            <div className="flex-1 min-w-0">
              <DialogTitle className="truncate">{file.title}</DialogTitle>
              <DialogDescription className="truncate">
                {file.mimeType || "Unknown file type"}
                {file.size && ` • ${formatBytes(file.size)}`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="preview" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>
          <TabsContent value="preview" className="mt-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={`preview-${loading ? "loading" : "content"}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {renderFilePreview()}
              </motion.div>
            </AnimatePresence>
          </TabsContent>
          <TabsContent value="details" className="mt-4">
            {renderFileDetails()}
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex flex-row justify-between items-center gap-2 sm:gap-0">
          <div className="text-sm text-muted-foreground">
            {file.updatedAt && `Last updated ${new Date(file.updatedAt).toLocaleDateString()}`}
          </div>
          <div className="flex gap-2">
            {(file.mimeType && (file.mimeType.startsWith("image/") || file.mimeType.includes("pdf") || file.mimeType.includes("text") || file.mimeType.includes("html"))) && (
              <Button variant="outline" size="sm" asChild>
                <a href={file.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Open
                </a>
              </Button>
            )}
            <Button size="sm" asChild>
              <a
                href={file.url}
                download={file.title}
                target="_blank"
                rel="noopener noreferrer"
                title="If download does not start, right-click and choose 'Save link as...'"
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </a>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
