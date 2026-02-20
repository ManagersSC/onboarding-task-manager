"use client"

import { useCallback, useRef, useState, useEffect } from "react"
import { Button } from "@components/ui/button"
import { Card } from "@components/ui/card"

// VULN-M15: Client-side file validation constants
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'image/gif', 'image/webp']
const BLOCKED_EXTENSIONS = ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.html', '.htm', '.svg', '.js']

function validateFiles(fileList) {
  const valid = []
  const errors = []
  for (const file of fileList) {
    const ext = (file.name || '').toLowerCase().match(/\.[^.]+$/)?.[0] || ''
    if (file.size > MAX_FILE_SIZE) {
      errors.push(`"${file.name}" exceeds the 10MB size limit`)
    } else if (BLOCKED_EXTENSIONS.includes(ext)) {
      errors.push(`"${file.name}" has a blocked file type`)
    } else if (file.type && !ALLOWED_TYPES.includes(file.type)) {
      errors.push(`"${file.name}" has an unsupported file type`)
    } else {
      valid.push(file)
    }
  }
  return { valid, errors }
}

export default function UploadDropzone({ onSubmit, registerSubmit, onFilesChange, showActions = true, submitLabel = "Submit Feedback", maxFiles = Infinity }) {
  const [files, setFiles] = useState([])
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)

  const [fileErrors, setFileErrors] = useState([])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = Array.from(e.dataTransfer.files || [])
    if (dropped.length) {
      const { valid, errors } = validateFiles(dropped)
      setFileErrors(errors)
      if (valid.length) setFiles((prev) => {
        const next = [...prev, ...valid]
        if (Number.isFinite(maxFiles)) return next.slice(0, maxFiles)
        return next
      })
    }
  }, [])

  const onPick = useCallback((e) => {
    const picked = Array.from(e.target.files || [])
    if (picked.length) {
      const { valid, errors } = validateFiles(picked)
      setFileErrors(errors)
      if (valid.length) setFiles((prev) => {
        const next = [...prev, ...valid]
        if (Number.isFinite(maxFiles)) return next.slice(0, maxFiles)
        return next
      })
    }
  }, [])

  const removeAt = (i) => setFiles((prev) => prev.filter((_, idx) => idx !== i))

  const handleSubmit = async () => {
    if (files.length === 0) return
    const toSend = Number.isFinite(maxFiles) ? files.slice(0, maxFiles) : files
    await onSubmit?.(toSend)
    setFiles([])
  }

  // Expose submit handler to parent and emit file changes
  useEffect(() => {
    try { registerSubmit?.(handleSubmit) } catch {}
    try { onFilesChange?.(files) } catch {}
  }, [files])

  return (
    <div className="space-y-3">
      <Card
        className={`flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-6 text-center ${dragOver ? "border-primary bg-primary/5" : "border-muted"}`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <div className="text-sm">
          Drag & drop files here, or{" "}
          <button
            type="button"
            className="underline underline-offset-2 cursor-pointer"
            onClick={() => inputRef.current?.click()}
          >
            browse
          </button>
        </div>
        <div className="text-xs text-muted-foreground">PDF, DOCX, images.</div>
        <input ref={inputRef} type="file" multiple className="hidden" onChange={onPick} aria-label="Choose files" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp" />
      </Card>

      {fileErrors.length > 0 && (
        <div className="text-xs text-red-500 space-y-1">
          {fileErrors.map((err, i) => <div key={i}>{err}</div>)}
        </div>
      )}

      {files.length > 0 && (
        <div className="rounded-md border">
          <div className="max-h-48 overflow-auto divide-y">
            {files.map((f, i) => (
              <div key={`${f.name}-${i}`} className="flex items-center justify-between px-3 py-2 text-sm">
                <div className="truncate">
                  {f.name} <span className="text-muted-foreground">({Math.round(f.size / 1024)} KB)</span>
                </div>
                <button
                  className="text-muted-foreground hover:text-foreground cursor-pointer text-xs"
                  onClick={() => removeAt(i)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showActions && (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            className="cursor-pointer bg-transparent"
            onClick={() => setFiles([])}
            disabled={files.length === 0}
          >
            Clear
          </Button>
          <Button className="cursor-pointer" onClick={handleSubmit} disabled={files.length === 0}>
            {submitLabel}
          </Button>
        </div>
      )}
    </div>
  )
}
