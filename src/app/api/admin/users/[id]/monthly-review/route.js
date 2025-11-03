import { cookies } from "next/headers"
import { unsealData } from "iron-session"
import Airtable from "airtable"
import logger from "@/lib/utils/logger"
import { logAuditEvent } from "@/lib/auditLogger"
import { createNotification } from "@/lib/notifications"

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

export async function POST(request, { params }) {
  try {
    const { id } = await params
    if (!id) {
      return new Response(JSON.stringify({ error: "Applicant ID required" }), { status: 400 })
    }

    const cookieStore = await cookies()
    const sealedSession = cookieStore.get("session")?.value
    if (!sealedSession) return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 })
    const session = await unsealData(sealedSession, { password: process.env.SESSION_SECRET })
    if (!session || session.userRole !== "admin") return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })

    const body = await request.json().catch(() => ({}))
    const dateStr = String(body?.date || "").trim()
    const startTime = String(body?.startTime || "").trim()
    const endTime = String(body?.endTime || "").trim()
    const title = String(body?.title || "Monthly Review").trim()
    if (!dateStr) return new Response(JSON.stringify({ error: "date is required (YYYY-MM-DD)" }), { status: 400 })

    // Fetch existing field to append
    const rec = await base("Applicants").find(id)
    const existing = rec.get("Monthly Review Dates") || ""
    const scheduleLine = startTime && endTime ? `${dateStr} ${startTime}-${endTime} • ${title}` : `${dateStr} • ${title}`
    const toAppend = existing ? `${existing}\n${scheduleLine}` : scheduleLine

    await base("Applicants").update(id, { "Monthly Review Dates": toAppend })

    try {
      await logAuditEvent({
        eventType: "Monthly Review Scheduled",
        eventStatus: "Success",
        userName: session.userName,
        userRole: session.userRole,
        userIdentifier: session.userEmail,
        detailedMessage: `Scheduled monthly review for applicant ${id} on ${dateStr} ${startTime && endTime ? `${startTime}-${endTime}` : ""} • ${title}`,
      })
    } catch (e) {
      logger?.error?.("audit log failed for monthly review", e)
    }

    // Try to notify acting staff (if Staff record exists)
    try {
      const staffRecs = await base("Staff").select({ filterByFormula: `{Email}='${String(session.userEmail).toLowerCase()}'`, maxRecords: 1 }).firstPage()
      const staff = staffRecs?.[0]
      if (staff) {
        await createNotification({
          title: "Monthly Review Scheduled",
          body: `${title} on ${dateStr}${startTime && endTime ? ` ${startTime}-${endTime}` : ""}`,
          type: "Monthly Review",
          severity: "Info",
          recipientId: staff.id,
          actionUrl: "/admin/users",
          source: "Applicant Drawer",
        })
      }
    } catch (e) {
      logger?.error?.("createNotification failed for monthly review", e)
    }

    return new Response(JSON.stringify({ success: true, date: dateStr, startTime, endTime, title }), { status: 200, headers: { "Content-Type": "application/json" } })
  } catch (err) {
    logger?.error?.("monthly-review schedule failed", err)
    return new Response(JSON.stringify({ error: "Failed to schedule monthly review" }), { status: 500 })
  }
}


