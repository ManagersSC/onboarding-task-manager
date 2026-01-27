import * as React from "react"
import { cva } from "class-variance-authority";

import { cn } from "@components/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-all duration-base ease-out-expo focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "text-foreground border-border",
        // Status variants with consistent border + background opacity pattern
        success:
          "border-success/30 bg-success-muted text-success hover:bg-success/20",
        warning:
          "border-warning/30 bg-warning-muted text-warning hover:bg-warning/20",
        error:
          "border-error/30 bg-error-muted text-error hover:bg-error/20",
        info:
          "border-info/30 bg-info-muted text-info hover:bg-info/20",
        // Subtle variants for less prominence
        "success-subtle":
          "border-transparent bg-success/10 text-success",
        "warning-subtle":
          "border-transparent bg-warning/10 text-warning",
        "error-subtle":
          "border-transparent bg-error/10 text-error",
        "info-subtle":
          "border-transparent bg-info/10 text-info",
        // Solid status variants
        "success-solid":
          "border-transparent bg-success text-success-foreground shadow-sm hover:bg-success/90",
        "warning-solid":
          "border-transparent bg-warning text-warning-foreground shadow-sm hover:bg-warning/90",
        "error-solid":
          "border-transparent bg-error text-error-foreground shadow-sm hover:bg-error/90",
        "info-solid":
          "border-transparent bg-info text-info-foreground shadow-sm hover:bg-info/90",
      },
      size: {
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-2 py-0.5 text-[10px]",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Badge({
  className,
  variant,
  size,
  ...props
}) {
  return (<div className={cn(badgeVariants({ variant, size }), className)} {...props} />);
}

export { Badge, badgeVariants }
