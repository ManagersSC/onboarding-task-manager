import Airtable from "airtable";
import { cookies } from "next/headers";
import { unsealData } from "iron-session";
import logger from "@/lib/utils/logger";

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

// Helper to batch updates in groups of 10
async function batchUpdateNotifications(updates) {
  const batchSize = 10;
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);
    await base("Notifications").update(batch);
  }
}

export async function PATCH(request) {
  try {
    logger.info("PATCH /api/notifications/mark-all-read called");
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
    const userName = session.userName;
    if (!userName) {
      return Response.json({ error: "No userName in session" }, { status: 401 });
    }

    // 2. Fetch all unread notifications for this user
    const filterFormula = `AND({Recipient} = '${userName}', {Read} = FALSE())`;
    logger.info('Using userName:', userName);
    logger.info('Filter formula:', filterFormula);
    const records = await base("Notifications")
      .select({
        filterByFormula: filterFormula,
        fields: ["Read"],
        pageSize: 100,
      })
      .all();

    if (records.length === 0) {
      logger.info(`No unread notifications to update for user ${userName}`);
      return Response.json({ success: true, updated: 0 });
    }

    // 3. Update all to Read = true (in batches of 10)
    const updates = records.map((rec) => ({
      id: rec.id,
      fields: { "Read": true },
    }));
    await batchUpdateNotifications(updates);
    logger.info(`Marked ${updates.length} notifications as read for user ${userName}`);

    // Fetch updated notifications (limit to first 20 for response)
    let updated = [];
    try {
      const updatedIds = updates.slice(0, 20).map(u => u.id);
      const fetchPromises = updatedIds.map(id => base("Notifications").find(id));
      const updatedRecords = await Promise.all(fetchPromises);
      updated = updatedRecords.map(rec => ({
        id: rec.id,
        updatedAt: rec.fields["Updated At"] || null,
      }));
    } catch (e) {
      logger.error("Failed to fetch updated notifications after mark-all-read", e);
    }

    return Response.json({ success: true, updated, updatedCount: updates.length });
  } catch (error) {
    logger.error("Failed to mark all notifications as read:", error);
    return Response.json({ error: error.message || "Failed to mark all notifications as read" }, { status: 500 });
  }
} 