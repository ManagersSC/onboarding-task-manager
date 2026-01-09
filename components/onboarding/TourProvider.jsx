"use client"

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { driver as createDriver } from "driver.js"
import "driver.js/dist/driver.css"
import "./tour.css"

const TourContext = createContext({ start: () => {}, stop: () => {}, isRunning: false })
export const useTour = () => useContext(TourContext)

export default function TourProvider({ children, steps = [], autoStart = false, onFinish }) {
  const [isRunning, setIsRunning] = useState(false)
  const driverRef = useRef(null)

  const handleDestroyed = useCallback(() => {
    setIsRunning(false)
    onFinish?.()
  }, [onFinish])

  const start = useCallback(() => {
    const drv = createDriver({
      allowClose: true,
      showProgress: true,
      smoothScroll: true,
      animate: true,
      overlayOpacity: 0.2,
      overlayColor: "rgba(0,0,0,0.35)",
      stagePadding: 8,
      stageRadius: 8,
      popoverClass: "otm-tour-popover",
      onDestroyed: handleDestroyed,
    })
    driverRef.current = drv
    setIsRunning(true)
    drv.setSteps(steps || [])
    drv.drive()
  }, [steps, handleDestroyed])

  const stop = useCallback(() => {
    try { driverRef.current?.destroy() } catch {}
    handleDestroyed()
  }, [handleDestroyed])

  useEffect(() => {
    if (autoStart) {
      const t = setTimeout(() => start(), 200)
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
