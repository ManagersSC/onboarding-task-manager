"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@components/ui/card"
import { Users, CheckCircle, Clock } from "lucide-react"
import { Skeleton } from "@components/ui/skeleton"

export function DashboardMetrics() {
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch("/api/admin/metrics")
        if (response.ok) {
          const data = await response.json()
          setMetrics(data)
        }
      } catch (error) {
        console.error("Error fetching metrics:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchMetrics()
  }, [])

  const metricCards = [
    {
      title: "Active Onboardings",
      value: metrics?.activeOnboardings || 0,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-50",
    },
    {
      title: "Average Completion Rate",
      value: metrics?.avgCompletionRate ? `${metrics.avgCompletionRate}%` : "0%",
      icon: CheckCircle,
      color: "text-green-500",
      bgColor: "bg-green-50",
    },
    {
      title: "Pending Custom Tasks",
      value: metrics?.pendingCustomTasks || 0,
      icon: Clock,
      color: "text-amber-500",
      bgColor: "bg-amber-50",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {metricCards.map((metric, index) => (
        <Card key={index} className="bg-white border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-gray-500">{metric.title}</CardTitle>
            <div className={`p-2 rounded-full ${metric.bgColor}`}>
              <metric.icon className={`h-4 w-4 ${metric.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-7 w-16" /> : <div className="text-2xl font-bold">{metric.value}</div>}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
