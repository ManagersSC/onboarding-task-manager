"use client"

import { SkeletonBase, SkeletonItem, createArray } from "./skeleton-base"
import { Card, CardContent } from "@components/ui/card"

export function QuickMetricsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
      {createArray(4).map((index) => (
        <Card key={index}>
          <CardContent className="p-3 md:p-4">
            <SkeletonBase>
              <div className="flex items-center justify-between">
                <SkeletonItem className="h-9 w-9 rounded-full" />
                <SkeletonItem className="h-3 w-16" />
              </div>
              <div className="mt-3">
                <SkeletonItem className="h-3 w-24 mb-2" />
                <SkeletonItem className="h-7 w-16" />
              </div>
            </SkeletonBase>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
