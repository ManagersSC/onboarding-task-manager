"use client"

import React, { useEffect, useState, useCallback } from "react"
import TourProvider from "@components/onboarding/TourProvider"
import { userDashboardTourSteps } from "@components/onboarding/userDashboardTourSteps"
import { useSearchParams } from "next/navigation"

export default function UserDashboardTourClient({ children }) {
  const search = useSearchParams()
  const [autoStart, setAutoStart] = useState(false)

  const syncFromServer = useCallback(async () => {
    try {
      const res = await fetch("/api/user/intro-tooltip", { cache: "no-store" })
      const data = res.ok ? await res.json() : {}
      // introTooltip true => already completed, so do NOT auto-start
      const force = search?.get("tour") === "dashboard"
      setAutoStart(force || !Boolean(data?.introTooltip))
      return Boolean(data?.introTooltip)
    } catch {
      setAutoStart(search?.get("tour") === "dashboard")
      return false
    }
  }, [search])

  useEffect(() => {
    syncFromServer()
  }, [syncFromServer])

  const markCompleted = useCallback(async () => {
    try {
      await fetch("/api/user/intro-tooltip", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ introTooltip: true }),
      })
    } catch {}
  }, [])

  return (
    <TourProvider steps={userDashboardTourSteps} autoStart={autoStart} onFinish={markCompleted}>
      {/* anchor for the first centered step */}
      <div className="sr-only" data-tour="user.welcome" aria-hidden="true" />
      {children}
    </TourProvider>
  )
}

