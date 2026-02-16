"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, X } from "lucide-react"

const actions = [
  {
    icon: "UserPlus",
    label: "Add New Hire",
    description: "Create a new onboarding process",
    color: "bg-blue-500 hover:bg-blue-600",
    iconColor: "text-white",
  },
  {
    icon: "FileText",
    label: "Create Template",
    description: "Design a new task template",
    color: "bg-purple-500 hover:bg-purple-600",
    iconColor: "text-white",
  },
  {
    icon: "Calendar",
    label: "Schedule Event",
    description: "Plan an onboarding activity",
    color: "bg-amber-500 hover:bg-amber-600",
    iconColor: "text-white",
  },
  {
    icon: "Mail",
    label: "Send Update",
    description: "Notify team of progress",
    color: "bg-green-500 hover:bg-green-600",
    iconColor: "text-white",
  },
]

// Import icons dynamically
import { UserPlus, FileText, Calendar, Mail } from "lucide-react"
const iconMap = { UserPlus, FileText, Calendar, Mail }

export default function FloatingQuickActions() {
  const [isOpen, setIsOpen] = useState(false)

  const toggleActions = () => {
    setIsOpen(!isOpen)
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
    exit: {
      opacity: 0,
      transition: {
        staggerChildren: 0.05,
        staggerDirection: -1,
      },
    },
  }

  const itemVariants = {
    hidden: {
      opacity: 0,
      scale: 0,
      y: 20,
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 500,
        damping: 25,
      },
    },
    exit: {
      opacity: 0,
      scale: 0,
      y: 20,
      transition: {
        duration: 0.2,
      },
    },
  }

  const mainButtonVariants = {
    closed: {
      rotate: 0,
      scale: 1,
    },
    open: {
      rotate: 45,
      scale: 1.1,
    },
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Action Bubbles */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute bottom-20 right-0 flex flex-col-reverse gap-3"
          >
            {actions.map((action, index) => {
              const IconComponent = iconMap[action.icon]
              return (
                <motion.div
                  key={action.label}
                  variants={itemVariants}
                  whileHover={{
                    scale: 1.05,
                    x: -5,
                  }}
                  whileTap={{ scale: 0.95 }}
                  className="group"
                >
                  <div className="flex items-center gap-3">
                    {/* Action Label */}
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.1 + 0.2 }}
                      className="bg-white dark:bg-gray-800 px-3 py-2 rounded-lg shadow-lg border opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap"
                    >
                      <p className="text-sm font-medium">{action.label}</p>
                      <p className="text-xs text-muted-foreground">{action.description}</p>
                    </motion.div>

                    {/* Action Button */}
                    <motion.button
                      className={`w-12 h-12 rounded-full ${action.color} shadow-lg flex items-center justify-center transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <IconComponent className={`h-5 w-5 ${action.iconColor}`} />
                    </motion.button>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Toggle Button */}
      <motion.button
        variants={mainButtonVariants}
        animate={isOpen ? "open" : "closed"}
        onClick={toggleActions}
        className="w-14 h-14 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-lg flex items-center justify-center transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label={isOpen ? "Close quick actions" : "Open quick actions"}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ opacity: 0, rotate: -90 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: 90 }}
              transition={{ duration: 0.2 }}
            >
              <X className="h-6 w-6" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ opacity: 0, rotate: 90 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: -90 }}
              transition={{ duration: 0.2 }}
            >
              <Plus className="h-6 w-6" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10"
            onClick={toggleActions}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
