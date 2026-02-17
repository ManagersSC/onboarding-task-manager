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
      className="md:hidden fixed bottom-0 left-0 right-0 h-14 backdrop-blur-lg bg-background/80 border-t border-border/30 z-50 px-1"
    >
      <div className="grid grid-cols-5 h-full">
        {navItems.map((item) => {
          const isActive = pathname === item.href

          return (
            <Link key={item.href} href={item.href} className="flex items-center justify-center">
              <motion.div
                whileTap={{ scale: 0.95 }}
                className={`flex flex-col items-center justify-center rounded-xl px-3 py-1.5 transition-colors duration-base ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground"
                }`}
              >
                <item.icon className="h-[18px] w-[18px]" />
                <span className="text-[10px] font-medium mt-0.5 leading-tight">{item.title}</span>
              </motion.div>
            </Link>
          )
        })}
      </div>
    </motion.div>
  )
}
