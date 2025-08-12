export const STAGES = [
  "New Application",
  "First Interview Invite Sent",
  "First Interview Booked",
  "Under Review",
  "Reviewed",
  "Second Interview Invite Sent",
  "Second Interview Booked",
  "Reviewed (2nd)",
  "Hired",
  "Interview Cancelled",
  "Interview Rescheduled",
  "Second Interview Finished",
  "Second Interview Cancelled",
  "Rejected",
  "Rejected - After First Interview",
  "Rejected - After Second Interview",
  "Rejected - Liked",
  "Proposal Documents Sent ",
  "Received Proposal Documents",
]

export function isInviteStage(stage) {
  return stage === "First Interview Invite Sent" || stage === "Second Interview Invite Sent"
}

export function inviteStageNeedsLocation(stage) {
  return isInviteStage(stage)
}

// Map UI options to Airtable values.
export function normalizeLocationLabel(input) {
  if (!input) return null
  const val = String(input).toLowerCase().trim()
  if (val === "finchley" || val === "finchley branch") return "Finchley Branch"
  if (val === "st johns wood" || val === "sjw" || val === "st johns wood branch") return "St Johns Wood Branch"
  if (val === "online") return "Online"
  return input
}

export function displayOrder(stage) {
  const order = [
    "New Application",
    "First Interview Invite Sent",
    "First Interview Booked",
    "Under Review",
    "Reviewed",
    "Second Interview Invite Sent",
    "Second Interview Booked",
    "Reviewed (2nd)",
    "Hired",
  ]
  const idx = order.indexOf(stage)
  return idx === -1 ? 999 : idx
}

export function stageColor(stage) {
  const map = {
    "New Application": "bg-teal-100 text-teal-900 dark:bg-teal-900/30 dark:text-teal-200",
    "First Interview Invite Sent": "bg-cyan-100 text-cyan-900 dark:bg-cyan-900/30 dark:text-cyan-200",
    "First Interview Booked": "bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-200",
    "Under Review": "bg-yellow-100 text-yellow-900 dark:bg-yellow-900/30 dark:text-yellow-200",
    Reviewed: "bg-orange-100 text-orange-900 dark:bg-orange-900/30 dark:text-orange-200",
    "Second Interview Invite Sent": "bg-purple-100 text-purple-900 dark:bg-purple-900/30 dark:text-purple-200",
    "Second Interview Booked": "bg-purple-100 text-purple-900 dark:bg-purple-900/30 dark:text-purple-200",
    "Reviewed (2nd)": "bg-indigo-100 text-indigo-900 dark:bg-indigo-900/30 dark:text-indigo-200",
    Hired: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200",
  }
  return map[stage] || ""
}
