"use client"

import { SkeletonBase, SkeletonItem, createArray } from "./skeleton-base"
import { Card, CardContent, CardHeader } from "@components/ui/card"

export function QuickActionsSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <SkeletonItem className="h-6 w-32" />
          <SkeletonItem className="h-9 w-28" />
        </div>
      </CardHeader>
      <CardContent>
        <SkeletonBase>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {createArray(4).map((index) => (
              <div key={index} className="flex flex-col items-center p-4 rounded-lg border">
                <SkeletonItem className="h-12 w-12 rounded-full mb-3" />
                <SkeletonItem className="h-4 w-24 mb-1" />
                <SkeletonItem className="h-3 w-32 text-center" />
              </div>
            ))}
          </div>
        </SkeletonBase>
      </CardContent>
    </Card>
  )
}
