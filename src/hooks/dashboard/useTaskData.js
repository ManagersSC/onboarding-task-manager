import useSWR from 'swr'

const fetcher = (...args) => fetch(...args).then(res => res.json())

export function useTaskData() {
  return useSWR('/api/admin/dashboard/tasks', fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 60000 // 1 minute
  })
} 