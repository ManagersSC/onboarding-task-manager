"use client"

import { SkeletonBase, SkeletonItem, createArray } from "./skeleton-base"
import { Card, CardContent, CardHeader } from "@components/ui/card"

export function ResourceHubSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <SkeletonItem className="h-6 w-32" />
          <SkeletonItem className="h-8 w-20" />
        </div>
      </CardHeader>
      <CardContent>
        <SkeletonBase>
          <div className="relative mb-4">
            <SkeletonItem className="h-10 w-full rounded-md" />
          </div>

          <div className="grid grid-cols-2 mb-4">
            <SkeletonItem className="h-8 w-full rounded-md" />
            <SkeletonItem className="h-8 w-full rounded-md" />
          </div>

          <div className="mt-4 space-y-2">
            {createArray(3).map((index) => (
              <div key={index} className="flex items-center p-2 rounded-md">
                <SkeletonItem className="p-2 rounded-md h-8 w-8 mr-3" />
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
