"use client"

import { QuickMetricsSkeleton } from "./quick-metrics-skeleton"
import { TaskManagementSkeleton } from "./task-management-skeleton"
import { NewHireTrackerSkeleton } from "./new-hire-tracker-skeleton"
import { CalendarPreviewSkeleton } from "./calendar-preview-skeleton"
import { ResourceHubSkeleton } from "./resource-hub-skeleton"
import { QuickActionsSkeleton } from "./quick-actions-skeleton"
import { NotificationCenterSkeleton } from "./notification-center-skeleton"
import { ActivityFeedSkeleton } from "./activity-feed-skeleton"
import { DashboardHeaderSkeleton } from "./dashboard-header-skeleton"

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col w-full min-h-screen bg-background">
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 md:p-6">
        {/* Top Row */}
        <div className="col-span-1 md:col-span-5 order-2 md:order-1">
          <QuickMetricsSkeleton />
        </div>
        <div className="col-span-1 order-1 md:order-2 hidden md:block">
          <DashboardHeaderSkeleton />
        </div>

        {/* Middle Row */}
        <div className="col-span-1 md:col-span-4 space-y-4 order-3">
          <TaskManagementSkeleton />
          <NewHireTrackerSkeleton />
        </div>
        <div className="col-span-1 md:col-span-2 space-y-4 order-4">
          <CalendarPreviewSkeleton />
          <ResourceHubSkeleton />
        </div>

        {/* Bottom Row */}
        <div className="col-span-1 md:col-span-3 order-5">
          <ActivityFeedSkeleton />
        </div>
        <div className="col-span-1 md:col-span-3 space-y-4 order-6">
          <QuickActionsSkeleton />
          <NotificationCenterSkeleton />
        </div>
      </div>
    </div>
  )
}
