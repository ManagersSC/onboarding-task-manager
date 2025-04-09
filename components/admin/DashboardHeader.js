"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@components/ui/card"
import { Skeleton } from "@components/ui/skeleton"

export function DashboardHeader() {
  const [adminName, setAdminName] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch admin profile
    const fetchProfile = async () => {
      try {
        const response = await fetch("/api/admin/profile")
        if (response.ok) {
          const data = await response.json()
          setAdminName(data.name || "Admin")
        }
      } catch (error) {
        console.error("Error fetching admin profile:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [])

  return (
    <Card className="bg-white border-none shadow-sm">
    {loading ? (
        <>
            <Skeleton className="h-8 w-1/2 mb-4" />
            <Skeleton className="h-6 w-full" />
        </>
        ): (
        <>
            <CardContent className="p-6">
                <h1 className="text-2xl font-bold text-gray-900">
                    Welcome, {adminName}
                </h1>
                <p className="text-gray-500 mt-1">
                    Here's what's happening with your onboarding processes today.
                </p>
            </CardContent>
        </>
        )
    }
    </Card>
  )
}
