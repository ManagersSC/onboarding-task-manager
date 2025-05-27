"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ChevronLeft,
  ChevronRight,
  CalendarIcon,
  Clock,
  MapPin,
  Trash2,
  Save,
  Loader2,
  Plus,
  Users,
  MoreHorizontal,
  Check,
  Mail,
  UserPlus
} from "lucide-react"
import { format, parse } from "date-fns"

import { Card, CardContent, CardHeader, CardTitle } from "@components/ui/card"
import { Button } from "@components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@components/ui/dialog"
import { Input } from "@components/ui/input"
import { Label } from "@components/ui/label"
import { Textarea } from "@components/ui/textarea"
import { Switch } from "@components/ui/switch"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@components/ui/popover"
import { CalendarPreviewSkeleton } from "./skeletons/calendar-preview-skeleton"
// Add these imports at the top
import { DayView } from "./subComponents/day-view"
import { CustomCalendar } from "./subComponents/custom-calendar"

// Event categories with colors
const eventCategories = {
  meeting: {
    color: "#a855f7",
    bgColor: "rgba(168, 85, 247, 0.15)",
    borderColor: "rgba(168, 85, 247, 0.3)",
    label: "Meeting",
  },
  appointment: {
    color: "#3b82f6",
    bgColor: "rgba(59, 130, 246, 0.15)",
    borderColor: "rgba(59, 130, 246, 0.3)",
    label: "Appointment",
  },
  deadline: {
    color: "#ef4444",
    bgColor: "rgba(239, 68, 68, 0.15)",
    borderColor: "rgba(239, 68, 68, 0.3)",
    label: "Deadline",
  },
  event: {
    color: "#22c55e",
    bgColor: "rgba(34, 197, 94, 0.15)",
    borderColor: "rgba(34, 197, 94, 0.3)",
    label: "Event",
  },
  default: {
    color: "#6b7280",
    bgColor: "rgba(107, 114, 128, 0.15)",
    borderColor: "rgba(107, 114, 128, 0.3)",
    label: "Other",
  },
}

// Time presets for quick selection
const timePresets = [
  { label: "Morning", start: "09:00", end: "10:00" },
  { label: "Lunch", start: "12:00", end: "13:00" },
  { label: "Afternoon", start: "14:00", end: "15:00" },
  { label: "Evening", start: "18:00", end: "19:00" },
]

// Generate time options for dropdowns (15 min intervals)
const generateTimeOptions = () => {
  const options = []
  for (let hour = 0; hour < 24; hour++) {
    for (const minute of [0, 15, 30, 45]) {
      const h = hour.toString().padStart(2, "0")
      const m = minute.toString().padStart(2, "0")
      const time = `${h}:${m}`

      // Format for display (12-hour with AM/PM)
      let displayHour = hour % 12
      if (displayHour === 0) displayHour = 12
      const period = hour < 12 ? "AM" : "PM"
      const displayTime = `${displayHour}:${m === "00" ? "00" : m} ${period}`

      options.push({ value: time, label: displayTime })
    }
  }
  return options
}

const timeOptions = generateTimeOptions()

// Helper function to determine event type from Google Calendar data
const getEventType = (event) => {
  const summary = event.summary?.toLowerCase() || ""
  if (summary.includes("meeting") || summary.includes("call")) return "meeting"
  if (summary.includes("appointment") || summary.includes("doctor")) return "appointment"
  if (summary.includes("deadline") || summary.includes("due")) return "deadline"
  return "event"
}

// Format date for display
const formatDate = (date, format = "full") => {
  if (format === "full") {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  } else if (format === "short") {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  } else if (format === "day") {
    return new Date(date).getDate()
  } else if (format === "weekday") {
    return new Date(date).toLocaleDateString("en-US", { weekday: "short" })
  }
}

