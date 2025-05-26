"use client"

import { motion } from "framer-motion"
import { Clock, MapPin } from "lucide-react"

export function DayView({ currentDate, events = [], onEventClick }) {
  const hours = Array.from({ length: 24 }, (_, i) => {
    const hour = i % 12 || 12
    const ampm = i < 12 ? "AM" : "PM"
    return {
      label: `${hour} ${ampm}`,
      hour: i,
    }
  })

  const formattedDate = currentDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  const isToday = currentDate.toDateString() === new Date().toDateString()

  // Group events by hour
  const eventsByHour = {}
  events.forEach((event) => {
    if (event.timeValue) {
      const [hours] = event.timeValue.split(":")
      const hour = Number.parseInt(hours, 10)
      if (!eventsByHour[hour]) eventsByHour[hour] = []
      eventsByHour[hour].push(event)
    }
  })

  // Get all-day events
  const allDayEvents = events.filter((event) => !event.timeValue)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4">
      <div className="text-center mb-4">
        <h3 className={`font-medium text-lg ${isToday ? "text-blue-500" : ""}`}>
          {formattedDate} {isToday && "(Today)"}
        </h3>
      </div>

      {allDayEvents.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm text-gray-400 mb-2">All Day</h4>
          <div className="space-y-2">
            {allDayEvents.map((event, index) => (
              <div
                key={index}
                className="p-2 rounded-md bg-gray-800 border-l-2 border-blue-500 cursor-pointer hover:bg-gray-700 transition-colors"
                onClick={() => onEventClick && onEventClick(event)}
              >
                <div className="font-medium">{event.title}</div>
                {event.location && (
                  <div className="flex items-center text-xs text-gray-400 mt-1">
                    <MapPin className="h-3 w-3 mr-1" />
                    {event.location}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border border-gray-800 rounded-md overflow-hidden">
        {hours.map((hour, i) => (
          <div key={i} className="flex border-b border-gray-800 last:border-b-0">
            <div className="w-16 p-2 text-xs text-gray-500 border-r border-gray-800 flex items-start pt-2">
              {hour.label}
            </div>
            <div className="flex-1 min-h-[60px] p-2 relative">
              {eventsByHour[hour.hour]?.map((event, index) => (
                <div
                  key={index}
                  className="p-2 rounded-md bg-gray-800 border-l-2 border-purple-500 mb-1 cursor-pointer hover:bg-gray-700 transition-colors"
                  onClick={() => onEventClick && onEventClick(event)}
                >
                  <div className="font-medium text-sm">{event.title}</div>
                  <div className="flex items-center text-xs text-gray-400 mt-1">
                    <Clock className="h-3 w-3 mr-1" />
                    {event.time}
                  </div>
                  {event.location && (
                    <div className="flex items-center text-xs text-gray-400 mt-1">
                      <MapPin className="h-3 w-3 mr-1" />
                      {event.location}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
