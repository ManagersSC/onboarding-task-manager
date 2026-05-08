import { cookies } from "next/headers"
import { unsealData } from "iron-session"
import Airtable from "airtable"
import logger from "@/lib/utils/logger"
import { logAuditEvent } from "@/lib/auditLogger"
import { createNotification } from "@/lib/notifications"
import { NOTIFICATION_TYPES } from "@/lib/notification-types"

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

export async function POST(request, { params }) {
  try {
    const { id } = await params
    if (!id) return new Response(JSON.stringify({ error: "Applicant ID required" }), { status: 400, headers: { "Content-Type": "application/json" } })

    const cookieStore = await cookies()
    const sealedSession = cookieStore.get("session")?.value
    if (!sealedSession) return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { "Content-Type": "application/json" } })
    const session = await unsealData(sealedSession, { password: process.env.SESSION_SECRET })
    if (!session || session.userRole !== "admin") return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } })

    const body = await request.json().catch(() => ({}))
    const newStage = String(body?.newStage || "").trim()
    const source = String(body?.source || "Stage Override").trim()
    if (!newStage) return new Response(JSON.stringify({ error: "newStage is required" }), { status: 400, headers: { "Content-Type": "application/json" } })

    // Get existing stage and name for audit + notifications
    const applicantRec = await base("Applicants").find(id)
    const prevStage = applicantRec.get("Stage") || ""
    const applicantName = applicantRec.get("Name") || "Unknown"

    // Update stage
    await base("Applicants").update([{ id, fields: { Stage: newStage } }])

    // Audit
    try {
      await logAuditEvent({
        eventType: "Applicant Stage Update",
        eventStatus: "Success",
        userName: session.userName,
        userRole: session.userRole,
        userIdentifier: session.userEmail,
        detailedMessage: `Stage override (${source}): ${prevStage || "—"} → ${newStage} for applicant ${id}`,
        request
      })
    } catch (e) {
      logger?.error?.("audit log failed for stage override", e)
    }

    // Notify all admins of the stage change
    try {
      const adminRecs = await base("Staff")
        .select({ filterByFormula: "{IsAdmin} = TRUE()", fields: ["Name"] })
        .firstPage()
      if (adminRecs.length > 0) {
        await Promise.all(
          adminRecs.map((admin) =>
            createNotification({
              title: "Applicant Stage Updated",
              body: `${applicantName}: stage changed from "${prevStage || "none"}" to "${newStage}".`,
              type: NOTIFICATION_TYPES.APPLICANT_STAGE_UPDATED,
              severity: "Info",
              recipientId: admin.id,
              actionUrl: "/admin/users",
              source: "Applicant Drawer",
            })
          )
        )
      }
    } catch (e) {
      logger?.error?.("createNotification failed for stage update — all admins", e)
    }

    return new Response(JSON.stringify({ success: true, id, prevStage, newStage }), { status: 200, headers: { "Content-Type": "application/json" } })
  } catch (error) {
    logger?.error?.("stage update failed", error)
    return new Response(JSON.stringify({ error: "Failed to update stage" }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
}
