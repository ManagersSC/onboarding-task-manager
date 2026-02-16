"use client"

import { Suspense, useState } from "react"
import { useApplicants } from "@/hooks/useApplicants"
import ApplicantsPage from "@components/admin/users/users-page"

export default function Page() {
  const [params, setParams] = useState({
    page: 1,
    pageSize: 25,
    search: '',
    stage: 'all',
    job: 'all',
    sortBy: 'Created Time',
    sortOrder: 'desc'
  })

  const { applicants, pagination, isLoading, error, mutate, isSearching } = useApplicants(params)

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 p-6 md:p-8">
        <div className="text-center">
          <p className="text-error mb-2">Error loading applicants</p>
          <p className="text-body-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 animate-fade-in-up">
      <Suspense>
        <ApplicantsPage
          initialApplicants={applicants}
          pagination={pagination}
          isLoading={isLoading}
          isSearching={isSearching}
          onParamsChange={setParams}
          onRefresh={mutate}
        />
      </Suspense>
    </div>
  )
}
