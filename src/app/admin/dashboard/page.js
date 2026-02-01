import { DashboardHeader } from "@components/dashboard/DashboardHeader"
import { QuickMetrics } from "@components/dashboard/QuickMetrics"
import { ActivityFeed } from "@components/dashboard/ActivityFeed"
import { TaskManagement } from "@components/dashboard/TaskManagement"
import { OnboardingHealth } from "@components/dashboard/OnboardingHealth"
import { NewHireTracker } from "@components/dashboard/NewHireTracker"
import { NotificationCenter } from "@components/dashboard/NotificationCenter"
import FloatingQuickActions from "@components/dashboard/subComponents/FloatingQuickActions"
import dynamic from "next/dynamic"
import { Suspense } from "react"
import { headers, cookies } from "next/headers"

const CalendarPreviewLazy = dynamic(() => import("@components/dashboard/CalendarPreview").then(m => m.CalendarPreview))

const ResourceHubLazy = dynamic(() => import("@components/dashboard/ResourceHub").then(m => m.ResourceHub))

export default async function DashboardPage() {
  let overview = null
  try {
    const hdrs = await headers()
    const host = hdrs.get("host")
    const proto = hdrs.get("x-forwarded-proto") || "http"
    const baseUrl = `${proto}://${host}`

    const cookieStore = await cookies()
    const cookieHeader = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join("; ")

    const res = await fetch(`${baseUrl}/api/admin/dashboard/overview`, {
      cache: "no-store",
      headers: { cookie: cookieHeader }
    })
    if (res.ok) {
      overview = await res.json()
    }
  } catch {}

  return (
    <div className="flex flex-col w-full min-h-screen bg-background">
      <div className="grid grid-cols-1 md:grid-cols-6 gap-5 p-4 md:p-6 lg:p-8">
        {/* Top Row */}
        <div className="col-span-1 md:col-span-5 order-2 md:order-1 animate-fade-in-up">
          <QuickMetrics initialData={overview?.metrics} />
        </div>
        <div className="col-span-1 order-1 md:order-2 hidden md:block animate-fade-in-up stagger-1">
          <DashboardHeader />
        </div>

        {/* Middle Row */}
        <div className="col-span-1 md:col-span-4 space-y-5 order-3 animate-fade-in-up stagger-2">
          <TaskManagement initialTasks={overview?.tasks} />
          <NewHireTracker initialNewHires={overview?.newHires} />
        </div>
        <div className="col-span-1 md:col-span-2 space-y-5 order-4 animate-fade-in-up stagger-3">
          <Suspense fallback={<div className="h-40 w-full" />}>
            <CalendarPreviewLazy />
          </Suspense>
          <Suspense fallback={<div className="h-40 w-full" />}>
            <ResourceHubLazy initialResources={overview?.resources?.items} initialTotal={overview?.resources?.totalCount} />
          </Suspense>
          <OnboardingHealth />
        </div>

        {/* Bottom Row */}
        <div className="col-span-1 md:col-span-3 order-5 animate-fade-in-up stagger-4">
          <ActivityFeed initialActivities={overview?.activities} />
        </div>
        <div className="col-span-1 md:col-span-3 space-y-5 order-6 animate-fade-in-up stagger-5">
          <NotificationCenter />
        </div>
      </div>
      <FloatingQuickActions />
    </div>
  )
}
