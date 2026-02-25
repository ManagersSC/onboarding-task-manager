import { cookies } from "next/headers"
import { unsealData } from "iron-session"
import { createNotification } from "@/lib/notifications"
import { NOTIFICATION_TYPES } from "@/lib/notification-types"
import Airtable from "airtable"
import fetch from "node-fetch"
import logger from "@/lib/utils/logger"

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

/**
 * GET /api/admin/notifications/test
 *
 * Diagnostic endpoint: fires a test notification for the requesting admin and
 * separately tests the Make.com webhook directly.
 *
 * Returns a JSON report of what succeeded and what failed, so you can identify
 * where in the pipeline a problem exists without waiting for a real event.
 */
export async function GET() {
  // 1. Auth — admins only
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get("session")?.value
  if (!sessionCookie) {
    return Response.json({ error: "Not authenticated" }, { status: 401 })
  }

  let session
  try {
    session = await unsealData(sessionCookie, {
      password: process.env.SESSION_SECRET,
      ttl: 60 * 60 * 8,
    })
  } catch {
    return Response.json({ error: "Invalid session" }, { status: 401 })
  }

  if (session.userRole !== "admin" && session.userRole !== "Admin") {
    return Response.json({ error: "Admin only" }, { status: 403 })
  }

  const userEmail = session.userEmail
  const report = {
    userEmail,
    airtableInApp: { ok: false, error: null },
    makeWebhook: { ok: false, error: null, configured: !!process.env.MAKE_WEBHOOK_URL_NOTIFICATIONS },
  }

  // 2. Look up staff record by email
  let staffId
  try {
    const staffRecs = await base("Staff")
      .select({
        filterByFormula: `{Email} = '${userEmail.replace(/'/g, "''")}'`,
        maxRecords: 1,
        fields: ["Name"],
      })
      .firstPage()

    if (!staffRecs || staffRecs.length === 0) {
      return Response.json({
        ...report,
        error: `No Staff record found for email=${userEmail}. Cannot test notification.`,
      }, { status: 404 })
    }
    staffId = staffRecs[0].id
  } catch (err) {
    return Response.json({
      ...report,
      error: `Staff lookup failed: ${err.message}`,
    }, { status: 500 })
  }

  // 3. Test in-app notification creation via createNotification()
  //    This exercises the full preference check + Airtable write path.
  const result = await createNotification({
    title: "Test Notification",
    body: `Diagnostic test sent at ${new Date().toISOString()} by ${userEmail}`,
    type: NOTIFICATION_TYPES.ANNOUNCEMENT,
    severity: "Info",
    recipientId: staffId,
    source: "Diagnostic",
  })

  report.airtableInApp.ok = result.ok
  if (!result.ok) {
    report.airtableInApp.error = result.error || "createNotification returned ok=false"
    logger.warn(`[notifications/test] in-app notification failed: ${result.error}`)
  }

  // 4. Test Make.com webhook directly (regardless of createNotification result)
  if (process.env.MAKE_WEBHOOK_URL_NOTIFICATIONS) {
    try {
      const webhookRes = await fetch(process.env.MAKE_WEBHOOK_URL_NOTIFICATIONS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Webhook Test",
          body: `Direct webhook test from diagnostic endpoint at ${new Date().toISOString()}`,
          type: NOTIFICATION_TYPES.ANNOUNCEMENT,
          severity: "Info",
          recipientId: staffId,
          channels: ["Email"],
          source: "Diagnostic",
        }),
      })
      report.makeWebhook.ok = webhookRes.ok
      if (!webhookRes.ok) {
        report.makeWebhook.error = `HTTP ${webhookRes.status}: ${await webhookRes.text()}`
      }
    } catch (err) {
      report.makeWebhook.ok = false
      report.makeWebhook.error = err.message
    }
  }

  // 5. Also check: does the user have ANNOUNCEMENT in their Notification Preferences?
  //    If not, the in-app notification was skipped (ok=true but nothing created).
  try {
    const staffRec = await base("Staff")
      .select({ filterByFormula: `RECORD_ID() = '${staffId}'`, maxRecords: 1, fields: ["Notification Preferences", "Notification Channels"] })
      .firstPage()
    if (staffRec[0]) {
      report.staffPreferences = staffRec[0].fields["Notification Preferences"] || []
      report.staffChannels = staffRec[0].fields["Notification Channels"] || []
      if (!report.staffPreferences.includes(NOTIFICATION_TYPES.ANNOUNCEMENT)) {
        report.airtableInApp.warning =
          `'${NOTIFICATION_TYPES.ANNOUNCEMENT}' is not in your Notification Preferences — ` +
          `in-app record was skipped (this is expected behaviour). Add it to test end-to-end.`
      }
    }
  } catch {
    // non-fatal, just skip the preferences check
  }

  const allOk = report.airtableInApp.ok && (!report.makeWebhook.configured || report.makeWebhook.ok)
  return Response.json({ allOk, ...report }, { status: allOk ? 200 : 207 })
}
