import Airtable from "airtable";
import { cookies } from "next/headers";
import { unsealData } from "iron-session";
import logger from "@/lib/utils/logger";

// Airtable setup
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

// Helper to get current user's Airtable record ID from session
async function getCurrentUserId() {
  const cookieStore = await cookies();
  const sealedSession = cookieStore.get("session")?.value;
  if (!sealedSession) throw new Error("Not authenticated");
  const session = await unsealData(sealedSession, { password: process.env.SESSION_SECRET });
  if (!session.userEmail) throw new Error("No user email in session");
  // Find staff record by email
  const staffRecords = await base("Staff")
    .select({ filterByFormula: `{Email} = '${session.userEmail.toLowerCase().trim()}'`, maxRecords: 1 })
    .firstPage();
  if (!staffRecords.length) throw new Error("Staff user not found");
  logger.info(`[Notifications API] User email: ${session.userEmail}, Staff record ID: ${staffRecords[0].id}`);
  return staffRecords[0].id;
}

// GET: Fetch notifications for current user (paginated)
export async function GET(req) {
  console.log("Received GET request");
  logger.info(`[Notifications API] Received GET request`);
  try {
    const userId = await getCurrentUserId();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const offset = (page - 1) * limit;

    const filterFormula = `FIND('${userId}', ARRAYJOIN({Recipient}, ',')) > 0`;
    logger.info(`[Notifications API] Using filter formula: ${filterFormula}`);

    // Fetch all notifications for user
    const allRecords = await base("Notifications")
      .select({
        filterByFormula: filterFormula,
        // sort: [{ field: "Created At", direction: "desc" }],
      })
      .all();
    logger.info(`[Notifications API] Raw notification record count: ${allRecords.length}`);
    logger.info(`[Notifications API] Raw notification record IDs: ${allRecords.map(r => r.id).join(", ")}`);
    if (allRecords.length === 0) {
      logger.info(`[Notifications API] No notifications found for Staff record ID: ${userId}`);
    }
    const total = allRecords.length;
    const notifications = allRecords.slice(offset, offset + limit).map((rec) => ({
      id: rec.id,
      title: rec.fields["Title"] || "",
      body: rec.fields["Body"] || "",
      type: rec.fields["Type"] || "",
      severity: rec.fields["Severity"] || "Info",
      read: !!rec.fields["Read"],
      createdAt: rec.fields["Created At"] || rec._rawJson.createdTime,
      actionUrl: rec.fields["Action URL"] || "",
      source: rec.fields["Source"] || "",
    }));
    logger.info(`[Notifications API] Final notifications array (paginated): ${JSON.stringify(notifications)}`);
    const unreadCount = allRecords.filter((rec) => !rec.fields["Read"]).length;
    return new Response(
      JSON.stringify({ notifications, unreadCount, total, page, limit }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    logger.error(`[Notifications API] Error: ${e.message}`);
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }
}

// PATCH: Mark all notifications as read for current user
export async function PATCH(req) {
  logger.info(`[Notifications API] Received PATCH request`);
  try {
    const userId = await getCurrentUserId();
    // Fetch all unread notifications for user
    const unreadRecords = await base("Notifications")
      .select({
        filterByFormula: `AND(FIND('${userId}', ARRAYJOIN({Recipient}, ',')) > 0, {Read} = FALSE())`,
      })
      .all();
    if (!unreadRecords.length) {
      logger.info(`[Notifications API] No unread notifications to mark as read for Staff record ID: ${userId}`);
      return new Response(JSON.stringify({ success: true, updated: 0 }), { status: 200 });
    }
    // Batch update to mark as read
    const updates = unreadRecords.map((rec) => ({ id: rec.id, fields: { Read: true } }));
    await base("Notifications").update(updates);
    logger.info(`[Notifications API] Marked ${updates.length} notifications as read for Staff record ID: ${userId}`);
    return new Response(JSON.stringify({ success: true, updated: updates.length }), { status: 200 });
  } catch (e) {
    logger.error(`[Notifications API] Error: ${e.message}`);
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }
} 