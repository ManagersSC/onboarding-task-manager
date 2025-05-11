"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  BarChart3,
  Users,
  ClipboardList,
  FileText,
  LogOut,
  ChevronLeft,
  ChevronRight,
  User,
  ChevronDown,
  FolderOpen,
  ListTodo,
} from "lucide-react"
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@components/ui/collapsible"

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false)
  const [isTasksOpen, setIsTasksOpen] = useState(false)

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
  ]
  const afterTaskItems = [
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
          "flex flex-col bg-background border-r transition-all duration-300 ease-in-out dark:bg-gray-900 dark:border-gray-800 h-screen",
          isCollapsed ? "w-16" : "w-64",
        )}
      >
        <div className="flex items-center h-14 px-4 border-b dark:border-gray-800 bg-primary/5">
          {!isCollapsed && (
            <Link href="/admin/dashboard" className="font-semibold text-lg">
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

        <div className="flex-1 py-2 overflow-y-auto">
          <nav className="space-y-1 px-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center px-3 py-2 rounded-md transition-colors",
                  pathname === item.href
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  isCollapsed && "justify-center",
                )}
              >
                <item.icon className={cn("h-5 w-5", isCollapsed ? "mx-0" : "mr-3")} />
                {!isCollapsed && <span>{item.title}</span>}
              </Link>
            ))}

            {/* Tasks & Resources Dropdown */}
            {isCollapsed ? (
              <Link
                href="/admin/resources"
                className={cn(
                  "flex items-center justify-center px-3 py-2 rounded-md transition-colors",
                  pathname.startsWith("/admin/resources") || pathname.includes("/assigned-tasks")
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <ClipboardList className="h-5 w-5" />
              </Link>
            ) : (
              <Collapsible open={isTasksOpen} onOpenChange={setIsTasksOpen} className="w-full">
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "flex items-center justify-between w-full px-3 py-2 rounded-md transition-colors",
                      pathname.startsWith("/admin/resources") || pathname.includes("/assigned-tasks")
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <div className="flex items-center">
                      <ClipboardList className="h-5 w-5 mr-3" />
                      <span>Tasks & Resources</span>
                    </div>
                    <ChevronDown
                      className={cn("h-4 w-4 transition-transform duration-200", isTasksOpen ? "rotate-180" : "")}
                    />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-10 pr-2 py-1 space-y-1">
                  <Link
                    href="/admin/resources"
                    className={cn(
                      "flex items-center px-3 py-2 rounded-md text-sm transition-colors",
                      pathname === "/admin/resources"
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <FolderOpen className="h-4 w-4 mr-2" />
                    <span>Resources</span>
                  </Link>
                  <Link
                    href="/admin/assigned-tasks"
                    className={cn(
                      "flex items-center px-3 py-2 rounded-md text-sm transition-colors",
                      pathname === "/admin/assigned-tasks"
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <ListTodo className="h-4 w-4 mr-2" />
                    <span>Assigned Tasks</span>
                  </Link>
                </CollapsibleContent>
              </Collapsible>
            )}

            {afterTaskItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center px-3 py-2 rounded-md transition-colors",
                  pathname === item.href
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  isCollapsed && "justify-center",
                )}
              >
                <item.icon className={cn("h-5 w-5", isCollapsed ? "mx-0" : "mr-3")} />
                {!isCollapsed && <span>{item.title}</span>}
              </Link>
            ))}
          </nav>
        </div>

        <div className="p-3 border-t dark:border-gray-800 space-y-2">
          {/* Theme Toggle */}
          <div className={cn("flex", isCollapsed ? "justify-center" : "justify-start")}>
            {isCollapsed ? (
              <ThemeToggle />
            ) : (
              <div className="flex items-center w-full px-3 py-2 text-muted-foreground">
                <ThemeToggle />
                <span className="ml-3">Theme</span>
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            className={cn(
              "w-full flex items-center text-red-600 hover:text-red-700 hover:bg-red-50/50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20",
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
