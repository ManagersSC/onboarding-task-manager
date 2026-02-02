"use client"

import { cn } from "@components/lib/utils"

const STEPS = [
  { key: "New Application", label: "New" },
  { key: "First Interview Invite Sent", label: "1st Invite" },
  { key: "Reviewed", label: "Reviewed" },
  { key: "Second Interview Invite Sent", label: "2nd Invite" },
  { key: "Reviewed (2nd)", label: "Reviewed (2nd)" },
  { key: "Hired", label: "Hired" },
]

export default function ProgressStepper({ currentStage = "" }) {
  const activeIndex = Math.max(
    0,
    STEPS.findIndex((s) => s.key === currentStage),
  )

  return (
    <div className="w-full">
      <ol className="flex flex-wrap items-center gap-4">
        {STEPS.map((step, idx) => {
          const done = idx < activeIndex
          const active = idx === activeIndex
          return (
            <li key={step.key} className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                  done
                    ? "bg-success text-success-foreground"
                    : active
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground",
                )}
                aria-current={active ? "step" : undefined}
                title={step.key}
              >
                {idx + 1}
              </div>
              <span className={cn("text-xs", active ? "font-semibold" : "text-muted-foreground")}>{step.label}</span>
              {idx < STEPS.length - 1 && (
                <span
                  className={cn("mx-2 h-px w-8 md:w-12", done ? "bg-success" : "bg-muted")}
                  aria-hidden="true"
                />
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
