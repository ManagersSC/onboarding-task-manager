"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { LayoutDashboard, CheckSquare, FolderKanban, Users, User, LogOut, FileSearch, ListChecks, ChevronLeft } from "lucide-react"
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@components/ui/tooltip"
import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"

const navGroups = [
  {
    label: "MAIN",
    items: [
      { title: "Dashboard", icon: LayoutDashboard, href: "/admin/dashboard" },
      { title: "Tasks", icon: CheckSquare, href: "/admin/assigned-tasks" },
      { title: "Resources", icon: FolderKanban, href: "/admin/resources" },
    ],
  },
  {
    label: "MANAGEMENT",
    items: [
      { title: "Users", icon: Users, href: "/admin/users" },
      { title: "Quizzes", icon: ListChecks, href: "/admin/quizzes" },
      { title: "Audit Logs", icon: FileSearch, href: "/admin/audit-logs" },
    ],
  },
]

// Flat list for backward compat
const navItems = navGroups.flatMap((g) => g.items)


export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { isMobile } = useSidebar()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false)

  // Initialize collapse state from localStorage + screen size
  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed")
    if (stored !== null) {
      setIsCollapsed(stored === "true")
    } else {
      // Auto-collapse on medium screens
      const isMiddle = window.innerWidth >= 768 && window.innerWidth < 1200
      setIsCollapsed(isMiddle)
    }
  }, [])

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev
      localStorage.setItem("sidebar-collapsed", String(next))
      return next
    })
  }, [])

  const sidebarWidth = isCollapsed ? "4rem" : "15rem"

  const renderNavItem = (item, collapsed) => {
    const isActive = pathname === item.href
    const linkContent = (
      <Link
        href={item.href}
        className={`flex items-center ${collapsed ? "justify-center" : "gap-3"} rounded-lg px-2.5 py-2 transition-all duration-base ease-out-expo ${
          isActive
            ? "bg-primary/8 text-foreground font-medium"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
        }`}
      >
        <item.icon className={`h-[18px] w-[18px] shrink-0 transition-colors duration-base ${isActive ? "text-foreground" : ""}`} />
        {!collapsed && <span className="truncate text-body-sm">{item.title}</span>}
      </Link>
    )

    if (collapsed) {
      return (
        <SidebarMenuItem key={item.href}>
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarMenuButton asChild isActive={isActive}>
                  {linkContent}
                </SidebarMenuButton>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8} className="text-body-sm bg-foreground text-background">
                {item.title}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </SidebarMenuItem>
      )
    }

    return (
      <SidebarMenuItem key={item.href}>
        <SidebarMenuButton asChild isActive={isActive}>
          {linkContent}
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  const renderProfileItem = (collapsed) => {
    const isActive = pathname === "/admin/profile"
    const linkContent = (
      <Link
        href="/admin/profile"
        className={`flex items-center ${collapsed ? "justify-center" : "gap-3"} w-full rounded-lg px-2.5 py-2 transition-all duration-base ease-out-expo ${
          isActive
            ? "bg-primary/8 text-foreground font-medium"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
        }`}
      >
        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-primary text-caption font-semibold">A</span>
        </div>
        {!collapsed && <span className="truncate text-body-sm">Profile</span>}
      </Link>
    )

    if (collapsed) {
      return (
        <SidebarMenuItem>
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarMenuButton asChild isActive={isActive}>
                  {linkContent}
                </SidebarMenuButton>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8} className="text-body-sm bg-foreground text-background">
                Profile
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </SidebarMenuItem>
      )
    }

    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={isActive}>
          {linkContent}
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  const renderLogoutItem = (collapsed) => {
    const btnContent = (
      <button
        className={`flex items-center ${collapsed ? "justify-center" : "gap-3"} w-full rounded-lg px-2.5 py-2 transition-all duration-base ease-out-expo text-muted-foreground hover:text-error hover:bg-error/5`}
        onClick={() => setIsLogoutDialogOpen(true)}
      >
        <LogOut className="h-[18px] w-[18px] shrink-0" />
        {!collapsed && <span className="truncate text-body-sm">Logout</span>}
      </button>
    )

    if (collapsed) {
      return (
        <SidebarMenuItem>
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarMenuButton asChild>
                  {btnContent}
                </SidebarMenuButton>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8} className="text-body-sm bg-foreground text-background">
                Logout
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </SidebarMenuItem>
      )
    }

    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild>
          {btnContent}
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <div
        className="hidden md:block transition-all duration-slow ease-out-expo shrink-0"
        style={{ width: sidebarWidth }}
      >
        <Sidebar
          className="pt-0 md:pt-0 h-full bg-gradient-to-b from-background to-muted/20"
          style={{ width: sidebarWidth }}
        >
          {/* Header / Brand */}
          <SidebarHeader className={`h-14 flex items-center border-b border-border/40 ${isCollapsed ? "justify-center px-2" : "px-3"}`}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className={`flex items-center w-full overflow-hidden ${isCollapsed ? "justify-center" : "gap-2.5"}`}
            >
              <Image src="/logo.png" alt="Smile Cliniq" width={isCollapsed ? 20 : 24} height={isCollapsed ? 20 : 24} className="shrink-0 rounded" />
              {!isCollapsed && (
                <span className="text-body-sm font-semibold truncate tracking-tight text-foreground">
                  Smile Cliniq
                </span>
              )}
            </motion.div>
          </SidebarHeader>

          {/* Nav Content */}
          <SidebarContent className="px-2 py-2 flex-1">
            {navGroups.map((group) => (
              <div key={group.label}>
                {!isCollapsed && (
                  <div className="text-overline text-muted-foreground/60 tracking-widest px-3 mb-1 mt-4 first:mt-2 select-none">
                    {group.label}
                  </div>
                )}
                {isCollapsed && <div className="mt-3 first:mt-1" />}
                <SidebarMenu className="space-y-0.5">
                  {group.items.map((item) => renderNavItem(item, isCollapsed))}
                </SidebarMenu>
              </div>
            ))}
          </SidebarContent>

          {/* Collapse Toggle */}
          <div className={`px-2 ${isCollapsed ? "flex justify-center" : ""}`}>
            <button
              onClick={toggleCollapse}
              className="flex items-center justify-center w-full rounded-lg py-1.5 text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/30 transition-all duration-base"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <ChevronLeft
                className={`h-4 w-4 transition-transform duration-slow ease-out-expo ${isCollapsed ? "rotate-180" : ""}`}
              />
            </button>
          </div>

          {/* Footer */}
          <SidebarFooter className="mt-auto border-t border-border/40 p-2">
            <SidebarMenu className="space-y-0.5">
              {renderProfileItem(isCollapsed)}
              {renderLogoutItem(isCollapsed)}
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
      </div>

      {/* Mobile Sidebar (offcanvas) */}
      {isMobile && (
        <Sidebar className="pt-0 md:pt-0 h-full" collapsible="offcanvas">
          <SidebarHeader className="h-14 flex items-center px-4 border-b border-border/40">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-2.5 w-full overflow-hidden"
            >
              <Image src="/logo.png" alt="Smile Cliniq" width={24} height={24} className="shrink-0 rounded" />
              <span className="text-body-sm font-semibold truncate tracking-tight text-foreground">
                Smile Cliniq
              </span>
            </motion.div>
          </SidebarHeader>

          <SidebarContent className="px-2 py-2">
            {navGroups.map((group) => (
              <div key={group.label}>
                <div className="text-overline text-muted-foreground/60 tracking-widest px-3 mb-1 mt-4 first:mt-2 select-none">
                  {group.label}
                </div>
                <SidebarMenu className="space-y-0.5">
                  {group.items.map((item) => renderNavItem(item, false))}
                </SidebarMenu>
              </div>
            ))}
          </SidebarContent>

          <SidebarFooter className="mt-auto border-t border-border/40 p-2">
            <SidebarMenu className="space-y-0.5">
              {renderProfileItem(false)}
              {renderLogoutItem(false)}
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
      )}

      {/* Logout Confirmation */}
      <AlertDialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
        <AlertDialogContent className="rounded-xl">
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
