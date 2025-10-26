"use client"

import { useEffect, useMemo, useState } from "react"
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
import { Input } from "@components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs"
import { addApplicantsByEmail, createHiredApplicant } from "@/app/admin/users/actions"
import { toast } from "sonner"

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

export default function AddApplicantDialog({ open, onOpenChange, onAdded, onApplicantAdded }) {
  const [tab, setTab] = useState("invite")
  const [value, setValue] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const parsed = useMemo(() => parseEmails(value), [value])

  // Hired form state
  const [hiredName, setHiredName] = useState("")
  const [hiredEmail, setHiredEmail] = useState("")
  const [hiredJobId, setHiredJobId] = useState("")
  const [hiredPhone, setHiredPhone] = useState("")

  // Jobs dropdown
  const [jobs, setJobs] = useState([])
  const [jobsLoading, setJobsLoading] = useState(false)
  const [jobsError, setJobsError] = useState("")

  useEffect(() => {
    if (!open) return
    let cancelled = false
    const loadJobs = async () => {
      setJobsLoading(true)
      setJobsError("")
      try {
        const res = await fetch("/api/admin/jobs")
        if (!res.ok) throw new Error("Failed to fetch jobs")
        const data = await res.json()
        if (!cancelled) setJobs(data.jobs || [])
      } catch (e) {
        if (!cancelled) setJobsError(e.message || "Failed to fetch jobs")
      } finally {
        if (!cancelled) setJobsLoading(false)
      }
    }
    loadJobs()
    return () => { cancelled = true }
  }, [open])

  const handleAdd = async () => {
    if (parsed.emails.length === 0) return
    setSubmitting(true)
    try {
      const created = await addApplicantsByEmail(parsed.emails)
      toast.success(
        <div>
          <div className="font-semibold">Invites submitted</div>
          <div className="text-sm opacity-80">{parsed.emails.length} applicant{parsed.emails.length > 1 ? 's' : ''} queued.</div>
        </div>
      )
      onAdded?.(created)
      onApplicantAdded?.(created)
      setValue("")
      onOpenChange?.(false)
    } catch (err) {
      toast.error(
        <div>
          <div className="font-semibold">Failed to submit invites</div>
          <div className="text-sm opacity-80">{err?.message || 'Unexpected error'}</div>
        </div>
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateHired = async () => {
    if (!hiredName.trim() || !hiredEmail.trim() || !hiredJobId.trim()) return
    setSubmitting(true)
    try {
      const result = await createHiredApplicant({
        name: hiredName.trim(),
        email: hiredEmail.trim(),
        jobId: hiredJobId.trim(),
        phone: hiredPhone.trim(),
      })
      toast.success(
        <div>
          <div className="font-semibold">Hired candidate created</div>
          <div className="text-sm opacity-80">{hiredName} &lt;{hiredEmail}&gt; was added.</div>
        </div>
      )
      onAdded?.(result)
      onApplicantAdded?.(result)
      setHiredName("")
      setHiredEmail("")
      setHiredJobId("")
      setHiredPhone("")
      onOpenChange?.(false)
    } catch (err) {
      toast.error(
        <div>
          <div className="font-semibold">Failed to create candidate</div>
          <div className="text-sm opacity-80">{err?.message || 'Unexpected error'}</div>
        </div>
      )
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
          <DialogTitle>Add Applicants</DialogTitle>
          <DialogDescription>Invite applicants by email, or create a hired candidate.</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="invite">Invite by Email</TabsTrigger>
            <TabsTrigger value="hired">Create Hired Candidate</TabsTrigger>
          </TabsList>

          <TabsContent value="invite" className="mt-4">
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
          </TabsContent>

          <TabsContent value="hired" className="mt-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="hired-name">Full Name <span className="text-destructive">*</span></Label>
                <Input id="hired-name" value={hiredName} onChange={(e) => setHiredName(e.target.value)} placeholder="Jane Doe" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="hired-email">Email <span className="text-destructive">*</span></Label>
                <Input id="hired-email" type="email" value={hiredEmail} onChange={(e) => setHiredEmail(e.target.value)} placeholder="jane@example.com" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="hired-job">Job <span className="text-destructive">*</span></Label>
                <select
                  id="hired-job"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  value={hiredJobId}
                  onChange={(e) => setHiredJobId(e.target.value)}
                  disabled={jobsLoading}
                >
                  <option value="" disabled>{jobsLoading ? "Loading jobs..." : "Select Job"}</option>
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>{j.title}</option>
                  ))}
                </select>
                {jobsError ? (<div className="text-xs text-destructive">{jobsError}</div>) : null}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="hired-phone">Phone</Label>
                <Input id="hired-phone" value={hiredPhone} onChange={(e) => setHiredPhone(e.target.value)} placeholder="+44 7123 456789" />
              </div>
              <div className="text-xs text-muted-foreground">
                Stage will be set to "Hired".
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange?.(false)} className="cursor-pointer">
            Cancel
          </Button>
          {tab === "invite" ? (
            <Button onClick={handleAdd} disabled={parsed.emails.length === 0 || submitting} className="cursor-pointer">
              {submitting ? "Adding..." : `Add ${parsed.emails.length || ""}`}
            </Button>
          ) : (
            <Button onClick={handleCreateHired} disabled={!hiredName.trim() || !hiredEmail.trim() || !hiredJobId.trim() || submitting} className="cursor-pointer">
              {submitting ? "Creating..." : "Create Candidate"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
