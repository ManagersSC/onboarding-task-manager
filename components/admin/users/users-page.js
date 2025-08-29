"use client"

import { useMemo, useState, useCallback } from "react"
import { Button } from "@components/ui/button"
import { Input } from "@components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@components/ui/select"
import { Users, Filter, Plus, RotateCw, Loader2, Search } from "lucide-react"
import UsersTable from "./users-table"
import AddApplicantDialog from "./add-applicant-dialog"

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
  const [addOpen, setAddOpen] = useState(false)

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

  const handleStageChange = useCallback((stage) => {
    setStagePreset(stage)
    onParamsChange(prev => ({ ...prev, stage, page: 1 }))
  }, [onParamsChange])

  const handleRefresh = useCallback(() => {
    onRefresh()
  }, [onRefresh])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Applicants</h1>
          <p className="text-muted-foreground">
            Manage and track all job applicants
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCw className="h-4 w-4" />
            )}
            Refresh
          </Button>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Applicant
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Search & Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by name, email, phone, job, or address..."
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
              disabled={isLoading}
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Stage Filter */}
            <div className="flex flex-wrap gap-2">
              {stageOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={stagePreset === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleStageChange(option.value)}
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  {option.label}
                  {option.count !== undefined && (
                    <span className="ml-1 px-2 py-0.5 text-xs bg-background/50 rounded-full">
                      {option.count}
                    </span>
                  )}
                </Button>
              ))}
            </div>

            {/* Page Size Selector */}
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-muted-foreground">Show:</span>
              <Select
                value={pagination.pageSize?.toString() || "25"}
                onValueChange={(value) => {
                  console.log('Page size changed to:', value)
                  onParamsChange(prev => ({ 
                    ...prev, 
                    pageSize: parseInt(value), 
                    page: 1 
                  }))
                }}
                disabled={isLoading}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">per page</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Applicants
            {pagination.total > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                ({pagination.total} total)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <UsersTable
            initialRows={initialApplicants}
            pagination={pagination}
            isLoading={isLoading}
            onPageChange={(page) => onParamsChange(prev => ({ ...prev, page }))}
          />
        </CardContent>
      </Card>

      {/* Add Applicant Dialog */}
      <AddApplicantDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onApplicantAdded={handleRefresh}
      />
    </div>
  )
}
