import * as React from "react"
import { cva } from "class-variance-authority"

import { cn } from "@components/lib/utils"

const inputVariants = cva(
  "flex w-full rounded-md border bg-background px-3 py-2 text-base transition-all duration-base ease-out-expo file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
  {
    variants: {
      variant: {
        default: "border-input shadow-sm focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:border-ring",
        filled: "border-transparent bg-muted/50 focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:border-input",
        ghost: "border-transparent shadow-none focus-visible:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/30",
      },
      inputSize: {
        default: "h-9",
        sm: "h-8 text-xs px-2.5",
        lg: "h-11 text-base px-4",
      },
    },
    defaultVariants: {
      variant: "default",
      inputSize: "default",
    },
  }
)

const Input = React.forwardRef(({ className, type, variant, inputSize, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(inputVariants({ variant, inputSize }), className)}
      ref={ref}
      {...props} />
  );
})
Input.displayName = "Input"

export { Input, inputVariants }
