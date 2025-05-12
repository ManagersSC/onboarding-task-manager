"use client"

import { motion } from "framer-motion"
import { ArrowUpRight, ArrowDownRight, Users, CheckCircle, Clock, AlertTriangle } from 'lucide-react'

import { Card, CardContent } from "@components/ui/card"

const metrics = [
  {
    title: "Active Onboardings",
    value: 12,
    change: 2,
    icon: Users,
    color: "bg-blue-500/10 text-blue-500",
  },
  {
    title: "Tasks Due This Week",
    value: 28,
    change: -5,
    icon: Clock,
    color: "bg-amber-500/10 text-amber-500",
  },
  {
    title: "Completion Rate",
    value: "87%",
    change: 4,
    icon: CheckCircle,
    color: "bg-green-500/10 text-green-500",
  },
  {
    title: "Blocked Items",
    value: 3,
    change: -2,
    icon: AlertTriangle,
    color: "bg-red-500/10 text-red-500",
  },
]

export function QuickMetrics() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="grid grid-cols-2 md:grid-cols-4 gap-4"
    >
      {metrics.map((metric, index) => (
        <motion.div
          key={metric.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-full ${metric.color}`}>
                  <metric.icon className="h-5 w-5" />
                </div>
                <div className="flex items-center text-xs font-medium">
                  {metric.change > 0 ? (
                    <>
                      <ArrowUpRight className="mr-1 h-3 w-3 text-green-500" />
                      <span className="text-green-500">{metric.change}%</span>
                    </>
                  ) : (
                    <>
                      <ArrowDownRight className="mr-1 h-3 w-3 text-red-500" />
                      <span className="text-red-500">{Math.abs(metric.change)}%</span>
                    </>
                  )}
                </div>
              </div>
              <div className="mt-3">
                <p className="text-sm font-medium text-muted-foreground">{metric.title}</p>
                <h3 className="text-2xl font-bold">{metric.value}</h3>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  )
}