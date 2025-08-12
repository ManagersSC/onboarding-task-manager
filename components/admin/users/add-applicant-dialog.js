"use client"

import { useMemo, useState } from "react"
import { Button } from "@components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@components/ui/dialog"
import { Label } from "@components/ui/label"
import { Textarea } from "@components/ui/textarea"
import { addApplicantsByEmail } from "@/app/admin/users/actions"

function parseEmails(input) {
  const tokens = String(input || "")
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const valid = tokens.filter((t) => emailRe.test(t.toLowerCase()))
  const invalid = tokens.filter((t) => !emailRe.test(t.toLowerCase()))
  const uniq = Array.from(new Set(valid.map((v) => v.toLowerCase())))
  return { emails: uniq, invalid }
}

export default function AddApplicantDialog({ open, onOpenChange, onAdded }) {
  const [value, setValue] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const parsed = useMemo(() => parseEmails(value), [value])

  const handleAdd = async () => {
    if (parsed.emails.length === 0) return
    setSubmitting(true)
    try {
      const created = await addApplicantsByEmail(parsed.emails)
      onAdded?.(created)
      setValue("")
      onOpenChange?.(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setValue("")
        onOpenChange?.(v)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Applicants by Email</DialogTitle>
          <DialogDescription>Paste or type emails. Separate by comma, space, or new line.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="emails">Emails</Label>
          <Textarea
            id="emails"
            placeholder="jane@example.com, john@example.com"
            rows={5}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <div className="text-xs text-muted-foreground">
            {parsed.emails.length} valid {parsed.invalid.length > 0 ? `• ${parsed.invalid.length} invalid ignored` : ""}
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange?.(false)} className="cursor-pointer">
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={parsed.emails.length === 0 || submitting} className="cursor-pointer">
            {submitting ? "Adding..." : `Add ${parsed.emails.length || ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
