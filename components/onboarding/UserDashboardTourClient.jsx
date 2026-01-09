"use client"

import React, { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import TourProvider from "@components/onboarding/TourProvider"
import { userDashboardTourSteps } from "@components/onboarding/userDashboardTourSteps"

export default function UserDashboardTourClient({ children }) {
  const [autoStart, setAutoStart] = useState(false)
  const search = useSearchParams()

  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        const res = await fetch("/api/user/preferences/tours", { cache: "no-store" })
        const data = res.ok ? await res.json() : {}
        const force = search?.get("tour") === "dashboard"
        const shouldStart = force || !data?.user_dashboard_v1
        if (!cancelled) setAutoStart(shouldStart)
      } catch {
        const force = search?.get("tour") === "dashboard"
        if (!cancelled) setAutoStart(Boolean(force))
      }
    }
    init()
    return () => {
      cancelled = true
    }
  }, [search])

  return (
    <TourProvider steps={userDashboardTourSteps} autoStart={autoStart} flagKey="user_dashboard_v1">
      {/* hidden anchor for centered welcome step */}
      <div data-tour="user.welcome" className="sr-only" aria-hidden="true" />
      {children}
    </TourProvider>
  )
}



