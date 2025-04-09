import { DashboardHeader } from "@components/admin/DashboardHeader"
import { DashboardMetrics } from "@components/admin/DashboardMetrics"
import { ActivityFeed } from "@components/admin/ActivityFeed"
import { QuickActions } from "@components/admin/QuickActions"

export default function AdminDashboard() {
  return (
    <div className="p-6 space-y-6">
      <DashboardHeader />
      {/* <DashboardMetrics /> */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* <div className="lg:col-span-2">
          <ActivityFeed />
        </div> */}
        <div>
          <QuickActions />
        </div>
      </div>
    </div>
  )
}
