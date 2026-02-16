"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@components/ui/table"
import { Badge } from "@components/ui/badge"
import { Button } from "@components/ui/button"
import { Checkbox } from "@components/ui/checkbox"
import { Avatar, AvatarFallback } from "@components/ui/avatar"
import { Skeleton } from "@components/ui/skeleton"
import { cn } from "@components/lib/utils"
import { Eye, ChevronLeft, ChevronRight, Users } from "lucide-react"
import ApplicantDrawer from "./applicant-drawer"

// Map stage names to semantic badge variants
const stageBadgeVariant = (stage) => {
  const s = String(stage || "").toLowerCase()
  if (s === "new application") return "info-subtle"
  if (s.includes("interview")) return "warning-subtle"
  if (s.includes("review")) return "secondary"
  if (s.startsWith("rejected")) return "error-subtle"
  if (s === "hired") return "success-subtle"
  return "secondary"
}

// Helper function for date formatting
const formatDate = (dateString) => {
  if (!dateString) return "—"
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return "Invalid date"
  }
}

// Relative time formatting
const relativeTime = (dateString) => {
  if (!dateString) return "—"
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
    return formatDate(dateString)
  } catch {
    return "—"
  }
}

function SkeletonRow() {
  return (
    <TableRow className="h-14">
      <TableCell className="w-[48px]">
        <Skeleton className="h-4 w-4 rounded" />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-44" />
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-24 rounded-md" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-3.5 w-28" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-3.5 w-20" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-3.5 w-20" />
      </TableCell>
      <TableCell className="text-right">
        <Skeleton className="h-8 w-8 rounded-lg ml-auto" />
      </TableCell>
    </TableRow>
  )
}

