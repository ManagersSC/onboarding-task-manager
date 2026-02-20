// VULN-H12: HTML sanitizer for dangerouslySetInnerHTML usage
"use client"

import DOMPurify from "dompurify"

/**
 * Sanitize HTML content to prevent XSS attacks.
 * Use this before passing content to dangerouslySetInnerHTML.
 */
export function sanitizeHtml(dirty) {
  if (typeof dirty !== "string") return ""
  if (typeof window === "undefined") return dirty // SSR fallback
  return DOMPurify.sanitize(dirty)
}
