"use client"

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import AnchoredTour from "@components/onboarding/anchored-tour"

const TourContext = createContext({ start: () => {}, stop: () => {}, isRunning: false })
export const useTour = () => useContext(TourContext)

export default function TourProvider({ children, steps = [], autoStart = false, onFinish }) {
  const [isRunning, setIsRunning] = useState(false)

  const start = useCallback(() => setIsRunning(true), [])
  const stop = useCallback(() => {
    setIsRunning(false)
    onFinish?.()
  }, [onFinish])

  useEffect(() => {
    if (autoStart) {
      const t = setTimeout(() => setIsRunning(true), 200)
      return () => clearTimeout(t)
    }
  }, [autoStart])

  const value = useMemo(() => ({ start, stop, isRunning }), [start, stop, isRunning])

  return (
    <TourContext.Provider value={value}>
      {children}
      {isRunning && (
        <AnchoredTour
          steps={steps}
          onClose={stop}
          onFinish={() => {
            stop()
          }}
        />
      )}
    </TourContext.Provider>
  )
}