// Email validation function
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Transform Google Calendar event to component format
const transformGoogleEvent = (googleEvent) => {
  const startDate = new Date(googleEvent.start?.dateTime || googleEvent.start?.date)
  const endDate = new Date(googleEvent.end?.dateTime || googleEvent.end?.date)

  // Format time for display
  let formattedTime = "All day"
  if (googleEvent.start?.dateTime) {
    formattedTime = startDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  }

  // Format time for input
  let timeValue = ""
  if (googleEvent.start?.dateTime) {
    timeValue = startDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
  }

  let endTimeValue = ""
  if (googleEvent.end?.dateTime) {
    endTimeValue = endDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
  }

  return {
    id: googleEvent.id,
    title: googleEvent.summary || "Untitled Event",
    type: getEventType(googleEvent),
    time: formattedTime,
    timeValue: timeValue,
    endTimeValue: endTimeValue,
    location: googleEvent.location || "",
    description: googleEvent.description || "",
    attendees: googleEvent.attendees?.map((a) => a.email) || [],
    startDateTime: googleEvent.start?.dateTime || googleEvent.start?.date,
    endDateTime: googleEvent.end?.dateTime || googleEvent.end?.date,
    googleEvent: googleEvent, // Keep original for reference
  }
}

// Transform component event to Google Calendar format
const transformToGoogleEvent = (componentEvent, selectedDate) => {
  // Format the date and times for Google Calendar
  const [year, month, day] = selectedDate.split("-")

  // Start time
  let startDateTime
  if (componentEvent.timeValue) {
    const [hours, minutes] = componentEvent.timeValue.split(":")
    startDateTime = `${selectedDate}T${hours}:${minutes}:00`
  } else {
    startDateTime = `${selectedDate}` // All day event
  }

  // End time
  let endDateTime
  if (componentEvent.endTimeValue) {
    const [hours, minutes] = componentEvent.endTimeValue.split(":")
    endDateTime = `${selectedDate}T${hours}:${minutes}:00`
  } else if (componentEvent.timeValue) {
    // Default to 1 hour later if no end time specified
    const [hours, minutes] = componentEvent.timeValue.split(":")
    const endHour = Number.parseInt(hours) + 1
    endDateTime = `${selectedDate}T${endHour.toString().padStart(2, "0")}:${minutes}:00`
  } else {
    // All day event, end date is next day
    const nextDay = new Date(`${year}-${month}-${day}`)
    nextDay.setDate(nextDay.getDate() + 1)
    const nextDayStr = nextDay.toISOString().split("T")[0]
    endDateTime = nextDayStr
  }

  return {
    summary: componentEvent.title,
    description: componentEvent.description,
    location: componentEvent.location,
    start: {
      dateTime: componentEvent.timeValue ? startDateTime : undefined,
      date: !componentEvent.timeValue ? startDateTime : undefined,
      timeZone: "Europe/London",
    },
    end: {
      dateTime: componentEvent.timeValue ? endDateTime : undefined,
      date: !componentEvent.timeValue ? endDateTime : undefined,
      timeZone: "Europe/London",
    },
    attendees: componentEvent.attendees?.map((email) => ({ email })) || [],
  }
}

// Check if a date is today
const isToday = (date) => {
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

// Calendar date picker component
function CalendarDatePicker({ selectedDate, onDateChange }) {
  const [pickerDate, setPickerDate] = useState(() => {
    const date = selectedDate ? new Date(selectedDate) : new Date()
    return date
  })

  const year = pickerDate.getFullYear()
  const month = pickerDate.getMonth()
  const monthName = pickerDate.toLocaleString("default", { month: "long" })
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfMonth = new Date(year, month, 1).getDay()

  // Generate calendar grid
  const calendarDays = []

  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push({ day: null, date: null })
  }

  // Add cells for each day of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day)
    const dateString = date.toISOString().split("T")[0]
    calendarDays.push({ day, date: dateString })
  }

  const navigateMonth = (direction) => {
    setPickerDate((prev) => {
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() + direction)
      return newDate
    })
  }

  const goToToday = () => {
    setPickerDate(new Date())
  }

  const handleDateClick = (dateString) => {
    // Make sure we call onDateChange with the correct date string format
    if (dateString && onDateChange) {
      onDateChange(dateString)
    }
  }

  return (
    <div className="p-2">
      <div className="flex justify-between items-center mb-2">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateMonth(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-sm font-medium">
          {monthName} {year}
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateMonth(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
          <div key={i} className="text-center text-xs text-gray-500">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, i) => {
          if (!day.day) {
            return <div key={`empty-${i}`} className="h-7 w-7" />
          }

          const isSelected = day.date === selectedDate
          const isTodayDate = isToday(new Date(day.date))

          return (
            <Button
              key={day.date}
              variant="ghost"
              size="sm"
              className={`h-7 w-7 p-0 ${
                isSelected
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : isTodayDate
                    ? "border border-gray-700"
                    : "hover:bg-gray-800"
              }`}
              onClick={() => handleDateClick(day.date)}
            >
              {day.day}
            </Button>
          )
        })}
      </div>

      <div className="mt-2 pt-2 border-t border-gray-800 flex justify-center">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={() => {
            const today = new Date().toISOString().split("T")[0]
            handleDateClick(today)
            goToToday()
          }}
        >
          Today
        </Button>
      </div>
    </div>
  )
}

