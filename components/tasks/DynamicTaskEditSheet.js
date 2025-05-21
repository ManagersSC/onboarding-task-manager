"use client"

import { useEffect, useState, useCallback } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { AnimatePresence } from "framer-motion"
import { Button } from "@components/ui/button"
import { Input } from "@components/ui/input"
import { Textarea } from "@components/ui/textarea"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@components/ui/sheet"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@components/ui/form"
import { Skeleton } from "@components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@components/ui/select"
import { AlertCircle, Info, LinkIcon, FileIcon, X, Upload, Paperclip, Plus, ChevronsUpDown } from "lucide-react"
import { cn } from "@components/lib/utils"
import { toast } from "sonner"
import { Badge } from "@components/ui/badge"

export function DynamicTaskEditSheet({
  open,
  onOpenChange,
  taskId,
  getEndpoint,
  patchEndpoint,
  fields,
  mapApiToForm,
  mapFormToApi,
  onEditSuccess,
  folderOptions = [],
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [originalData, setOriginalData] = useState(null)
  const [attachments, setAttachments] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const [formModified, setFormModified] = useState(false)

  // Form definition (dynamic fields)
  const defaultValues = fields.reduce((acc, f) => {
    acc[f.name] = f.defaultValue || (f.type === "file" ? [] : "")
    return acc
  }, {})
  const form = useForm({
    resolver: zodResolver({}), // No strict schema, validation can be added per field config
    defaultValues,
  })
  const formValues = form.watch()

  // Reset form to original values
  const resetForm = () => {
    if (originalData) {
      form.reset(originalData)
      // Reset attachments
      if (originalData.attachments && Array.isArray(originalData.attachments)) {
        setAttachments(originalData.attachments)
        form.setValue("attachments", originalData.attachments)
      } else {
        setAttachments([])
        form.setValue("attachments", [])
      }
      setFormModified(false)
    }
  }

  // Handle file drop
  const handleDragOver = useCallback((e) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(true)
  }, [])
  const handleDragLeave = useCallback((e) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false)
  }, [])
  const handleDrop = useCallback(
    (e) => {
      e.preventDefault(); e.stopPropagation(); setIsDragging(false)
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const newFiles = Array.from(e.dataTransfer.files).map((file) => ({
          id: Math.random().toString(36).substring(2, 9),
          name: file.name,
          size: file.size,
          type: file.type,
          file,
          isNew: true,
        }))
        setAttachments((prev) => [...prev, ...newFiles])
        form.setValue("attachments", [...attachments, ...newFiles])
        setFormModified(true)
      }
    }, [attachments, form],
  )
  const handleFileSelect = useCallback(
    (e) => {
      if (e.target.files && e.target.files.length > 0) {
        const newFiles = Array.from(e.target.files).map((file) => ({
          id: Math.random().toString(36).substring(2, 9),
          name: file.name,
          size: file.size,
          type: file.type,
          file,
          isNew: true,
        }))
        setAttachments((prev) => [...prev, ...newFiles])
        form.setValue("attachments", [...attachments, ...newFiles])
        setFormModified(true)
      }
    }, [attachments, form],
  )
  const removeAttachment = useCallback(
    (id) => {
      setAttachments((prev) => prev.filter((file) => file.id !== id))
      form.setValue(
        "attachments",
        attachments.filter((file) => file.id !== id),
      )
      setFormModified(true)
    }, [attachments, form],
  )

  // Load task data when sheet opens or taskId changes
  useEffect(() => {
    if (open && taskId && getEndpoint) {
      setLoading(true)
      setError(null)
      setFormModified(false)
      fetch(getEndpoint)
        .then((res) => { if (!res.ok) throw new Error(res.statusText); return res.json() })
        .then((data) => {
          const mapped = mapApiToForm(data.task || data.log || data)
          setOriginalData(mapped)
          form.reset(mapped)
          if (mapped.attachments && Array.isArray(mapped.attachments)) {
            setAttachments(mapped.attachments)
            form.setValue("attachments", mapped.attachments)
          } else {
            setAttachments([])
            form.setValue("attachments", [])
          }
        })
        .catch((err) => {
          setError(err.message)
          toast({ variant: "destructive", title: "Error loading record", description: err.message })
        })
        .finally(() => setLoading(false))
    }
  }, [open, taskId, getEndpoint, form, mapApiToForm])

  // Check for form modifications
  useEffect(() => {
    if (originalData) {
      const hasRegularFieldsChanged = fields.some(f => {
        if ((originalData[f.name] === undefined || originalData[f.name] === null || originalData[f.name] === "") &&
            (formValues[f.name] === undefined || formValues[f.name] === null || formValues[f.name] === "")) {
          return false;
        }
        
        if (Array.isArray(originalData[f.name]) && Array.isArray(formValues[f.name])) {
          return originalData[f.name].length !== formValues[f.name].length;
        }
        
        return originalData[f.name] !== formValues[f.name];
      });
      
      const hasNewAttachments = attachments.some(a => a.isNew);
      
      setFormModified(hasRegularFieldsChanged || hasNewAttachments);
    }
  }, [formValues, originalData, attachments, fields])

  // Submit handler
  async function onSubmit(data) {
    setLoading(true)
    try {
      const formData = new FormData()
      // Add regular fields
      fields.forEach(f => {
        if (f.type !== "file") formData.append(f.name, data[f.name] || "")
      })
      // Add new file attachments
      if (fields.some(f => f.type === "file")) {
        attachments.forEach((attachment) => {
          if (attachment.isNew && attachment.file) {
            formData.append("files", attachment.file)
          } else if (!attachment.isNew) {
            formData.append("existingAttachments", attachment.id)
          }
        })
      }
      // Map form data to API payload if needed
      const apiPayload = mapFormToApi ? mapFormToApi(data) : null
      // PATCH with FormData or JSON
      const response = await fetch(patchEndpoint, {
        method: "PATCH",
        body: formData,
      })
      if (!response.ok) throw new Error("Failed to update record")
      setOriginalData({ ...data, attachments })
      setFormModified(false)
      toast({ title: "Record updated", description: "Details have been saved successfully" })
      if (typeof onEditSuccess === "function") onEditSuccess()
      onOpenChange(false)
    } catch (err) {
      toast({ variant: "destructive", title: "Error updating record", description: err.message })
    } finally {
      setLoading(false)
    }
  }

  // Render dynamic fields
  const renderField = (field) => {
    if (field.type === "text" || field.type === "url" || field.type === "date") {
      return (
        <FormField
          key={field.name}
          control={form.control}
          name={field.name}
          render={({ field: f }) => (
            <FormItem>
              <FormLabel>{field.label}</FormLabel>
              {loading ? <Skeleton className="h-10 w-full" /> : (
                <FormControl>
                  <Input type={field.type} placeholder={field.label} {...f} />
                </FormControl>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      )
    }
    if (field.type === "textarea") {
      return (
        <FormField
          key={field.name}
          control={form.control}
          name={field.name}
          render={({ field: f }) => (
            <FormItem>
              <FormLabel>{field.label}</FormLabel>
              {loading ? <Skeleton className="h-20 w-full" /> : (
                <FormControl>
                  <Textarea placeholder={field.label} {...f} />
                </FormControl>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      )
    }
    if (field.type === "select") {
      return (
        <FormField
          key={field.name}
          control={form.control}
          name={field.name}
          render={({ field: f }) => (
            <FormItem>
              <FormLabel>{field.label}</FormLabel>
              {loading ? <Skeleton className="h-10 w-full" /> : (
                <Select onValueChange={f.onChange} value={f.value || ""}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {field.options && field.options.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      )
    }
    if (field.type === "file") {
      return (
        <FormField
          key={field.name}
          control={form.control}
          name={field.name}
          render={() => (
            <FormItem>
              <FormLabel>{field.label}</FormLabel>
              {loading ? <Skeleton className="h-32 w-full" /> : (
                <div className="space-y-2">
                  <div
                    className={cn(
                      "border-2 border-dashed rounded-md p-6 transition-colors",
                      isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
                    )}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <div className="flex flex-col items-center justify-center gap-1 text-center">
                      <Upload className="h-10 w-10 text-muted-foreground" />
                      <p className="text-sm font-medium">Drag & drop files here</p>
                      <p className="text-xs text-muted-foreground">or</p>
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <div className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                          Browse files
                        </div>
                        <input
                          id="file-upload"
                          type="file"
                          multiple
                          className="sr-only"
                          onChange={handleFileSelect}
                        />
                      </label>
                    </div>
                  </div>
                  {attachments.length > 0 && (
                    <div className="space-y-2 mt-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        {attachments.length} attachment{attachments.length !== 1 ? "s" : ""}
                      </p>
                      <ul className="space-y-2 max-h-40 overflow-y-auto p-2 border rounded-md bg-background">
                        {attachments.map((file) => (
                          <li
                            key={file.id}
                            className="flex items-center justify-between text-sm p-2 rounded-md hover:bg-muted"
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <FileIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                              <span className="truncate">{file.name}</span>
                              {file.isNew && (
                                <Badge
                                  variant="outline"
                                  className="bg-blue-100 text-blue-800 border-blue-200 text-xs"
                                >
                                  New
                                </Badge>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 rounded-full"
                              onClick={() => removeAttachment(file.id)}
                            >
                              <X className="h-3 w-3" />
                              <span className="sr-only">Remove</span>
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <FormDescription className="flex items-center text-xs">
                    <Info className="h-3 w-3 mr-1.5" />
                    Upload files to attach to this record
                  </FormDescription>
                  <FormMessage />
                </div>
              )}
            </FormItem>
          )}
        />
      )
    }
    return null
  }

  return (
    <>
      <AnimatePresence mode="wait">
        {open && (
          <Sheet
            open={open}
            onOpenChange={(isOpen) => {
              if (!isOpen && formModified) {
                if (confirm("You have unsaved changes. Are you sure you want to close?")) {
                  onOpenChange(false)
                }
                return
              }
              onOpenChange(isOpen)
            }}
          >
            <SheetContent className="sm:max-w-md overflow-y-auto">
              <SheetHeader className="pb-4 border-b">
                <SheetTitle className="text-xl">
                  {loading ? <Skeleton className="h-8 w-3/4" /> : "Record Details"}
                </SheetTitle>
                {loading ? (
                  <div className="text-sm text-muted-foreground">
                    <Skeleton className="h-4 w-full" />
                  </div>
                ) : (
                  <SheetDescription>
                    View and edit record details.
                  </SheetDescription>
                )}
              </SheetHeader>
              {error ? (
                <div className="py-6 text-center">
                  <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-2" />
                  <p className="text-destructive font-medium">Error: {error}</p>
                  <Button onClick={() => onOpenChange(false)} variant="outline" className="mt-4">
                    Close
                  </Button>
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-6">
                    {fields.map(renderField)}
                    <div className="pt-4 border-t mt-6">
                      {formModified && (
                        <div className="mb-4 p-2 bg-blue-50 dark:bg-blue-950/30 rounded-md border border-blue-200 dark:border-blue-800">
                          <p className="text-sm text-blue-700 dark:text-blue-400 flex items-center">
                            <Info className="h-4 w-4 mr-2" />
                            You have unsaved changes
                          </p>
                        </div>
                      )}
                      <SheetFooter className="flex justify-between sm:justify-between">
                        <div className="flex gap-2">
                          <SheetClose asChild>
                            <Button type="button" variant="outline" disabled={loading}>
                              Cancel
                            </Button>
                          </SheetClose>
                          {formModified && (
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={resetForm}
                              disabled={loading || !formModified}
                            >
                              Reset
                            </Button>
                          )}
                        </div>
                        <Button
                          type="submit"
                          disabled={loading || !formModified}
                          className={!formModified ? "opacity-50" : ""}
                        >
                          {loading ? "Saving..." : "Save changes"}
                        </Button>
                      </SheetFooter>
                    </div>
                  </form>
                </Form>
              )}
            </SheetContent>
          </Sheet>
        )}
      </AnimatePresence>
    </>
  )
} 