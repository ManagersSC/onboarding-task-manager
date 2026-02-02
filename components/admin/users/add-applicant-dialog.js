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
import { addApplicantsByEmail, createHiredApplicant, findApplicantByEmail, hireExistingApplicant } from "@/app/admin/users/actions"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

function parseEmails(input) {
  // Very simple email parsing and validation (client-side only)
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
  // Invite tab job selection (send job id to server action)
  const [inviteJobId, setInviteJobId] = useState("")

  // Existing applicant confirmation
  const [existingApplicant, setExistingApplicant] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [checkingExisting, setCheckingExisting] = useState(false)

  const isValidEmail = (email) => {
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRe.test(String(email || "").trim().toLowerCase())
  }

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
    if (parsed.emails.length === 0 || !inviteJobId.trim()) return
    setSubmitting(true)
    try {
      const loadingId = toast.loading("Submitting invites...")
      // Chunk large email lists to reduce webhook/provider errors
      const MAX_BATCH = 50
      const chunks = []
      for (let i = 0; i < parsed.emails.length; i += MAX_BATCH) {
        chunks.push(parsed.emails.slice(i, i + MAX_BATCH))
      }
      let totalProcessed = 0
      for (const chunk of chunks) {
        const created = await addApplicantsByEmail(chunk, inviteJobId.trim())
        totalProcessed += chunk.length
        // Allow UI to remain responsive between batches
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 0))
        // Optional: could aggregate created results if needed
        onAdded?.(created)
        onApplicantAdded?.(created)
      }
      const jobTitleForToast = jobs.find((j) => j.id === inviteJobId)?.title || "selected job"
      toast.success(
        <div>
          <div className="font-semibold">Invites submitted</div>
          <div className="text-sm opacity-80">
            {totalProcessed} applicant{totalProcessed > 1 ? 's' : ''} queued for “{jobTitleForToast}”.
          </div>
        </div>
      )
      toast.dismiss(loadingId)
      setValue("")
      setInviteJobId("")
      onOpenChange?.(false)
    } catch (err) {
      toast.dismiss()
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
    if (!isValidEmail(hiredEmail)) {
      toast.error(
        <div>
          <div className="font-semibold">Invalid email</div>
          <div className="text-sm opacity-80">Please enter a valid email address.</div>
        </div>
      )
      return
    }
    // First check if an applicant already exists by email
    setCheckingExisting(true)
    try {
      const existing = await findApplicantByEmail(hiredEmail.trim())
      if (existing) {
        setExistingApplicant(existing)
        setConfirmOpen(true)
        return
      }
    } catch {} finally {
      setCheckingExisting(false)
    }
    setSubmitting(true)
    try {
      const loadingId = toast.loading("Creating hired candidate...")
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
      toast.dismiss(loadingId)
      onAdded?.(result)
      onApplicantAdded?.(result)
      setHiredName("")
      setHiredEmail("")
      setHiredJobId("")
      setHiredPhone("")
      onOpenChange?.(false)
    } catch (err) {
      toast.dismiss()
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

  const handleConfirmHireExisting = async () => {
    if (!existingApplicant?.id) {
      setConfirmOpen(false)
      return
    }
    setSubmitting(true)
    try {
      const loadingId = toast.loading("Marking as Hired...")
      await hireExistingApplicant({ id: existingApplicant.id })
      toast.success(
        <div>
          <div className="font-semibold">Applicant marked as Hired</div>
          <div className="text-sm opacity-80">{existingApplicant.name} &lt;{existingApplicant.email}&gt;</div>
        </div>
      )
      toast.dismiss(loadingId)
      onApplicantAdded?.()
      setConfirmOpen(false)
      setExistingApplicant(null)
      setHiredName("")
      setHiredEmail("")
      setHiredJobId("")
      setHiredPhone("")
      onOpenChange?.(false)
    } catch (err) {
      toast.dismiss()
      toast.error(
        <div>
          <div className="font-semibold">Failed to update status</div>
          <div className="text-sm opacity-80">{err?.message || 'Unexpected error'}</div>
        </div>
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          // Reset all dialog state when closing
          setValue("")
          setTab("invite")
          setHiredName("")
          setHiredEmail("")
          setHiredJobId("")
          setHiredPhone("")
          setInviteJobId("")
          setExistingApplicant(null)
          setConfirmOpen(false)
        }
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
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="invite-job">Job <span className="text-error">*</span></Label>
                <select
                  id="invite-job"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  value={inviteJobId}
                  onChange={(e) => setInviteJobId(e.target.value)}
                  disabled={jobsLoading}
                >
                  <option value="" disabled>{jobsLoading ? "Loading jobs..." : "Select Job"}</option>
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>{j.title}</option>
                  ))}
                </select>
                {jobsError ? (<div className="text-xs text-error">{jobsError}</div>) : null}
              </div>
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
            </div>
          </TabsContent>

          <TabsContent value="hired" className="mt-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="hired-name">Full Name <span className="text-error">*</span></Label>
                <Input id="hired-name" value={hiredName} onChange={(e) => setHiredName(e.target.value)} placeholder="Jane Doe" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="hired-email">Email <span className="text-error">*</span></Label>
                <Input id="hired-email" type="email" value={hiredEmail} onChange={(e) => setHiredEmail(e.target.value)} placeholder="jane@example.com" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="hired-job">Job <span className="text-error">*</span></Label>
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
                {jobsError ? (<div className="text-xs text-error">{jobsError}</div>) : null}
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
            <Button
              onClick={handleAdd}
                disabled={parsed.emails.length === 0 || !inviteJobId.trim() || jobsLoading || submitting}
              className="cursor-pointer"
            >
              {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...</> : `Add ${parsed.emails.length || ""}`}
            </Button>
          ) : (
            <Button
              onClick={handleCreateHired}
              disabled={
                !hiredName.trim() ||
                !hiredEmail.trim() ||
                !isValidEmail(hiredEmail) ||
                !hiredJobId.trim() ||
                submitting ||
                checkingExisting
              }
              className="cursor-pointer"
            >
              {(submitting || checkingExisting)
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {submitting ? "Creating..." : "Checking..."}</>
                : "Create Candidate"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
    {/* Confirmation dialog for existing applicant */}
    <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Existing applicant found</DialogTitle>
          <DialogDescription>We found a record with the same email. Do you want to set their status to Hired?</DialogDescription>
        </DialogHeader>
        <div className="grid gap-1 text-sm">
          <div><span className="text-muted-foreground">Name:</span> {existingApplicant?.name || "—"}</div>
          <div><span className="text-muted-foreground">Email:</span> {existingApplicant?.email || "—"}</div>
          <div><span className="text-muted-foreground">Job:</span> {existingApplicant?.jobTitle || "—"}</div>
          <div><span className="text-muted-foreground">Current Stage:</span> {existingApplicant?.stage || "—"}</div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setConfirmOpen(false)} className="cursor-pointer">Cancel</Button>
          <Button onClick={handleConfirmHireExisting} disabled={submitting} className="cursor-pointer">
            {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...</> : "Mark as Hired"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
