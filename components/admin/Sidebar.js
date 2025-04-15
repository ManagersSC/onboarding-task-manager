"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { BarChart3, Users, ClipboardList, FileText, LogOut, ChevronLeft, ChevronRight, User } from "lucide-react"
import { cn } from "@components/lib/utils"
import { Button } from "@components/ui/button"
import { ThemeToggle } from "@components/theme-toggle"
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

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false)

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/logout", { method: "POST" })
      if (!response.ok) throw new Error("Failed to logout")
      router.push("/")
    } catch (error) {
      console.error("Error logging out:", error)
    }
  }

  const navItems = [
    {
      title: "Dashboard",
      href: "/admin/dashboard",
      icon: BarChart3,
    },
    {
      title: "Tasks & Resources",
      href: "/admin/tasks",
      icon: ClipboardList,
    },
    {
      title: "Users",
      href: "/admin/users",
      icon: Users,
    },
    {
      title: "Reports",
      href: "/admin/reports",
      icon: FileText,
    },
    {
      title: "Profile",
      href: "/admin/profile",
      icon: User,
    },
  ]

  return (
    <>
      <div
        className={cn(
          "flex flex-col bg-background border-r border-gray-200 transition-all duration-300 ease-in-out dark:bg-gray-900 dark:border-gray-800",
          isCollapsed ? "w-16" : "w-64",
        )}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-800">
          {!isCollapsed && (
            <Link href="/admin/dashboard" className="font-semibold text-lg dark:text-white">
              Onboarding Manager
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn("ml-auto", isCollapsed && "mx-auto")}
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </Button>
        </div>
        <div className="flex-1 py-4 overflow-y-auto">
          <nav className="space-y-1 px-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center px-3 py-2 rounded-md transition-colors",
                  pathname === item.href
                    ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100",
                  isCollapsed && "justify-center",
                )}
              >
                <item.icon className={cn("h-5 w-5", isCollapsed ? "mx-0" : "mr-3")} />
                {!isCollapsed && <span>{item.title}</span>}
              </Link>
            ))}
          </nav>
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-2">
          {/* Theme Toggle */}
          <div className={cn("flex", isCollapsed ? "justify-center" : "justify-start")}>
            {isCollapsed ? (
              <ThemeToggle />
            ) : (
              <div className="flex items-center w-full px-3 py-2 text-gray-600 dark:text-gray-400">
                <ThemeToggle />
                <span className="ml-3">Theme</span>
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            className={cn(
              "w-full flex items-center text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20",
              isCollapsed && "justify-center",
            )}
            onClick={() => setIsLogoutDialogOpen(true)}
          >
            <LogOut className={cn("h-5 w-5", isCollapsed ? "mx-0" : "mr-3")} />
            {!isCollapsed && <span>Logout</span>}
          </Button>
        </div>
      </div>

      <AlertDialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to logout?</AlertDialogTitle>
            <AlertDialogDescription>You will be redirected to the login page.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>Logout</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
