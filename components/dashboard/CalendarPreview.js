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
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-2">
            <h3 className="font-medium">
              {calendarData.month} {calendarData.year}
            </h3>
          </div>

          <div className="grid grid-cols-7 text-center mb-1">
            {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
              <div key={i} className="text-xs font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((cell, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: i * 0.01 }}
                className={`aspect-square flex flex-col items-center justify-center rounded-md text-xs ${
                  cell.isEmpty ? "text-muted-foreground/30" : "hover:bg-muted cursor-pointer"
                }`}
              >
                {!cell.isEmpty && (
                  <>
                    <span className="mb-1">{cell.day}</span>
                    {cell.events.length > 0 && (
                      <div className="flex gap-0.5">
                        {cell.events.map((event, j) => (
                          <div
                            key={j}
                            className={`h-1.5 w-1.5 rounded-full ${eventColors[event.type]}`}
                            title={`${event.count} ${event.type} event${event.count > 1 ? "s" : ""}`}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            ))}
          </div>

          <div className="flex justify-center gap-x-3 gap-y-1 mt-3">
            <div className="flex items-center">
              <div className="h-2 w-2 rounded-full bg-green-500 mr-1" />
              <span className="text-xs">Start Date</span>
            </div>
            <div className="flex items-center">
              <div className="h-2 w-2 rounded-full bg-blue-500 mr-1" />
              <span className="text-xs">Training</span>
            </div>
            <div className="flex items-center">
              <div className="h-2 w-2 rounded-full bg-purple-500 mr-1" />
              <span className="text-xs">Meeting</span>
            </div>
            <div className="flex items-center">
              <div className="h-2 w-2 rounded-full bg-red-500 mr-1" />
              <span className="text-xs">Deadline</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
