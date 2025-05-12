"use client"

import { useState, useEffect } from "react"

export function useProfile() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchProfile() {
      try {
        setLoading(true)
        const response = await fetch("/api/admin/profile")

        if (!response.ok) {
          throw new Error(`Error: ${response.status}`)
        }

        const data = await response.json()
        setProfile(data)
      } catch (err) {
        console.error("Failed to fetch profile:", err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [])

  return { profile, loading, error }
}
