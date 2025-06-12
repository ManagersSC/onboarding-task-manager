import useSWR from 'swr';

const fetcher = (url) => fetch(url).then((res) => res.json());

export function useNotificationData({ page = 1, limit = 10, refreshInterval = 30000 } = {}) {
  const { data, error, isLoading, mutate } = useSWR(
    `/api/admin/notifications?page=${page}&limit=${limit}`,
    fetcher,
    {
      refreshInterval,
      revalidateOnFocus: true,
    }
  );

  // Mark all as read
  const markAllAsRead = async () => {
    await fetch('/api/admin/notifications', { method: 'PATCH' });
    mutate();
  };

  // Mark a single notification as read
  const markAsRead = async (id) => {
    await fetch(`/api/admin/notifications/${id}/read`, { method: 'PATCH' });
    mutate();
  };

  return {
    notifications: data?.notifications || [],
    unreadCount: data?.unreadCount || 0,
    total: data?.total || 0,
    page: data?.page || 1,
    limit: data?.limit || limit,
    isLoading,
    error,
    mutate,
    markAllAsRead,
    markAsRead,
  };
} 