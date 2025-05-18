"use client"

import { SkeletonBase, SkeletonItem } from "./skeleton-base"

export function DashboardHeaderSkeleton() {
  return (
    <SkeletonBase className="flex items-center justify-end gap-4">
      <SkeletonItem className="relative h-10 w-10 rounded-md" />
    </SkeletonBase>
  )
}
