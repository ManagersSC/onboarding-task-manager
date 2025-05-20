"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@components/ui/dialog"
import { ScrollArea } from "@components/ui/scroll-area"
import { Button } from "@components/ui/button"
import { Input } from "@components/ui/input"
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
  PlusCircle,
  Save,
  Trash2,
  Loader2,
  Pencil,
} from "lucide-react"

// File type icons mapping
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

// Get file type from mime type or extension
const getFileType = (file) => {
  if (!file) return "default"

  const mimeType = file.type || ""
  const extension = file.filename ? file.filename.split(".").pop().toLowerCase() : ""

  if (mimeType.includes("pdf") || extension === "pdf") return "pdf"
  if (mimeType.includes("image") || ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(extension)) return "image"
  if (
    mimeType.includes("text") ||
    ["txt", "md", "rtf", "js", "jsx", "ts", "tsx", "css", "html", "json"].includes(extension)
  )
    return "text"
  if (mimeType.includes("spreadsheet") || ["xls", "xlsx", "csv"].includes(extension)) return "spreadsheet"
  if (["js", "jsx", "ts", "tsx", "html", "css", "json", "xml", "py", "rb", "java", "php"].includes(extension))
    return "code"
  if (mimeType.includes("zip") || ["zip", "rar", "7z", "tar", "gz"].includes(extension)) return "archive"
  if (mimeType.includes("audio") || ["mp3", "wav", "ogg", "flac"].includes(extension)) return "audio"
  if (mimeType.includes("video") || ["mp4", "webm", "avi", "mov", "wmv"].includes(extension)) return "video"

  return "default"
}

