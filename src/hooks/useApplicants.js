import useSWR from 'swr'
import { useMemo } from 'react'
import { useDebounce } from '@/hooks/use-debounce'

const fetcher = async (url) => {
  const response = await fetch(url)
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.userError || error.error || 'Failed to fetch data')
  }
  return response.json()
}

export function useApplicants(params = {}) {
  const {
    page = 1,
    limit = 20,
    search = '',
    stage = 'all',
    sortBy = 'Created Time',
    sortOrder = 'desc'
  } = params

  // Increase debounce time to 500ms for better performance
  const debouncedSearch = useDebounce(search, 500)

  // Memoize query params to prevent unnecessary re-renders
  const queryParams = useMemo(() => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      stage,
      sortBy,
      sortOrder
    })
    
    // Only add search if it has content
    if (debouncedSearch.trim()) {
      params.set('search', debouncedSearch.trim())
    }
    
    return params.toString()
  }, [page, limit, debouncedSearch, stage, sortBy, sortOrder])

  const { data, error, mutate, isLoading } = useSWR(
    [`/api/admin/users`, queryParams],
    ([url, query]) => fetcher(`${url}?${query}`),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 30000,
      errorRetryCount: 3,
      errorRetryInterval: 5000,
      keepPreviousData: true,
      onError: (error) => {
        console.error('Error fetching applicants:', error)
      }
    }
  )

  return {
    applicants: data?.applicants || [],
    pagination: data?.pagination || {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false
    },
    isLoading,
    error,
    mutate,
    // Add search state for UI feedback
    isSearching: search !== debouncedSearch
  }
}
