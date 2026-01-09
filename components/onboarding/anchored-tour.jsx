"use client"

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@components/ui/button"
import { Card, CardContent } from "@components/ui/card"

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function computePosition(rect, side = "bottom", gap = 12) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const maxWidth = 360
  let top = 0
  let left = 0
  switch (side) {
    case "top":
      top = rect.top - gap
      left = rect.left + rect.width / 2
      break
    case "left":
      top = rect.top + rect.height / 2
      left = rect.left - gap
      break
    case "right":
      top = rect.top + rect.height / 2
      left = rect.right + gap
      break
    default:
      // bottom
      top = rect.bottom + gap
      left = rect.left + rect.width / 2
  }
  return {
    style: {
      top: clamp(top, 8, vh - 8),
      left: clamp(left, 8, vw - 8),
      maxWidth,
    },
    origin: side,
  }
}

export default function AnchoredTour({ steps, onClose, onFinish }) {
  const [index, setIndex] = useState(0)
  const [rect, setRect] = useState(null)
  const [position, setPosition] = useState({ style: { top: 0, left: 0 }, origin: "bottom" })
  const step = steps[index] || null
  const targetRef = useRef(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const scrollIntoView = async (el) => {
    try {
      el?.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" })
      await new Promise((r) => setTimeout(r, 260))
    } catch {}
  }

  const measure = async () => {
    if (!step) return
    const el = document.querySelector(step.element)
    targetRef.current = el
    if (!el) {
      // if element not found, skip to next
      setIndex((i) => Math.min(i + 1, steps.length - 1))
      return
    }
    await scrollIntoView(el)
    const r = el.getBoundingClientRect()
    setRect(r)
    setPosition(computePosition(r, step.popover?.side || "bottom"))
  }

  useLayoutEffect(() => {
    measure()
    const onResize = () => measure()
    window.addEventListener("resize", onResize)
    window.addEventListener("scroll", onResize, true)
    return () => {
      window.removeEventListener("resize", onResize)
      window.removeEventListener("scroll", onResize, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, step?.element])

  const next = () => {
    if (index < steps.length - 1) setIndex(index + 1)
    else onFinish?.()
  }
  const prev = () => setIndex((i) => Math.max(i - 1, 0))
  const skip = () => onClose?.()

  const Overlay = (
    <AnimatePresence>
      {rect && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[99990] pointer-events-auto"
        >
          <div className="absolute inset-0 bg-black/35" onClick={skip} />

          {/* Highlight box */}
          <motion.div
            className="absolute border-2 border-primary/80 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.35)] bg-transparent"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            style={{
              top: rect.top + window.scrollY - 4,
              left: rect.left + window.scrollX - 4,
              width: rect.width + 8,
              height: rect.height + 8,
              pointerEvents: "none",
            }}
          />

          {/* Popover */}
          <motion.div
            className="absolute z-[99999]"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.2 }}
            style={{
              top: position.style.top + window.scrollY,
              left: position.style.left + window.scrollX,
              transform: "translate(-50%, 0)",
              maxWidth: position.style.maxWidth,
            }}
          >
            <Card className="border border-border bg-card text-card-foreground shadow-xl">
              <CardContent className="p-4">
                <div className="text-sm font-semibold mb-1.5">{step?.popover?.title}</div>
                <div className="text-sm text-muted-foreground mb-3">{step?.popover?.description}</div>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs text-muted-foreground">{index + 1} / {steps.length}</div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={prev} disabled={index === 0}>Previous</Button>
                    <Button variant="ghost" size="sm" onClick={skip}>Skip</Button>
                    <Button size="sm" onClick={next}>{index === steps.length - 1 ? "Done" : "Next"}</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  if (!mounted) return null
  return createPortal(Overlay, document.body)
}


