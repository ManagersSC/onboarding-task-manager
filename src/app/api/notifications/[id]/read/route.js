import Airtable from "airtable";
import { cookies } from "next/headers";
import { unsealData } from "iron-session";
import logger from "@/lib/utils/logger";

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

export async function PATCH(request, { params }) {
  try {
    logger.info("PATCH /api/notifications/:id/read called");
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session")?.value;
    if (!sessionCookie) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }
    let session;
    try {
      session = await unsealData(sessionCookie, {
        password: process.env.SESSION_SECRET,
        ttl: 60 * 60 * 8,
      });
    } catch (err) {
      return Response.json({ error: "Invalid session" }, { status: 401 });
    }
    logger.info('Session after unsealing:', session);
    const userName = session.userName;
    if (!userName) {
      return Response.json({ error: "No userName in session" }, { status: 401 });
    }

    const p = await params;
    const notificationId = p.id;
    if (!notificationId) {
      return Response.json({ error: "Notification ID required" }, { status: 400 });
    }

    // Update Read field to true
    await base("Notifications").update([{
      id: notificationId,
      fields: { "Read": true },
    }]);

    // Fetch the updated notification
    let updatedNotification = null;
    try {
      const rec = await base("Notifications").find(notificationId);
      updatedNotification = {
        id: rec.id,
        title: rec.fields["Title"] || "",
        body: rec.fields["Body"] || "",
        type: rec.fields["Type"] || "",
        severity: rec.fields["Severity"] || "",
        read: rec.fields["Read"] || false,
        actionUrl: rec.fields["Action URL"] || null,
        source: rec.fields["Source"] || null,
        createdAt: rec.fields["Created At"] || null,
        updatedAt: rec.fields["Updated At"] || null,
        recipient: rec.fields["Recipient"] || null,
      };
    } catch (e) {
      logger.error("Failed to fetch updated notification", e);
    }

    logger.info(`Notification ${notificationId} marked as read by user ${userName}`);
    return Response.json({ success: true, notification: updatedNotification });
  } catch (error) {
    logger.error("Failed to mark notification as read:", error);
    return Response.json({ error: error.message || "Failed to mark notification as read" }, { status: 500 });
  }
} 