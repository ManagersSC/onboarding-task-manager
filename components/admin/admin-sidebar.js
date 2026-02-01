"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { LayoutDashboard, CheckSquare, FolderKanban, Users, User, LogOut, FileSearch, ListChecks } from "lucide-react"
import { handleLogout } from "@/lib/utils/logout"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@components/ui/alert-dialog"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@components/ui/sidebar"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

const navItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/admin/dashboard",
  },
  {
    title: "Tasks",
    icon: CheckSquare,
    href: "/admin/assigned-tasks",
  },
  {
    title: "Resources",
    icon: FolderKanban,
    href: "/admin/resources",
  },
  {
    title: "Users",
    icon: Users,
    href: "/admin/users",
  },
  {
    title: "Quizzes",
    icon: ListChecks,
    href: "/admin/quizzes",
  },
  {
    title: "Audit Logs",
    icon: FileSearch,
    href: "/admin/audit-logs",
  },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { isMobile } = useSidebar()
  const [isMiddleScreen, setIsMiddleScreen] = useState(false)
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false)

  // Add effect to detect medium screen size
  useEffect(() => {
    const checkScreenSize = () => {
      const isMiddle = window.innerWidth >= 768 && window.innerWidth < 1200
      setIsMiddleScreen(isMiddle)
    }

    // Check on mount
    checkScreenSize()

    // Add resize listener
    window.addEventListener("resize", checkScreenSize)

    // Clean up
    return () => window.removeEventListener("resize", checkScreenSize)
  }, [])

  return (
    <>
      {/* Desktop Sidebar */}
      <div
        className={`hidden md:block transition-all duration-slow ease-out-expo ${isMiddleScreen ? "sidebar-icon-only" : ""}`}
        style={{ width: isMiddleScreen ? "4rem" : "16rem" }}
      >
        <Sidebar className="pt-0 md:pt-0 h-full" style={{ width: isMiddleScreen ? "4rem" : "16rem" }}>
          <SidebarHeader className="h-14 flex items-center px-4 border-b border-border/60">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-2.5 w-full overflow-hidden"
            >
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0 shadow-sm">
                SC
              </div>
              <span className={`font-semibold truncate tracking-tight ${isMiddleScreen ? "hidden" : "block"}`}>
                SC Manager
              </span>
            </motion.div>
          </SidebarHeader>

          <SidebarContent className="px-2 py-3">
            <SidebarMenu className="space-y-0.5">
              {navItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <Link
                        href={item.href}
                        className={`flex items-center ${isMiddleScreen ? "justify-center" : "gap-3"} rounded-lg transition-all duration-base ease-out-expo ${
                          isActive
                            ? "bg-primary/5 text-primary font-medium border-l-2 border-primary"
                            : "hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <item.icon className={`h-5 w-5 shrink-0 transition-colors duration-base ${isActive ? "text-primary" : ""}`} />
                        <span className={`truncate ${isMiddleScreen ? "hidden" : "block"}`}>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="mt-auto border-t border-border/60 p-3">
            <SidebarMenu className="space-y-0.5">
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/admin/profile"} tooltip="Profile">
                  <Link
                    href="/admin/profile"
                    className={`flex items-center ${isMiddleScreen ? "justify-center" : "gap-3"} w-full rounded-lg transition-all duration-base ease-out-expo ${
                      pathname === "/admin/profile"
                        ? "bg-primary/5 text-primary font-medium"
                        : "hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <User className="h-5 w-5 shrink-0" />
                    <span className={`truncate ${isMiddleScreen ? "hidden" : "block"}`}>Profile</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Logout">
                  <button
                    className={`flex items-center ${isMiddleScreen ? "justify-center" : "gap-3"} w-full rounded-lg transition-all duration-base ease-out-expo hover:bg-error/10 text-muted-foreground hover:text-error`}
                    onClick={() => setIsLogoutDialogOpen(true)}
                  >
                    <LogOut className="h-5 w-5 shrink-0" />
                    <span className={`truncate ${isMiddleScreen ? "hidden" : "block"}`}>Logout</span>
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
      </div>

      {/* Mobile Sidebar */}
      {isMobile && (
        <Sidebar className="pt-0 md:pt-0 h-full" collapsible="offcanvas">
          <SidebarHeader className="h-14 flex items-center px-4 border-b border-border/60">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-2.5 w-full overflow-hidden"
            >
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0 shadow-sm">
                SC
              </div>
              <span className="font-semibold truncate tracking-tight">Onboarding Manager</span>
            </motion.div>
          </SidebarHeader>

          <SidebarContent className="px-2 py-3">
            <SidebarMenu className="space-y-0.5">
              {navItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link
                        href={item.href}
                        className={`flex items-center gap-3 rounded-lg transition-all duration-base ease-out-expo ${
                          isActive
                            ? "bg-primary/5 text-primary font-medium border-l-2 border-primary"
                            : "hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <item.icon className={`h-5 w-5 shrink-0 transition-colors duration-base ${isActive ? "text-primary" : ""}`} />
                        <span className="truncate">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="mt-auto border-t border-border/60 p-3">
            <SidebarMenu className="space-y-0.5">
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/admin/profile"}>
                  <Link
                    href="/admin/profile"
                    className={`flex items-center gap-3 w-full rounded-lg transition-all duration-base ease-out-expo ${
                      pathname === "/admin/profile"
                        ? "bg-primary/5 text-primary font-medium"
                        : "hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <User className="h-5 w-5 shrink-0" />
                    <span className="truncate">Profile</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <button
                    className="flex items-center gap-3 w-full rounded-lg transition-all duration-base ease-out-expo hover:bg-error/10 text-muted-foreground hover:text-error"
                    onClick={() => setIsLogoutDialogOpen(true)}
                  >
                    <LogOut className="h-5 w-5 shrink-0" />
                    <span className="truncate">Logout</span>
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
      )}
      <AlertDialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to logout?</AlertDialogTitle>
            <AlertDialogDescription>You will be redirected to the login page.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleLogout(router)}>Logout</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
