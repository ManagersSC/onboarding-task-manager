"use client"

import { motion } from "framer-motion"
import { Users, Clock, TrendingUp, TrendingDown } from 'lucide-react'

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

// Loading skeleton for metrics - updated to match new card structure
function MetricSkeleton() {
  return (
    <Card variant="elevated" className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <div className="mt-4 space-y-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-3 w-24" />
        </div>
      </CardContent>
    </Card>
  )
}

export function QuickMetrics({ initialData }) {
  const { metrics, isLoading, isError } = useQuickMetrics(initialData);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {[1, 2].map((i) => (
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
      title: "ACTIVE ONBOARDINGS",
      value: formatValue(metrics.activeOnboardings),
      numericValue: typeof metrics.activeOnboardings === 'number' ? metrics.activeOnboardings : null,
      change: metrics.activeOnboardingsMonthlyChange,
      icon: Users,
      iconBg: "bg-info/8",
      iconColor: "text-info",
    },
    {
      title: "TASKS DUE THIS WEEK",
      value: formatValue(metrics.tasksDueThisWeek, false, false, true),
      numericValue: typeof metrics.tasksDueThisWeek === 'number' ? metrics.tasksDueThisWeek : null,
      change: metrics.tasksDueThisWeekMonthlyChange,
      icon: Clock,
      iconBg: "bg-warning/8",
      iconColor: "text-warning",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="grid grid-cols-2 gap-4"
    >
      {cards.map((metric, index) => (
        <motion.div
          key={metric.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
        >
          <Card variant="elevated" className="overflow-hidden hover:shadow-elevated transition-shadow duration-base">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                {/* Icon in rounded container */}
                <div className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center",
                  metric.iconBg
                )}>
                  <metric.icon className={cn("h-5 w-5", metric.iconColor)} />
                </div>

                {/* Trend indicator pill */}
                {metric.change !== null && metric.change !== undefined && (
                  <div className={cn(
                    "flex items-center gap-0.5 px-2 py-0.5 rounded-full text-caption font-medium",
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
                )}
              </div>

              <div className="mt-4">
                {/* Value */}
                <div>
                  {metric.numericValue !== null ? (
                    <AnimatedCounterSimple
                      value={metric.numericValue}
                      duration={1200}
                      className="text-headline font-bold"
                    />
                  ) : (
                    <span className="text-headline font-bold">{metric.value}</span>
                  )}
                </div>
                {/* Label */}
                <p className="text-caption text-muted-foreground uppercase tracking-wide mt-1">{metric.title}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  )
}