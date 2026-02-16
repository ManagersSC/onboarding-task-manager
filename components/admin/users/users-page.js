"use client"

import { useMemo, useState, useCallback } from "react"
import { Button } from "@components/ui/button"
import { Input } from "@components/ui/input"
import { Card } from "@components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@components/ui/select"
import { Plus, RotateCw, Loader2, Search, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import UsersTable from "./users-table"
import AddApplicantDialog from "./add-applicant-dialog"
import BulkDeleteModal from "./bulk-delete-modal"

export default function ApplicantsPage({
  initialApplicants = [],
  pagination = {},
  isLoading = false,
  isSearching = false,
  onParamsChange,
  onRefresh
}) {
  const [query, setQuery] = useState("")
  const [stagePreset, setStagePreset] = useState("all")
  const [sortBy, setSortBy] = useState("Created Time")
  const [sortOrder, setSortOrder] = useState("desc")
  const [addOpen, setAddOpen] = useState(false)
  const [selectedApplicants, setSelectedApplicants] = useState([])
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)

  // Enhanced stage options with grouped stages
  const stageOptions = useMemo(() => [
    { value: 'all', label: 'All Stages', count: pagination.total || 0 },
    { value: 'New Application', label: 'New Application' },
    { value: 'interview', label: 'Interview Stages' },
    { value: 'review', label: 'Review Stages' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'Hired', label: 'Hired' }
  ], [pagination.total])

  const handleSearch = useCallback((value) => {
    setQuery(value)
    onParamsChange(prev => ({ ...prev, search: value, page: 1 }))
  }, [onParamsChange])

  const sortOptions = useMemo(() => [
    { value: 'Created Time', label: 'Date Created' },
    { value: 'Name', label: 'Name' },
    { value: 'Stage', label: 'Stage' },
  ], [])

  const handleStageChange = useCallback((stage) => {
    setStagePreset(stage)
    onParamsChange(prev => ({ ...prev, stage, page: 1 }))
  }, [onParamsChange])

  const handleSortByChange = useCallback((value) => {
    setSortBy(value)
    onParamsChange(prev => ({ ...prev, sortBy: value, page: 1 }))
  }, [onParamsChange])

  const handleSortOrderToggle = useCallback(() => {
    setSortOrder(prev => {
      const next = prev === "desc" ? "asc" : "desc"
      onParamsChange(p => ({ ...p, sortOrder: next, page: 1 }))
      return next
    })
  }, [onParamsChange])

  const handleRefresh = useCallback(() => {
    onRefresh()
  }, [onRefresh])

  const handleSelectionChange = useCallback((selected) => {
    setSelectedApplicants(selected)
  }, [])

  const handleDeleteSuccess = useCallback(() => {
    setSelectedApplicants([])
    onRefresh()
  }, [onRefresh])

  return (
    <div className="space-y-0 animate-fade-in-up">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-headline">Users</h1>
          <p className="text-body-sm text-muted-foreground mt-1">
            Manage applicants and team members
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isLoading}
            className="h-9 w-9 rounded-lg"
            title="Refresh"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCw className="h-4 w-4" />
            )}
          </Button>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Applicant
          </Button>
        </div>
      </div>

      {/* Toolbar: Search + Stage Filter + Page Size */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, phone, job..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 h-10 w-72 rounded-lg bg-background border-border/40 focus-visible:ring-2 focus-visible:ring-primary/20"
            disabled={isLoading}
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Stage Filter Dropdown */}
        <Select
          value={stagePreset}
          onValueChange={handleStageChange}
          disabled={isLoading}
        >
          <SelectTrigger className="h-10 w-44 rounded-lg border-border/40">
            <SelectValue placeholder="All Stages" />
          </SelectTrigger>
          <SelectContent>
            {stageOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort By Dropdown */}
        <Select
          value={sortBy}
          onValueChange={handleSortByChange}
          disabled={isLoading}
        >
          <SelectTrigger className="h-10 w-40 rounded-lg border-border/40">
            <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 text-muted-foreground shrink-0" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort Order Toggle */}
        <Button
          variant="outline"
          size="icon"
          onClick={handleSortOrderToggle}
          disabled={isLoading}
          className="h-10 w-10 rounded-lg border-border/40"
          title={sortOrder === "desc" ? "Newest first" : "Oldest first"}
        >
          {sortOrder === "desc" ? (
            <ArrowDown className="h-4 w-4" />
          ) : (
            <ArrowUp className="h-4 w-4" />
          )}
        </Button>

        {/* Page Size Selector */}
        <div className="flex items-center gap-2 text-body-sm text-muted-foreground ml-auto">
          <span>Show:</span>
          <Select
            value={pagination.pageSize?.toString() || "25"}
            onValueChange={(value) => {
              onParamsChange(prev => ({
                ...prev,
                pageSize: parseInt(value),
                page: 1
              }))
            }}
            disabled={isLoading}
          >
            <SelectTrigger className="w-20 h-9 rounded-lg border-border/40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span>per page</span>
        </div>
      </div>

      {/* Bulk Delete Bar */}
      {selectedApplicants.length > 0 && (
        <div className="bg-error/5 border border-error/20 rounded-lg px-3 py-2 mb-4 flex items-center justify-between animate-fade-in-up">
          <span className="text-body-sm font-medium">
            {selectedApplicants.length} applicant{selectedApplicants.length !== 1 ? 's' : ''} selected
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteModalOpen(true)}
            disabled={isLoading}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      )}

      {/* Table in Elevated Card */}
      <Card variant="elevated" className="overflow-hidden">
        <UsersTable
          initialRows={initialApplicants}
          pagination={pagination}
          isLoading={isLoading}
          onPageChange={(page) => onParamsChange(prev => ({ ...prev, page }))}
          onSelectionChange={handleSelectionChange}
        />
      </Card>

      {/* Add Applicant Dialog */}
      <AddApplicantDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onApplicantAdded={handleRefresh}
      />

      {/* Bulk Delete Modal */}
      <BulkDeleteModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        selectedApplicants={selectedApplicants}
        onDeleteSuccess={handleDeleteSuccess}
      />
    </div>
  )
}
