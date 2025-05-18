import useSWR from 'swr'

const fetcher = (...args) => fetch(...args).then(res => res.json())

export function useActivityData() {
  return useSWR('/api/admin/dashboard/activities', fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 60000 // 1 minute
  })
} 