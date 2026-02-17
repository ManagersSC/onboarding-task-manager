import { DashboardHeader } from "@components/dashboard/DashboardHeader"
import { QuickMetrics } from "@components/dashboard/QuickMetrics"
import { ActivityFeed } from "@components/dashboard/ActivityFeed"
import { TaskManagement } from "@components/dashboard/TaskManagement"
import { OnboardingHealth } from "@components/dashboard/OnboardingHealth"
import { NewHireTracker } from "@components/dashboard/NewHireTracker"
import { NotificationCenter } from "@components/dashboard/NotificationCenter"
import dynamic from "next/dynamic"
import { Suspense } from "react"
import { headers, cookies } from "next/headers"

const CalendarPreviewLazy = dynamic(() => import("@components/dashboard/CalendarPreview").then(m => m.CalendarPreview))

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
    <div className="flex flex-col w-full min-h-screen">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 p-6 md:p-8">
        {/* Row 1: Page Header */}
        <div className="lg:col-span-5 flex items-center justify-between animate-fade-in-up">
          <div>
            <h1 className="text-headline font-semibold tracking-tight">Dashboard</h1>
            <p className="text-body-sm text-muted-foreground mt-1">Overview of your onboarding operations</p>
          </div>
          <DashboardHeader />
        </div>

        {/* Row 2: Quick Metrics */}
        <div className="lg:col-span-5 animate-fade-in-up stagger-1">
          <QuickMetrics initialData={overview?.metrics} />
        </div>

        {/* Row 3: TaskManagement + Sidebar Column */}
        <div className="lg:col-span-3 animate-fade-in-up stagger-2">
          <TaskManagement initialTasks={overview?.tasks} />
        </div>
        <div className="lg:col-span-2 space-y-6 animate-fade-in-up stagger-3">
          <Suspense fallback={<div className="h-40 w-full rounded-xl bg-muted/30 animate-pulse" />}>
            <CalendarPreviewLazy />
          </Suspense>
          <OnboardingHealth />
        </div>

        {/* Row 4: NewHireTracker + ActivityFeed */}
        <div className="lg:col-span-3 animate-fade-in-up stagger-4">
          <NewHireTracker initialNewHires={overview?.newHires} />
        </div>
        <div className="lg:col-span-2 animate-fade-in-up stagger-4">
          <ActivityFeed initialActivities={overview?.activities} />
        </div>

        {/* Row 5: NotificationCenter */}
        <div className="lg:col-span-5 animate-fade-in-up stagger-5">
          <NotificationCenter />
        </div>
      </div>
    </div>
  )
}
