"use client"

import { useState, useEffect, useCallback, useRef } from "react"

const useNotifications = ({ limit = 10, pollInterval = 30000 } = {}) => {
  const [notifications, setNotifications] = useState([])
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [totalUnread, setTotalUnread] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  const lastFetchTime = useRef(null)
  const isFirstLoad = useRef(true)

  // Smart merge function to combine existing and new notifications
  const mergeNotifications = useCallback((existing, incoming, isIncremental = false) => {
    if (!isIncremental) {
      // Initial load - just return the incoming notifications
      return incoming
    }

    // Create a map of existing notifications for quick lookup
    const existingMap = new Map(existing.map((n) => [n.id, n]))
    const merged = [...existing]
    const newNotifications = []

    // Process incoming notifications
    incoming.forEach((incomingNotification) => {
      const existingIndex = merged.findIndex((n) => n.id === incomingNotification.id)

      if (existingIndex >= 0) {
        // Update existing notification
        merged[existingIndex] = incomingNotification
      } else {
        // New notification - add to the beginning
        newNotifications.push(incomingNotification)
      }
    })

    // Add new notifications to the top
    const result = [...newNotifications, ...merged]

    // Sort to ensure unread notifications are at the top
    return result.sort((a, b) => {
      // Sort unread notifications to the top
      if (!a.read && b.read) return -1
      if (a.read && !b.read) return 1
      // Then sort by creation date (newest first)
      return new Date(b.createdAt) - new Date(a.createdAt)
    })
  }, [])

  const fetchNotifications = useCallback(
    async (isIncremental = false) => {
      if (isIncremental) {
        setIsRefreshing(true)
      } else {
        setIsInitialLoading(true)
      }

      setError(null)

      try {
        const params = new URLSearchParams()
        params.append("limit", limit.toString())

        // Use since parameter for incremental updates
        if (isIncremental && lastFetchTime.current) {
          params.append("since", lastFetchTime.current)
        }

        const res = await fetch(`/api/notifications?${params.toString()}`)
        if (!res.ok) throw new Error("Failed to fetch notifications")

        const data = await res.json()

        // Update last fetch time
        lastFetchTime.current = new Date().toISOString()

        // Merge notifications intelligently
        setNotifications((prev) => mergeNotifications(prev, data.notifications || [], isIncremental))
        setTotalUnread(data.totalUnread || 0)
        setHasMore(data.hasMore || false)
      } catch (err) {
        setError(err.message || "Unknown error")
      } finally {
        setIsInitialLoading(false)
        setIsRefreshing(false)
      }
    },
    [limit, mergeNotifications],
  )

  // Initial load
  useEffect(() => {
    if (isFirstLoad.current) {
      fetchNotifications(false)
      isFirstLoad.current = false
    }
  }, [fetchNotifications])

  // Polling for updates
  useEffect(() => {
    if (pollInterval > 0 && !isFirstLoad.current) {
      const interval = setInterval(() => {
        // Only poll if not currently loading
        if (!isInitialLoading && !isRefreshing) {
          fetchNotifications(true) // Incremental update
        }
      }, pollInterval)

      return () => clearInterval(interval)
    }
  }, [fetchNotifications, pollInterval, isInitialLoading, isRefreshing])

  // Optimistic mark as read
  const markAsRead = useCallback(async (id) => {
    // Optimistic update
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    setTotalUnread((prev) => Math.max(0, prev - 1))

    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: "PATCH" })
      if (!res.ok) throw new Error("Failed to mark as read")

      const data = await res.json()

      // Update with server response (in case of any differences)
      if (data.notification) {
        setNotifications((prev) => prev.map((n) => (n.id === id ? data.notification : n)))
      }
    } catch (err) {
      // Revert optimistic update on error
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: false } : n)))
      setTotalUnread((prev) => prev + 1)
      setError(err.message || "Failed to mark as read")
      throw err // Re-throw for component error handling
    }
  }, [])

  // Optimistic mark all as read
  const markAllAsRead = useCallback(async () => {
    const unreadNotifications = notifications.filter((n) => !n.read)

    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setTotalUnread(0)

    try {
      const res = await fetch(`/api/notifications/mark-all-read`, { method: "PATCH" })
      if (!res.ok) throw new Error("Failed to mark all as read")

      const data = await res.json()

      // Update with server timestamps if available
      if (data.updated && data.updated.length > 0) {
        setNotifications((prev) =>
          prev.map((n) => {
            const updated = data.updated.find((u) => u.id === n.id)
            return updated ? { ...n, updatedAt: updated.updatedAt } : n
          }),
        )
      }
    } catch (err) {
      // Revert optimistic update on error
      setNotifications((prev) =>
        prev.map((n) => {
          const wasUnread = unreadNotifications.find((un) => un.id === n.id)
          return wasUnread ? { ...n, read: false } : n
        }),
      )
      setTotalUnread(unreadNotifications.length)
      setError(err.message || "Failed to mark all as read")
      throw err // Re-throw for component error handling
    }
  }, [notifications])

  const refetch = useCallback(() => {
    fetchNotifications(false)
  }, [fetchNotifications])

  return {
    notifications,
    loading: isInitialLoading,
    isRefreshing,
    error,
    unreadCount: totalUnread,
    hasMore,
    markAsRead,
    markAllAsRead,
    refetch,
  }
}

export default useNotifications
