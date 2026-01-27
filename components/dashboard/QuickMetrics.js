"use client"

import { motion } from "framer-motion"
import { ArrowUpRight, ArrowDownRight, Users, CheckCircle, Clock, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react'

import { Card, CardContent } from "@components/ui/card"
import { useQuickMetrics } from "@/hooks/dashboard/useQuickMetrics"
import { AnimatedCounterSimple } from "@components/ui/animated-counter"
import { cn } from "@components/lib/utils"
import { Skeleton } from "@components/ui/skeleton"

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

// Loading skeleton for metrics
function MetricSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="mt-4 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
        </div>
      </CardContent>
    </Card>
  )
}

export function QuickMetrics({ initialData }) {
  const { metrics, isLoading, isError } = useQuickMetrics(initialData);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <MetricSkeleton key={i} />
        ))}
      </div>
    );
  }
  if (isError || !metrics) {
    return (
      <Card className="border-error/30 bg-error-muted">
        <CardContent className="p-4 text-center text-error">
          Error loading metrics. Please try refreshing.
        </CardContent>
      </Card>
    );
  }

  const cards = [
    {
      title: "Active Onboardings",
      value: formatValue(metrics.activeOnboardings),
      numericValue: typeof metrics.activeOnboardings === 'number' ? metrics.activeOnboardings : null,
      change: metrics.activeOnboardingsMonthlyChange,
      icon: Users,
      iconBg: "bg-info/10",
      iconColor: "text-info",
      gradient: "from-info/5 via-transparent to-transparent",
    },
    {
      title: "Tasks Due This Week",
      value: formatValue(metrics.tasksDueThisWeek, false, false, true),
      numericValue: typeof metrics.tasksDueThisWeek === 'number' ? metrics.tasksDueThisWeek : null,
      change: metrics.tasksDueThisWeekMonthlyChange,
      icon: Clock,
      iconBg: "bg-warning/10",
      iconColor: "text-warning",
      gradient: "from-warning/5 via-transparent to-transparent",
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
          <Card variant="interactive" className="overflow-hidden group">
            {/* Gradient background */}
            <div className={cn(
              "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-slow",
              metric.gradient
            )} />

            <CardContent className="p-5 relative">
              <div className="flex items-start justify-between">
                {/* Icon with gradient background */}
                <div className={cn(
                  "p-3 rounded-xl transition-transform duration-base group-hover:scale-105",
                  metric.iconBg
                )}>
                  <metric.icon className={cn("h-5 w-5", metric.iconColor)} />
                </div>

                {/* Change indicator */}
                <div className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-base",
                  metric.change > 0
                    ? "bg-success/10 text-success"
                    : metric.change < 0
                      ? "bg-error/10 text-error"
                      : "bg-muted text-muted-foreground"
                )}>
                  {metric.change > 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : metric.change < 0 ? (
                    <TrendingDown className="h-3 w-3" />
                  ) : null}
                  <span>{formatPercent(metric.change)}</span>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-sm text-muted-foreground font-medium">{metric.title}</p>
                <div className="mt-1">
                  {metric.numericValue !== null ? (
                    <AnimatedCounterSimple
                      value={metric.numericValue}
                      duration={1200}
                      className="text-3xl font-bold tracking-tight"
                    />
                  ) : (
                    <span className="text-3xl font-bold tracking-tight">{metric.value}</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  )
}