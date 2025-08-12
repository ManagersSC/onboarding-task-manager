"use client"

import { useState } from "react"
import { Button } from "@components/ui/button"
import { Card } from "@components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@components/ui/alert-dialog"
import { MapPin, Send, UserCheck } from "lucide-react"
import LocationDialog from "./location-dialog"
import { updateApplicant } from "@/app/admin/users/actions"

function getNext(stage) {
  if (stage === "New Application")
    return {
      type: "invite1",
      label: "Send First Interview Invite",
      toStage: "First Interview Invite Sent",
      needsLocation: true,
    }
  if (stage === "Reviewed")
    return {
      type: "invite2",
      label: "Send Second Interview Invite",
      toStage: "Second Interview Invite Sent",
      needsLocation: true,
    }
  if (stage === "Reviewed (2nd)")
    return { type: "hire", label: "Mark as Hired", toStage: "Hired", needsLocation: false }
  return null
}

export default function NextStep({ applicant, onUpdated }) {
  const next = getNext(applicant?.stage)
  const [locOpen, setLocOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  if (!applicant) return null

  if (!next) {
    return (
      <Card className="rounded-xl border p-4">
        <div className="space-y-1">
          <div className="text-sm font-semibold">Next step</div>
          <div className="text-sm text-muted-foreground">
            No action available right now. This will unlock after feedback or interviews.
          </div>
          <div className="text-xs text-muted-foreground">{applicant.stage}</div>
        </div>
      </Card>
    )
  }

  return (
    <>
      <Card className="rounded-xl border p-4">
        <div className="space-y-3">
          <div>
            <div className="text-sm font-semibold">Next step</div>
            <div className="text-sm text-muted-foreground">
              {next.type === "hire"
                ? "Candidate has completed round 2 and can be hired."
                : next.type === "invite2"
                  ? "Candidate reviewed. Send the second interview invite."
                  : "Send the first interview invite."}
            </div>
          </div>

          {next.type === "hire" ? (
            <Button
              className="cursor-pointer w-full sm:w-auto rounded-full h-9 px-4 gap-2 shadow-sm hover:shadow"
              variant="secondary"
              onClick={() => setConfirmOpen(true)}
            >
              <UserCheck className="h-4 w-4" />
              <span className="text-sm font-medium">Mark as Hired</span>
            </Button>
          ) : (
            <Button
              className="cursor-pointer w-full sm:w-auto rounded-full h-9 px-4 gap-2 shadow-sm hover:shadow"
              variant="secondary"
              onClick={() => setLocOpen(true)}
            >
              <Send className="h-4 w-4" />
              <span className="text-sm font-medium">
                {next.type === "invite2" ? "Send Second Interview Invite" : "Send First Interview Invite"}
              </span>
            </Button>
          )}
        </div>
      </Card>

      <LocationDialog
        open={locOpen}
        onOpenChange={setLocOpen}
        onConfirm={async (location) => {
          const updated = await updateApplicant({ id: applicant.id, stage: next?.toStage, location })
          onUpdated(updated)
        }}
      />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Hired?</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            Location: {applicant.location || "Not set"}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="cursor-pointer"
              onClick={async () => {
                const updated = await updateApplicant({ id: applicant.id, stage: "Hired" })
                onUpdated(updated)
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
