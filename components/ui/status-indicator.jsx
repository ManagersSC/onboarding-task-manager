"use client"

import * as React from "react"
import { cva } from "class-variance-authority"

import { cn } from "@components/lib/utils"

const statusIndicatorVariants = cva(
  "inline-flex items-center rounded-full",
  {
    variants: {
      status: {
        default: "bg-muted-foreground",
        success: "bg-success",
        warning: "bg-warning",
        error: "bg-error",
        info: "bg-info",
        pending: "bg-muted-foreground/50",
        active: "bg-success",
        inactive: "bg-muted-foreground/30",
      },
      size: {
        xs: "h-1.5 w-1.5",
        sm: "h-2 w-2",
        default: "h-2.5 w-2.5",
        lg: "h-3 w-3",
        xl: "h-4 w-4",
      },
    },
    defaultVariants: {
      status: "default",
      size: "default",
    },
  }
)

/**
 * StatusDot - Simple status indicator dot
 */
const StatusDot = React.forwardRef(({
  status,
  size,
  pulse = false,
  className,
  ...props
}, ref) => {
  return (
    <span
      ref={ref}
      className={cn(
        statusIndicatorVariants({ status, size }),
        pulse && "animate-pulse-ring",
        className
      )}
      {...props}
    />
  )
})
StatusDot.displayName = "StatusDot"

/**
 * StatusIndicator - Status dot with optional label
 */
const StatusIndicator = React.forwardRef(({
  status,
  size,
  pulse = false,
  label,
  className,
  dotClassName,
  labelClassName,
  ...props
}, ref) => {
  return (
    <span
      ref={ref}
      className={cn("inline-flex items-center gap-2", className)}
      {...props}
    >
      <StatusDot
        status={status}
        size={size}
        pulse={pulse}
        className={dotClassName}
      />
      {label && (
        <span className={cn("text-sm text-muted-foreground", labelClassName)}>
          {label}
        </span>
      )}
    </span>
  )
})
StatusIndicator.displayName = "StatusIndicator"

/**
 * StatusRing - Status indicator with ring around avatar/icon
 */
const StatusRing = React.forwardRef(({
  status = "default",
  size = "default",
  pulse = false,
  children,
  className,
  ringClassName,
  ...props
}, ref) => {
  const ringColors = {
    default: "ring-muted-foreground",
    success: "ring-success",
    warning: "ring-warning",
    error: "ring-error",
    info: "ring-info",
    pending: "ring-muted-foreground/50",
    active: "ring-success",
    inactive: "ring-muted-foreground/30",
  }

  const ringSizes = {
    xs: "ring-1",
    sm: "ring-1",
    default: "ring-2",
    lg: "ring-2",
    xl: "ring-[3px]",
  }

  return (
    <span
      ref={ref}
      className={cn(
        "relative inline-flex",
        className
      )}
      {...props}
    >
      {children}
      <span
        className={cn(
          "absolute inset-0 rounded-full",
          ringSizes[size],
          ringColors[status],
          pulse && "animate-pulse-ring",
          ringClassName
        )}
      />
    </span>
  )
})
StatusRing.displayName = "StatusRing"

/**
 * StatusBadge - Status indicator as a badge/chip
 */
const StatusBadge = React.forwardRef(({
  status = "default",
  size = "default",
  pulse = false,
  label,
  className,
  ...props
}, ref) => {
  const badgeColors = {
    default: "bg-muted text-muted-foreground border-border",
    success: "bg-success-muted text-success border-success/30",
    warning: "bg-warning-muted text-warning border-warning/30",
    error: "bg-error-muted text-error border-error/30",
    info: "bg-info-muted text-info border-info/30",
    pending: "bg-muted text-muted-foreground border-border",
    active: "bg-success-muted text-success border-success/30",
    inactive: "bg-muted/50 text-muted-foreground/60 border-border/50",
  }

  const badgeSizes = {
    xs: "text-[10px] px-1.5 py-0.5 gap-1",
    sm: "text-xs px-2 py-0.5 gap-1.5",
    default: "text-xs px-2.5 py-1 gap-1.5",
    lg: "text-sm px-3 py-1 gap-2",
    xl: "text-sm px-3.5 py-1.5 gap-2",
  }

  return (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-full border font-medium transition-colors",
        badgeColors[status],
        badgeSizes[size],
        className
      )}
      {...props}
    >
      <StatusDot
        status={status}
        size={size === "xs" ? "xs" : size === "sm" ? "xs" : "sm"}
        pulse={pulse}
      />
      {label}
    </span>
  )
})
StatusBadge.displayName = "StatusBadge"

/**
 * OnlineIndicator - Specifically for online/offline status
 */
const OnlineIndicator = React.forwardRef(({
  online = false,
  showLabel = false,
  size = "default",
  className,
  ...props
}, ref) => {
  return (
    <StatusIndicator
      ref={ref}
      status={online ? "active" : "inactive"}
      size={size}
      pulse={online}
      label={showLabel ? (online ? "Online" : "Offline") : undefined}
      className={className}
      {...props}
    />
  )
})
OnlineIndicator.displayName = "OnlineIndicator"

export {
  StatusDot,
  StatusIndicator,
  StatusRing,
  StatusBadge,
  OnlineIndicator,
  statusIndicatorVariants
}
