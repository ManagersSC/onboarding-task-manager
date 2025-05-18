import useSWR from 'swr'

const fetcher = (...args) => fetch(...args).then(res => res.json())

export function useNewHireData() {
  return useSWR('/api/admin/dashboard/new-hires', fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 60000 // 1 minute
  })
} 