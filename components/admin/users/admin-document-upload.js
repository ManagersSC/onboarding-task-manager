"use client"

import { useCallback, useRef, useState } from "react"
import { Button } from "@components/ui/button"
import { Card } from "@components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@components/ui/select"
import { Label } from "@components/ui/label"
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from "lucide-react"
import { Badge } from "@components/ui/badge"

// Document type definitions with categories
const DOCUMENT_TYPES = {
  // Initial Application Documents
  'cv': { name: 'CV', category: 'Application', field: 'CV' },
  'portfolio': { name: 'Portfolio of Cases', category: 'Application', field: 'Portfolio of Cases' },
  'testimonials': { name: 'Testimonials', category: 'Application', field: 'Testimonials' },
  'reference1': { name: 'Reference 1', category: 'Application', field: 'Reference 1' },
  'reference2': { name: 'Reference 2', category: 'Application', field: 'Reference 2' },
  
  // Post-Hiring Documents
  'passport': { name: 'Passport', category: 'Legal', field: 'Passport' },
  'gdc_registration': { name: 'GDC Registration Certificate', category: 'Professional', field: 'GDC Registration Certificate' },
  'qualification': { name: 'Qualification Certificate', category: 'Professional', field: 'Qualification Certificate' },
  'dbs': { name: 'DBS Check', category: 'Legal', field: 'DBS' },
  'indemnity': { name: 'Indemnity Insurance', category: 'Professional', field: 'Indemnity Insurance' },
  'hep_b': { name: 'Hep B Immunity Record', category: 'Medical', field: 'Hep B Immunity Record' },
  'cpd': { name: 'CPD Training Certificates', category: 'Professional', field: 'CPD Training Certificates' },
  'profile_photo': { name: 'Profile Photo', category: 'Personal', field: 'Profile Photo' },
  'basic_life_support': { name: 'Basic Life Support Training', category: 'Training', field: 'Basic Life Support Training' },
  'p45': { name: 'P45', category: 'Employment', field: 'P45' },
  'new_starter_info': { name: 'New Starter Information', category: 'Employment', field: 'New Starter Information and Next of Kin Document' },
  'other': { name: 'Other Documents', category: 'Miscellaneous', field: 'Other Documents' }
}

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

export default function AdminDocumentUpload({ applicantId, applicantName, onUploadComplete, onClose }) {
  const [selectedDocType, setSelectedDocType] = useState('')
  const [files, setFiles] = useState([])
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState(null)
  const [fileErrors, setFileErrors] = useState([])
  const inputRef = useRef(null)

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = Array.from(e.dataTransfer.files || [])
    if (dropped.length) {
      const { valid, errors } = validateFiles(dropped)
      setFileErrors(errors)
      if (valid.length) setFiles((prev) => [...prev, ...valid])
    }
  }, [])

  const onPick = useCallback((e) => {
    const picked = Array.from(e.target.files || [])
    if (picked.length) {
      const { valid, errors } = validateFiles(picked)
      setFileErrors(errors)
      if (valid.length) setFiles((prev) => [...prev, ...valid])
    }
  }, [])

  const removeAt = (i) => setFiles((prev) => prev.filter((_, idx) => idx !== i))

  const handleSubmit = async () => {
    if (files.length === 0 || !selectedDocType) return
    
    setUploading(true)
    setUploadStatus(null)
    
    try {
      const formData = new FormData()
      formData.append('applicantId', applicantId)
      formData.append('documentType', selectedDocType)
      formData.append('field', DOCUMENT_TYPES[selectedDocType].field)
      formData.append('category', DOCUMENT_TYPES[selectedDocType].category)
      
      files.forEach((file, index) => {
        formData.append(`files`, file)
      })

      const response = await fetch('/api/admin/users/upload-document', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const result = await response.json()
      setUploadStatus({ success: true, message: `Successfully uploaded ${files.length} document(s)` })
      
      // Call the callback to refresh the applicant data
      onUploadComplete?.(result)
      
      // Reset form after successful upload
      setTimeout(() => {
        setFiles([])
        setSelectedDocType('')
        setUploadStatus(null)
        onClose?.()
      }, 2000)
      
    } catch (error) {
      setUploadStatus({ success: false, message: 'Upload failed. Please try again.' })
    } finally {
      setUploading(false)
    }
  }

  const getCategoryColor = (category) => {
    const colors = {
      'Application': 'bg-info-muted text-info',
      'Legal': 'bg-error-muted text-error',
      'Professional': 'bg-success-muted text-success',
      'Medical': 'bg-primary/10 text-primary',
      'Training': 'bg-warning-muted text-warning',
      'Employment': 'bg-info-muted text-info',
      'Personal': 'bg-primary/10 text-primary',
      'Miscellaneous': 'bg-muted text-muted-foreground'
    }
    return colors[category] || 'bg-muted text-muted-foreground'
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold">Upload Documents for {applicantName}</h3>
        <p className="text-sm text-muted-foreground">Select document type and upload files</p>
      </div>

      {/* Document Type Selection */}
      <div className="space-y-2">
        <Label htmlFor="document-type">Document Type *</Label>
        <Select value={selectedDocType} onValueChange={setSelectedDocType}>
          <SelectTrigger>
            <SelectValue placeholder="Select document type" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(DOCUMENT_TYPES).map(([key, doc]) => (
              <SelectItem key={key} value={key}>
                <div className="flex items-center gap-2">
                  <span>{doc.name}</span>
                  <Badge className={`text-xs ${getCategoryColor(doc.category)}`}>
                    {doc.category}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* File Upload Area */}
      <Card
        className={`flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-6 text-center ${
          dragOver ? "border-primary bg-primary/5" : "border-muted"
        }`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <Upload className="h-8 w-8 text-muted-foreground" />
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
        <div className="text-xs text-muted-foreground">
          PDF, DOCX, images. Multiple files supported.
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={onPick}
          aria-label="Choose files"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
        />
      </Card>

      {/* File validation errors */}
      {fileErrors.length > 0 && (
        <div className="text-xs text-red-500 space-y-1">
          {fileErrors.map((err, i) => <div key={i}>{err}</div>)}
        </div>
      )}

      {/* Selected Files */}
      {files.length > 0 && (
        <div className="rounded-md border">
          <div className="max-h-48 overflow-auto divide-y">
            {files.map((f, i) => (
              <div key={`${f.name}-${i}`} className="flex items-center justify-between px-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div className="truncate">
                    {f.name} <span className="text-muted-foreground">({Math.round(f.size / 1024)} KB)</span>
                  </div>
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

      {/* Upload Status */}
      {uploadStatus && (
        <div className={`p-3 rounded-md border ${
          uploadStatus.success ? 'border-success/30 bg-success-muted' : 'border-error/30 bg-error-muted'
        }`}>
          <div className="flex items-center gap-2">
            {uploadStatus.success ? (
              <CheckCircle className="h-4 w-4 text-success" />
            ) : (
              <AlertCircle className="h-4 w-4 text-error" />
            )}
            <span className={`text-sm ${
              uploadStatus.success ? 'text-success' : 'text-error'
            }`}>
              {uploadStatus.message}
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={onClose}
          disabled={uploading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={files.length === 0 || !selectedDocType || uploading}
          className="min-w-[100px]"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
