import { DashboardHeader } from "@components/admin/DashboardHeader"
import { DashboardMetrics } from "@components/admin/DashboardMetrics"
import { ActivityFeed } from "@components/admin/ActivityFeed"
import { QuickActions } from "@components/admin/QuickActions"

import { cookies } from "next/headers"
import { getIronSession } from "iron-session"

export default async function AdminDashboard() {
  const cookieStore = await cookies();
  const session = await getIronSession(cookieStore, {
    password: process.env.SESSION_SECRET,
    cookieName: 'session'
  })
  console.log(session.userName)
  return (
    <div className="p-6 space-y-6">
      <DashboardHeader userName={session.userName} />
      {/* <DashboardMetrics /> */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ActivityFeed />
        </div>
        <div>
          <QuickActions />
        </div>
      </div>
    </div>
  )
}
