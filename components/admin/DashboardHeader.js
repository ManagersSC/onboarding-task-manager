"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@components/ui/card"
import { Skeleton } from "@components/ui/skeleton"

// const getServerSideProps = withIron

export function DashboardHeader({ userName }) {
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    setTimeout(2000);
    setLoading(false);
  })

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
                    Welcome, {userName}
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
