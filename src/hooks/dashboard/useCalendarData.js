import useSWR from 'swr'

const fetcher = (...args) => fetch(...args).then(res => res.json())

export function useCalendarData() {
  return useSWR('/api/admin/dashboard/calendar', fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 60000 // 1 minute
  })
} 