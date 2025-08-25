import { useState, useEffect, useCallback } from 'react'
import useSWR from 'swr'

// Fetcher function for SWR
const fetcher = async (url) => {
  const response = await fetch(url)
  if (!response.ok) {
    const error = new Error('An error occurred while fetching the data.')
    error.info = await response.json()
    error.status = response.status
    throw error
  }
  return response.json()
}

// Local storage cache key
const getCacheKey = (applicantId) => `feedback-documents-${applicantId}`

// Cache management functions
const getCachedData = (applicantId) => {
  try {
    const cached = localStorage.getItem(getCacheKey(applicantId))
    if (cached) {
      const { data, timestamp } = JSON.parse(cached)
      // Cache is valid for 5 minutes
      if (Date.now() - timestamp < 5 * 60 * 1000) {
        return data
      }
    }
  } catch (error) {
    console.warn('Error reading from cache:', error)
  }
  return null
}

const setCachedData = (applicantId, data) => {
  try {
    const cacheData = {
      data,
      timestamp: Date.now()
    }
    localStorage.setItem(getCacheKey(applicantId), JSON.stringify(cacheData))
  } catch (error) {
    console.warn('Error writing to cache:', error)
  }
}

export function useFeedbackDocuments(applicantId, options = {}) {
  const {
    enabled = true,
    refreshInterval = 30000, // 30 seconds
    revalidateOnFocus = true,
    revalidateOnReconnect = true,
    dedupingInterval = 5000, // 5 seconds
    onSuccess,
    onError
  } = options



  // State for manual refresh
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefreshTime, setLastRefreshTime] = useState(null)

  // SWR configuration - only fetch when enabled and applicantId exists
  const swrKey = enabled && applicantId ? `/api/admin/users/${applicantId}/feedback-documents` : null

  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate
  } = useSWR(swrKey, fetcher, {
    refreshInterval,
    revalidateOnFocus,
    revalidateOnReconnect,
    dedupingInterval,
    onSuccess: (data) => {
      // Cache the successful response
      if (data?.success && applicantId) {
        setCachedData(applicantId, data.data)
      }
      
      // Update last refresh time
      setLastRefreshTime(new Date())
      
      // Call custom onSuccess if provided
      if (onSuccess) {
        onSuccess(data)
      }
    },
    onError: (error) => {
      console.error('Error fetching feedback documents:', error)
      
      // Call custom onError if provided
      if (onError) {
        onError(error)
      }
    }
  })

  // Manual refresh function
  const refresh = useCallback(async () => {
    if (!applicantId) return
    
    setIsRefreshing(true)
    try {
      await mutate()
      setLastRefreshTime(new Date())
    } catch (error) {
      console.error('Error during manual refresh:', error)
    } finally {
      setIsRefreshing(false)
    }
  }, [applicantId, mutate])

  // Get cached data on initial load
  const [initialData, setInitialData] = useState(null)
  
  useEffect(() => {
    if (enabled && applicantId && !data && !isLoading) {
      const cached = getCachedData(applicantId)
      if (cached) {
        setInitialData(cached)
      }
    }
  }, [enabled, applicantId, data, isLoading])

  // Helper functions for data organization
  const groupByStage = useCallback((documents) => {
    if (!documents) return {}
    
    return documents.reduce((acc, doc) => {
      const stage = doc.interviewStage || 'Unknown'
      if (!acc[stage]) {
        acc[stage] = []
      }
      acc[stage].push(doc)
      return acc
    }, {})
  }, [])

  const groupByType = useCallback((documents) => {
    if (!documents) return {}
    
    return documents.reduce((acc, doc) => {
      const type = doc.documentType || 'Unknown'
      if (!acc[type]) {
        acc[type] = []
      }
      acc[type].push(doc)
      return acc
    }, {})
  }, [])

  const getDocumentsByStage = useCallback((stage) => {
    const documents = data?.data?.documents || initialData?.documents || []
    return documents.filter(doc => doc.interviewStage === stage)
  }, [data, initialData])

  const getDocumentsByType = useCallback((type) => {
    const documents = data?.data?.documents || initialData?.documents || []
    return documents.filter(doc => doc.documentType === type)
  }, [data, initialData])

  const getFeedbackStats = useCallback(() => {
    const documents = data?.data?.documents || initialData?.documents || []
    const stats = {
      total: documents.length,
      byStage: {},
      byType: {}
    }

    documents.forEach(doc => {
      const stage = doc.interviewStage || 'Unknown'
      const type = doc.documentType || 'Unknown'
      
      stats.byStage[stage] = (stats.byStage[stage] || 0) + 1
      stats.byType[type] = (stats.byType[type] || 0) + 1
    })

    return stats
  }, [data, initialData])

  // Determine the current data source
  const currentData = data?.data || initialData
  const documents = currentData?.documents || []
  const documentsByStage = currentData?.documentsByStage || groupByStage(documents)
  const documentsByType = currentData?.documentsByType || groupByType(documents)
  const stats = currentData?.stats || getFeedbackStats()

  // If hook is disabled, return default values
  if (!enabled) {
    return {
      // Data
      documents: [],
      documentsByStage: {},
      documentsByType: {},
      stats: { total: 0, byStage: {}, byType: {} },
      applicantName: null,
      
      // Loading states
      isLoading: false,
      isValidating: false,
      isRefreshing: false,
      
      // Error state
      error: null,
      
      // Actions
      refresh: () => {},
      mutate: () => {},
      
      // Helper functions
      groupByStage,
      groupByType,
      getDocumentsByStage,
      getDocumentsByType,
      getFeedbackStats,
      
      // Metadata
      lastRefreshTime: null,
      hasData: false,
      totalDocuments: 0,
      
      // Cache info
      isFromCache: false,
      cacheKey: null
    }
  }

  return {
    // Data
    documents,
    documentsByStage,
    documentsByType,
    stats,
    applicantName: currentData?.applicantName,
    
    // Loading states
    isLoading: isLoading && !initialData,
    isValidating,
    isRefreshing,
    
    // Error state
    error: error?.info || error,
    
    // Actions
    refresh,
    mutate,
    
    // Helper functions
    groupByStage,
    groupByType,
    getDocumentsByStage,
    getDocumentsByType,
    getFeedbackStats,
    
    // Metadata
    lastRefreshTime,
    hasData: documents.length > 0,
    totalDocuments: documents.length,
    
    // Cache info
    isFromCache: !!initialData && !data,
    cacheKey: applicantId ? getCacheKey(applicantId) : null
  }
}
