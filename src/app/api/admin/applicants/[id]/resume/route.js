import { cookies } from "next/headers"
import { unsealData } from "iron-session"
import Airtable from "airtable"
import logger from "@/lib/utils/logger"
import { logAuditEvent } from "@/lib/auditLogger"

export async function POST(request, { params }) {
  let userEmail, userRole, userName
  try {
    const sessionCookie = (await cookies()).get("session")?.value
    if (!sessionCookie) return Response.json({ error: "Unauthorised" }, { status: 401 })

    let session
    try {
      session = await unsealData(sessionCookie, { password: process.env.SESSION_SECRET, ttl: 60 * 60 * 8 })
    } catch (err) {
      return Response.json({ error: "Invalid Session" }, { status: 401 })
    }
    if (!session?.userEmail || session?.userRole !== "admin") return Response.json({ error: "Unauthorised" }, { status: 401 })
    userEmail = session.userEmail
    userRole = session.userRole
    userName = session.userName

    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      logger.error("Server configuration error: Missing Airtable credentials")
      return Response.json({ error: "Server configuration error" }, { status: 500 })
    }
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

    const applicantId = params.id
    let applicant
    try {
      applicant = await base("Applicants").find(applicantId)
    } catch (err) {
      return Response.json({ error: "Applicant not found" }, { status: 404 })
    }

    // Find current admin staff record
    const staff = await base("Staff").select({ filterByFormula: `{Email}='${userEmail}'`, maxRecords: 1 }).firstPage()
    const staffId = staff?.[0]?.id || null

    const fields = {
      "Onboarding Paused": false,
      "Onboarding Resumed At": new Date().toISOString(),
      ...(staffId ? { "Onboarding Resumed By": [staffId] } : {}),
    }

    await base("Applicants").update([{ id: applicantId, fields }])

    await logAuditEvent({
      eventType: "Onboarding Resumed",
      eventStatus: "Success",
      userRole,
      userName,
      userIdentifier: userEmail,
      detailedMessage: `Resumed onboarding for ${applicant.fields["Name"] || applicantId}`,
      request,
    })

    return Response.json({ success: true, paused: false })
  } catch (error) {
    logger.error("Resume onboarding error:", error)
    try {
      await logAuditEvent({
        eventType: "Onboarding Resumed",
        eventStatus: "Error",
        userRole: userRole || "Unknown",
        userName: userName || "Unknown",
        userIdentifier: userEmail || "Unknown",
        detailedMessage: error.message,
        request,
      })
    } catch {}
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}


