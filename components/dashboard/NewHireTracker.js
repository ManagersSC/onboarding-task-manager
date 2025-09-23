"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { format, parse, isValid, isBefore, startOfDay } from "date-fns"
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Briefcase,
  Mail,
  PauseCircle,
  PlayCircle,
  Info,
  Play,
  Clock,
  X,
  Send,
  LayoutTemplateIcon as Template,
  Trash2,
  Edit,
  Users,
  Plus,
} from "lucide-react"
import { toast } from "sonner"

import { Card, CardContent, CardHeader, CardTitle } from "@components/ui/card"
import { Button } from "@components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@components/ui/avatar"
import { Progress } from "@components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@components/ui/dialog"
import { Input } from "@components/ui/input"
import { Label } from "@components/ui/label"
import { Textarea } from "@components/ui/textarea"
import { Badge } from "@components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@components/ui/popover"
import { CustomCalendar } from "@components/dashboard/subComponents/custom-calendar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@components/ui/alert-dialog"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@components/ui/breadcrumb"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@components/ui/dropdown-menu"

export function NewHireTracker() {
  const [newHires, setNewHires] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedHire, setSelectedHire] = useState(null)
  const [startDateModalOpen, setStartDateModalOpen] = useState(false)
  const [selectedHireForStartDate, setSelectedHireForStartDate] = useState(null)
  const [startDate, setStartDate] = useState("")
  const [settingStartDate, setSettingStartDate] = useState(false)
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [confirmSendModalOpen, setConfirmSendModalOpen] = useState(false)
  const [selectedHireForEmail, setSelectedHireForEmail] = useState(null)
  const [emailData, setEmailData] = useState({
    to: [],
    subject: "",
    body: "",
  })
  const [currentEmailInput, setCurrentEmailInput] = useState("")
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailValidationError, setEmailValidationError] = useState("")
  const [creatingTemplate, setCreatingTemplate] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [customTemplates, setCustomTemplates] = useState([])
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    subject: "",
    body: "",
  })
  const [templatePreview, setTemplatePreview] = useState({
    subject: "",
    body: "",
  })
  const [applyingTemplate, setApplyingTemplate] = useState(false)
  const [confirmApplyTemplate, setConfirmApplyTemplate] = useState(null)
  const [deleteTemplateConfirm, setDeleteTemplateConfirm] = useState(null)
  const [activeField, setActiveField] = useState("subject") // Track which field is focused for variable insertion
  const [currentUserName, setCurrentUserName] = useState("HR Team") // Current user's name from session

  // Pause/Resume state
  const [pauseConfirmOpen, setPauseConfirmOpen] = useState(false)
  const [pauseModalOpen, setPauseModalOpen] = useState(false)
  const [selectedHireForPause, setSelectedHireForPause] = useState(null)
  const [pausing, setPausing] = useState(false)
  const [resuming, setResuming] = useState(false)
  const [pauseForm, setPauseForm] = useState({ resumeOnDate: "", reason: "" })
  const cancelPauseConfirm = (e) => {
    try { e?.stopPropagation?.() } catch {}
    setPauseConfirmOpen(false)
  }

  const cancelPauseForm = (e) => {
    try { e?.stopPropagation?.() } catch {}
    setPauseModalOpen(false)
    setSelectedHireForPause(null)
    setPauseForm({ resumeOnDate: "", reason: "" })
  }
  const [resumeConfirmOpen, setResumeConfirmOpen] = useState(false)
  const [resumeDateOverride, setResumeDateOverride] = useState("")
  const [selectedHireForResume, setSelectedHireForResume] = useState(null)
  const [showResumeDatePicker, setShowResumeDatePicker] = useState(false)
  const cancelResumeFlow = () => {
    setResumeConfirmOpen(false)
    setSelectedHireForResume(null)
    setShowResumeDatePicker(false)
    setResumeDateOverride("")
  }

  const emailTemplates = [
    {
      id: 1,
      name: "First Day Instructions",
      subject: "Your first day instructions - {{name}}",
      body: "Hi {{name}},\n\nYour first day is tomorrow! Here are the details:\n\n• Arrival time: 9:00 AM\n• Location: Main office reception\n• What to bring: ID and completed paperwork\n• Dress code: Business casual\n\nYour manager will meet you at reception and guide you through your first day.\n\nWelcome aboard!\n\nBest regards,\n{{senderName}}",
      isBuiltIn: true,
    },
  ]

  // Email validation function
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Template variable helper - Updated with new variables
  const templateVariables = [
    { key: "{{name}}", description: "Employee's full name" },
    { key: "{{role}}", description: "Employee's job title" },
    { key: "{{startDate}}", description: "Onboarding start date" },
    { key: "{{department}}", description: "Employee's department" },
    { key: "{{senderName}}", description: "Your name" },
    { key: "{{currentDate}}", description: "Today's date" },
  ]

  // Insert variable into template field or email field
  const insertVariable = (field, variable) => {
    if (creatingTemplate || editingTemplate) {
      setNewTemplate((prev) => ({
        ...prev,
        [field]: prev[field] + variable,
      }))
    } else {
      // Insert into main email form
      setEmailData((prev) => ({
        ...prev,
        [field]: prev[field] + variable,
      }))
    }
  }

  // Replace placeholders with actual data
  const replacePlaceholders = (text, senderName = "HR Team") => {
    if (!selectedHireForEmail) return text

    return text
      .replace(/{{name}}/g, selectedHireForEmail.name)
      .replace(/{{role}}/g, selectedHireForEmail.role)
      .replace(
        /{{startDate}}/g,
        selectedHireForEmail.onboardingStartDate
          ? new Date(selectedHireForEmail.onboardingStartDate).toLocaleDateString()
          : "TBD",
      )
      .replace(/{{department}}/g, selectedHireForEmail.department || "Department")
      .replace(/{{senderName}}/g, senderName)
      .replace(/{{currentDate}}/g, new Date().toLocaleDateString())
  }

  // Update template preview
  const updateTemplatePreview = () => {
    setTemplatePreview({
      subject: replacePlaceholders(newTemplate.subject, currentUserName),
      body: replacePlaceholders(newTemplate.body, currentUserName),
    })
  }

  // Start creating template
  const startCreatingTemplate = () => {
    setCreatingTemplate(true)
    setEditingTemplate(null)
    setNewTemplate({ name: "", subject: "", body: "" })
    setTemplatePreview({ subject: "", body: "" })
  }

  // Start editing template
  const startEditingTemplate = (template) => {
    setEditingTemplate(template)
    setCreatingTemplate(false)
    setNewTemplate({
      name: template.name,
      subject: template.subject,
      body: template.body,
    })
    setTemplatePreview({ subject: "", body: "" })
  }

  // Cancel template creation/editing
  const cancelTemplateCreation = () => {
    setCreatingTemplate(false)
    setEditingTemplate(null)
    setNewTemplate({ name: "", subject: "", body: "" })
    setTemplatePreview({ subject: "", body: "" })
  }

  // Save custom template
  const saveCustomTemplate = async () => {
    if (!newTemplate.name.trim() || !newTemplate.subject.trim() || !newTemplate.body.trim()) {
      toast.error("Please fill in all template fields")
      return
    }

    try {
      if (editingTemplate) {
        // Update existing template
        const response = await fetch(`/api/admin/email-templates/${editingTemplate.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: newTemplate.name.trim(),
            subject: newTemplate.subject.trim(),
            body: newTemplate.body.trim(),
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to update template")
        }

        const result = await response.json()
        setCustomTemplates((prev) => 
          prev.map(t => t.id === editingTemplate.id ? result.template : t)
        )
        toast.success(`Template "${result.template.name}" updated successfully`)
        setEditingTemplate(null)
      } else {
        // Create new template
        const response = await fetch("/api/admin/email-templates", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: newTemplate.name.trim(),
            subject: newTemplate.subject.trim(),
            body: newTemplate.body.trim(),
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to create template")
        }

        const result = await response.json()
        setCustomTemplates((prev) => [...prev, result.template])
        toast.success(`Template "${result.template.name}" created successfully`)
      }
      
      setCreatingTemplate(false)
      setNewTemplate({ name: "", subject: "", body: "" })
      setTemplatePreview({ subject: "", body: "" })
    } catch (error) {
      console.error("Error saving template:", error)
      toast.error(error.message || "Failed to save template")
    }
  }

  // Delete custom template
  const deleteCustomTemplate = async (templateId) => {
    try {
      const response = await fetch(`/api/admin/email-templates/${templateId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete template")
      }

      setCustomTemplates((prev) => prev.filter((t) => t.id !== templateId))
      toast.success("Template deleted successfully")
      setDeleteTemplateConfirm(null)
    } catch (error) {
      console.error("Error deleting template:", error)
      toast.error(error.message || "Failed to delete template")
      setDeleteTemplateConfirm(null)
    }
  }

  // Clear all recipients
  const clearAllRecipients = () => {
    setEmailData((prev) => ({ ...prev, to: [] }))
    toast.success("All recipients cleared")
  }

  // Apply template with confirmation
  const handleApplyTemplate = (template) => {
    if (emailData.subject.trim() || emailData.body.trim()) {
      setConfirmApplyTemplate(template)
    } else {
      applyTemplateDirectly(template)
    }
  }

  // Apply template directly
  const applyTemplateDirectly = async (template) => {
    setApplyingTemplate(true)

    // Simulate loading for better UX
    await new Promise((resolve) => setTimeout(resolve, 500))

    setEmailData((prev) => ({
      ...prev,
      subject: replacePlaceholders(template.subject, currentUserName),
      body: replacePlaceholders(template.body, currentUserName),
    }))

    setApplyingTemplate(false)
    setConfirmApplyTemplate(null)
    toast.success(`Applied template: ${template.name}`)
  }

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e) => {
      // Ctrl+Enter to send email
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && emailModalOpen) {
        e.preventDefault()
        if (emailData.to.length > 0 && emailData.subject.trim() && emailData.body.trim()) {
          setConfirmSendModalOpen(true)
        }
      }

      // Escape to close modals
      if (e.key === "Escape") {
        if (confirmSendModalOpen) {
          setConfirmSendModalOpen(false)
        } else if (confirmApplyTemplate) {
          setConfirmApplyTemplate(null)
        } else if (deleteTemplateConfirm) {
          setDeleteTemplateConfirm(null)
        } else if (creatingTemplate || editingTemplate) {
          cancelTemplateCreation()
        } else if (emailModalOpen) {
          setEmailModalOpen(false)
        } else if (startDateModalOpen) {
          setStartDateModalOpen(false)
        } else if (pauseModalOpen) {
          setPauseModalOpen(false)
        }
      }
    },
    [
      emailModalOpen,
      confirmSendModalOpen,
      confirmApplyTemplate,
      deleteTemplateConfirm,
      creatingTemplate,
      editingTemplate,
      startDateModalOpen,
      pauseModalOpen,
      emailData,
    ],
  )

  // Add keyboard event listeners
  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  // Update the handleEmailKeyPress function
  const handleEmailKeyPress = (e) => {
    if (e.key === "Enter" && currentEmailInput.trim()) {
      e.preventDefault()
      const email = currentEmailInput.trim()

      // Validate email format
      if (!validateEmail(email)) {
        setEmailValidationError("Please enter a valid email address")
        return
      }

      // Check for duplicates
      if (emailData.to.includes(email)) {
        setEmailValidationError("This email address is already added")
        return
      }

      // Clear any previous errors
      setEmailValidationError("")

      // Add email to list
      setEmailData((prev) => ({
        ...prev,
        to: [...prev.to, email],
      }))
      setCurrentEmailInput("")
    }
  }

  // Clear validation error when input changes
  const handleEmailInputChange = (e) => {
    setCurrentEmailInput(e.target.value)
    if (emailValidationError) {
      setEmailValidationError("")
    }
  }

  // Fetch current user data
  const fetchCurrentUser = async () => {
    try {
      const response = await fetch("/api/admin/dashboard/current-user")
      if (response.ok) {
        const data = await response.json()
        console.log("Current user data:", data)
        setCurrentUserName(data.userName || data.name || "HR Team")
      } else {
        console.error("Failed to fetch current user:", response.status)
      }
    } catch (error) {
      console.error("Error fetching current user:", error)
    }
  }

  // Fetch new hires data
  useEffect(() => {
    const fetchNewHires = async () => {
      try {
        const response = await fetch("/api/admin/dashboard/new-hires")
        if (!response.ok) {
          throw new Error("Failed to fetch new hires")
        }
        const data = await response.json()
        setNewHires(data.newHires || [])
      } catch (error) {
        console.error("Error fetching new hires:", error)
        toast.error("Failed to load new hire data")
      } finally {
        setLoading(false)
      }
    }

    fetchNewHires()
    fetchCurrentUser()
  }, [])

  // Fetch email templates
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await fetch("/api/admin/email-templates")
        if (!response.ok) {
          throw new Error("Failed to fetch templates")
        }
        const data = await response.json()
        setCustomTemplates(data.templates?.filter(t => t.isCustom) || [])
      } catch (error) {
        console.error("Error fetching templates:", error)
        toast.error("Failed to load email templates")
      }
    }

    fetchTemplates()
  }, [])

  // Update template preview when template data changes
  useEffect(() => {
    if (creatingTemplate || editingTemplate) {
      updateTemplatePreview()
    }
  }, [newTemplate, selectedHireForEmail, creatingTemplate, editingTemplate])

  // Handle start date setting
  const handleSetStartDate = async () => {
    if (!selectedHireForStartDate || !startDate) return

    // Validate not in the past
    try {
      const selected = parse(startDate, "yyyy-MM-dd", new Date())
      if (isValid(selected) && isBefore(startOfDay(selected), startOfDay(new Date()))) {
        toast.error("Start date cannot be in the past")
        return
      }
    } catch {}

    setSettingStartDate(true)
    try {
      const response = await fetch(`/api/admin/dashboard/new-hires/${selectedHireForStartDate.id}/start-onboarding`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          onboardingStartDate: startDate,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to set start date")
      }

      const result = await response.json()

      // Update local state
      setNewHires((prev) =>
        prev.map((hire) =>
          hire.id === selectedHireForStartDate.id
            ? {
                ...hire,
                onboardingStartDate: startDate,
                onboardingStarted: result.record.onboardingStarted,
                onboardingInitiationFlow: result.record.onboardingInitiationFlow,
              }
            : hire,
        ),
      )

      // Show appropriate success message
      toast.success(result.message)

      setStartDateModalOpen(false)
      setSelectedHireForStartDate(null)
      setStartDate("")
    } catch (error) {
      console.error("Error setting start date:", error)
      toast.error(error.message || "Failed to set onboarding start date")
    } finally {
      setSettingStartDate(false)
    }
  }

  // Open start date modal
  const openStartDateModal = (hire) => {
    setSelectedHireForStartDate(hire)
    setStartDate("")
    setStartDateModalOpen(true)
  }

  // Open pause confirm -> then modal
  const openPauseConfirm = (hire) => {
    setSelectedHireForPause(hire)
    setPauseForm({ resumeOnDate: "", reason: "" })
    setPauseConfirmOpen(true)
  }

  const proceedPause = () => {
    setPauseConfirmOpen(false)
    setPauseModalOpen(true)
  }

  // Submit pause
  const submitPause = async () => {
    if (!selectedHireForPause) return
    // Validate resume date not in past
    if (pauseForm.resumeOnDate) {
      try {
        const d = parse(pauseForm.resumeOnDate, "yyyy-MM-dd", new Date())
        if (isValid(d) && isBefore(startOfDay(d), startOfDay(new Date()))) {
          toast.error("Resume date cannot be in the past")
          return
        }
      } catch {}
    }

    setPausing(true)
    try {
      const response = await fetch(`/api/admin/dashboard/new-hires/${selectedHireForPause.id}/pause-onboarding`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "pause",
          reason: pauseForm.reason?.trim() || undefined,
          resumeOnDate: pauseForm.resumeOnDate || undefined,
        }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || "Failed to pause onboarding")

      setNewHires((prev) =>
        prev.map((hire) =>
          hire.id === selectedHireForPause.id
            ? {
                ...hire,
                onboardingPaused: true,
                onboardingPausedAt: result.record.pausedAt,
                onboardingPausedReason: result.record.pausedReason,
                onboardingResumedOn: result.record.resumedOnDate || null,
                lastPausedByName: result.record.pausedByName || currentUserName,
              }
            : hire,
        ),
      )

      toast.success("Onboarding paused")
      setPauseModalOpen(false)
      setSelectedHireForPause(null)
      setPauseForm({ resumeOnDate: "", reason: "" })
    } catch (error) {
      console.error("Error pausing onboarding:", error)
      toast.error(error.message || "Failed to pause onboarding")
    } finally {
      setPausing(false)
    }
  }

  // Resume
  const handleResume = async (hire) => {
    setSelectedHireForResume(hire)
    setResumeDateOverride("")
    setResumeConfirmOpen(true)
    setShowResumeDatePicker(false)
  }

  const submitResume = async () => {
    if (!selectedHireForResume) return
    setResuming(true)
    try {
      const response = await fetch(`/api/admin/dashboard/new-hires/${selectedHireForResume.id}/pause-onboarding`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resume", resumeAtDate: resumeDateOverride || undefined }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || "Failed to resume onboarding")

      setNewHires((prev) =>
        prev.map((h) =>
          h.id === selectedHireForResume.id
            ? {
                ...h,
                onboardingPaused: false,
                onboardingResumedAt: result.record.resumedAt,
                lastResumedByName: result.record.resumedByName || currentUserName,
              }
            : h,
        ),
      )
      const isFutureResume = (() => {
        if (!resumeDateOverride) return false
        try {
          const d = parse(resumeDateOverride, "yyyy-MM-dd", new Date())
          return isValid(d) && isBefore(startOfDay(new Date()), startOfDay(d))
        } catch { return false }
      })()
      toast.success(
        isFutureResume
          ? `Onboarding Resume Date set for ${format(parse(resumeDateOverride, "yyyy-MM-dd", new Date()), "PPP")}`
          : "Onboarding resumed",
      )
      setResumeConfirmOpen(false)
      setSelectedHireForResume(null)
      setShowResumeDatePicker(false)
    } catch (error) {
      console.error("Error resuming onboarding:", error)
      toast.error(error.message || "Failed to resume onboarding")
    } finally {
      setResuming(false)
    }
  }

  // Remove email from list
  const removeEmail = (emailToRemove) => {
    setEmailData((prev) => ({
      ...prev,
      to: prev.to.filter((email) => email !== emailToRemove),
    }))
  }

  // Open email modal
  const openEmailModal = (hire) => {
    setSelectedHireForEmail(hire)
    setEmailData({
      to: [hire.email],
      subject: "",
      body: "",
    })
    setCurrentEmailInput("")
    setEmailModalOpen(true)
  }

  // Handle send email
  const handleSendEmail = async () => {
    setSendingEmail(true)
    try {
      const response = await fetch("/api/admin/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipients: emailData.to.map(email => ({
            email,
            name: selectedHireForEmail.name,
            role: selectedHireForEmail.role,
            department: selectedHireForEmail.department
          })),
          email: {
            subject: emailData.subject,
            body: emailData.body
          }
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(result.message || `Email sent successfully to ${emailData.to.length} recipient(s)`)
        setConfirmSendModalOpen(false)
        setEmailModalOpen(false)

        // Reset email data
        setEmailData({
          to: [],
          subject: "",
          body: "",
        })
      } else {
        throw new Error(result.error || "Failed to send email")
      }
    } catch (error) {
      console.error("Error sending email:", error)
      toast.error(error.message || "Failed to send email")
    } finally {
      setSendingEmail(false)
    }
  }

  const allTemplates = [...emailTemplates, ...customTemplates]

  // Get breadcrumb path
  const getBreadcrumbPath = () => {
    const path = ["New Hire Tracker"]

    if (selectedHire) {
      path.push(selectedHire.name)
    }

    if (emailModalOpen) {
      path.push("Send Email")

      if (creatingTemplate) {
        path.push("Create Template")
      } else if (editingTemplate) {
        path.push("Edit Template")
      }
    } else if (startDateModalOpen) {
      path.push("Set Start Date")
    }

    return path
  }

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>New Hire Progress</CardTitle>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8 bg-transparent" disabled>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8 bg-transparent" disabled>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading new hires...</div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      {/* Breadcrumb Navigation */}
      <div className="mb-4">
        <Breadcrumb>
          <BreadcrumbList>
            {getBreadcrumbPath().map((item, index) => (
              <div key={index} className="flex items-center">
                {index > 0 && <BreadcrumbSeparator />}
                <BreadcrumbItem>
                  {index === getBreadcrumbPath().length - 1 ? (
                    <BreadcrumbPage>{item}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href="#" className="cursor-default">
                      {item}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </div>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>New Hire Progress</CardTitle>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8 bg-transparent">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8 bg-transparent">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {newHires.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <Clock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No active new hires found</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:flex sm:space-x-4 gap-4 sm:gap-0 sm:overflow-x-auto pb-2 custom-scrollbar">
              {newHires.map((hire, index) => (
                <Dialog key={hire.id}>
                  <DialogTrigger asChild>
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="flex-shrink-0 w-full sm:w-60 bg-card rounded-lg border p-4 cursor-pointer hover:shadow-md transition-shadow"
                      whileHover={{ scale: 1.02 }}
                      onClick={() => setSelectedHire(hire)}
                    >
                      <div className="flex items-center gap-3 justify-between">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={hire.avatar || "/placeholder.svg"} alt={hire.name} />
                          <AvatarFallback>
                            {hire.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm">{hire.name}</h4>
                          <p className="text-xs text-muted-foreground">{hire.role}</p>
                        </div>
                        <div className="flex-shrink-0">
                          {hire.onboardingPaused ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-green-500 hover:text-green-600"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleResume(hire)
                              }}
                              title="Resume onboarding"
                              disabled={resuming}
                            >
                              <PlayCircle className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-amber-500 hover:text-amber-600"
                              onClick={(e) => {
                                e.stopPropagation()
                                openPauseConfirm(hire)
                              }}
                              title="Pause onboarding"
                            >
                              <PauseCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="flex justify-between text-xs mb-1">
                          <span>Onboarding Progress</span>
                          <span className="font-medium">{hire.progress}%</span>
                        </div>
                        <Progress value={hire.progress} className="h-2" />
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3 mr-1" />
                          <span>
                            {hire.onboardingStartDate
                              ? `Started: ${new Date(hire.onboardingStartDate).toLocaleDateString()}`
                              : "Not started"}
                          </span>
                        </div>
                        {!hire.onboardingStarted && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-xs bg-transparent"
                            onClick={(e) => {
                              e.stopPropagation()
                              openStartDateModal(hire)
                            }}
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Start
                          </Button>
                        )}
                      </div>

                      {/* Paused meta */}
                      {hire.onboardingPaused && (
                        <div className="mt-2 text-[11px] text-amber-500">
                          Paused{hire.lastPausedByName ? ` by ${hire.lastPausedByName}` : ""}
                          {hire.onboardingPausedAt ? ` at ${new Date(hire.onboardingPausedAt).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}` : ""}
                          {hire.onboardingPausedReason ? ` — Reason: ${hire.onboardingPausedReason}` : ""}
                        </div>
                      )}
                      {!hire.onboardingPaused && (hire.lastPausedByName || hire.onboardingResumedAt) && (
                        <div className="mt-2 flex items-center justify-between">
                          <div className="text-[11px] text-muted-foreground truncate pr-2">
                            Last paused by {hire.lastPausedByName || "—"}
                            {" • "}
                            Resumed by {hire.lastResumedByName || "Admin"}
                            {hire.onboardingResumedAt ? ` at ${new Date(hire.onboardingResumedAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}` : ""}
                          </div>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground">
                                <Info className="h-3 w-3" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-64 text-xs">
                              <div className="space-y-1">
                                <div>
                                  <span className="font-medium">Paused by:</span> {hire.lastPausedByName || "Unknown"}
                                </div>
                                {hire.onboardingPausedAt && (
                                  <div>
                                    <span className="font-medium">Paused at:</span> {new Date(hire.onboardingPausedAt).toLocaleString()}
                                  </div>
                                )}
                                {hire.onboardingPausedReason && (
                                  <div>
                                    <span className="font-medium">Reason:</span> {hire.onboardingPausedReason}
                                  </div>
                                )}
                                {(hire.lastResumedByName || hire.onboardingResumedAt) && (
                                  <div>
                                    <span className="font-medium">Resumed by:</span> {hire.lastResumedByName || "Admin"}
                                    {hire.onboardingResumedAt ? ` at ${new Date(hire.onboardingResumedAt).toLocaleString()}` : ""}
                                  </div>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      )}
                    </motion.div>
                  </DialogTrigger>

                  <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-hidden">
                    <DialogHeader className="pb-4">
                      <DialogTitle className="text-xl font-semibold">New Hire Details</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6 overflow-y-auto max-h-[calc(90vh-120px)] pr-2 custom-scrollbar">
                      {/* Employee Info Card */}
                      <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
                        <Avatar className="h-16 w-16 flex-shrink-0">
                          <AvatarImage src={hire.avatar || "/placeholder.svg"} alt={hire.name} />
                          <AvatarFallback className="text-lg font-semibold">
                            {hire.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-semibold text-lg leading-tight">{hire.name}</h3>
                            {hire.onboardingPaused ? (
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 bg-transparent text-green-600 border-green-600"
                                onClick={() => handleResume(hire)}
                                disabled={resuming}
                              >
                                <PlayCircle className="h-4 w-4 mr-1" /> Resume
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 bg-transparent text-amber-600 border-amber-600"
                                onClick={() => openPauseConfirm(hire)}
                              >
                                <PauseCircle className="h-4 w-4 mr-1" /> Pause
                              </Button>
                            )}
                          </div>
                          <p className="text-muted-foreground text-sm mb-2">{hire.role}</p>
                          <div className="flex flex-wrap gap-3 text-xs">
                            <div className="flex items-center gap-1">
                              <Briefcase className="h-3 w-3" />
                              <span>{hire.department}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>
                                {hire.onboardingStartDate
                                  ? new Date(hire.onboardingStartDate).toLocaleDateString()
                                  : "Not started"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Progress Section */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Onboarding Progress</h4>
                          <span className="text-2xl font-bold text-primary">{hire.progress}%</span>
                        </div>
                        <Progress value={hire.progress} className="h-3" />
                        <p className="text-sm text-muted-foreground">
                          {hire.tasks?.completed || 0} of {hire.tasks?.total || 0} tasks completed
                        </p>
                      </div>

                      {/* Contact Information */}
                      <div className="space-y-3">
                        <h4 className="font-medium">Contact Information</h4>
                        <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg">
                          <div className="p-2 bg-primary/10 rounded-full">
                            <Mail className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">Email Address</p>
                            <p className="text-sm text-muted-foreground truncate">{hire.email}</p>
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */
                      }
                      <div className="flex justify-center">
                        {hire.onboardingStarted ? (
                          <Badge variant="default" className="px-4 py-2">
                            <Play className="h-3 w-3 mr-1" />
                            Onboarding Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="px-4 py-2">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending Start
                          </Badge>
                        )}
                      </div>

                      {/* Paused/Active meta text */}
                      {hire.onboardingPaused ? (
                        <div className="text-xs text-amber-600 text-center mt-2">
                          Paused{hire.lastPausedByName ? ` by ${hire.lastPausedByName}` : ""}
                          {hire.onboardingPausedAt ? ` at ${new Date(hire.onboardingPausedAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}` : ""}
                          {hire.onboardingPausedReason ? ` — Reason: ${hire.onboardingPausedReason}` : ""}
                        </div>
                      ) : (
                        (hire.lastPausedByName || hire.lastResumedByName || hire.onboardingResumedAt) && (
                          <div className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
                            <span className="truncate">
                              {hire.lastPausedByName ? `Last paused by ${hire.lastPausedByName}` : "Previously active"}
                              {hire.lastResumedByName || hire.onboardingResumedAt ? ` • Resumed by ${hire.lastResumedByName || "Admin"} at ${hire.onboardingResumedAt ? new Date(hire.onboardingResumedAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : "--:--"}` : ""}
                            </span>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground">
                                  <Info className="h-3 w-3" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent align="center" className="w-72 text-xs">
                                <div className="space-y-1 text-left">
                                  {hire.lastPausedByName && (
                                    <div><span className="font-medium">Paused by:</span> {hire.lastPausedByName}</div>
                                  )}
                                  {hire.onboardingPausedAt && (
                                    <div><span className="font-medium">Paused at:</span> {new Date(hire.onboardingPausedAt).toLocaleString()}</div>
                                  )}
                                  {hire.onboardingPausedReason && (
                                    <div><span className="font-medium">Reason:</span> {hire.onboardingPausedReason}</div>
                                  )}
                                  {(hire.lastResumedByName || hire.onboardingResumedAt) && (
                                    <div><span className="font-medium">Resumed by:</span> {hire.lastResumedByName || "Admin"}{hire.onboardingResumedAt ? ` at ${new Date(hire.onboardingResumedAt).toLocaleString()}` : ""}</div>
                                  )}
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                        )
                      )}
                    </div>

                    {/* Action Buttons - Fixed at bottom */}
                    <div className="flex flex-col gap-2 pt-4 border-t mt-4">
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1 bg-transparent" size="sm">
                          <Briefcase className="h-4 w-4 mr-2" />
                          View Tasks
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1 bg-transparent"
                          size="sm"
                          onClick={() => openEmailModal(hire)}
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          Send Email
                        </Button>
                      </div>
                      {!hire.onboardingStarted && (
                        <Button onClick={() => openStartDateModal(hire)} className="w-full" size="sm">
                          <Play className="h-4 w-4 mr-2" />
                          Start Onboarding Process
                        </Button>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Start Date Modal */}
      <Dialog open={startDateModalOpen} onOpenChange={setStartDateModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Set Onboarding Start Date</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="start-date">Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="mt-1 w-full justify-start text-left font-normal"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {startDate && isValid(parse(startDate, "yyyy-MM-dd", new Date()))
                      ? format(parse(startDate, "yyyy-MM-dd", new Date()), "PPP")
                      : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="flex w-auto flex-col space-y-2 p-2 pointer-events-auto z-50">
                  <div className="rounded-md border">
                    <CustomCalendar
                      selected={startDate ? parse(startDate, "yyyy-MM-dd", new Date()) : undefined}
                      onSelect={(date) => {
                        if (!date) return
                        if (isBefore(startOfDay(date), startOfDay(new Date()))) {
                          toast.error("Start date cannot be in the past")
                          return
                        }
                        const str = format(date, "yyyy-MM-dd")
                        setStartDate(str)
                      }}
                    />
                  </div>
                  {startDate && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setStartDate("")}
                      className="w-full"
                    >
                      Clear Date
                    </Button>
                  )}
                </PopoverContent>
              </Popover>
            </div>
            {selectedHireForStartDate && (
              <div className="text-sm text-muted-foreground">
                <p>
                  This will start onboarding for <strong>{selectedHireForStartDate.name}</strong>
                </p>
                <p>Tasks will be automatically assigned via automation.</p>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStartDateModalOpen(false)} disabled={settingStartDate}>
                Cancel
              </Button>
              <Button onClick={handleSetStartDate} disabled={!startDate || settingStartDate}>
                {settingStartDate ? "Starting..." : "Start Onboarding"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Modal */}
      <Dialog open={emailModalOpen} onOpenChange={setEmailModalOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[85vh] p-0 overflow-hidden">
          <div className="flex h-[calc(85vh-2rem)]">
            {/* Main Email Form */}
            <div
              className={`flex-1 flex flex-col ${creatingTemplate || editingTemplate ? "opacity-60 pointer-events-none" : ""}`}
            >
              <DialogHeader className="px-6 py-4 border-b">
                <DialogTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Send Email to {selectedHireForEmail?.name}
                  {(creatingTemplate || editingTemplate) && (
                    <Badge variant="secondary" className="ml-2">
                      {editingTemplate ? "Editing Template..." : "Creating Template..."}
                    </Badge>
                  )}
                  {applyingTemplate && (
                    <Badge variant="secondary" className="ml-2">
                      Applying Template...
                    </Badge>
                  )}
                </DialogTitle>
                <div className="text-xs text-muted-foreground mt-1">
                  Press <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl+Enter</kbd> to send •{" "}
                  <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Esc</kbd> to close
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 space-y-6">
                  {/* To Field */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="email-to" className="text-sm font-medium">
                        To <span className="text-destructive">*</span>
                      </Label>
                      {emailData.to.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearAllRecipients}
                          className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                        >
                          <Users className="h-3 w-3 mr-1" />
                          Clear All ({emailData.to.length})
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2 p-3 border rounded-lg min-h-[48px] bg-background focus-within:ring-2 focus-within:ring-ring">
                        {emailData.to.map((email, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                          >
                            <Badge variant="secondary" className="flex items-center gap-1 px-2 py-1 text-sm">
                              {email}
                              <X
                                className="h-3 w-3 cursor-pointer hover:text-destructive transition-colors"
                                onClick={() => removeEmail(email)}
                              />
                            </Badge>
                          </motion.div>
                        ))}
                        <Input
                          value={currentEmailInput}
                          onChange={handleEmailInputChange}
                          onKeyPress={handleEmailKeyPress}
                          placeholder={emailData.to.length === 0 ? "Enter email address..." : "Add another email..."}
                          className="border-none shadow-none focus-visible:ring-0 flex-1 min-w-[200px] p-0"
                        />
                      </div>
                      {emailValidationError && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-sm text-destructive flex items-center gap-1"
                        >
                          <X className="h-3 w-3" />
                          {emailValidationError}
                        </motion.p>
                      )}
                      <p className="text-xs text-muted-foreground">Press Enter to add multiple email addresses</p>
                    </div>
                  </div>

                  {/* Variables Helper for Main Form */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Insert Variables</Label>
                    <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto custom-scrollbar">
                      {templateVariables.map((variable) => (
                        <Button
                          key={variable.key}
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs bg-transparent flex-shrink-0"
                          onClick={() => insertVariable(activeField, variable.key)}
                          title={variable.description}
                        >
                          {variable.key}
                        </Button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">Click to insert into {activeField} field</p>
                  </div>

                  {/* Subject Field */}
                  <div className="space-y-2">
                    <Label htmlFor="email-subject" className="text-sm font-medium">
                      Subject <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="email-subject"
                      value={emailData.subject}
                      onChange={(e) => setEmailData((prev) => ({ ...prev, subject: e.target.value }))}
                      onFocus={() => setActiveField("subject")}
                      placeholder="Enter email subject"
                      className="h-12"
                    />
                  </div>

                  {/* Body Field */}
                  <div className="space-y-2">
                    <Label htmlFor="email-body" className="text-sm font-medium">
                      Message <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="email-body"
                      value={emailData.body}
                      onChange={(e) => setEmailData((prev) => ({ ...prev, body: e.target.value }))}
                      onFocus={() => setActiveField("body")}
                      placeholder="Enter your message"
                      className="min-h-[200px] max-h-[300px] resize-none custom-scrollbar"
                    />
                    <p className="text-xs text-muted-foreground">{emailData.body.length} characters</p>
                  </div>
                </motion.div>
              </div>

              {/* Action Buttons */}
              <div className="px-6 py-4 border-t bg-muted/20">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-muted-foreground">
                    {emailData.to.length} recipient{emailData.to.length !== 1 ? "s" : ""}
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setEmailModalOpen(false)} className="px-6">
                      Cancel
                    </Button>
                    <Button
                      onClick={() => setConfirmSendModalOpen(true)}
                      disabled={emailData.to.length === 0 || !emailData.subject.trim() || !emailData.body.trim()}
                      className="flex items-center gap-2 px-6"
                    >
                      <Send className="h-4 w-4" />
                      Send Email
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Templates Sidebar */}
            <div className="w-80 border-l bg-muted/30 flex flex-col">
              {!creatingTemplate && !editingTemplate ? (
                // Templates List View
                <>
                  <div className="p-4 border-b">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Template className="h-4 w-4" />
                      Email Templates
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">Click a template to use it</p>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {allTemplates.map((template) => (
                      <motion.div key={template.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Card
                          className="cursor-pointer hover:shadow-md transition-all duration-200 border-2 hover:border-primary/20 group"
                          onClick={() => handleApplyTemplate(template)}
                        >
                          <CardContent className="p-4">
                            <div className="space-y-2">
                              <div className="flex items-start justify-between">
                                <h4 className="font-medium text-sm">{template.name}</h4>
                                <div className="flex items-center gap-1">
                                  <Badge variant={template.isCustom ? "default" : "outline"} className="text-xs">
                                    {template.isCustom ? "Custom" : template.isBuiltIn ? "Built-in" : "Template"}
                                  </Badge>
                                  {template.isCustom && (
                                    <div className="flex">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          startEditingTemplate(template)
                                        }}
                                      >
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setDeleteTemplateConfirm(template)
                                        }}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2">{template.subject}</p>
                              <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded text-left">
                                {template.body.substring(0, 100)}...
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}

                    {/* Create Custom Template Button */}
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Card
                        className="border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer"
                        onClick={startCreatingTemplate}
                      >
                        <CardContent className="p-4 text-center">
                          <div className="space-y-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                              <Plus className="h-4 w-4 text-primary" />
                            </div>
                            <p className="text-sm font-medium">Create Custom</p>
                            <p className="text-xs text-muted-foreground">Start with a blank template</p>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </div>
                </>
              ) : (
                // Template Creation/Editing View
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex flex-col h-full"
                >
                  <div className="p-4 border-b">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Template className="h-4 w-4" />
                      {editingTemplate ? `Edit: ${editingTemplate.name}` : "Create Template"}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {editingTemplate ? "Update your template" : "Design your custom email template"}
                    </p>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {/* Template Name */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Template Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        value={newTemplate.name}
                        onChange={(e) => setNewTemplate((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., Welcome Email"
                        className="h-9"
                      />
                    </div>

                    {/* Variables Helper */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Insert Variables</Label>
                      <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto custom-scrollbar">
                        {templateVariables.map((variable) => (
                          <Button
                            key={variable.key}
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs bg-transparent flex-shrink-0"
                            onClick={() => insertVariable(activeField, variable.key)}
                            title={variable.description}
                          >
                            {variable.key}
                          </Button>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">Click to insert into {activeField} field</p>
                    </div>

                    {/* Template Subject */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Subject <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        value={newTemplate.subject}
                        onChange={(e) => setNewTemplate((prev) => ({ ...prev, subject: e.target.value }))}
                        onFocus={() => setActiveField("subject")}
                        placeholder="Enter template subject"
                        className="h-9"
                      />
                    </div>

                    {/* Template Body */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Message <span className="text-destructive">*</span>
                      </Label>
                      <Textarea
                        value={newTemplate.body}
                        onChange={(e) => setNewTemplate((prev) => ({ ...prev, body: e.target.value }))}
                        onFocus={() => setActiveField("body")}
                        placeholder="Enter template message"
                        className="min-h-[120px] max-h-[200px] resize-none text-sm custom-scrollbar"
                      />
                    </div>

                    {/* Preview Section */}
                    {(templatePreview.subject || templatePreview.body) && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Preview</Label>
                        <div className="border rounded-lg p-3 bg-muted/20 space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                          {templatePreview.subject && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground">Subject:</p>
                              <p className="text-sm">{templatePreview.subject}</p>
                            </div>
                          )}
                          {templatePreview.body && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground">Message:</p>
                              <p className="text-sm whitespace-pre-wrap">{templatePreview.body}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Template Creation Actions */}
                  <div className="p-4 border-t space-y-2">
                    <Button
                      onClick={saveCustomTemplate}
                      disabled={!newTemplate.name.trim() || !newTemplate.subject.trim() || !newTemplate.body.trim()}
                      className="w-full"
                    >
                      {editingTemplate ? "Update Template" : "Save Template"}
                    </Button>
                    <Button variant="outline" onClick={cancelTemplateCreation} className="w-full bg-transparent">
                      Cancel
                    </Button>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pause confirmation (non-modal to avoid nested lock) */}
      <Dialog open={pauseConfirmOpen} onOpenChange={setPauseConfirmOpen} modal={false}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>
              {selectedHireForPause ? `Pause onboarding for ${selectedHireForPause.name}?` : "Pause Onboarding"}
            </DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">
            Are you sure you want to pause onboarding for {selectedHireForPause?.name}? This will stop automated tasks until it is resumed.
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={cancelPauseConfirm}>Cancel</Button>
            <Button onClick={proceedPause}>Yes, continue</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pause form modal */}
      <Dialog open={pauseModalOpen} onOpenChange={setPauseModalOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Pause Onboarding</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Resume Date (optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="mt-1 w-full justify-start text-left font-normal">
                    <Calendar className="mr-2 h-4 w-4" />
                    {pauseForm.resumeOnDate && isValid(parse(pauseForm.resumeOnDate, "yyyy-MM-dd", new Date()))
                      ? format(parse(pauseForm.resumeOnDate, "yyyy-MM-dd", new Date()), "PPP")
                      : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="flex w-auto flex-col space-y-2 p-2 pointer-events-auto z-50">
                  <div className="rounded-md border">
                    <CustomCalendar
                      selected={pauseForm.resumeOnDate ? parse(pauseForm.resumeOnDate, "yyyy-MM-dd", new Date()) : undefined}
                      onSelect={(date) => {
                        if (!date) return
                        if (isBefore(startOfDay(date), startOfDay(new Date()))) {
                          toast.error("Resume date cannot be in the past")
                          return
                        }
                        const str = format(date, "yyyy-MM-dd")
                        setPauseForm((p) => ({ ...p, resumeOnDate: str }))
                      }}
                    />
                  </div>
                  {pauseForm.resumeOnDate && (
                    <Button variant="outline" size="sm" onClick={() => setPauseForm((p) => ({ ...p, resumeOnDate: "" }))} className="w-full">
                      Clear Date
                    </Button>
                  )}
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Reason (optional)</Label>
              <Textarea
                value={pauseForm.reason}
                onChange={(e) => setPauseForm((p) => ({ ...p, reason: e.target.value }))}
                placeholder="e.g., Schedule change"
                className="min-h-[100px] resize-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={cancelPauseForm} disabled={pausing}>
                Cancel
              </Button>
              <Button onClick={submitPause} disabled={pausing}>
                {pausing ? "Pausing..." : "Confirm Pause"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Resume confirmation with date override */}
      <Dialog open={resumeConfirmOpen} onOpenChange={setResumeConfirmOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>
              {selectedHireForResume ? `Resume onboarding for ${selectedHireForResume.name}?` : "Resume Onboarding"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Are you sure you want to resume onboarding?
            </div>
            {!showResumeDatePicker ? (
              <div className="text-xs italic text-muted-foreground">
                or if you want to automatically resume it, {""}
                <button
                  type="button"
                  className="font-semibold underline text-white"
                  onClick={() => setShowResumeDatePicker(true)}
                >
                  select a resume date
                </button>
                .
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start">
                      <Calendar className="mr-2 h-4 w-4" />
                      {resumeDateOverride && isValid(parse(resumeDateOverride, "yyyy-MM-dd", new Date()))
                        ? format(parse(resumeDateOverride, "yyyy-MM-dd", new Date()), "PPP")
                        : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="flex w-auto flex-col space-y-2 p-2 pointer-events-auto z-50">
                    <div className="rounded-md border">
                      <CustomCalendar
                        selected={resumeDateOverride ? parse(resumeDateOverride, "yyyy-MM-dd", new Date()) : undefined}
                        onSelect={(date) => {
                          if (!date) return
                          const str = format(date, "yyyy-MM-dd")
                          setResumeDateOverride(str)
                        }}
                      />
                    </div>
                    {resumeDateOverride && (
                      <Button variant="outline" size="sm" onClick={() => setResumeDateOverride("")}>Clear Date</Button>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            )}
            <div className="flex justify-end items-center gap-2">
              <Button variant="outline" onClick={cancelResumeFlow} disabled={resuming}>No</Button>
              <Button onClick={submitResume} disabled={resuming}>
                {resuming
                  ? (resumeDateOverride && isValid(parse(resumeDateOverride, "yyyy-MM-dd", new Date())) && isBefore(startOfDay(new Date()), startOfDay(parse(resumeDateOverride, "yyyy-MM-dd", new Date())))
                      ? "Setting Resume Date..."
                      : "Resuming...")
                  : "Yes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Apply Template Confirmation */}
      <AlertDialog open={!!confirmApplyTemplate} onOpenChange={() => setConfirmApplyTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply Template</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes in your email. Applying this template will replace your current subject and
              message. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmApplyTemplate && applyTemplateDirectly(confirmApplyTemplate)}>
              Apply Template
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Template Confirmation */}
      <AlertDialog open={!!deleteTemplateConfirm} onOpenChange={() => setDeleteTemplateConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the template "{deleteTemplateConfirm?.name}"? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTemplateConfirm && deleteCustomTemplate(deleteTemplateConfirm.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Template
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Modal */}
      <Dialog open={confirmSendModalOpen} onOpenChange={setConfirmSendModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Confirm Send Email</DialogTitle>
          </DialogHeader>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p>Are you sure you want to send this email to:</p>
              <div className="mt-2 space-y-1">
                {emailData.to.map((email, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Mail className="h-3 w-3" />
                    <span className="font-medium">{email}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 p-3 bg-muted rounded-lg">
                <div className="font-medium text-foreground">Subject:</div>
                <div className="text-sm">{emailData.subject}</div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmSendModalOpen(false)} disabled={sendingEmail}>
                Cancel
              </Button>
              <Button onClick={handleSendEmail} disabled={sendingEmail} className="flex items-center gap-2">
                {sendingEmail ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                      className="h-4 w-4 border-2 border-current border-t-transparent rounded-full"
                    />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Yes, Send Email
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
