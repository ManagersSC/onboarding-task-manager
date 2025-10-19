"use client"

import { useMemo, useState } from "react"
import { Button } from "@components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@components/ui/dialog"
import { Label } from "@components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@components/ui/select"
import { CalendarIcon, CheckCircle2 } from "lucide-react"
import { format, parse } from "date-fns"
import { CustomCalendar } from "@components/dashboard/subComponents/custom-calendar"
import { CalendarPreview } from "@components/dashboard/CalendarPreview"

const generateTimeOptions = () => {
  const options = []
  for (let hour = 0; hour < 24; hour++) {
    for (const minute of [0, 15, 30, 45]) {
      const h = hour.toString().padStart(2, "0")
      const m = minute.toString().padStart(2, "0")
      const labelHour = (hour % 12) || 12
      const ampm = hour < 12 ? "AM" : "PM"
      options.push({ value: `${h}:${m}`, label: `${labelHour}:${m === "00" ? "00" : m} ${ampm}` })
    }
  }
  return options
}
const TIME_OPTIONS = generateTimeOptions()

export function AppraisalBookingModal({ open, onOpenChange, initialDate, onConfirm, defaultTitle }) {
  const [date, setDate] = useState(initialDate || "")
  const [start, setStart] = useState("09:00")
  const [end, setEnd] = useState("10:00")

  const isoRange = useMemo(() => {
    if (!date || !start || !end) return null
    try {
      const startIso = `${date}T${start}:00`
      const endIso = `${date}T${end}:00`
      return { start: startIso, end: endIso }
    } catch {
      return null
    }
  }, [date, start, end])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-5xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          {/* Left pane: details and pickers */}
          <div className="p-5 border-r">
            <DialogTitle className="text-base mb-3">{defaultTitle || "Book appraisal"}</DialogTitle>
            <div className="space-y-4">
              <div>
                <Label className="mb-1 block text-sm">Date</Label>
                <div className="rounded-md border w-fit">
                  <CustomCalendar
                    selected={date ? parse(date, "yyyy-MM-dd", new Date()) : undefined}
                    onSelect={(d) => {
                      if (d) setDate(format(d, "yyyy-MM-dd"))
                    }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1 block text-sm">Start</Label>
                  <Select value={start} onValueChange={setStart}>
                    <SelectTrigger>
                      <SelectValue placeholder="Start" />
                    </SelectTrigger>
                    <SelectContent className="max-h-56">
                      {TIME_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1 block text-sm">End</Label>
                  <Select value={end} onValueChange={setEnd}>
                    <SelectTrigger>
                      <SelectValue placeholder="End" />
                    </SelectTrigger>
                    <SelectContent className="max-h-56">
                      {TIME_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                className="w-full"
                disabled={!isoRange || end <= start}
                onClick={() => {
                  if (!isoRange) return
                  onConfirm?.(isoRange)
                  onOpenChange(false)
                }}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" /> Use this slot
              </Button>
            </div>
          </div>
          {/* Right pane: read-only calendar with dropdown date picker */}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
              <CalendarIcon className="h-4 w-4" />
              <span>Calendar preview</span>
            </div>
            <CalendarPreview readOnly initialDate={date} draftEvent={isoRange ? { start: isoRange.start, end: isoRange.end, title: defaultTitle } : null} compact />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}


