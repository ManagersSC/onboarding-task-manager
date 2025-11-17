import useSWR from 'swr'

const fetcher = async (url) => {
  const res = await fetch(url)
  if (!res.ok) {
    const err = new Error('Failed to fetch quiz submissions')
    err.info = await res.json().catch(() => ({}))
    err.status = res.status
    throw err
  }
  return res.json()
}

export function useQuizSubmissions(applicantId, options = {}) {
  const {
    enabled = true,
    refreshInterval = 0,
    revalidateOnFocus = true,
    revalidateOnReconnect = true,
    dedupingInterval = 5000,
    onSuccess,
    onError
  } = options

  const key = enabled && applicantId ? `/api/admin/users/${applicantId}/quiz-submissions` : null

  const swrConfig = {
    refreshInterval,
    revalidateOnFocus,
    revalidateOnReconnect,
    dedupingInterval
  }
  if (typeof onSuccess === 'function') swrConfig.onSuccess = onSuccess
  if (typeof onError === 'function') swrConfig.onError = onError

  const { data, error, isLoading, isValidating, mutate } = useSWR(key, fetcher, swrConfig)

  return {
    submissions: data?.submissions || [],
    questionsById: data?.questionsById || {},
    isLoading,
    isValidating,
    error: error?.info || error,
    mutate,
    refresh: mutate
  }
}


