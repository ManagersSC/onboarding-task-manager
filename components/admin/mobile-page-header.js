"use client"

import { usePathname } from "next/navigation"
import { motion } from "framer-motion"

const pageNames = {
  "/admin/dashboard": "Dashboard",
  "/admin/assigned-tasks": "Assigned Tasks",
  "/admin/resources": "Resources",
  "/admin/users": "Users",
  "/admin/profile": "Profile",
}

export function MobilePageHeader() {
  const pathname = usePathname()
  const pageName = pageNames[pathname] || "Page"

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="md:hidden px-4 py-3"
    >
      <h1 className="text-xl font-semibold">{pageName}</h1>
    </motion.div>
  )
}
