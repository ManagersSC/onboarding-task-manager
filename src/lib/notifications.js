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
 * @param {string} options.type - Notification type (must match single select in Airtable)
 * @param {string} options.severity - Notification severity (must match single select in Airtable)
 * @param {string} options.recipientId - Airtable record ID of the Staff user
 * @param {string} [options.actionUrl] - Optional action URL
 * @param {string} [options.source] - Optional source (System, Webhook, etc.)
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
  try {
    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      throw new Error("Airtable environment variables are missing")
    }
    if (!recipientId) throw new Error("Recipient ID is required")

    // Fetch recipient's preferences from Staff table
    const staffRecords = await base("Staff")
      .select({ filterByFormula: `RECORD_ID() = '${recipientId}'`, maxRecords: 1 })
      .firstPage()
    const staff = staffRecords[0]
    if (!staff) throw new Error("Staff user not found")

    const preferences = staff.fields["Notification Preferences"] || []
    const channels = staff.fields["Notification Channels"] || []

    // Only notify if the type is enabled in preferences
    if (!preferences.includes(type)) {
      logger.info(`Notification type '${type}' not enabled for user ${recipientId}`)
      return
    }

    // Always create notification in Notifications table (in-app)
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

    // If Email or Slack is enabled, send to Make.com webhook
    const enabledChannels = channels.filter(c => c === "Email" || c === "Slack")
    if (enabledChannels.length > 0 && MAKE_WEBHOOK_URL_NOTIFICATIONS) {
      try {
        await fetch(MAKE_WEBHOOK_URL_NOTIFICATIONS, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            body,
            type,
            severity,
            actionUrl,
            source,
            recipientId,
            channels: enabledChannels
          })
        })
      } catch (err) {
        logger.error("Failed to send notification to Make.com webhook:", err)
      }
    }
  } catch (error) {
    logger.error("Notification creation failed:", error)
  }
} 