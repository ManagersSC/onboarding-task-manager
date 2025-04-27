"use client"

import { TableCell, TableRow } from "@components/ui/table"
import { Skeleton } from "@components/ui/skeleton"

export function SkeletonRow() {
  return (
    <TableRow>
      <TableCell>
        <Skeleton className="h-5 w-[180px]" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-[150px]" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-[60px]" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-[60px]" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-[100px]" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-[100px]" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-[30px]" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-8 w-[60px]" />
      </TableCell>
    </TableRow>
  )
}
