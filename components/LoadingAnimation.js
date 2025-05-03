"use client"

import { motion } from "framer-motion"

export function LoadingAnimation() {
  return (
    <div className="flex justify-center items-center py-8">
      <motion.div
        className="flex space-x-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {[0, 1, 2].map((index) => (
          <motion.div
            key={index}
            className="h-3 w-3 rounded-full bg-primary"
            animate={{
              y: ["0%", "-50%", "0%"],
            }}
            transition={{
              duration: 0.6,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "loop",
              delay: index * 0.1,
            }}
          />
        ))}
      </motion.div>
    </div>
  )
}
