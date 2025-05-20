"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
} from "date-fns"
import { Button } from "@components/ui/button"
import { cn } from "@components/lib/utils"

export function CustomCalendar({ selected, onSelect, className }) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  // Get days in current month view
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Get day names
  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

  // Navigation functions
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))

  return (
    <div className={cn("p-3 space-y-4", className)}>
      {/* Header with month and navigation */}
      <div className="flex justify-center items-center relative">
        <Button variant="outline" size="icon" className="h-7 w-7 absolute left-1 p-0" onClick={prevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-sm font-medium">{format(currentMonth, "MMMM yyyy")}</div>
        <Button variant="outline" size="icon" className="h-7 w-7 absolute right-1 p-0" onClick={nextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 gap-1">
        {dayNames.map((day) => (
          <div key={day} className="text-center text-muted-foreground text-xs h-9 flex items-center justify-center">
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {daysInMonth.map((day) => {
          const isSelected = selected && isSameDay(day, selected)
          const isToday = isSameDay(day, new Date())

          return (
            <Button
              key={day.toString()}
              variant="ghost"
              className={cn(
                "h-9 w-9 p-0 font-normal",
                isSelected && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                isToday && !isSelected && "bg-accent text-accent-foreground",
                !isSameMonth(day, currentMonth) && "text-muted-foreground opacity-50",
              )}
              onClick={() => onSelect(day)}
            >
              {format(day, "d")}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
