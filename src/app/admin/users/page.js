"use client"

import { useState } from "react"
import { useApplicants } from "@/hooks/useApplicants"
import ApplicantsPage from "@components/admin/users/users-page"

export default function Page() {
  const [params, setParams] = useState({
    page: 1,
    limit: 20,
    search: '',
    stage: 'all',
    sortBy: 'Created Time',
    sortOrder: 'desc'
  })

  const { applicants, pagination, isLoading, error, mutate, isSearching } = useApplicants(params)

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-destructive mb-2">Error loading applicants</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <ApplicantsPage 
      initialApplicants={applicants}
      pagination={pagination}
      isLoading={isLoading}
      isSearching={isSearching}
      onParamsChange={setParams}
      onRefresh={mutate}
    />
  )
}
