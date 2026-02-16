"use client"

import { TableCell, TableRow } from "@components/ui/table"
import { Skeleton } from "@components/ui/skeleton"

export function SkeletonRow() {
  return (
    <TableRow className="border-b border-border/20">
      {/* Checkbox */}
      <TableCell className="h-14" style={{ width: "40px" }}>
        <Skeleton className="h-4 w-4 rounded" />
      </TableCell>
      {/* Title */}
      <TableCell className="h-14">
        <Skeleton className="h-4 w-[180px] rounded" />
      </TableCell>
      {/* Week */}
      <TableCell className="h-14 hidden md:table-cell">
        <Skeleton className="h-4 w-8 rounded" />
      </TableCell>
      {/* Day */}
      <TableCell className="h-14 hidden md:table-cell">
        <Skeleton className="h-4 w-8 rounded" />
      </TableCell>
      {/* Folder */}
      <TableCell className="h-14">
        <Skeleton className="h-5 w-[90px] rounded-full" />
      </TableCell>
      {/* Actions */}
      <TableCell className="h-14">
        <div className="flex gap-1">
          <Skeleton className="h-6 w-6 rounded" />
          <Skeleton className="h-6 w-6 rounded" />
        </div>
      </TableCell>
    </TableRow>
  )
}
