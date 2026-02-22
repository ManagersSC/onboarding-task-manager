import useSWR from 'swr'

const fetcher = async (url) => {
  const res = await fetch(url)
  if (!res.ok) {
    const err = new Error('Failed to fetch applicant tasks')
    err.info = await res.json().catch(() => ({}))
    err.status = res.status
    throw err
  }
  return res.json()
}

export function useApplicantTasks(applicantId, options = {}) {
  const {
    enabled = true,
    refreshInterval = 0,
    revalidateOnFocus = false,
    revalidateOnReconnect = true,
    dedupingInterval = 10000,
    onSuccess,
    onError
  } = options

  const key = enabled && applicantId ? `/api/admin/users/${applicantId}/tasks` : null

  const swrConfig = {
    refreshInterval,
    revalidateOnFocus,
    revalidateOnReconnect,
    dedupingInterval,
  }
  if (typeof onSuccess === 'function') swrConfig.onSuccess = onSuccess
  if (typeof onError === 'function') swrConfig.onError = onError

  const { data, error, isLoading, isValidating, mutate } = useSWR(key, fetcher, swrConfig)

  return {
    active: data?.active || [],
    overdue: data?.overdue || [],
    completed: data?.completed || [],
    pendingVerification: data?.pendingVerification || [],
    isLoading,
    isValidating,
    error: error?.info || error,
    mutate,
    refresh: mutate,
  }
}
