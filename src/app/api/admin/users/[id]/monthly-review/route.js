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

    // Fetch applicant name for notification message
    const applicantRecs = await base("Applicants")
      .select({ filterByFormula: `RECORD_ID() = '${id}'`, fields: ["Name"], maxRecords: 1 })
      .firstPage()
    const applicantName = applicantRecs?.[0]?.get?.("Name") || "Unknown"

    // Create Monthly Reviews record instead of appending free-text
    const period = `${dateStr.slice(0, 7)}` // YYYY-MM
    const startDateTime = startTime ? `${dateStr}T${startTime}:00` : null
    const endDateTime = endTime ? `${dateStr}T${endTime}:00` : null

    const created = await base("Monthly Reviews").create([
      {
        fields: {
          Applicant: [id],
          Title: title,
          Period: period,
          ...(startDateTime ? { Start: new Date(startDateTime).toISOString() } : {}),
          ...(endDateTime ? { End: new Date(endDateTime).toISOString() } : {}),
        },
      },
    ])
    const review = created?.[0]

    try {
      await logAuditEvent({
        eventType: "Monthly Review Scheduled",
        eventStatus: "Success",
        userName: session.userName,
        userRole: session.userRole,
        userIdentifier: session.userEmail,
        detailedMessage: `Scheduled monthly review (reviewId: ${review?.id}) for applicant ${id} on ${dateStr} ${startTime && endTime ? `${startTime}-${endTime}` : ""} • ${title}`,
      })
    } catch (e) {
      logger?.error?.("audit log failed for monthly review", e)
    }

    // Notify all admins of the scheduled monthly review
    try {
      const adminRecs = await base("Staff")
        .select({ filterByFormula: "{IsAdmin} = TRUE()", fields: ["Name"] })
        .firstPage()
      if (adminRecs.length > 0) {
        await Promise.all(
          adminRecs.map((admin) =>
            createNotification({
              title: "Monthly Review Scheduled",
              body: `${applicantName} has a monthly review scheduled for ${dateStr}${startTime && endTime ? ` ${startTime}–${endTime}` : ""}.`,
              type: NOTIFICATION_TYPES.MONTHLY_REVIEW,
              severity: "Info",
              recipientId: admin.id,
              actionUrl: "/admin/users",
              source: "Applicant Drawer",
            })
          )
        )
      }
    } catch (e) {
      logger?.error?.("createNotification failed for monthly review — all admins", e)
    }

    return new Response(
      JSON.stringify({ success: true, date: dateStr, startTime, endTime, title, period, reviewId: review?.id }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  } catch (err) {
    logger?.error?.("monthly-review schedule failed", err)
    return new Response(JSON.stringify({ error: "Failed to schedule monthly review" }), { status: 500 })
  }
}


