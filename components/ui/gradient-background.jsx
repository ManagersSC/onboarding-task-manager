"use client"

import * as React from "react"
import { cva } from "class-variance-authority"

import { cn } from "@components/lib/utils"

const gradientBackgroundVariants = cva(
  "relative overflow-hidden",
  {
    variants: {
      variant: {
        mesh: "gradient-mesh",
        radial: "",
        linear: "",
        noise: "",
      },
    },
    defaultVariants: {
      variant: "mesh",
    },
  }
)

/**
 * GradientBackground - Reusable gradient mesh background component
 *
 * Can be used as a wrapper or as a standalone background element
 */
const GradientBackground = React.forwardRef(({
  variant = "mesh",
  className,
  children,
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={cn(gradientBackgroundVariants({ variant }), className)}
      {...props}
    >
      {children}
    </div>
  )
})
GradientBackground.displayName = "GradientBackground"

/**
 * GradientBlob - Animated gradient blob for backgrounds
 */
const GradientBlob = React.forwardRef(({
  color = "primary",
  size = "default",
  position = "center",
  animate = false,
  className,
  ...props
}, ref) => {
  const colors = {
    primary: "from-primary/20 via-primary/10 to-transparent",
    success: "from-success/20 via-success/10 to-transparent",
    warning: "from-warning/20 via-warning/10 to-transparent",
    error: "from-error/20 via-error/10 to-transparent",
    info: "from-info/20 via-info/10 to-transparent",
    accent: "from-accent/30 via-accent/15 to-transparent",
  }

  const sizes = {
    sm: "w-48 h-48",
    default: "w-72 h-72",
    lg: "w-96 h-96",
    xl: "w-[32rem] h-[32rem]",
    full: "w-full h-full",
  }

  const positions = {
    center: "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
    "top-left": "top-0 left-0 -translate-x-1/4 -translate-y-1/4",
    "top-right": "top-0 right-0 translate-x-1/4 -translate-y-1/4",
    "bottom-left": "bottom-0 left-0 -translate-x-1/4 translate-y-1/4",
    "bottom-right": "bottom-0 right-0 translate-x-1/4 translate-y-1/4",
    "top-center": "top-0 left-1/2 -translate-x-1/2 -translate-y-1/4",
    "bottom-center": "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/4",
  }

  return (
    <div
      ref={ref}
      className={cn(
        "absolute rounded-full bg-gradient-radial blur-3xl pointer-events-none",
        colors[color],
        sizes[size],
        positions[position],
        animate && "animate-pulse-subtle",
        className
      )}
      {...props}
    />
  )
})
GradientBlob.displayName = "GradientBlob"

/**
 * GradientOverlay - Gradient overlay for images or content
 */
const GradientOverlay = React.forwardRef(({
  direction = "bottom",
  intensity = "default",
  className,
  ...props
}, ref) => {
  const directions = {
    top: "bg-gradient-to-t",
    bottom: "bg-gradient-to-b",
    left: "bg-gradient-to-l",
    right: "bg-gradient-to-r",
    "top-left": "bg-gradient-to-tl",
    "top-right": "bg-gradient-to-tr",
    "bottom-left": "bg-gradient-to-bl",
    "bottom-right": "bg-gradient-to-br",
  }

  const intensities = {
    light: "from-background/50 to-transparent",
    default: "from-background/80 to-transparent",
    strong: "from-background to-transparent",
  }

  return (
    <div
      ref={ref}
      className={cn(
        "absolute inset-0 pointer-events-none",
        directions[direction],
        intensities[intensity],
        className
      )}
      {...props}
    />
  )
})
GradientOverlay.displayName = "GradientOverlay"

/**
 * GradientBorder - Animated gradient border effect
 */
const GradientBorder = React.forwardRef(({
  animate = false,
  colors = "default",
  className,
  children,
  ...props
}, ref) => {
  const colorSchemes = {
    default: "from-primary/50 via-info/50 to-primary/50",
    rainbow: "from-error via-warning via-success via-info to-error",
    cool: "from-info via-primary to-success",
    warm: "from-warning via-error to-warning",
  }

  return (
    <div
      ref={ref}
      className={cn(
        "relative rounded-xl p-[1px]",
        "bg-gradient-to-r",
        colorSchemes[colors],
        animate && "bg-[length:200%_200%] animate-shimmer",
        className
      )}
      {...props}
    >
      <div className="relative rounded-[11px] bg-card h-full">
        {children}
      </div>
    </div>
  )
})
GradientBorder.displayName = "GradientBorder"

/**
 * ScrollFadeEdges - Gradient fade edges for horizontal scroll containers
 */
const ScrollFadeEdges = React.forwardRef(({
  direction = "horizontal",
  fadeSize = "default",
  className,
  children,
  ...props
}, ref) => {
  const fadeSizes = {
    sm: "20px",
    default: "40px",
    lg: "60px",
  }

  const size = fadeSizes[fadeSize]

  return (
    <div
      ref={ref}
      className={cn("relative", className)}
      {...props}
    >
      {children}
      {direction === "horizontal" || direction === "both" ? (
        <>
          <div
            className="absolute top-0 bottom-0 left-0 pointer-events-none z-10"
            style={{
              width: size,
              background: "linear-gradient(90deg, hsl(var(--background)), transparent)",
            }}
          />
          <div
            className="absolute top-0 bottom-0 right-0 pointer-events-none z-10"
            style={{
              width: size,
              background: "linear-gradient(270deg, hsl(var(--background)), transparent)",
            }}
          />
        </>
      ) : null}
      {direction === "vertical" || direction === "both" ? (
        <>
          <div
            className="absolute top-0 left-0 right-0 pointer-events-none z-10"
            style={{
              height: size,
              background: "linear-gradient(180deg, hsl(var(--background)), transparent)",
            }}
          />
          <div
            className="absolute bottom-0 left-0 right-0 pointer-events-none z-10"
            style={{
              height: size,
              background: "linear-gradient(0deg, hsl(var(--background)), transparent)",
            }}
          />
        </>
      ) : null}
    </div>
  )
})
ScrollFadeEdges.displayName = "ScrollFadeEdges"

export {
  GradientBackground,
  GradientBlob,
  GradientOverlay,
  GradientBorder,
  ScrollFadeEdges,
  gradientBackgroundVariants
}