// Format file size
const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return "0 Bytes"

  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${Number.parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`
}

// File Item Component
const FileItem = ({ file, displayName, isSelected, onSelect, onRename, onDelete, onDownload }) => {
  const fileType = getFileType(file)
  const icon = fileTypeIcons[fileType] || fileTypeIcons.default
  const nameToShow = displayName ?? file.filename

  return (
    <div
      className={cn(
        "flex items-center gap-2 p-3 rounded-md cursor-pointer",
        isSelected ? "bg-[#1f2937]" : "hover:bg-[#1a1d24]",
      )}
      onClick={() => onSelect(file)}
    >
      <div className="flex-shrink-0 text-gray-400">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{nameToShow}</div>
        <div className="text-xs text-gray-400 flex items-center gap-1">
          <span>{formatFileSize(file.size)}</span>
          <span>•</span>
          <span>{file.type || "Text"}</span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-gray-400 hover:text-white hover:bg-[#1f2937]"
          onClick={(e) => {
            e.stopPropagation()
            onRename(file)
          }}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-gray-400 hover:text-white hover:bg-[#1f2937]"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(file)
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-gray-400 hover:text-white hover:bg-[#1f2937]"
          onClick={(e) => {
            e.stopPropagation()
            onDownload(file)
          }}
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// File Content Viewer
const FileContentViewer = ({ file, content, isLoading }) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>Loading content...</p>
        </div>
      </div>
    )
  }

  if (!file) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <p>No file selected</p>
      </div>
    )
  }

  const fileType = getFileType(file)

  if (fileType === "image") {
    return (
      <div className="flex items-center justify-center h-full">
        <img
          src={file.url || "/placeholder.svg"}
          alt={file.filename}
          className="max-w-full max-h-full object-contain"
        />
      </div>
    )
  }

  if (fileType === "pdf") {
    return <iframe src={file.url} className="w-full h-full border-0" title={file.filename} />
  }

  // Text or code content
  return (
    <ScrollArea className="h-full w-full">
      <div className="p-4">
        <pre className="whitespace-pre-wrap font-mono text-sm text-white">{content || "No content available"}</pre>
      </div>
    </ScrollArea>
  )
}

// File Upload Area
const FileUploadArea = ({ onFilesAdded }) => {
  const fileInputRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesAdded(Array.from(e.dataTransfer.files))
    }
  }

  return (
    <div
      className={cn(
        "border-2 border-dashed rounded-md p-4 mt-2 transition-colors",
        isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex flex-col items-center gap-2">
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          multiple
          onChange={(e) => {
            if (e.target.files?.length) {
              onFilesAdded(Array.from(e.target.files))
            }
          }}
        />
        <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full">
          <PlusCircle className="h-4 w-4 mr-2" />
          Select Files
        </Button>
        <p className="text-sm text-center text-muted-foreground">or drag and drop files here</p>
      </div>
    </div>
  )
}

// Rename Dialog
const RenameDialog = ({ file, isOpen, onClose, onSave }) => {
  const [newName, setNewName] = useState("")

  useEffect(() => {
    if (file && isOpen) {
      setNewName(file.filename)
    }
  }, [file, isOpen])

  const handleSave = () => {
    if (newName.trim() === "") {
      toast.error(
        <div>
          <div className="font-semibold">Error</div>
          <div className="text-sm opacity-80">Filename cannot be empty</div>
        </div>
      )
      return
    }

    onSave(newName)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename File</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter new filename"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}


// Main File Viewer Modal Component
export function FileViewerModal({ isOpen, onClose, taskId, onFilesUpdated }) {
  const [files, setFiles] = useState([])
  const [selectedFile, setSelectedFile] = useState(null)
  const [fileContent, setFileContent] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isContentLoading, setIsContentLoading] = useState(false)

  // File operations state
  const [showUploadArea, setShowUploadArea] = useState(false)
  const [newFiles, setNewFiles] = useState([])
  const [filesToRemove, setFilesToRemove] = useState([])
  const [fileRenames, setFileRenames] = useState({})
  const [isSaving, setIsSaving] = useState(false)

  // Rename dialog state
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [fileToRename, setFileToRename] = useState(null)

  // Derived state
  const hasUnsavedChanges = newFiles.length > 0 || Object.keys(fileRenames).length > 0 || filesToRemove.length > 0

  // Combined files (existing + new)
  const allFiles = [
    ...files.filter((file) => !filesToRemove.includes(file.id)),
    ...newFiles.map((file, idx) => ({
      id: `new-${idx}`,
      filename: file.name,
      size: file.size,
      type: file.type,
      url: URL.createObjectURL(file),
      isNew: true,
      file: file,
    })),
  ]

  // Get display name (considering renames)
  const getDisplayName = (file) => {
    if (file.isNew) return file.filename
    return fileRenames[file.id]?.newName || file.filename
  }

  // Fetch files when modal opens
  useEffect(() => {
    if (isOpen && taskId) {
      fetchFiles()
    }

    // Cleanup object URLs when component unmounts
    return () => {
      newFiles.forEach((file) => {
        if (file.objectUrl) URL.revokeObjectURL(file.objectUrl)
      })
    }
  }, [isOpen, taskId])

  // Fetch file content when selected file changes
  useEffect(() => {
    if (selectedFile) {
      fetchFileContent(selectedFile)
    } else {
      setFileContent("")
    }
  }, [selectedFile])

  // Fetch files from API
  const fetchFiles = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/tasks/core-tasks/${taskId}/attachments`)
      if (!response.ok) {
        throw new Error(`Error fetching files: ${response.statusText}`)
      }

      const data = await response.json()
      const formattedFiles = (data.attachments || []).map((attachment) => ({
        id: attachment.id,
        filename: attachment.filename,
        size: attachment.size,
        type: attachment.type,
        url: attachment.url,
      }))

      setFiles(formattedFiles)

      // Select first file if available
      if (formattedFiles.length > 0 && !selectedFile) {
        setSelectedFile(formattedFiles[0])
      }

      // Reset state
      setNewFiles([])
      setFilesToRemove([])
      setFileRenames({})
      setShowUploadArea(false)
    } catch (error) {
      console.error("Error fetching files:", error)
      toast.error(
        <div>
          <div className="font-semibold">Error</div>
          <div className="text-sm opacity-80">Failed to load files</div>
        </div>
      )
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch file content
  const fetchFileContent = async (file) => {
    if (!file || !file.url) return

    const fileType = getFileType(file)
    if (fileType !== "text" && fileType !== "code") {
      setFileContent("")
      return
    }

    setIsContentLoading(true)
    try {
      const response = await fetch(file.url)
      if (!response.ok) {
        throw new Error(`Error fetching file content: ${response.statusText}`)
      }

      const content = await response.text()
      setFileContent(content)
    } catch (error) {
      console.error("Error fetching file content:", error)
      setFileContent("Error loading file content")
    } finally {
      setIsContentLoading(false)
    }
  }

  // File operations
  const handleSelectFile = (file) => {
    setSelectedFile(file)
  }

  const handleAddFiles = (files) => {
    setNewFiles((prev) => [...prev, ...files])
    setShowUploadArea(false)
  }

  const handleDeleteFile = (file) => {
    if (file.isNew) {
      // Remove from new files
      const fileIndex = newFiles.findIndex((f) => f === file.file)
      if (fileIndex !== -1) {
        setNewFiles((prev) => prev.filter((_, idx) => idx !== fileIndex))
      }
    } else {
      // Mark for removal
      setFilesToRemove((prev) => [...prev, file.id])
    }

    // If the deleted file is selected, select another file
    if (selectedFile && selectedFile.id === file.id) {
      const remainingFiles = allFiles.filter((f) => f.id !== file.id)
      setSelectedFile(remainingFiles.length > 0 ? remainingFiles[0] : null)
    }
  }

  const handleRenameFile = (file) => {
    setFileToRename(file)
    setRenameDialogOpen(true)
  }

  const handleSaveRename = (newName) => {
    if (!fileToRename) return

    if (fileToRename.isNew) {
      // Rename new file
      const fileIndex = newFiles.findIndex((f) => f === fileToRename.file)
      if (fileIndex !== -1) {
        const updatedFiles = [...newFiles]
        const file = updatedFiles[fileIndex]

        // Create a new File object with the new name
        const renamedFile = new File([file], newName, { type: file.type })
        updatedFiles[fileIndex] = renamedFile

        setNewFiles(updatedFiles)
      }
    } else {
      // Add to renames
      setFileRenames((prev) => ({
        ...prev,
        [fileToRename.id]: {
          originalName: fileToRename.filename,
          newName,
        },
      }))
    }
  }

  // Save changes
  const handleSaveChanges = async () => {
    if (!taskId) {
      toast.error(
        <div>
          <div className="font-semibold">Error</div>
          <div className="text-sm opacity-80">Task ID is required</div>
        </div>
      )
      return
    }

    setIsSaving(true)
    try {
      const formData = new FormData()

      // Add renames
      if (Object.keys(fileRenames).length > 0) {
        const renames = Object.entries(fileRenames).map(([fileId, { newName }]) => ({
          fileId,
          newFilename: newName,
        }))
        formData.append("renames", JSON.stringify(renames))
      }

      // Add removals
      if (filesToRemove.length > 0) {
        formData.append("removeIds", JSON.stringify(filesToRemove))
      }

      // Add new files
      newFiles.forEach((file) => {
        formData.append("newFiles", file)
      })

      // Send request
      const response = await fetch(`/api/admin/tasks/core-tasks/${taskId}/attachments`, {
        method: "PATCH",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to save changes")
      }

      const data = await response.json()

      toast.success(
        <div>
          <div className="font-semibold">Success</div>
          <div className="text-sm opacity-80">Changes saved successfully</div>
        </div>
      )

      // Reset state
      setNewFiles([])
      setFilesToRemove([])
      setFileRenames({})

      // Update files
      const updatedFiles = data.attachments || []
      setFiles(
        updatedFiles.map((attachment) => ({
          id: attachment.id,
          filename: attachment.filename,
          size: attachment.size,
          type: attachment.type,
          url: attachment.url,
        })),
      )

      // Notify parent
      if (onFilesUpdated) {
        onFilesUpdated()
      }
    } catch (error) {
      console.error("Error saving changes:", error)
      toast.error(
        <div>
          <div className="font-semibold">Error</div>
          <div className="text-sm opacity-80">{error.message || "Failed to save changes"}</div>
        </div>
      )
    } finally {
      setIsSaving(false)
    }
  }

  // Navigation
  const handlePrevFile = () => {
    const currentIndex = allFiles.findIndex((file) => file.id === selectedFile?.id)
    if (currentIndex > 0) {
      setSelectedFile(allFiles[currentIndex - 1])
    }
  }

  const handleNextFile = () => {
    const currentIndex = allFiles.findIndex((file) => file.id === selectedFile?.id)
    if (currentIndex < allFiles.length - 1) {
      setSelectedFile(allFiles[currentIndex + 1])
    }
  }

  async function handleDownloadFile(file) {
    if (!file || !file.url) return
  
    try {
      // 1) Fetch the raw data
      const res = await fetch(file.url)
      if (!res.ok) throw new Error(`Download failed: ${res.statusText}`)
      const blob = await res.blob()
  
      // 2) Create a blob URL
      const blobUrl = URL.createObjectURL(blob)
  
      // 3) Create and click an <a download> pointing at it
      const link = document.createElement("a")
      link.href = blobUrl
      link.download = getDisplayName(file)  // your filename logic
      document.body.appendChild(link)
      link.click()
  
      // 4) Cleanup
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)
    } catch (err) {
      console.error(err)
      toast.error(
        <div>
          <div className="font-semibold">Download error</div>
          <div className="text-sm opacity-80">{err.message}</div>
        </div>
      )
    }
  }

  // Get current file index
  const getCurrentFileIndex = () => {
    if (!selectedFile) return -1
    return allFiles.findIndex((file) => file.id === selectedFile.id)
  }

  const currentIndex = getCurrentFileIndex()

  return (
    <Dialog open={isOpen} onOpenChange={onClose} className="dark">
      <DialogContent className="max-w-6xl w-[90vw] h-[85vh] p-0 bg-[#0a0c10] border border-gray-800 text-white flex flex-col">
        <DialogHeader className="px-6 py-2 border-b border-gray-800">
          <DialogTitle className="text-lg font-medium flex items-center justify-between">
            <div className="flex items-center gap-2">
              File Viewer
              {!isLoading && allFiles.length > 0 && (
                <span className="text-gray-400 font-normal">
                  ({currentIndex + 1} of {allFiles.length})
                </span>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Left side: File viewer (70%) */}
          <div className="w-[70%] h-full border-r border-gray-800 relative">
            {/* File navigation */}
            {allFiles.length > 1 && (
              <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 flex justify-between px-4 z-10 pointer-events-none">
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full bg-background shadow-md pointer-events-auto"
                  onClick={handlePrevFile}
                  disabled={currentIndex <= 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full bg-background shadow-md pointer-events-auto"
                  onClick={handleNextFile}
                  disabled={currentIndex >= allFiles.length - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* File content */}
            <FileContentViewer file={selectedFile} content={fileContent} isLoading={isLoading || isContentLoading} />
          </div>

          {/* Right side: File list (30%) */}
          <div className="w-[30%] h-full flex flex-col bg-[#0a0c10]">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h3 className="font-medium">Files {!isLoading && `(${allFiles.length})`}</h3>
              <Button
                variant="outline"
                size="sm"
                className="bg-[#1f2937] text-white border-gray-700 hover:bg-[#2d3748]"
                onClick={() => setShowUploadArea(!showUploadArea)}
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Files
              </Button>
            </div>

            {showUploadArea && (
              <div className="px-4">
                <FileUploadArea onFilesAdded={handleAddFiles} />
              </div>
            )}

            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {isLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : allFiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <p>No files available</p>
                    <Button variant="outline" size="sm" onClick={() => setShowUploadArea(true)} className="mt-2">
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Files
                    </Button>
                  </div>
                ) : (
                  allFiles.map((file) => (
                    <FileItem
                      key={file.id}
                      file={file}
                      displayName={getDisplayName(file)}
                      isSelected={selectedFile?.id === file.id}
                      onSelect={handleSelectFile}
                      onRename={handleRenameFile}
                      onDelete={handleDeleteFile}
                      onDownload={handleDownloadFile}
                    />
                  ))
                )}
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-gray-800">
              <Button
                className="w-full bg-[#1f2937] text-white border-gray-700 hover:bg-[#2d3748]"
                onClick={handleSaveChanges}
                disabled={!hasUnsavedChanges || isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Rename Dialog */}
      <RenameDialog
        file={fileToRename}
        isOpen={renameDialogOpen}
        onClose={() => setRenameDialogOpen(false)}
        onSave={handleSaveRename}
      />
    </Dialog>
  )
}