export default function UsersTable({
  initialRows = [],
  pagination = {},
  isLoading = false,
  onPageChange,
  onSelectionChange
}) {
  const searchParams = useSearchParams()
  const [rows, setRows] = useState(initialRows)
  const [openId, setOpenId] = useState(null)

  // Auto-open drawer if applicantId is in URL params
  useEffect(() => {
    const applicantId = searchParams.get('applicantId')
    if (applicantId) {
      setOpenId(applicantId)
    }
  }, [searchParams])

  useEffect(() => {
    setRows(initialRows)
  }, [initialRows])

  const [selected, setSelected] = useState({})
  const allChecked = useMemo(() => rows.length > 0 && rows.every((r) => selected[r.id]), [rows, selected])

  const toggleAll = (checked) => {
    const next = {}
    if (checked) rows.forEach((r) => (next[r.id] = true))
    setSelected(next)
  }

  const toggleOne = (id, checked) => {
    setSelected((prev) => ({ ...prev, [id]: checked }))
  }

  // Use useEffect to call onSelectionChange after state updates
  useEffect(() => {
    onSelectionChange?.(getSelectedApplicants())
  }, [selected, rows, onSelectionChange])

  const getSelectedApplicants = (selectionState = selected) => {
    return rows.filter(row => selectionState[row.id])
  }

  const handlePageChange = (newPage) => {
    onPageChange?.(newPage)
  }

  if (isLoading && rows.length === 0) {
    return (
      <div className="w-full">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/20 hover:bg-muted/20 h-11">
              <TableHead className="w-[48px]">
                <Checkbox aria-label="Select all" disabled />
              </TableHead>
              <TableHead className="text-overline text-muted-foreground/70 uppercase tracking-wider font-medium">Applicant</TableHead>
              <TableHead className="text-overline text-muted-foreground/70 uppercase tracking-wider font-medium">Stage</TableHead>
              <TableHead className="text-overline text-muted-foreground/70 uppercase tracking-wider font-medium">Job</TableHead>
              <TableHead className="text-overline text-muted-foreground/70 uppercase tracking-wider font-medium">Location</TableHead>
              <TableHead className="text-overline text-muted-foreground/70 uppercase tracking-wider font-medium">Created</TableHead>
              <TableHead className="text-overline text-muted-foreground/70 uppercase tracking-wider font-medium text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <div className="w-full">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/20 hover:bg-muted/20 h-11 border-b border-border/30">
            <TableHead className="w-[48px]">
              <Checkbox
                aria-label="Select all"
                checked={allChecked}
                onCheckedChange={(v) => toggleAll(!!v)}
                disabled={isLoading}
              />
            </TableHead>
            <TableHead className="text-overline text-muted-foreground/70 uppercase tracking-wider font-medium">Applicant</TableHead>
            <TableHead className="text-overline text-muted-foreground/70 uppercase tracking-wider font-medium">Stage</TableHead>
            <TableHead className="text-overline text-muted-foreground/70 uppercase tracking-wider font-medium">Job</TableHead>
            <TableHead className="text-overline text-muted-foreground/70 uppercase tracking-wider font-medium">Location</TableHead>
            <TableHead className="text-overline text-muted-foreground/70 uppercase tracking-wider font-medium">Created</TableHead>
            <TableHead className="text-overline text-muted-foreground/70 uppercase tracking-wider font-medium text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const [first, last] = (row.name || "").split(" ")
            const initials = `${(first || "").slice(0, 1)}${(last || "").slice(0, 1)}`.trim().toUpperCase() || "A"
            return (
              <TableRow
                key={row.id}
                data-rowid={row.id}
                className="h-14 hover:bg-muted/20 transition-colors cursor-pointer border-b border-border/20 last:border-0 group"
              >
                <TableCell className="align-middle">
                  <Checkbox
                    aria-label={`Select ${row.name}`}
                    checked={!!selected[row.id]}
                    onCheckedChange={(v) => toggleOne(row.id, !!v)}
                    disabled={isLoading}
                  />
                </TableCell>
                <TableCell className="min-w-[220px]">
                  <div
                    className="flex items-center gap-3"
                    onClick={() => setOpenId(row.id)}
                    title="Open details"
                  >
                    <Avatar className="h-8 w-8 bg-primary/5">
                      <AvatarFallback className="bg-primary/5 text-primary font-medium text-caption">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="leading-tight min-w-0">
                      <div className="text-body-sm font-medium group-hover:underline truncate">{row.name}</div>
                      <div className="text-caption text-muted-foreground truncate">{row.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={stageBadgeVariant(row.stage)}
                    className="cursor-pointer"
                    onClick={() => setOpenId(row.id)}
                    title="View details"
                  >
                    {row.stage}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-body-sm truncate max-w-[180px]">{row.job || "—"}</div>
                </TableCell>
                <TableCell>
                  {row.location ? (
                    <span className="text-body-sm text-muted-foreground">{row.location}</span>
                  ) : (
                    <span className="text-caption text-muted-foreground/60">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <span
                    className="text-body-sm text-muted-foreground"
                    title={row.createdAt ? formatDate(row.createdAt) : undefined}
                  >
                    {relativeTime(row.createdAt)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setOpenId(row.id)}
                    aria-label="Open details"
                    className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    disabled={isLoading}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
          {rows.length === 0 && !isLoading && (
            <TableRow>
              <TableCell colSpan={7} className="h-48">
                <div className="flex flex-col items-center justify-center text-center">
                  <Users className="h-12 w-12 text-muted-foreground/40 mb-3" />
                  <p className="text-body-sm text-muted-foreground">No applicants found</p>
                  <p className="text-caption text-muted-foreground/60 mt-1">Try adjusting your filters</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Pagination */}
      {pagination && pagination.total > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border/20">
          <div className="text-caption text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.pageSize) + 1} to{" "}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{" "}
            {pagination.total} applicants
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={!pagination.hasPrev || isLoading}
              className="h-8 rounded-lg"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <span className="text-caption text-muted-foreground px-2">
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={!pagination.hasNext || isLoading}
              className="h-8 rounded-lg"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      <ApplicantDrawer
        open={!!openId}
        onOpenChange={(v) => !v && setOpenId(null)}
        applicantId={openId}
        onApplicantUpdated={(updated) => {
          if (!updated) return
          // Update the local state with the updated applicant
          setRows(prev => prev.map(r => r.id === updated.id ? updated : r))
        }}
      />
    </div>
  )
}
