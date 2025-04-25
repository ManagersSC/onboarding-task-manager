import { TableCell, TableRow } from "@components/ui/table"
import { Skeleton } from "@components/ui/skeleton"

export function SkeletonRow() {
  return (
    <TableRow className="animate-pulse">
      <TableCell>
        <Skeleton className="h-5 w-[180px]" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-[150px]" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-16" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-12" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-6 w-[120px] rounded-full" />
      </TableCell>
      <TableCell className="text-center">
        <Skeleton className="h-8 w-8 rounded-full inline-block" />
      </TableCell>
    </TableRow>
  )
}
