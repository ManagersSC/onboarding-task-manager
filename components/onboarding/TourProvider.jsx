"use client"

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { driver as createDriver } from "driver.js"
import "driver.js/dist/driver.css"

const TourContext = createContext({
  start: () => {},
  stop: () => {},
  isRunning: false,
})

export const useTour = () => useContext(TourContext)

/**
 * Generic Tour provider backed by driver.js
 * - Accepts `steps` in driver.js format
 * - Persists completion via /api/user/preferences/tours
 * - Can autoStart when `autoStart` is true
 * - `flagKey` controls which preference flag is updated (e.g., "user_dashboard_v1")
 */
export default function TourProvider({ children, steps = [], autoStart = false, flagKey = "dashboard_v1" }) {
  const driverRef = useRef(null)
  const [isRunning, setIsRunning] = useState(false)

  const persistCompleted = useCallback(async () => {
    try {
      await fetch("/api/user/preferences/tours", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [flagKey]: true }),
      })
    } catch {}
  }, [flagKey])

  const handleDestroyed = useCallback(() => {
    setIsRunning(false)
    persistCompleted()
  }, [persistCompleted])

  const start = useCallback(() => {
    const drv = createDriver({
      allowClose: true,
      showProgress: true,
      smoothScroll: true,
      animate: true,
      overlayOpacity: 0.6,
      popoverClass: "otm-tour-popover",
      onDestroyed: handleDestroyed,
    })
    driverRef.current = drv
    setIsRunning(true)
    drv.setSteps(steps || [])
    drv.drive()
  }, [steps, handleDestroyed])

  const stop = useCallback(() => {
    try {
      driverRef.current?.destroy()
    } catch {}
    handleDestroyed()
  }, [handleDestroyed])

  useEffect(() => {
    if (autoStart) {
      const t = setTimeout(() => start(), 150)
      return () => clearTimeout(t)
    }
  }, [autoStart, start])

  const value = useMemo(() => ({ start, stop, isRunning }), [start, stop, isRunning])

  return (
    <TourContext.Provider value={value}>
      {children}
    </TourContext.Provider>
  )
}



