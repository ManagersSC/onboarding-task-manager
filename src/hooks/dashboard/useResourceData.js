import useSWR from 'swr'

const fetcher = (...args) => fetch(...args).then(res => res.json())

export function useResourceData() {
  return useSWR('/api/admin/dashboard/resources', fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 60000 // 1 minute
  })
} 