// Attendee component for displaying and removing attendees
function AttendeeItem({ email, onRemove }) {
  return (
    <div className="flex items-center justify-between bg-gray-800 rounded-md px-2 py-1 text-sm">
      <div className="flex items-center gap-1.5">
        <Mail className="h-3 w-3 text-gray-400" />
        <span className="text-gray-200">{email}</span>
      </div>
    </div>
  )
}

export function CalendarPreview() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [calendarData, setCalendarData] = useState({ days: [] })
  const [selectedDay, setSelectedDay] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [isCreatingEvent, setIsCreatingEvent] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isAllDay, setIsAllDay] = useState(false)
  const [activeView, setActiveView] = useState("month")
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const modalRef = useRef(null)
  const [newAttendee, setNewAttendee] = useState("")
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState(null)
  const [meetToggle, setMeetToggle] = useState(false)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const monthName = currentDate.toLocaleString("default", { month: "long" })
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // Helper: Determine if attendees are required for current event type
  const attendeesRequired = editingEvent && (editingEvent.type === "meeting" || editingEvent.type === "appointment")
  // Helper: Determine if Meet toggle should be shown
  const showMeetToggle = editingEvent && ["meeting", "appointment", "event"].includes(editingEvent.type)
  // Helper: Default Meet toggle ON for meeting/appointment, OFF for event
  useEffect(() => {
    if (editingEvent) {
      if (editingEvent.type === "meeting" || editingEvent.type === "appointment") {
        setMeetToggle(true)
      } else if (editingEvent.type === "event") {
        setMeetToggle(false)
      }
    }
  }, [editingEvent && editingEvent.type])

  // Fetch events from Google Calendar API
  const fetchEvents = async () => {
    try {
      setLoading(true)
      const startOfMonth = new Date(year, month, 1).toISOString()
      const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59).toISOString()

      const response = await fetch(`/api/admin/dashboard/calendar?start=${startOfMonth}&end=${endOfMonth}`)
      if (!response.ok) throw new Error("Failed to fetch events")

      const googleEvents = await response.json()

      // Initialize calendar data structure
      const days = Array.from({ length: daysInMonth }, (_, i) => ({
        day: i + 1,
        date: new Date(year, month, i + 1),
        events: [],
      }))

      // Group events by day
      googleEvents.forEach((googleEvent) => {
        const transformedEvent = transformGoogleEvent(googleEvent)
        const eventDate = new Date(googleEvent.start?.dateTime || googleEvent.start?.date)
        const dayOfMonth = eventDate.getDate()

        if (dayOfMonth >= 1 && dayOfMonth <= daysInMonth && eventDate.getMonth() === month) {
          days[dayOfMonth - 1].events.push(transformedEvent)
        }
      })

      setCalendarData({ month: monthName, year, days })
    } catch (error) {
      console.error("Error fetching events:", error)
      toast.error("Failed to fetch calendar events")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [currentDate])

  // Generate calendar grid
  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const totalCells = Math.ceil((daysInMonth + firstDayOfMonth) / 7) * 7

  const calendarCells = Array.from({ length: totalCells }, (_, i) => {
    const dayIndex = i - firstDayOfMonth
    if (dayIndex < 0 || dayIndex >= daysInMonth) {
      // Previous or next month
      const date = new Date(year, month, dayIndex + 1)
      return { isEmpty: true, date, day: date.getDate() }
    }
    return { ...calendarData.days[dayIndex], isEmpty: false }
  })

  // Group cells into weeks for rendering
  const weeks = []
  for (let i = 0; i < calendarCells.length; i += 7) {
    weeks.push(calendarCells.slice(i, i + 7))
  }

  const handleDayClick = (cell) => {
    if (!cell.isEmpty) {
      setSelectedDay(cell)
      setSelectedDate(`${year}-${String(month + 1).padStart(2, "0")}-${String(cell.day).padStart(2, "0")}`)
      setIsModalOpen(true)
      setEditingEvent(null)
      setIsCreatingEvent(false)
    }
  }

  const handleEditEvent = (event) => {
    setEditingEvent({ ...event })
    setIsCreatingEvent(false)
    setIsAllDay(!event.timeValue)
    // Set meetToggle based on event type
    if (event.type === "meeting" || event.type === "appointment") {
      setMeetToggle(true)
    } else if (event.type === "event") {
      setMeetToggle(false)
    }
  }

  const handleCreateEvent = () => {
    setEditingEvent({
      title: "",
      type: "meeting",
      timeValue: "09:00",
      endTimeValue: "10:00",
      location: "",
      description: "",
      attendees: [],
    })
    setIsCreatingEvent(true)
    setIsAllDay(false)
    setMeetToggle(true) // Default for meeting
  }

  const handleSaveEvent = async () => {
    if (!editingEvent || !selectedDate) return

    // Validate form
    if (!editingEvent.title.trim()) {
      toast.error("Event title is required")
      return
    }
    // Attendee requirement logic
    if (attendeesRequired && (!editingEvent.attendees || editingEvent.attendees.length === 0)) {
      toast.error("At least one attendee is required for this event type")
      return
    }
    if (!isAllDay && (!editingEvent.timeValue || !editingEvent.endTimeValue)) {
      toast.error("Start and end times are required")
      return
    }
    if (!isAllDay && editingEvent.timeValue && editingEvent.endTimeValue) {
      if (editingEvent.endTimeValue <= editingEvent.timeValue) {
        toast.error("End time must be after start time")
        return
      }
    }
    try {
      setSaving(true)
      const eventToSave = { ...editingEvent }
      if (isAllDay) {
        eventToSave.timeValue = null
        eventToSave.endTimeValue = null
      }
      // Add createMeet flag
      eventToSave.createMeet = showMeetToggle ? meetToggle : false
      if (isCreatingEvent) {
        const googleEventData = transformToGoogleEvent(eventToSave, selectedDate)
        googleEventData.createMeet = eventToSave.createMeet
        const response = await fetch("/api/admin/dashboard/calendar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(googleEventData),
        })
        if (!response.ok) throw new Error("Failed to create event")
        toast.success("Event created successfully")
      } else {
        const googleEventData = transformToGoogleEvent(eventToSave, selectedDate)
        googleEventData.createMeet = eventToSave.createMeet
        const response = await fetch("/api/admin/dashboard/calendar", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId: editingEvent.id,
            ...googleEventData,
          }),
        })
        if (!response.ok) throw new Error("Failed to update event")
        toast.success("Event updated successfully")
      }
      await fetchEvents()
      setEditingEvent(null)
      setIsCreatingEvent(false)
      setIsModalOpen(false)
    } catch (error) {
      console.error("Error saving event:", error)
      toast.error("Failed to save event")
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteEvent = async (eventId) => {
    try {
      setSaving(true)
      const response = await fetch(`/api/admin/dashboard/calendar?eventId=${eventId}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete event")

      toast.success("Event deleted successfully")

      // Refresh events
      await fetchEvents()
      setEditingEvent(null)
    } catch (error) {
      console.error("Error deleting event:", error)
      toast.error("Failed to delete event")
    } finally {
      setSaving(false)
    }
  }

  const navigateDate = (direction) => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (activeView === "month") {
        newDate.setMonth(prev.getMonth() + direction)
      } else if (activeView === "day") {
        newDate.setDate(prev.getDate() + direction)
      }
      return newDate
    })
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const applyTimePreset = (preset) => {
    setEditingEvent({
      ...editingEvent,
      timeValue: preset.start,
      endTimeValue: preset.end,
    })
  }

  const handleAddAttendee = () => {
    if (!newAttendee.trim()) return

    if (!isValidEmail(newAttendee)) {
      toast.error("Please enter a valid email address")
      return
    }

    // Check if attendee already exists
    if (editingEvent.attendees.includes(newAttendee)) {
      toast.error("This attendee is already added")
      return
    }

    setEditingEvent({
      ...editingEvent,
      attendees: [...editingEvent.attendees, newAttendee],
    })
    setNewAttendee("")
  }

  const handleRemoveAttendee = (email) => {
    setEditingEvent({
      ...editingEvent,
      attendees: editingEvent.attendees.filter((a) => a !== email),
    })
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddAttendee()
    }
  }

  // Modal animations
  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 10 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        damping: 25,
        stiffness: 300,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: 10,
      transition: {
        duration: 0.2,
      },
    },
  }

  // Event card animations
  const eventCardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.05,
        duration: 0.3,
        ease: "easeOut",
      },
    }),
    exit: {
      opacity: 0,
      x: -20,
      transition: { duration: 0.2 },
    },
    hover: {
      y: -3,
      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
      transition: { duration: 0.2 },
    },
  }

  // Calendar cell animations
  const cellVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: (i) => ({
      opacity: 1,
      scale: 1,
      transition: {
        delay: i * 0.01,
        duration: 0.2,
      },
    }),
    hover: {
      scale: 1.05,
      backgroundColor: "rgba(255, 255, 255, 0.05)",
      transition: { duration: 0.2 },
    },
    tap: {
      scale: 0.95,
      transition: { duration: 0.1 },
    },
  }

  if (loading) {
    return <CalendarPreviewSkeleton />
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Card className="border-none shadow-lg bg-black text-white overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg font-bold">Calendar</CardTitle>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={goToToday}>
                Today
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-l-md rounded-r-none border-r border-gray-800 hover:bg-gray-800"
                  onClick={() => navigateDate(-1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-r-md rounded-l-none hover:bg-gray-800"
                  onClick={() => navigateDate(1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex rounded-md bg-background border border-gray-800">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`px-3 h-8 rounded-l-md ${activeView === "month" ? "bg-gray-800" : ""}`}
                  onClick={() => setActiveView("month")}
                >
                  Month
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`px-3 h-8 rounded-r-md ${activeView === "day" ? "bg-gray-800" : ""}`}
                  onClick={() => setActiveView("day")}
                >
                  Day
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        {/* Then in the return statement, replace the CardContent section with: */}
        <CardContent className="p-0">
          <AnimatePresence mode="wait">
            {activeView === "month" && (
              <motion.div
                key="month-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-4"
              >
                <div className="text-center mb-4">
                  <h3 className="font-medium text-lg">
                    {monthName} {year}
                  </h3>
                </div>

                <div className="grid grid-cols-7 text-center mb-2">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, i) => (
                    <div key={i} className="text-xs font-medium text-gray-400 py-1">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="space-y-1">
                  {weeks.map((week, weekIndex) => (
                    <div key={weekIndex} className="grid grid-cols-7 gap-1">
                      {week.map((cell, dayIndex) => {
                        const cellDate = cell.date || new Date(year, month, cell.day)
                        const isCurrentDay = isToday(cellDate)
                        const i = weekIndex * 7 + dayIndex

                        return (
                          <motion.div
                            key={i}
                            custom={i}
                            initial="hidden"
                            animate="visible"
                            variants={cellVariants}
                            whileHover={!cell.isEmpty ? "hover" : {}}
                            whileTap={!cell.isEmpty ? "tap" : {}}
                            className={`relative rounded-md p-1 ${
                              cell.isEmpty
                                ? "text-gray-600"
                                : "hover:cursor-pointer border border-transparent hover:border-gray-700"
                            } ${isCurrentDay ? "bg-gray-800 border-gray-700" : ""}`}
                            onClick={() => !cell.isEmpty && handleDayClick(cell)}
                          >
                            <div
                              className={`flex flex-col h-full min-h-[60px] md:min-h-[80px] p-1 ${cell.isEmpty ? "opacity-40" : ""}`}
                            >
                              <div className="flex justify-end">
                                <span
                                  className={`text-xs font-medium ${
                                    isCurrentDay
                                      ? "bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                                      : ""
                                  }`}
                                >
                                  {cell.day}
                                </span>
                              </div>

                              <div className="mt-1 flex-grow">
                                {!cell.isEmpty && cell.events && cell.events.length > 0 && (
                                  <div className="space-y-1">
                                    {cell.events.slice(0, 2).map((event, j) => {
                                      const category = eventCategories[event.type] || eventCategories.default
                                      return (
                                        <div
                                          key={j}
                                          className="text-[10px] px-1 py-0.5 rounded truncate"
                                          style={{
                                            backgroundColor: category.bgColor,
                                            borderLeft: `2px solid ${category.color}`,
                                          }}
                                          title={event.title}
                                        >
                                          {event.time !== "All day" && (
                                            <span className="mr-1 opacity-70">
                                              {event.time.replace(/\s[AP]M$/, "")}
                                            </span>
                                          )}
                                          {event.title}
                                        </div>
                                      )
                                    })}
                                    {cell.events.length > 2 && (
                                      <div className="text-[10px] text-gray-400 pl-1">
                                        +{cell.events.length - 2} more
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeView === "day" && (
              <DayView
                currentDate={currentDate}
                events={
                  calendarData.days.find(
                    (day) =>
                      day.day === currentDate.getDate() &&
                      month === currentDate.getMonth() &&
                      year === currentDate.getFullYear(),
                  )?.events || []
                }
                onEventClick={(event) => {
                  // When an event is clicked in day view, we need to:
                  // 1. Set the selected day to the current day
                  const currentDay = calendarData.days.find(
                    (day) =>
                      day.day === currentDate.getDate() &&
                      month === currentDate.getMonth() &&
                      year === currentDate.getFullYear(),
                  )
                  if (currentDay) {
                    setSelectedDay(currentDay)
                    setSelectedDate(
                      `${year}-${String(month + 1).padStart(2, "0")}-${String(currentDay.day).padStart(2, "0")}`,
                    )
                    setIsModalOpen(true)
                    handleEditEvent(event)
                  }
                }}
              />
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Event Details Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="p-0 border-none bg-transparent shadow-none max-w-md overflow-hidden">
              <motion.div
                ref={modalRef}
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={modalVariants}
                className="bg-black text-white rounded-xl overflow-hidden border border-gray-800"
              >
                {/* Modal Header */}
                <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5 text-gray-400" />
                    <DialogTitle className="text-lg font-medium">
                      {selectedDay && formatDate(new Date(year, month, selectedDay.day))}
                    </DialogTitle>
                  </div>
                </div>

                {/* Modal Content */}
                <div className="max-h-[70vh] overflow-y-auto event-modal-content">
                  {/* Events List */}
                  {selectedDay && !editingEvent && (
                    <div className="p-4">
                      <h3 className="text-gray-400 text-sm mb-3">Events</h3>

                      {selectedDay.events.length > 0 ? (
                        <AnimatePresence>
                          <div className="space-y-3">
                            {selectedDay.events.map((event, index) => {
                              const category = eventCategories[event.type] || eventCategories.default
                              return (
                                <motion.div
                                  key={event.id}
                                  custom={index}
                                  initial="hidden"
                                  animate="visible"
                                  exit="exit"
                                  variants={eventCardVariants}
                                  whileHover="hover"
                                  className="rounded-lg p-4"
                                  style={{
                                    backgroundColor: category.bgColor,
                                    borderLeft: `3px solid ${category.color}`,
                                  }}
                                >
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <h4 className="font-medium text-white">{event.title}</h4>
                                    </div>
                                    <div className="flex gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 rounded-full hover:bg-black/20"
                                        onClick={() => handleEditEvent(event)}
                                      >
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>

                                  <div className="space-y-1 text-sm text-gray-300">
                                    {event.time && (
                                      <div className="flex items-center gap-2">
                                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                                        {event.time}
                                      </div>
                                    )}

                                    {event.location && (
                                      <div className="flex items-center gap-2">
                                        <MapPin className="h-3.5 w-3.5 text-gray-400" />
                                        {event.location}
                                      </div>
                                    )}

                                    {event.attendees && event.attendees.length > 0 && (
                                      <div className="flex items-center gap-2">
                                        <Users className="h-3.5 w-3.5 text-gray-400" />
                                        {event.attendees.length} attendee{event.attendees.length !== 1 ? "s" : ""}
                                      </div>
                                    )}
                                  </div>

                                  {event.description && (
                                    <div className="mt-3 pt-3 border-t border-gray-700/30">
                                      <p className="text-sm text-gray-300">{event.description}</p>
                                    </div>
                                  )}
                                </motion.div>
                              )
                            })}
                          </div>
                        </AnimatePresence>
                      ) : (
                        <div className="text-center py-8 text-gray-500 bg-gray-900/30 rounded-lg">
                          <CalendarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>No events scheduled for this day</p>
                          <p className="text-sm mt-1">Click the button below to add one</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Event Editor */}
                  {editingEvent && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                      className="p-4"
                    >
                      <div className="mb-4 pb-2 border-b border-gray-800">
                        <h3 className="text-lg font-medium">{isCreatingEvent ? "New Event" : "Edit Event"}</h3>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="title" className="text-gray-400">
                            Title
                          </Label>
                          <Input
                            id="title"
                            value={editingEvent.title}
                            onChange={(e) =>
                              setEditingEvent({
                                ...editingEvent,
                                title: e.target.value,
                              })
                            }
                            placeholder="Event title"
                            className="bg-gray-900 border-gray-800 focus:border-gray-700"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-gray-400">Event Type</Label>
                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries(eventCategories).map(([key, category]) => (
                              <motion.div
                                key={key}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className={`flex items-center gap-2 p-2 rounded-md cursor-pointer border ${
                                  editingEvent.type === key
                                    ? "border-gray-600 bg-gray-800"
                                    : "border-gray-800 hover:bg-gray-900"
                                }`}
                                onClick={() => setEditingEvent({ ...editingEvent, type: key })}
                              >
                                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color }}></div>
                                <span className="text-sm">{category.label}</span>
                                {editingEvent.type === key && <Check className="h-4 w-4 ml-auto text-blue-500" />}
                              </motion.div>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="isAllDay" className="text-gray-400">
                            All day event
                          </Label>
                          <Switch id="isAllDay" checked={isAllDay} onCheckedChange={setIsAllDay} />
                        </div>

                        {!isAllDay && (
                          <>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <Label className="text-gray-400">Time</Label>
                                <div className="flex gap-1">
                                  {timePresets.map((preset) => (
                                    <Button
                                      key={preset.label}
                                      variant="outline"
                                      size="sm"
                                      className="h-6 text-xs bg-background border-gray-800 hover:bg-gray-800"
                                      onClick={() => applyTimePreset(preset)}
                                    >
                                      {preset.label}
                                    </Button>
                                  ))}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <Label htmlFor="startTime" className="text-xs text-gray-500">
                                    Start
                                  </Label>
                                  <Select
                                    value={editingEvent.timeValue}
                                    onValueChange={(value) =>
                                      setEditingEvent({
                                        ...editingEvent,
                                        timeValue: value,
                                      })
                                    }
                                  >
                                    <SelectTrigger className="bg-background border-gray-800">
                                      <SelectValue placeholder="Select time" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-background border-gray-800 max-h-[200px]">
                                      {timeOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                          {option.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-1">
                                  <Label htmlFor="endTime" className="text-xs text-gray-500">
                                    End
                                  </Label>
                                  <Select
                                    value={editingEvent.endTimeValue}
                                    onValueChange={(value) =>
                                      setEditingEvent({
                                        ...editingEvent,
                                        endTimeValue: value,
                                      })
                                    }
                                  >
                                    <SelectTrigger className="bg-background border-gray-800">
                                      <SelectValue placeholder="Select time" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-background border-gray-800 max-h-[200px]">
                                      {timeOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                          {option.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>
                          </>
                        )}

                        <div className="space-y-2">
                          <Label htmlFor="location" className="text-gray-400">
                            Location
                          </Label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                              <MapPin className="h-4 w-4 text-gray-500" />
                            </div>
                            <Input
                              id="location"
                              value={editingEvent.location}
                              onChange={(e) =>
                                setEditingEvent({
                                  ...editingEvent,
                                  location: e.target.value,
                                })
                              }
                              placeholder="Add location"
                              className="bg-background border-gray-800 focus:border-gray-700 pl-10"
                            />
                          </div>
                        </div>

                        {/* Attendees Section */}
                        <div className="space-y-2">
                          <Label htmlFor="attendees" className="text-gray-400">
                            Attendees{attendeesRequired && <span className="text-red-500 ml-1">*</span>}
                          </Label>
                          <div className="space-y-3">
                            <div className="flex gap-2">
                              <div className="relative flex-1">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                  <Mail className="h-4 w-4 text-gray-500" />
                                </div>
                                <Input
                                  id="attendees"
                                  value={newAttendee}
                                  onChange={(e) => setNewAttendee(e.target.value)}
                                  onKeyDown={handleKeyDown}
                                  placeholder="Add attendee email"
                                  className="bg-background border-gray-800 focus:border-gray-700 pl-10"
                                />
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={handleAddAttendee}
                                className="h-10 w-10 bg-background border-gray-800 hover:bg-gray-800"
                              >
                                <UserPlus className="h-4 w-4" />
                              </Button>
                            </div>

                            {editingEvent.attendees && editingEvent.attendees.length > 0 ? (
                              <div className="flex flex-wrap gap-2 p-2 bg-background rounded-md border border-gray-800">
                                {editingEvent.attendees.map((email) => (
                                  <AttendeeItem key={email} email={email} onRemove={handleRemoveAttendee} />
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-3 text-sm text-gray-500 bg-background rounded-md">
                                No attendees added
                              </div>
                            )}
                            {/* Show attendee requirement warning if needed */}
                            {attendeesRequired && (!editingEvent.attendees || editingEvent.attendees.length === 0) && (
                              <div className="text-xs text-red-500">At least one attendee is required for this event type.</div>
                            )}
                          </div>
                        </div>
                        {/* Google Meet Toggle Section */}
                        {showMeetToggle && (
                          <div className="flex items-center gap-2 mt-2">
                            <Switch
                              id="meet-toggle"
                              checked={meetToggle}
                              onCheckedChange={setMeetToggle}
                              disabled={editingEvent.type === "meeting" || editingEvent.type === "appointment"}
                            />
                            <Label htmlFor="meet-toggle" className="text-gray-400">
                              Google Meet link
                            </Label>
                            {(editingEvent.type === "meeting" || editingEvent.type === "appointment") && (
                              <span className="text-xs text-blue-400 ml-2">Will be added to this event</span>
                            )}
                          </div>
                        )}

                        {!isCreatingEvent && (
                          <div className="space-y-2">
                            <Label htmlFor="moveDate" className="text-gray-400">
                              Date
                            </Label>
                            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className="w-full justify-start text-left font-normal bg-background border-gray-800"
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {selectedDate
                                    ? format(parse(selectedDate, 'yyyy-MM-dd', new Date()), "PPP")
                                    : "Pick a date"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent align="start" className="flex w-auto flex-col space-y-2 p-2 pointer-events-auto z-50 bg-background border-gray-800">
                                <div className="rounded-md border">
                                  <CustomCalendar
                                    selected={selectedDate ? parse(selectedDate, 'yyyy-MM-dd', new Date()) : undefined}
                                    onSelect={(date) => {
                                      if (date) {
                                        const localStr = format(date, 'yyyy-MM-dd')
                                        setSelectedDate(localStr)
                                        setIsDatePickerOpen(false)
                                      }
                                    }}
                                  />
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label htmlFor="description" className="text-gray-400">
                            Description
                          </Label>
                          <Textarea
                            id="description"
                            value={editingEvent.description}
                            onChange={(e) =>
                              setEditingEvent({
                                ...editingEvent,
                                description: e.target.value,
                              })
                            }
                            placeholder="Add description"
                            rows={3}
                            className="bg-background border-gray-800 focus:border-gray-700 resize-none"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="p-4 border-t border-gray-800">
                  {!editingEvent ? (
                    <Button
                      onClick={handleCreateEvent}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={saving}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add New Event
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSaveEvent}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                        disabled={saving || (attendeesRequired && (!editingEvent.attendees || editingEvent.attendees.length === 0))}
                      >
                        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        Save
                      </Button>
                      {!isCreatingEvent && (
                        <Button
                          variant="outline"
                          onClick={() => {
                            setPendingDeleteId(editingEvent.id)
                            setShowDeleteConfirm(true)
                          }}
                          disabled={saving}
                          className="bg-transparent border-red-800 text-red-500 hover:bg-red-900/20 hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingEvent(null)
                          setIsCreatingEvent(false)
                        }}
                        disabled={saving}
                        className="bg-gray-800 border-gray-700 hover:bg-gray-700"
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>

      {/* Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm">
          <DialogTitle>Delete Event?</DialogTitle>
          <div className="py-2 text-gray-300">Are you sure you want to delete this event? This action cannot be undone.</div>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={saving} className="bg-gray-800 border-gray-600 hover:bg-background">Cancel</Button>
            <Button onClick={() => handleDeleteEvent(pendingDeleteId)} disabled={saving} className="bg-red-600 hover:bg-red-700 text-white">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
