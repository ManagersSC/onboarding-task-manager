"use client"

import { Card, CardContent, CardHeader } from "@components/ui/card"

// Helper function to create arrays for skeleton items
const createArray = (length) => Array.from({ length }, (_, i) => i)

// Skeleton item component
export function SkeletonItem({ className = "" }) {
  return <div className={`bg-gray-800 animate-pulse rounded ${className}`}></div>
}

// Base skeleton component
export function SkeletonBase({ children }) {
  return <div className="space-y-4">{children}</div>
}

export function CalendarPreviewSkeleton() {
  return (
    <Card className="border-none shadow-lg bg-black text-white overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <SkeletonItem className="h-6 w-24" />
            <SkeletonItem className="h-7 w-16 rounded-md" />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex">
              <SkeletonItem className="h-8 w-8 rounded-l-md" />
              <SkeletonItem className="h-8 w-8 rounded-r-md" />
            </div>
            <SkeletonItem className="h-8 w-32 rounded-md" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="p-4">
          <div className="text-center mb-4">
            <SkeletonItem className="h-5 w-32 mx-auto" />
          </div>

          <div className="grid grid-cols-7 text-center mb-2">
            {createArray(7).map((index) => (
              <div key={index} className="text-xs font-medium py-1">
                <SkeletonItem className="h-3 w-6 mx-auto" />
              </div>
            ))}
          </div>

          <div className="space-y-1">
            {createArray(5).map((weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 gap-1">
                {createArray(7).map((dayIndex) => (
                  <div key={dayIndex} className="relative rounded-md p-1">
                    <div className="flex flex-col h-full min-h-[60px] md:min-h-[80px] p-1">
                      <div className="flex justify-end">
                        <SkeletonItem className="h-4 w-4 rounded-full" />
                      </div>

                      <div className="mt-2 space-y-1">
                        {Math.random() > 0.5 && <SkeletonItem className="h-3 w-full rounded" />}
                        {Math.random() > 0.7 && <SkeletonItem className="h-3 w-full rounded" />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
