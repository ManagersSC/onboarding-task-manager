"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { LayoutDashboard, CheckSquare, FolderKanban, Users, User } from "lucide-react"

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
    title: "Profile",
    icon: User,
    href: "/admin/profile",
  },
]

export function BottomNavigation() {
  const pathname = usePathname()

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-background border-t z-50 px-2"
    >
      <div className="grid grid-cols-5 h-full">
        {navItems.map((item) => {
          const isActive = pathname === item.href

          return (
            <Link key={item.href} href={item.href} className="flex flex-col items-center justify-center">
              <motion.div
                whileTap={{ scale: 0.9 }}
                className={`flex flex-col items-center justify-center w-full h-full ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <div className="relative">
                  <item.icon className="h-5 w-5" />
                  {isActive && (
                    <motion.div
                      layoutId="bottomNavIndicator"
                      className="absolute -bottom-1 left-1/2 w-1 h-1 bg-primary rounded-full -translate-x-1/2"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </div>
                <span className="text-xs mt-1">{item.title}</span>
              </motion.div>
            </Link>
          )
        })}
      </div>
    </motion.div>
  )
}
