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

export default function AdminDocumentUpload({ applicantId, applicantName, onUploadComplete, onClose }) {
  const [selectedDocType, setSelectedDocType] = useState('')
  const [files, setFiles] = useState([])
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState(null)
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
      'Application': 'bg-blue-100 text-blue-800',
      'Legal': 'bg-red-100 text-red-800',
      'Professional': 'bg-green-100 text-green-800',
      'Medical': 'bg-purple-100 text-purple-800',
      'Training': 'bg-yellow-100 text-yellow-800',
      'Employment': 'bg-orange-100 text-orange-800',
      'Personal': 'bg-pink-100 text-pink-800',
      'Miscellaneous': 'bg-gray-100 text-gray-800'
    }
    return colors[category] || 'bg-gray-100 text-gray-800'
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
        />
      </Card>

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
          uploadStatus.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
        }`}>
          <div className="flex items-center gap-2">
            {uploadStatus.success ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <span className={`text-sm ${
              uploadStatus.success ? 'text-green-800' : 'text-red-800'
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
