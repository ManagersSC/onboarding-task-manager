// VULN-M10: Defense-in-depth — server-side auth check in admin layout
import { cookies } from "next/headers"
import { unsealData } from "iron-session"
import { redirect } from "next/navigation"
import { SidebarProvider } from "@components/ui/sidebar"
import { BottomNavigation } from "@components/admin/bottom-navigation"
import { AdminSidebar } from "@components/admin/admin-sidebar"

export const metadata = {
  title: "Admin Dashboard | Onboarding Manager",
  description: "Admin dashboard for managing onboarding tasks and users",
}

export default async function AdminLayout({ children }) {
  // Server-side session + role check (defense-in-depth alongside middleware)
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get("session")?.value

  if (!sessionCookie) {
    redirect("/?mode=admin")
  }

  try {
    const session = await unsealData(sessionCookie, {
      password: process.env.SESSION_SECRET,
      ttl: 60 * 60 * 8,
    })
    if (!session?.userEmail || session?.userRole !== "admin") {
      redirect("/?mode=admin")
    }
  } catch {
    redirect("/?mode=admin")
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AdminSidebar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto scroll-smooth bg-muted/20 pb-16 md:pb-0 w-full">
          {children}
          <BottomNavigation />
        </main>
      </div>
    </SidebarProvider>
  )
}
