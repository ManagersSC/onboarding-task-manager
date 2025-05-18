"use client"

import { SkeletonBase, SkeletonItem, createArray } from "./skeleton-base"
import { Card, CardContent, CardHeader } from "@components/ui/card"

export function NotificationCenterSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center">
            <SkeletonItem className="h-6 w-32" />
            <SkeletonItem className="h-5 w-12 ml-2 rounded-full" />
          </div>
          <SkeletonItem className="h-8 w-32" />
        </div>
      </CardHeader>
      <CardContent>
        <SkeletonBase>
          <div className="space-y-3">
            {createArray(4).map((index) => (
              <div key={index} className="flex items-start p-3 rounded-lg border">
                <SkeletonItem className="p-2 rounded-full h-8 w-8 mr-3" />
                <div className="flex-1 min-w-0">
                  <SkeletonItem className="h-4 w-full mb-1" />
                  <SkeletonItem className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        </SkeletonBase>
      </CardContent>
    </Card>
  )
}
