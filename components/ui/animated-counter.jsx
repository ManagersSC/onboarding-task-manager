"use client"

import * as React from "react"
import { motion, useSpring, useTransform, useInView } from "framer-motion"

import { cn } from "@components/lib/utils"

/**
 * AnimatedCounter - Smooth number animation for metrics
 *
 * @param {number} value - The target value to animate to
 * @param {number} duration - Animation duration in seconds (default: 1)
 * @param {string} prefix - Text to show before the number (e.g., "$")
 * @param {string} suffix - Text to show after the number (e.g., "%", "+")
 * @param {number} decimals - Number of decimal places (default: 0)
 * @param {boolean} animateOnView - Whether to trigger animation when in view (default: true)
 */
const AnimatedCounter = React.forwardRef(({
  value,
  duration = 1,
  prefix = "",
  suffix = "",
  decimals = 0,
  animateOnView = true,
  className,
  ...props
}, ref) => {
  const containerRef = React.useRef(null)
  const isInView = useInView(containerRef, { once: true, margin: "-50px" })

  const shouldAnimate = animateOnView ? isInView : true

  const spring = useSpring(0, {
    duration: duration * 1000,
    bounce: 0,
  })

  const display = useTransform(spring, (current) => {
    const formatted = decimals > 0
      ? current.toFixed(decimals)
      : Math.floor(current).toLocaleString()
    return `${prefix}${formatted}${suffix}`
  })

  React.useEffect(() => {
    if (shouldAnimate) {
      spring.set(value)
    }
  }, [spring, value, shouldAnimate])

  return (
    <span ref={containerRef} className={cn("tabular-nums", className)} {...props}>
      <motion.span ref={ref}>{display}</motion.span>
    </span>
  )
})
AnimatedCounter.displayName = "AnimatedCounter"

/**
 * AnimatedCounterSimple - A simpler version without framer-motion dependencies
 * Uses CSS for smooth number transitions
 */
const AnimatedCounterSimple = React.forwardRef(({
  value,
  duration = 1000,
  prefix = "",
  suffix = "",
  decimals = 0,
  className,
  ...props
}, ref) => {
  const [displayValue, setDisplayValue] = React.useState(0)
  const [hasAnimated, setHasAnimated] = React.useState(false)
  const containerRef = React.useRef(null)

  // Track the last animated value to detect significant changes
  const lastValueRef = React.useRef(value)

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true)

          const startTime = performance.now()
          const startValue = 0
          const endValue = value

          const animate = (currentTime) => {
            const elapsed = currentTime - startTime
            const progress = Math.min(elapsed / duration, 1)

            // Ease out expo
            const easeOutExpo = 1 - Math.pow(2, -10 * progress)
            const currentValue = startValue + (endValue - startValue) * easeOutExpo

            setDisplayValue(currentValue)

            if (progress < 1) {
              requestAnimationFrame(animate)
            }
          }

          requestAnimationFrame(animate)
          lastValueRef.current = value
        }
      },
      { threshold: 0.1 }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [value, duration, hasAnimated])

  // Handle value changes after initial animation (e.g., when data loads)
  React.useEffect(() => {
    if (hasAnimated && value !== lastValueRef.current) {
      const startTime = performance.now()
      const startValue = lastValueRef.current
      const endValue = value

      const animate = (currentTime) => {
        const elapsed = currentTime - startTime
        const progress = Math.min(elapsed / duration, 1)

        // Ease out expo
        const easeOutExpo = 1 - Math.pow(2, -10 * progress)
        const currentValue = startValue + (endValue - startValue) * easeOutExpo

        setDisplayValue(currentValue)

        if (progress < 1) {
          requestAnimationFrame(animate)
        }
      }

      requestAnimationFrame(animate)
      lastValueRef.current = value
    }
  }, [value, duration, hasAnimated])

  const formattedValue = decimals > 0
    ? displayValue.toFixed(decimals)
    : Math.floor(displayValue).toLocaleString()

  return (
    <span
      ref={containerRef}
      className={cn("tabular-nums", className)}
      {...props}
    >
      <span ref={ref}>
        {prefix}{formattedValue}{suffix}
      </span>
    </span>
  )
})
AnimatedCounterSimple.displayName = "AnimatedCounterSimple"

/**
 * ProgressRing - Circular progress indicator with animated fill
 */
const ProgressRing = React.forwardRef(({
  value,
  max = 100,
  size = 48,
  strokeWidth = 4,
  className,
  trackClassName,
  progressClassName,
  children,
  ...props
}, ref) => {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const progress = Math.min(Math.max(value / max, 0), 1)
  const offset = circumference - progress * circumference

  return (
    <div
      ref={ref}
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      {...props}
    >
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className={cn("text-muted/30", trackClassName)}
        />
        {/* Progress */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          animate={{ strokeDashoffset: offset }}
          transition={{ type: "spring", stiffness: 50, damping: 15 }}
          strokeLinecap="round"
          className={cn("text-primary", progressClassName)}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  )
})
ProgressRing.displayName = "ProgressRing"

export { AnimatedCounter, AnimatedCounterSimple, ProgressRing }
