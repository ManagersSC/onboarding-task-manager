"use client"

import { SkeletonBase, SkeletonItem, createArray } from "./skeleton-base"
import { Card, CardContent, CardHeader } from "@components/ui/card"

export function NewHireTrackerSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <SkeletonItem className="h-6 w-40" />
          <div className="flex gap-1">
            <SkeletonItem className="h-8 w-8 rounded-md" />
            <SkeletonItem className="h-8 w-8 rounded-md" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <SkeletonBase>
          <div className="grid grid-cols-1 sm:flex sm:space-x-4 gap-4 sm:gap-0 sm:overflow-x-auto pb-2">
            {createArray(4).map((index) => (
              <div key={index} className="flex-shrink-0 w-full sm:w-60 bg-card rounded-lg border p-4">
                <div className="flex items-center gap-3 mb-4">
                  <SkeletonItem className="h-10 w-10 rounded-full" />
                  <div>
                    <SkeletonItem className="h-4 w-24 mb-2" />
                    <SkeletonItem className="h-3 w-20" />
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between text-xs mb-1">
                    <SkeletonItem className="h-3 w-32" />
                    <SkeletonItem className="h-3 w-8" />
                  </div>
                  <SkeletonItem className="h-2 w-full rounded-full" />
                </div>

                <div className="mt-3">
                  <SkeletonItem className="h-3 w-28" />
                </div>
              </div>
            ))}
          </div>
        </SkeletonBase>
      </CardContent>
    </Card>
  )
}
