import { DashboardHeader } from "@components/dashboard/DashboardHeader"
import { QuickMetrics } from "@components/dashboard/QuickMetrics"
import { ActivityFeed } from "@components/dashboard/ActivityFeed"
import { QuickActions } from "@components/dashboard/QuickActions"
import { TaskManagement } from "@components/dashboard/TaskManagement"
import { CalendarPreview } from "@components/dashboard/CalendarPreview"
import { ResourceHub } from "@components/dashboard/ResourceHub"
import { OnboardingHealth } from "@components/dashboard/OnboardingHealth"
import { NewHireTracker } from "@components/dashboard/NewHireTracker"
import { NotificationCenter } from "@components/dashboard/NotificationCenter"

export default function DashboardPage() {
    return (
      <div className="flex flex-col w-full min-h-screen bg-background">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 md:p-6">
          {/* Top Row */}
          <div className="col-span-1 md:col-span-5 order-2 md:order-1">
            <QuickMetrics />
          </div>
          <div className="col-span-1 order-1 md:order-2 hidden md:block">
            <DashboardHeader />
          </div>
  
          {/* Middle Row */}
          <div className="col-span-1 md:col-span-4 space-y-4 order-3">
            <TaskManagement />
            <NewHireTracker />
          </div>
          <div className="col-span-1 md:col-span-2 space-y-4 order-4">
            <CalendarPreview />
            <ResourceHub />
            <OnboardingHealth />
          </div>
  
          {/* Bottom Row */}
          <div className="col-span-1 md:col-span-3 order-5">
            <ActivityFeed />
          </div>
          <div className="col-span-1 md:col-span-3 space-y-4 order-6">
            <QuickActions />
            <NotificationCenter />
          </div>
        </div>
      </div>
    )
  }
  