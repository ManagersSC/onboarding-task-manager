import { cookies } from "next/headers"
import { unsealData } from "iron-session"
import Airtable from "airtable"
import logger from "@/lib/utils/logger"
import { logAuditEvent } from "@/lib/auditLogger"

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
    const dateStr = String(body?.date || "").trim() // expects YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return new Response(JSON.stringify({ error: "Invalid date format (expected YYYY-MM-DD)" }), { status: 400, headers: { "Content-Type": "application/json" } })
    }

    // Update Applicants.'Appraisal Date'
    await base("Applicants").update([{ id, fields: { "Appraisal Date": dateStr } }])

    try {
      await logAuditEvent({
        eventType: "Appraisal Date Update",
        eventStatus: "Success",
        userName: session.userName,
        userRole: session.userRole,
        userIdentifier: session.userEmail,
        detailedMessage: `Set Appraisal Date to ${dateStr} for applicant ${id}`,
        request
      })
    } catch (e) {
      logger?.error?.("audit log failed for appraisal date update", e)
    }

    return new Response(JSON.stringify({ success: true, id, appraisalDate: dateStr }), { status: 200, headers: { "Content-Type": "application/json" } })
  } catch (error) {
    logger?.error?.("appraisal date update failed", error)
    return new Response(JSON.stringify({ error: "Failed to update appraisal date" }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
}


