"use client"

import { useCallback, useRef, useState } from "react"
import { Button } from "@components/ui/button"
import { Card } from "@components/ui/card"

export default function UploadDropzone({ onSubmit }) {
  const [files, setFiles] = useState([])
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = Array.from(e.dataTransfer.files || [])
    if (dropped.length) setFiles((prev) => [...prev, ...dropped])
  }, [])

  const onPick = useCallback((e) => {
    const picked = Array.from(e.target.files || [])
    if (picked.length) setFiles((prev) => [...prev, ...picked])
  }, [])

  const removeAt = (i) => setFiles((prev) => prev.filter((_, idx) => idx !== i))

  const handleSubmit = async () => {
    if (files.length === 0) return
    await onSubmit?.(files)
    setFiles([])
  }

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
        <div className="text-xs text-muted-foreground">PDF, DOCX, images. Multiple files supported.</div>
        <input ref={inputRef} type="file" multiple className="hidden" onChange={onPick} aria-label="Choose files" />
      </Card>

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
          Submit Feedback
        </Button>
      </div>
    </div>
  )
}
