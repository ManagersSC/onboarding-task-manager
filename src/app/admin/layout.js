// import { Sidebar } from "@components/admin/Sidebar"
import { SidebarProvider } from "@components/ui/sidebar"
import { MobilePageHeader } from "@components/admin/mobile-page-header"
import { BottomNavigation } from "@components/admin/bottom-navigation"
import { AdminSidebar } from "@components/admin/admin-sidebar"

export const metadata = {
  title: "Admin Dashboard | Onboarding Manager",
  description: "Admin dashboard for managing onboarding tasks and users",
}

export default function AdminLayout({ children }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AdminSidebar />
        <main className="flex-1 overflow-x-hidden pb-16 md:pb-0 w-full">
          {children}
          <BottomNavigation />
        </main>
      </div>
    </SidebarProvider>
  )
}
