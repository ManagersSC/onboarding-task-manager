"use server"

import { updateApplicantInStore, addApplicantsFromEmails, addFeedbackFiles, getApplicantById } from "@/lib/mock-db"
import { inviteStageNeedsLocation, normalizeLocationLabel } from "@/lib/stage"

function allowedNextTransition(current, requested) {
  return (
    (current === "New Application" && requested === "First Interview Invite Sent") ||
    (current === "Reviewed" && requested === "Second Interview Invite Sent") ||
    (current === "Reviewed (2nd)" && requested === "Hired")
  )
}

export async function updateApplicant(payload) {
  const { id, stage, location } = payload || {}
  if (!id) throw new Error("Missing id")

  const existing = await getApplicantById(id)
  if (!existing) throw new Error("Applicant not found")

  if (stage) {
    if (!allowedNextTransition(existing.stage, stage)) {
      throw new Error("Transition not allowed")
    }
    if (inviteStageNeedsLocation(stage)) {
      const loc = normalizeLocationLabel(location || existing.location)
      if (!loc) throw new Error("Interview Location required for this stage")
      return await updateApplicantInStore(id, { stage, location: loc })
    }
    return await updateApplicantInStore(id, { stage })
  }

  if (location) {
    return await updateApplicantInStore(id, { location: normalizeLocationLabel(location) })
  }

  return existing
}

export async function addApplicantsByEmail(emails = []) {
  if (!Array.isArray(emails) || emails.length === 0) return []
  const created = await addApplicantsFromEmails(emails)
  return created
}

export async function attachFeedback({ id, files = [] }) {
  if (!id) throw new Error("Missing id")
  const before = await getApplicantById(id)
  if (!before) throw new Error("Applicant not found")

  const withFeedback = await addFeedbackFiles(id, files)

  const secondRound = String(before.stage).toLowerCase().includes("second")
  const alreadyHired = before.stage === "Hired"
  let nextStage = withFeedback.stage

  if (!alreadyHired) {
    if (secondRound && withFeedback.stage !== "Reviewed (2nd)") nextStage = "Reviewed (2nd)"
    if (!secondRound && withFeedback.stage !== "Reviewed") nextStage = "Reviewed"
  }

  if (nextStage !== withFeedback.stage) {
    return await updateApplicantInStore(id, { stage: nextStage })
  }
  return withFeedback
}
