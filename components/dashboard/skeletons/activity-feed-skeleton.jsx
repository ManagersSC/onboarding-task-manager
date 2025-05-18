"use client"

import { SkeletonBase, SkeletonItem, createArray } from "./skeleton-base"
import { Card, CardContent, CardHeader } from "@components/ui/card"

export function ActivityFeedSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <SkeletonItem className="h-6 w-32" />
          <SkeletonItem className="h-8 w-24" />
        </div>
      </CardHeader>
      <CardContent>
        <SkeletonBase>
          <div className="relative">
            <div className="absolute top-0 bottom-0 left-6 border-l border-dashed border-muted-foreground/20" />
            <div className="space-y-6">
              {createArray(5).map((index) => (
                <div key={index} className="relative flex gap-3">
                  <SkeletonItem className="z-10 h-12 w-12 rounded-full" />
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 flex-wrap">
                      <SkeletonItem className="h-6 w-6 rounded-full" />
                      <SkeletonItem className="h-4 w-32" />
                      <SkeletonItem className="h-3 w-24" />
                    </div>
                    <SkeletonItem className="h-4 w-64 mt-1" />
                    <SkeletonItem className="h-3 w-24 mt-1" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SkeletonBase>
      </CardContent>
    </Card>
  )
}
