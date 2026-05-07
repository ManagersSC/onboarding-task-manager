import Airtable from "airtable"
import jwt from "jsonwebtoken"
import { cookies } from "next/headers"
import { unsealData } from "iron-session"
import logger from "@/lib/utils/logger"
import { logAuditEvent } from "@/lib/auditLogger"
import { escapeAirtableValue } from "@/lib/airtable/sanitize"

export async function POST(request) {
  let requesterEmail = "Unknown"
  let requesterRole = "Unknown"
  try {
    // Authorize admin
    const sessionCookie = (await cookies()).get("session")?.value
    if (!sessionCookie) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    let session
    try {
      session = await unsealData(sessionCookie, { password: process.env.SESSION_SECRET })
    } catch (err) {
      return Response.json({ error: "Invalid session" }, { status: 401 })
    }

    requesterEmail = session?.userEmail || "Unknown"
    requesterRole = session?.userRole || "Unknown"
    if (session?.userRole !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }

    const { name, email } = await request.json()
    const normalisedName = String(name || "").trim()
    if (!normalisedName || !email) {
      return Response.json({ error: "Name and email are required" }, { status: 400 })
    }

    const normalisedEmail = String(email).trim().toLowerCase()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(normalisedEmail)) {
      return Response.json({ error: "Invalid email address" }, { status: 400 })
    }

    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      logger.error("Missing Airtable env vars")
      return Response.json({ error: "Server configuration error" }, { status: 500 })
    }

    if (!process.env.JWT_SECRET) {
      logger.error("JWT_SECRET not configured")
      return Response.json({ error: "Server configuration error" }, { status: 500 })
    }

    if (!process.env.MAKE_WEBHOOK_URL_ADMIN_PASSWORD_PAGE) {
      logger.error("MAKE_WEBHOOK_URL_ADMIN_PASSWORD_PAGE not configured")
      return Response.json({ error: "Server configuration error" }, { status: 500 })
    }

    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

    // Check Staff table for existing record
    const existing = await base("Staff")
      .select({ filterByFormula: `{Email}='${escapeAirtableValue(normalisedEmail)}'`, maxRecords: 1 })
      .firstPage()

    let staffId
    let alreadyConfigured = false
    let createdInThisRequest = false
    if (existing.length > 0) {
      staffId = existing[0].id
      alreadyConfigured = Boolean(existing[0].fields?.Password)
      // Warn if promoting an existing non-admin staff record to admin
      if (!alreadyConfigured && !existing[0].fields?.IsAdmin) {
        logger.warn("invite-admin: promoting existing non-admin Staff record to admin", { staffId, email: normalisedEmail })
      }
    } else {
      const created = await base("Staff").create([
        {
          fields: {
            Name: normalisedName,
            Email: normalisedEmail,
            IsAdmin: true,
            Password: "", // pending until invite accepted
          },
        },
      ])
      staffId = created[0].id
      createdInThisRequest = true
    }

    if (alreadyConfigured) {
      return Response.json({ error: "User already has an admin account" }, { status: 400 })
    }

    // VULN-H7: Generate invite nonce for single-use token
    const inviteNonce = crypto.randomUUID()
    await base("Staff").update([{
      id: staffId,
      fields: {
        Name: normalisedName, // keep Name current on re-invite
        "Invite Nonce": inviteNonce,
      },
    }])

    // Create 24h invite token
    const token = jwt.sign({ staffId, email: normalisedEmail, type: "admin_invite", nonce: inviteNonce }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    })

    // VULN-L4: Require a known base URL in production to prevent host header injection.
    // APP_BASE_URL takes precedence; falls back to NEXT_PUBLIC_APP_URL (set on Vercel).
    const envBase = (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "").trim()
    if (!envBase && process.env.NODE_ENV === "production") {
      logger.error("APP_BASE_URL or NEXT_PUBLIC_APP_URL is required in production for invite links")
      return Response.json({ error: "Server configuration error" }, { status: 500 })
    }
    const baseUrl = envBase || `http://localhost:3000`
    const inviteLink = `${baseUrl}/accept-admin-invite?token=${encodeURIComponent(token)}`

    // Notify via Make.com webhook
    const payload = {
      name: normalisedName,
      email: normalisedEmail,
      inviteLink,
      requestedBy: requesterEmail,
      requestedAt: new Date().toISOString(),
    }

    const webhookRes = await fetch(process.env.MAKE_WEBHOOK_URL_ADMIN_PASSWORD_PAGE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const webhookBody = await webhookRes.json().catch(() => null)
    if (!webhookRes.ok) {
      const makeError = webhookBody?.error || "Unknown error"
      logger.error("Admin invite webhook failed", { status: webhookRes.status, body: webhookBody })
      // Rollback: remove the Staff record if we just created it so Airtable stays clean
      if (createdInThisRequest) {
        await base("Staff").destroy([staffId]).catch((e) =>
          logger.error("Failed to rollback Staff record after webhook failure", { staffId, error: e.message })
        )
      }
      return Response.json({ error: `Failed to trigger invite email: ${makeError}` }, { status: 502 })
    }

    try {
      await logAuditEvent({
        eventType: "User",
        eventStatus: "Success",
        userRole: requesterRole,
        userName: session?.userName || "Unknown",
        userIdentifier: requesterEmail,
        detailedMessage: `Admin invite sent to ${normalisedEmail}`,
        request,
      })
    } catch {}

    return Response.json({ message: "Invite sent", staffId })
  } catch (error) {
    logger.error("Error in invite-admin:", error)
    try {
      await logAuditEvent({
        eventType: "Server",
        eventStatus: "Error",
        userRole: requesterRole,
        userIdentifier: requesterEmail,
        detailedMessage: `Admin invite failed: ${error.message}`,
        request,
      })
    } catch {}
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}


