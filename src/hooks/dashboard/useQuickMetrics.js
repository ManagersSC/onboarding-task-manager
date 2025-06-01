import useSWR from 'swr';

const fetcher = (...args) => fetch(...args).then(res => res.json());

export function useQuickMetrics() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/admin/dashboard/quick-metrics',
    fetcher,
    {
      refreshInterval: 60000, // Optional: revalidate every 60 seconds
      revalidateOnFocus: true,
    }
  );

  return {
    metrics: data,
    isLoading,
    isError: error,
    mutate,
  };
} 