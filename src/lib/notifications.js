import Airtable from "airtable";
import logger from "./utils/logger";
import fetch from "node-fetch";

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID
);

const MAKE_WEBHOOK_URL_NOTIFICATIONS = process.env.MAKE_WEBHOOK_URL_NOTIFICATIONS;

/**
 * Creates a notification for a user, respecting their preferences and channel settings.
 *
 * @param {object} options
 * @param {string} options.title - Notification title
 * @param {string} options.body - Notification body/message
 * @param {string} options.type - Notification type — use a constant from src/lib/notification-types.js
 * @param {string} options.severity - "Info" | "Success" | "Warning" | "Critical"
 * @param {string} options.recipientId - Airtable record ID of the Staff user
 * @param {string} [options.actionUrl] - Optional action URL
 * @param {string} [options.source] - Optional source label (e.g. "Admin Panel", "System")
 *
 * @returns {{ ok: boolean, error?: string }}
 *   ok=true  → in-app notification created (webhook delivery is best-effort and does not affect this)
 *   ok=false → notification was not created; error contains the reason
 */
export async function createNotification({
  title,
  body,
  type,
  severity,
  recipientId,
  actionUrl,
  source
}) {
  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
    const msg = "Airtable environment variables are missing"
    logger.error(`[createNotification] ${msg}`)
    return { ok: false, error: msg }
  }

  if (!recipientId) {
    const msg = "Recipient ID is required"
    logger.error(`[createNotification] ${msg}`)
    return { ok: false, error: msg }
  }

  // Fetch recipient's preferences from Staff table
  let staff
  try {
    const staffRecords = await base("Staff")
      .select({ filterByFormula: `RECORD_ID() = '${recipientId}'`, maxRecords: 1 })
      .firstPage()
    staff = staffRecords[0]
  } catch (err) {
    const msg = `Failed to fetch Staff record for recipientId=${recipientId}: ${err.message}`
    logger.error(`[createNotification] ${msg}`)
    return { ok: false, error: msg }
  }

  if (!staff) {
    const msg = `Staff user not found for recipientId=${recipientId}`
    logger.warn(`[createNotification] ${msg}`)
    return { ok: false, error: msg }
  }

  const preferences = staff.fields["Notification Preferences"] || []
  const channels = staff.fields["Notification Channels"] || []

  // Only notify if the type is enabled in preferences
  if (!preferences.includes(type)) {
    logger.info(`[createNotification] type='${type}' not in preferences for recipientId=${recipientId} — skipping`)
    return { ok: true }
  }

  // Create in-app notification record in Notifications table
  try {
    await base("Notifications").create([
      {
        fields: {
          "Title": title,
          "Body": body,
          "Type": type,
          "Severity": severity,
          "Recipient": [recipientId],
          "Read": false,
          ...(actionUrl && { "Action URL": actionUrl }),
          ...(source && { "Source": source })
        }
      }
    ])
  } catch (err) {
    const msg = `Failed to create Notifications record: ${err.message}`
    logger.error(`[createNotification] ${msg}`, { type, recipientId })
    return { ok: false, error: msg }
  }

  // Best-effort: send to Make.com webhook for Email/Slack delivery
  const enabledChannels = channels.filter(c => c === "Email" || c === "Slack")
  if (enabledChannels.length > 0 && MAKE_WEBHOOK_URL_NOTIFICATIONS) {
    try {
      await fetch(MAKE_WEBHOOK_URL_NOTIFICATIONS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body: body.replace(/"/g, "\u2019"),
          type,
          severity,
          actionUrl,
          source,
          recipientId,
          channels: enabledChannels
        })
      })
    } catch (err) {
      // Webhook failure is non-fatal — in-app notification was already created
      logger.error("[createNotification] Failed to send to Make.com webhook:", err.message)
    }
  }

  return { ok: true }
}
