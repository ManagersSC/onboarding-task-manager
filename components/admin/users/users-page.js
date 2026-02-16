"use client"

import { useMemo, useState, useCallback } from "react"
import { Button } from "@components/ui/button"
import { Input } from "@components/ui/input"
import { Card } from "@components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@components/ui/select"
import { cn } from "@components/lib/utils"
import { Plus, RotateCw, Loader2, Search, Trash2, ArrowUp, ArrowDown, X, Briefcase } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { AnimatedFilterPill } from "@components/tasks/table/AnimatedFilterPills"
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
  const [jobFilter, setJobFilter] = useState("all")
  const [sortOrder, setSortOrder] = useState("desc")
  const [addOpen, setAddOpen] = useState(false)
  const [selectedApplicants, setSelectedApplicants] = useState([])
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  // Lazy-loaded job options
  const [jobOptions, setJobOptions] = useState([])
  const [jobsLoading, setJobsLoading] = useState(false)
  const [jobsFetched, setJobsFetched] = useState(false)

  // Enhanced stage options with grouped stages
  const stageOptions = useMemo(() => [
    { value: 'all', label: 'All Stages' },
    { value: 'New Application', label: 'New Application' },
    { value: 'interview', label: 'Interview Stages' },
    { value: 'review', label: 'Review Stages' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'Hired', label: 'Hired' }
  ], [])

  // Get stage label for filter pill display
  const stageLabelMap = useMemo(() => {
    const map = {}
    stageOptions.forEach(o => { map[o.value] = o.label })
    return map
  }, [stageOptions])

  const fetchJobs = async () => {
    if (jobsFetched || jobsLoading) return
    setJobsLoading(true)
    try {
      const res = await fetch("/api/admin/jobs")
      if (!res.ok) throw new Error("Failed to fetch jobs")
      const data = await res.json()
      const titles = (data.jobs || [])
        .map((j) => j.title)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b))
      setJobOptions(Array.from(new Set(titles)))
      setJobsFetched(true)
    } catch {
      // swallow
    } finally {
      setJobsLoading(false)
    }
  }

  const handleSearch = useCallback((value) => {
    setQuery(value)
    onParamsChange(prev => ({ ...prev, search: value, page: 1 }))
  }, [onParamsChange])

  const handleClearSearch = useCallback(() => {
    setQuery("")
    onParamsChange(prev => ({ ...prev, search: "", page: 1 }))
  }, [onParamsChange])

  const handleStageChange = useCallback((stage) => {
    setStagePreset(stage)
    onParamsChange(prev => ({ ...prev, stage, page: 1 }))
  }, [onParamsChange])

  const handleJobChange = useCallback((job) => {
    setJobFilter(job)
    onParamsChange(prev => ({ ...prev, job, page: 1 }))
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

  // Active filter tracking
  const hasActiveFilters = stagePreset !== "all" || jobFilter !== "all" || query
  const activeFilterCount = [
    stagePreset !== "all", jobFilter !== "all", !!query
  ].filter(Boolean).length

  const clearAllFilters = useCallback(() => {
    setQuery("")
    setStagePreset("all")
    setJobFilter("all")
    onParamsChange(prev => ({ ...prev, search: "", stage: "all", job: "all", page: 1 }))
  }, [onParamsChange])

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

      {/* Toolbar */}
      <div className="space-y-3 mb-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3">
          {/* Search */}
          <div className="relative w-full lg:w-72">
            <Search className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-200",
              isFocused ? "text-primary" : "text-muted-foreground"
            )} />
            <Input
              placeholder="Search by name, email, phone, job..."
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className="pl-9 pr-10 h-9 rounded-lg bg-background border-border/40 focus-visible:ring-2 focus-visible:ring-primary/20"
              disabled={isLoading}
              aria-label="Search applicants"
            />
            {query && !isSearching && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={handleClearSearch}
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />
            )}
          </div>

          {/* Filter dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Stage Filter */}
            <Select
              value={stagePreset}
              onValueChange={handleStageChange}
              disabled={isLoading}
            >
              <SelectTrigger className="h-9 w-[150px] rounded-lg text-body-sm border-border/40">
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

            {/* Job Filter — lazy loaded */}
            <Select
              value={jobFilter}
              onValueChange={handleJobChange}
              onOpenChange={(open) => { if (open) fetchJobs() }}
              disabled={isLoading}
            >
              <SelectTrigger className="h-9 w-[150px] rounded-lg text-body-sm border-border/40">
                <div className="flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                  <SelectValue placeholder="All Jobs" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Jobs</SelectItem>
                {jobsLoading ? (
                  <div className="px-2 py-1.5 text-body-sm text-muted-foreground">Loading...</div>
                ) : jobOptions.length === 0 && jobsFetched ? (
                  <div className="px-2 py-1.5 text-body-sm text-muted-foreground">No jobs</div>
                ) : (
                  jobOptions.map((title) => (
                    <SelectItem key={title} value={title}>{title}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            {/* Sort Order Toggle */}
            <Button
              variant="outline"
              size="icon"
              onClick={handleSortOrderToggle}
              disabled={isLoading}
              className="h-9 w-9 rounded-lg border-border/40"
              title={sortOrder === "desc" ? "Newest first" : "Oldest first"}
            >
              {sortOrder === "desc" ? (
                <ArrowDown className="h-4 w-4" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </Button>

            {/* Active filter pills — inline */}
            <AnimatePresence>
              {hasActiveFilters && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex flex-wrap items-center gap-1.5"
                >
                  {stagePreset !== "all" && (
                    <AnimatedFilterPill
                      label="Stage"
                      value={stageLabelMap[stagePreset] || stagePreset}
                      onRemove={() => handleStageChange("all")}
                    />
                  )}
                  {jobFilter !== "all" && (
                    <AnimatedFilterPill
                      label="Job"
                      value={jobFilter}
                      onRemove={() => handleJobChange("all")}
                    />
                  )}
                  {query && (
                    <AnimatedFilterPill
                      label="Search"
                      value={query}
                      onRemove={handleClearSearch}
                    />
                  )}
                  {activeFilterCount > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAllFilters}
                      className="h-6 px-2 text-caption text-muted-foreground hover:text-foreground"
                    >
                      Clear all
                    </Button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Page Size Selector — pushed right */}
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
