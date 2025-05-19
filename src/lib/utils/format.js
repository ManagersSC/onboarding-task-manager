/**
 * Format bytes to a human-readable string
 * @param {number} bytes - The number of bytes
 * @param {number} decimals - The number of decimal places to show
 * @returns {string} - Formatted string (e.g., "1.5 MB")
 */
export function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return "0 Bytes"
  
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]
  
    const i = Math.floor(Math.log(bytes) / Math.log(k))
  
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
  }
  
  /**
   * Format a date to a relative time string
   * @param {string|Date} date - The date to format
   * @returns {string} - Formatted string (e.g., "2 days ago")
   */
  export function formatRelativeTime(date) {
    if (!date) return "Unknown"
  
    try {
      const now = new Date()
      const dateObj = new Date(date)
      const diffMs = now - dateObj
      const diffSec = Math.floor(diffMs / 1000)
      const diffMin = Math.floor(diffSec / 60)
      const diffHour = Math.floor(diffMin / 60)
      const diffDay = Math.floor(diffHour / 24)
  
      if (diffSec < 60) return "Just now"
      if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? "s" : ""} ago`
      if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? "s" : ""} ago`
      if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`
  
      return dateObj.toLocaleDateString()
    } catch (e) {
      console.error("Date formatting error:", e)
      return "Unknown date"
    }
  }
  