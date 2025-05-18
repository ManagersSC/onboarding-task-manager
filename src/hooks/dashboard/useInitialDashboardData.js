import useSWR from 'swr'

const fetcher = (...args) => fetch(...args).then(res => res.json())

export function useInitialDashboardData() {
  return useSWR('/api/admin/dashboard/initial', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000 // 30 seconds
  })
} 