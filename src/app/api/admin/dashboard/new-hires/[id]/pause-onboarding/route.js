import { cookies } from "next/headers"
import { unsealData } from "iron-session"
import Airtable from "airtable"
import logger from "@/lib/utils/logger"
import { logAuditEvent } from "@/lib/auditLogger"

export async function POST(request, { params }) {
  let userEmail, userRole, userName, userStaffId
  try {
    // 1) Validate session and admin access
    const sessionCookie = (await cookies()).get("session")?.value
    if (!sessionCookie) {
      return Response.json({ error: "Unauthorised" }, { status: 401 })
    }

    let session
    try {
      session = await unsealData(sessionCookie, {
        password: process.env.SESSION_SECRET,
        ttl: 60 * 60 * 8,
      })
    } catch (err) {
      return Response.json({ error: "Invalid Session" }, { status: 401 })
    }

    userRole = session.userRole
    if (userRole !== "admin") {
      return Response.json({ error: "Unauthorised" }, { status: 401 })
    }

    userEmail = session.userEmail
    userName = session.userName
    userStaffId = session.userStaffId

    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      logger.error("Missing Airtable envs")
      return Response.json({ error: "Server configuration error" }, { status: 500 })
    }

    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

    // 2) Parse body
    const { action, reason, resumeOnDate, resumeAtDate } = await request.json()
    if (!action || !["pause", "resume"].includes(action)) {
      return Response.json({ error: "Invalid action" }, { status: 400 })
    }

    // 3) Ensure applicant exists
    const p = await params
    const applicantId = p.id
    let applicantRecord
    try {
      applicantRecord = await base("Applicants").find(applicantId)
    } catch (err) {
      return Response.json({ error: "Applicant not found" }, { status: 404 })
    }

    const nowIso = new Date().toISOString()

    // 4) Build update fields
    let fieldsToUpdate = {}
    if (action === "pause") {
      fieldsToUpdate = {
        "Onboarding Paused": true,
        "Onboarding Paused At": nowIso,
        ...(userStaffId ? { "Onboarding Paused By": [userStaffId] } : {}),
        ...(reason ? { "Onboarding Paused Reason": reason } : {}),
        ...(resumeOnDate ? { "Onboarding Resumed On": resumeOnDate } : {}),
      }
    } else if (action === "resume") {
      const resumeAtIso = resumeAtDate ? new Date(`${resumeAtDate}T00:00:00.000Z`).toISOString() : nowIso
      fieldsToUpdate = {
        "Onboarding Paused": false,
        "Onboarding Resumed At": resumeAtIso,
        ...(userStaffId ? { "Onboarding Resumed By": [userStaffId] } : {}),
      }
    }

    // 5) Perform update
    const updated = await base("Applicants").update([
      { id: applicantId, fields: fieldsToUpdate },
    ])

    const updatedRecord = updated?.[0]

    // 6) Prepare response payload
    const responseRecord = {
      id: applicantId,
      onboardingPaused: !!updatedRecord?.get?.("Onboarding Paused") || fieldsToUpdate["Onboarding Paused"] === true,
      pausedAt: updatedRecord?.get?.("Onboarding Paused At") || (action === "pause" ? nowIso : undefined),
      pausedReason: updatedRecord?.get?.("Onboarding Paused Reason") || (action === "pause" ? reason : undefined),
      resumedAt: updatedRecord?.get?.("Onboarding Resumed At") || (action === "resume" ? (resumeAtDate ? new Date(`${resumeAtDate}T00:00:00.000Z`).toISOString() : nowIso) : undefined),
      resumedOnDate: updatedRecord?.get?.("Onboarding Resumed On") || (action === "pause" ? resumeOnDate : undefined),
      // Names will be best-effort; for immediate UX, return actor names from session
      pausedByName: action === "pause" ? (userName || "Admin") : undefined,
      resumedByName: action === "resume" ? (userName || "Admin") : undefined,
    }

    // 7) Audit log
    try {
      await logAuditEvent({
        eventType: action === "pause" ? "Onboarding Paused" : "Onboarding Resumed",
        eventStatus: "Success",
        userRole,
        userName,
        userIdentifier: userEmail,
        detailedMessage:
          action === "pause"
            ? `Admin ${userName} paused onboarding for ${applicantRecord.get("Name")}${reason ? ` — Reason: ${reason}` : ""}`
            : `Admin ${userName} resumed onboarding for ${applicantRecord.get("Name")}`,
        request,
      })
    } catch (e) {
      logger.error("Failed to log audit event for pause/resume", e)
    }

    // 8) Return
    return Response.json({
      success: true,
      message: action === "pause" ? "Onboarding paused" : "Onboarding resumed",
      record: responseRecord,
    })
  } catch (error) {
    logger.error("pause-onboarding error:", error)
    return Response.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}


