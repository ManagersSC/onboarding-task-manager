"use client"

import { useEffect, useMemo, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@components/ui/table"
import { Badge } from "@components/ui/badge"
import { Button } from "@components/ui/button"
import { Checkbox } from "@components/ui/checkbox"
import { Avatar, AvatarFallback } from "@components/ui/avatar"
import { Eye, Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import ApplicantDrawer from "./applicant-drawer"
import { stageColor } from "@/lib/stage"

// Helper function for date formatting
const formatDate = (dateString) => {
  if (!dateString) return "—"
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return "Invalid date"
  }
}

export default function UsersTable({ 
  initialRows = [], 
  pagination = {},
  isLoading = false,
  onPageChange
}) {
  const [rows, setRows] = useState(initialRows)
  const [openId, setOpenId] = useState(null)

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
  
  const toggleOne = (id, checked) => setSelected((prev) => ({ ...prev, [id]: checked }))

  const handlePageChange = (newPage) => {
    onPageChange?.(newPage)
  }

  if (isLoading && rows.length === 0) {
    return (
      <div className="w-full overflow-auto rounded-md border">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading applicants...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full overflow-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[48px]">
              <Checkbox 
                aria-label="Select all" 
                checked={allChecked} 
                onCheckedChange={(v) => toggleAll(!!v)}
                disabled={isLoading}
              />
            </TableHead>
            <TableHead>Applicant</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Job</TableHead>
            <TableHead>Interview</TableHead>
            <TableHead>Documents</TableHead>
            <TableHead>Feedback</TableHead>
            <TableHead>Source</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const docsText = row.docs.total || 0
            const [first, last] = (row.name || "").split(" ")
            const initials = `${(first || "").slice(0, 1)}${(last || "").slice(0, 1)}`.trim().toUpperCase() || "A"
            return (
              <TableRow key={row.id} data-rowid={row.id}>
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
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => setOpenId(row.id)}
                    title="Open details"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div className="leading-tight">
                      <div className="font-medium hover:underline">{row.name}</div>
                      <div className="text-xs text-muted-foreground">{row.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="min-w-[220px]">
                  <Badge
                    variant="secondary"
                    className={`${stageColor(row.stage)} cursor-pointer`}
                    onClick={() => setOpenId(row.id)}
                    title="View details"
                  >
                    {row.stage}
                  </Badge>
                </TableCell>
                <TableCell className="min-w-[180px]">
                  <div className="truncate">{row.job || "—"}</div>
                </TableCell>
                <TableCell className="min-w-[220px]">
                  <div className="flex flex-col">
                    <div className="text-sm">
                      {row.location ? (
                        <Badge variant="outline" className="cursor-default">
                          {row.location}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">No location</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {row.interviewDate ? `First: ${formatDate(row.interviewDate)}` : "First: —"}
                      {row.secondInterviewDate ? ` • Second: ${formatDate(row.secondInterviewDate)}` : " • Second: —"}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge variant={row.docs.total > 0 ? "default" : "outline"}>{docsText}</Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{row.feedbackCount || 0}</Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm">{row.source || "—"}</div>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setOpenId(row.id)}
                    aria-label="Open details"
                    className="cursor-pointer"
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
              <TableCell colSpan={9} className="h-24 text-center text-sm text-muted-foreground">
                No applicants found. Adjust filters or search.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Pagination */}
      {pagination && (
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <div className="text-sm text-muted-foreground">
            {pagination.total > 0 ? (
              <>
                Showing {((pagination.page - 1) * pagination.pageSize) + 1} to{" "}
                {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{" "}
                {pagination.total} applicants
              </>
            ) : (
              "No applicants found"
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={!pagination.hasPrev || isLoading}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={!pagination.hasNext || isLoading}
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
