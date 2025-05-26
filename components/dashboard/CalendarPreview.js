"use client"

import { motion } from "framer-motion"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@components/ui/card"
import { Button } from "@components/ui/button"

// Demo data
const calendarData = {
  month: "May",
  year: 2023,
  days: Array.from({ length: 31 }, (_, i) => ({
    day: i + 1,
    events: [],
  })),
}

// Add some events
calendarData.days[14].events.push({ type: "start", count: 1 }) // May 15
calendarData.days[21].events.push({ type: "start", count: 1 }) // May 22
calendarData.days[16].events.push({ type: "training", count: 2 }) // May 17
calendarData.days[23].events.push({ type: "training", count: 1 }) // May 24
calendarData.days[24].events.push({ type: "meeting", count: 3 }) // May 25
calendarData.days[28].events.push({ type: "deadline", count: 2 }) // May 29

const eventColors = {
  start: "bg-green-500",
  training: "bg-blue-500",
  meeting: "bg-purple-500",
  deadline: "bg-red-500",
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const monthName = currentDate.toLocaleString("default", { month: "long" })
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // Fetch events from Google Calendar API
  const fetchEvents = async () => {
    try {
      setLoading(true)
      const startOfMonth = new Date(year, month, 1).toISOString()
      const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59).toISOString()

      const response = await fetch(`/api/admin/dashboard/calendar?start=${startOfMonth}&end=${endOfMonth}`)
      if (!response.ok) {
        throw new Error("Failed to fetch events")
      }
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
        let eventDate;
        if (googleEvent.start?.dateTime) {
          eventDate = new Date(googleEvent.start.dateTime);
        } else if (googleEvent.start?.date) {
          const [y, m, d] = googleEvent.start.date.split('-');
          eventDate = new Date(Number(y), Number(m) - 1, Number(d));
        } else {
          return;
        }
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
  const daysInMonth = calendarData.days.length
  const firstDayOfMonth = new Date(calendarData.year, 4, 1).getDay() // 0 = Sunday
  const totalCells = Math.ceil((daysInMonth + firstDayOfMonth) / 7) * 7

  const calendarCells = Array.from({ length: totalCells }, (_, i) => {
    const dayIndex = i - firstDayOfMonth
    if (dayIndex < 0 || dayIndex >= daysInMonth) {
      return { isEmpty: true }
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
  }

  const handleSaveEvent = async () => {
    if (!editingEvent || !selectedDate) return

    // Validate form
    if (!editingEvent.title.trim()) {
      toast.error("Event title is required")
      return
    }

    if (!isAllDay && (!editingEvent.timeValue || !editingEvent.endTimeValue)) {
      toast.error("Start and end times are required")
      return
    }

    // Validate that end time is after start time
    if (!isAllDay && editingEvent.timeValue && editingEvent.endTimeValue) {
      if (editingEvent.endTimeValue <= editingEvent.timeValue) {
        toast.error("End time must be after start time")
        return
      }
    }

    try {
      setSaving(true)

      // If all-day event, remove time values
      const eventToSave = { ...editingEvent }
      if (isAllDay) {
        eventToSave.timeValue = null
        eventToSave.endTimeValue = null
      }

      if (isCreatingEvent) {
        // Create new event
        const googleEventData = transformToGoogleEvent(eventToSave, selectedDate)
        const response = await fetch("/api/admin/dashboard/calendar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(googleEventData),
        })

        if (!response.ok) {
          toast.error("Failed to create event")
          throw new Error("Failed to create event")
        }
        toast.success("Event created successfully")
      } else {
        // Update existing event
        const googleEventData = transformToGoogleEvent(eventToSave, selectedDate)
        const response = await fetch("/api/admin/dashboard/calendar", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId: editingEvent.id,
            ...googleEventData,
          }),
        })

        if (!response.ok) {
          toast.error("Failed to update event")
          throw new Error("Failed to update event")
        }
        toast.success("Event updated successfully")
      }

      // Refresh events
      await fetchEvents()
      setEditingEvent(null)
      setIsCreatingEvent(false)
      setIsModalOpen(false)
    } catch (error) {
      console.error("Error saving event:", error)
      // Only show toast if not already shown for this error
      if (!error.message?.includes("Failed to create event") && !error.message?.includes("Failed to update event")) {
        toast.error("Failed to save event")
      }
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

      if (!response.ok) {
        toast.error("Failed to delete event")
        throw new Error("Failed to delete event")
      }
      toast.success("Event deleted successfully")

      // Remove the deleted event from the selectedDay.events array
      if (selectedDay && selectedDay.events) {
        setSelectedDay({
          ...selectedDay,
          events: selectedDay.events.filter(event => event.id !== eventId),
        });
      }

      // Refresh events in the main calendar grid
      await fetchEvents()
      setEditingEvent(null)
    } catch (error) {
      console.error("Error deleting event:", error)
      // Only show toast if not already shown for this error
      if (!error.message?.includes("Failed to delete event")) {
        toast.error("Failed to delete event")
      }
    } finally {
      setSaving(false)
      setShowDeleteConfirm(false)
      setPendingDeleteId(null)
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    >
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Calendar</CardTitle>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ChevronLeft className="h-4 w-4" />
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

              <div className="flex rounded-md bg-gray-900 border border-gray-800">
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
                            } ${isCurrentDay ? "bg-background border-gray-700" : ""}`}
                            onClick={() => !cell.isEmpty && handleDayClick(cell)}
                          >
                            <div
                              className={`flex flex-col h-full min-h-[60px] md:min-h-[80px] p-1 ${cell.isEmpty ? "opacity-40" : ""}`}
                            >
                              <div className="flex justify-end">
                                <span
                                  className={`text-xs font-medium ${
                                    isCurrentDay
                                      ? "bg-background text-white rounded-full w-5 h-5 flex items-center justify-center"
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
                <div className="max-h-[70vh] overflow-y-auto custom-scrollbar">
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
                            className="bg-background border-gray-800 focus:border-gray-700"
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

                        {!isCreatingEvent && (
                          <div className="space-y-2">
                            <Label htmlFor="moveDate" className="text-gray-400">
                              Date
                            </Label>
                            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className="w-full justify-start bg-background border-gray-800 text-left"
                                >
                                  <Calendar className="mr-2 h-4 w-4" />
                                  {selectedDate
                                    ? format(parse(selectedDate, 'yyyy-MM-dd', new Date()), "PPP")
                                    : "Pick a date"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent
                                align="start"
                                className="flex w-auto flex-col space-y-2 p-2 pointer-events-auto z-50 bg-background border-gray-800"
                              >
                                <div className="rounded-md border bg-background">
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
                        disabled={saving}
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
                        className="bg-gray-800 border-gray-600 hover:bg-gray-900"
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm">
          <DialogTitle>Delete Event?</DialogTitle>
          <div className="py-2 text-gray-300">Are you sure you want to delete this event? This action cannot be undone.</div>
          <div className="flex gap-2 justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={saving}
              className="bg-gray-800 border-gray-600 hover:bg-gray-900"
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleDeleteEvent(pendingDeleteId)}
              disabled={saving}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
