import { DashboardHeader } from "@components/dashboard/DashboardHeader"
import { QuickMetrics } from "@components/dashboard/QuickMetrics"
import { ActivityFeed } from "@components/dashboard/ActivityFeed"
import { QuickActions } from "@components/dashboard/QuickActions"
import { TaskManagement } from "@components/dashboard/TaskManagement"
import { CalendarPreview } from "@components/dashboard/CalendarPreview"
import { ResourceHub } from "@components/dashboard/ResourceHub"
import { OnboardingHealth } from "@components/dashboard/OnboardingHealth"
import { NewHireTracker } from "@components/dashboard/NewHireTracker"

import { cookies } from "next/headers"
import { getIronSession } from "iron-session"

export default async function AdminDashboard() {
  const cookieStore = await cookies();
  const session = await getIronSession(cookieStore, {
    password: process.env.SESSION_SECRET,
    cookieName: 'session'
  })
  return (
    <div className="flex flex-col w-full min-h-screen bg-background">
      <div className="grid grid-cols-6 gap-4 p-4 md:p-6">
        {/* Top Row */}
        <div className="col-span-5">
          <QuickMetrics />
        </div>
        <div className="col-span-1">
          <DashboardHeader />
        </div>

        {/* Middle Row */}
        <div className="col-span-4 space-y-4">
          <TaskManagement />
          <NewHireTracker />
        </div>
        <div className="col-span-2 space-y-4">
          <CalendarPreview />
          <ResourceHub />
          <OnboardingHealth />
        </div>

        {/* Bottom Row */}
        <div className="col-span-3">
          <ActivityFeed />
        </div>
        <div className="col-span-3 space-y-4">
          <QuickActions />
          {/* <NotificationCenter /> */}
        </div>
      </div>
    </div>
  )
}
