import { Sidebar } from "@components/admin/Sidebar"

export const metadata = {
  title: "Admin Dashboard | Onboarding Manager",
  description: "Admin dashboard for managing onboarding tasks and users",
}

export default function AdminLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  )
}
