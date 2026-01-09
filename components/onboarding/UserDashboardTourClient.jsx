"use client"

import React, { useCallback, useEffect, useState } from "react"
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
        const res = await fetch("/api/user/intro-tooltip", { cache: "no-store" })
        const data = res.ok ? await res.json() : {}
        const force = search?.get("tour") === "dashboard"
        const shouldStart = force || !Boolean(data?.introTooltip)
        if (!cancelled) setAutoStart(shouldStart)
      } catch {
        const force = search?.get("tour") === "dashboard"
        if (!cancelled) setAutoStart(Boolean(force))
      }
    }
    init()
    return () => { cancelled = true }
  }, [search])

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
      {/* hidden anchor for centered welcome step */}
      <div data-tour="user.welcome" className="sr-only" aria-hidden="true" />
      {children}
    </TourProvider>
  )
}



