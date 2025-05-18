import useSWR from 'swr'

const fetcher = (...args) => fetch(...args).then(res => res.json())

export function useOnboardingHealth() {
  return useSWR('/api/admin/dashboard/onboarding-health', fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 60000 // 1 minute
  })
} 