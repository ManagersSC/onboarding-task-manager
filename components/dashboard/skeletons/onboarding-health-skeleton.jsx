"use client"

import { SkeletonBase, SkeletonItem, createArray } from "./skeleton-base"
import { Card, CardContent, CardHeader } from "@components/ui/card"

export function OnboardingHealthSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <SkeletonItem className="h-6 w-40" />
            <SkeletonItem className="h-6 w-6 ml-1 rounded-md" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <SkeletonBase>
          <div className="space-y-3">
            {createArray(5).map((index) => (
              <div key={index} className="flex items-center">
                <SkeletonItem className="w-24 h-4 mr-2" />
                <div className="flex-1 mx-2">
                  <SkeletonItem className="h-2 w-full rounded-full" />
                </div>
                <div className="flex items-center gap-2">
                  <SkeletonItem className="w-10 h-5" />
                </div>
              </div>
            ))}
          </div>
        </SkeletonBase>
      </CardContent>
    </Card>
  )
}
