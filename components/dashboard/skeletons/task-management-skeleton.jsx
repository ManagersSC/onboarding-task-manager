"use client"

import { SkeletonBase, SkeletonItem, createArray } from "./skeleton-base"
import { Card, CardContent, CardHeader } from "@components/ui/card"

export function TaskManagementSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <SkeletonItem className="h-6 w-40" />
          <SkeletonItem className="h-9 w-24" />
        </div>
      </CardHeader>
      <CardContent>
        <SkeletonBase>
          <div className="flex mb-4">
            {createArray(3).map((index) => (
              <SkeletonItem key={index} className="h-10 w-1/3 rounded-md mx-1" />
            ))}
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center">
              <SkeletonItem className="h-4 w-32 mr-2" />
              <SkeletonItem className="h-5 w-6 rounded-md" />
            </div>
          </div>

          {createArray(3).map((index) => (
            <div key={index} className="bg-card rounded-md p-3 mb-2 border">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center flex-wrap mb-2">
                    <SkeletonItem className="h-5 w-16 mr-2 rounded-full" />
                    <SkeletonItem className="h-5 w-16 mr-2 rounded-full" />
                    <SkeletonItem className="h-5 w-40" />
                  </div>
                  <SkeletonItem className="h-4 w-48 mb-2" />
                  <SkeletonItem className="h-3 w-32" />
                </div>
                <div className="flex items-center">
                  <SkeletonItem className="h-8 w-8 rounded-md mr-1" />
                  <SkeletonItem className="h-8 w-8 rounded-md" />
                </div>
              </div>
            </div>
          ))}
        </SkeletonBase>
      </CardContent>
    </Card>
  )
}
