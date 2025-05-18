"use client"

import { SkeletonBase, SkeletonItem, createArray } from "./skeleton-base"
import { Card, CardContent, CardHeader } from "@components/ui/card"

export function CalendarPreviewSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <SkeletonItem className="h-6 w-24" />
          <div className="flex gap-1">
            <SkeletonItem className="h-8 w-8 rounded-md" />
            <SkeletonItem className="h-8 w-8 rounded-md" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <SkeletonBase>
          <div className="text-center mb-2">
            <SkeletonItem className="h-5 w-32 mx-auto" />
          </div>

          <div className="grid grid-cols-7 text-center mb-1">
            {createArray(7).map((index) => (
              <div key={index} className="text-xs font-medium">
                <SkeletonItem className="h-3 w-3 mx-auto" />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {createArray(35).map((index) => (
              <div key={index} className="aspect-square flex flex-col items-center justify-center">
                <SkeletonItem className="h-4 w-4 rounded-full mb-1" />
                <div className="flex gap-0.5">
                  <SkeletonItem className="h-1.5 w-1.5 rounded-full" />
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-3">
            {createArray(4).map((index) => (
              <div key={index} className="flex items-center">
                <SkeletonItem className="h-2 w-2 rounded-full mr-1" />
                <SkeletonItem className="h-3 w-16" />
              </div>
            ))}
          </div>
        </SkeletonBase>
      </CardContent>
    </Card>
  )
}
