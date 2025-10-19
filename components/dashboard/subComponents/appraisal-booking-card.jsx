"use client"

import { CalendarIcon, Users, Clock, Plus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@components/ui/card"
import { Button } from "@components/ui/button"
import { Badge } from "@components/ui/badge"

export function AppraisalBookingCard({ onBook, subtitle, countLabel }) {
  return (
    <Card className="border-border/50 bg-card/60 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5">
              <CalendarIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Appraisal Booking</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {subtitle || "Schedule an appraisal for the selected hire with calendar context."}
              </p>
            </div>
          </div>
          {countLabel ? (
            <Badge variant="secondary" className="text-xs bg-emerald-600 text-white">
              {countLabel}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>Admin-led booking</span>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Pick date, start & end time</span>
            </div>
          </div>
          <Button onClick={onBook} className="shadow-sm bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" /> Book Appraisal
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}


