"use client"

import { motion } from "framer-motion"
import { Info } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@components/ui/card"
import { Button } from "@components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@components/ui/tooltip"

// Demo data
const departments = [
  {
    name: "Dentist",
    completion: 85,
    trend: "up",
    hires: 4,
  },
  {
    name: "Receptionist",
    completion: 70,
    trend: "up",
    hires: 2,
  },
  {
    name: "Nurse",
    completion: 90,
    trend: "up",
    hires: 5,
  },
  {
    name: "Marketing",
    completion: 60,
    trend: "down",
    hires: 3,
  }
]

export function OnboardingHealth() {
  // Function to determine color based on completion percentage
  const getHealthColor = (completion) => {
    if (completion >= 80) return "bg-success"
    if (completion >= 60) return "bg-warning"
    return "bg-error"
  }

  // Function to generate sparkline points
  const generateSparkline = (completion, trend) => {
    const points = []
    const baseValue = 50
    const range = 30
    const pointCount = 5

    for (let i = 0; i < pointCount; i++) {
      // Generate random points that trend in the specified direction
      let value
      if (trend === "up") {
        value = baseValue + Math.random() * range * (i / (pointCount - 1))
      } else {
        value = baseValue + range - Math.random() * range * (i / (pointCount - 1))
      }
      points.push(value)
    }

    // Make sure the last point matches the completion percentage
    points[pointCount - 1] = completion

    return points
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
    >
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <CardTitle>Onboarding Health</CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 ml-1">
                      <Info className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Completion rate of onboarding tasks by department</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {departments.map((dept, index) => {
              const sparklinePoints = generateSparkline(dept.completion, dept.trend)
              const pointsString = sparklinePoints
                .map((point, i) => `${(i / (sparklinePoints.length - 1)) * 100},${100 - point}`)
                .join(" ")

              return (
                <motion.div
                  key={dept.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="flex items-center"
                >
                  <div className="w-24 truncate text-sm">{dept.name}</div>
                  <div className="flex-1 mx-2">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${dept.completion}%` }}
                        transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                        className={`h-full ${getHealthColor(dept.completion)}`}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg width="40" height="20" className="text-muted-foreground hidden sm:block">
                      <polyline
                        points={pointsString}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span className="text-sm font-medium">{dept.completion}%</span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
