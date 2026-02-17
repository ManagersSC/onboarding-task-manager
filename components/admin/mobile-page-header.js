"use client"

import { usePathname, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ChevronLeft } from "lucide-react"

const pageNames = {
  "/admin/dashboard": "Dashboard",
  "/admin/assigned-tasks": "Assigned Tasks",
  "/admin/resources": "Resources",
  "/admin/users": "Users",
  "/admin/quizzes": "Quizzes",
  "/admin/audit-logs": "Audit Logs",
  "/admin/profile": "Profile",
}

const subPages = new Set(["/admin/profile", "/admin/audit-logs"])

export function MobilePageHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const pageName = pageNames[pathname] || "Page"
  const isSubPage = subPages.has(pathname)

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="md:hidden sticky top-0 z-20 bg-background/80 backdrop-blur-lg border-b border-border/30 px-4 py-3"
    >
      <div className="flex items-center gap-2">
        {isSubPage && (
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-7 h-7 -ml-1 rounded-lg hover:bg-muted/40 transition-colors"
            aria-label="Go back"
          >
            <ChevronLeft className="h-4.5 w-4.5 text-muted-foreground" />
          </button>
        )}
        <h1 className="text-title-sm font-semibold">{pageName}</h1>
      </div>
    </motion.div>
  )
}
