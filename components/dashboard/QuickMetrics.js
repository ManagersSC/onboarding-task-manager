"use client"

import { motion } from "framer-motion"
import { ArrowUpRight, ArrowDownRight, Users, CheckCircle, Clock, AlertTriangle } from 'lucide-react'

import { Card, CardContent } from "@components/ui/card"
import { useQuickMetrics } from "@/hooks/dashboard/useQuickMetrics"

function formatPercent(val) {
  if (val === null || val === undefined) return "N/A";
  return `${Math.abs(val).toFixed(0)}%`;
}

function formatValue(val, isPercent = false, isCompletionRate = false, isTasksDue = false) {
  if (val === null || val === undefined) return "N/A";
  // Only use placeholder for tasks due this week
  if (isTasksDue && val === 11.11) return "11.11";
  if (isPercent) return `${(val * 100).toFixed(0)}%`;
  return val;
}

export function QuickMetrics() {
  const { metrics, isLoading, isError } = useQuickMetrics();

  if (isLoading) {
    return <div className="h-24">Loading...</div>;
  }
  if (isError || !metrics) {
    return <div className="h-24 text-red-500">Error loading metrics</div>;
  }

  const cards = [
    {
      title: "Active Onboardings",
      value: formatValue(metrics.activeOnboardings),
      change: metrics.activeOnboardingsMonthlyChange,
      icon: Users,
      color: "bg-blue-500/10 text-blue-500",
    },
    {
      title: "Tasks Due This Week",
      value: formatValue(metrics.tasksDueThisWeek, false, false, true),
      change: metrics.tasksDueThisWeekMonthlyChange,
      icon: Clock,
      color: "bg-amber-500/10 text-amber-500",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="grid grid-cols-2 md:grid-cols-4 gap-4"
    >
      {cards.map((metric, index) => (
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
                      <span className="text-green-500">{formatPercent(metric.change)}</span>
                    </>
                  ) : metric.change < 0 ? (
                    <>
                      <ArrowDownRight className="mr-1 h-3 w-3 text-red-500" />
                      <span className="text-red-500">{formatPercent(metric.change)}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">{formatPercent(metric.change)}</span>
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