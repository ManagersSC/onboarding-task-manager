import { cookies } from "next/headers"
import { unsealData } from "iron-session"
import Airtable from "airtable"
import { logAuditEvent } from "@/lib/auditLogger"

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

const VALID_ROLES = ["Nurse", "Receptionist", "Dentist"]

async function getAdminSession() {
  const cookieStore = await cookies()
  const sealedSession = cookieStore.get("session")?.value
  if (!sealedSession) return null
  const session = await unsealData(sealedSession, { password: process.env.SESSION_SECRET })
  if (!session || session.userRole !== "admin") return null
  return session
}

export async function POST(request, { params }) {
  let userEmail, userRole, userName

  try {
    const session = await getAdminSession()
    if (!session) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } })

    userEmail = session.userEmail
    userRole = session.userRole
    userName = session.userName || userEmail?.split("@")[0]

    const { quizId } = await params
    if (!quizId) return new Response(JSON.stringify({ error: "quizId required" }), { status: 400, headers: { "Content-Type": "application/json" } })

    const body = await request.json().catch(() => ({}))
    let roles = Array.isArray(body.roles) ? body.roles.filter(r => VALID_ROLES.includes(r)) : []

    // If no roles provided in body, fall back to the quiz's own Target Roles field
    if (roles.length === 0) {
      const quizRec = await base("Onboarding Quizzes").find(quizId)
      const targetRole = quizRec.get("Target Roles") || null
      if (targetRole) roles = [targetRole]
    }

    if (roles.length === 0) {
      return new Response(JSON.stringify({ error: "No valid roles provided and quiz has no Target Roles set" }), { status: 400, headers: { "Content-Type": "application/json" } })
    }

    // Build formula to find applicants matching any of the target roles
    // Job Name (fldd0RHjePJFSOoQP) is a lookup field — use field name in formula
    const roleConditions = roles.map(r => `{Job Name} = '${r}'`).join(", ")
    const roleFormula = roles.length === 1 ? roleConditions : `OR(${roleConditions})`

    const applicants = await base("Applicants")
      .select({
        filterByFormula: roleFormula,
        fields: ["Email", "fldd0RHjePJFSOoQP"],
      })
      .all()

    if (applicants.length === 0) {
      return new Response(JSON.stringify({ created: 0, skipped: 0, roles, message: "No applicants found for the given roles" }), { status: 200, headers: { "Content-Type": "application/json" } })
    }

    // Check which applicants already have a task log for this quiz (avoid duplicates)
    const applicantIds = applicants.map(a => a.id)
    const existingLogs = await base("Onboarding Tasks Logs")
      .select({
        filterByFormula: `AND(FIND('${quizId}', ARRAYJOIN({Onboarding Quizzes})), OR(${applicantIds.map(id => `FIND('${id}', ARRAYJOIN({Assigned}))`).join(", ")}))`,
        fields: ["Assigned"],
      })
      .all()

    const alreadyAssignedIds = new Set(
      existingLogs.flatMap(log => log.get("Assigned") || [])
    )

    const toAssign = applicants.filter(a => !alreadyAssignedIds.has(a.id))

    if (toAssign.length === 0) {
      return new Response(JSON.stringify({ created: 0, skipped: applicants.length, roles }), { status: 200, headers: { "Content-Type": "application/json" } })
    }

    // Create task log records in chunks of 10 (Airtable limit)
    const records = toAssign.map(applicant => {
      const jobNameField = applicant.get("Job Name")
      const jobName = Array.isArray(jobNameField) ? jobNameField[0] || "" : jobNameField || ""
      return {
        fields: {
          "Assigned": [applicant.id],
          "Onboarding Quizzes": [quizId],
          "Status": "Assigned",
          "Applicant Job": jobName,
        }
      }
    })

    const chunkSize = 10
    for (let i = 0; i < records.length; i += chunkSize) {
      await base("Onboarding Tasks Logs").create(records.slice(i, i + chunkSize))
    }

    await logAuditEvent({
      eventType: "Quiz Bulk Assigned",
      eventStatus: "Success",
      userRole,
      userName,
      userIdentifier: userEmail,
      detailedMessage: `Admin: ${userName}. Quiz ${quizId} bulk-assigned to ${toAssign.length} applicant(s) with role(s): ${roles.join(", ")}. Skipped ${alreadyAssignedIds.size} existing assignment(s).`,
      request,
    })

    return new Response(
      JSON.stringify({ created: toAssign.length, skipped: applicants.length - toAssign.length, roles }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  } catch (e) {
    await logAuditEvent({
      eventType: "Quiz Bulk Assigned",
      eventStatus: "Error",
      userRole: userRole || "Unknown",
      userName: userName || "Unknown",
      userIdentifier: userEmail || "Unknown",
      detailedMessage: `Failed to bulk-assign quiz: ${e?.message || "Unknown error"}`,
      request,
    })
    return new Response(JSON.stringify({ error: "Failed to bulk assign quiz" }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
}
