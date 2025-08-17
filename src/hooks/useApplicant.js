import useSWR from 'swr'

const fetcher = async (url) => {
  const response = await fetch(url)
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.userError || error.error || 'Failed to fetch data')
  }
  return response.json()
}

export function useApplicant(id) {
  const { data, error, mutate, isLoading } = useSWR(
    id ? `/api/admin/users/${id}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 30000,
      errorRetryCount: 3,
      errorRetryInterval: 5000,
      onError: (error) => {
        console.error('Error fetching applicant:', error)
      }
    }
  )

  return {
    applicant: data?.applicant,
    isLoading,
    error,
    mutate
  }
}
