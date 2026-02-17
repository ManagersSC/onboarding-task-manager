import Airtable from "airtable";
import { cookies } from "next/headers";
import { unsealData } from "iron-session";
import logger from "@/lib/utils/logger";
import { escapeAirtableValue } from "@/lib/airtable/sanitize";

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

export async function GET(request) {
  try {
    logger.info("GET /api/notifications called");
    
    // 1. Authenticate user and get Staff record ID from session
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session")?.value;
    if (!sessionCookie) {
      logger.info("[GET /api/notifications]: No session cookie found");
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }
    
    let session;
    try {
      session = await unsealData(sessionCookie, {
        password: process.env.SESSION_SECRET,
        ttl: 60 * 60 * 8,
      });
    } catch (err) {
      logger.error("[GET /api/notifications]: Invalid session");
      return Response.json({ error: "Invalid session" }, { status: 401 });
    }
    
    logger.info('Session after unsealing:', session);
    const staffName = session.userName;
    if (!staffName) {
      logger.info("[GET /api/notifications]: No staff name found in session");
      return Response.json({ error: "No staff name in session" }, { status: 401 });
    }

    // 2. Parse query params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit")) || 10;
    const offset = searchParams.get("offset");
    const unread = searchParams.get("unread") === "true";
    const since = searchParams.get("since"); // ISO string or timestamp

    // 3. Build Airtable filter formula
    let filterFormula = `{Recipient} = '${escapeAirtableValue(staffName)}'`;
    if (unread) {
      filterFormula = `AND(${filterFormula}, {Read} = FALSE())`;
    }
    if (since) {
      // Use Last Modified Time field for filtering
      // Airtable's LAST_MODIFIED_TIME() returns ISO string, so compare as string
      filterFormula = `AND(${filterFormula}, IS_AFTER(LAST_MODIFIED_TIME(), '${since}'))`;
    }
    
    logger.info('Using staffName:', staffName);
    logger.info('Filter formula:', filterFormula);

    // 4. Query Airtable (pageSize = limit + 1 to check for hasMore)
    const selectOptions = {
      filterByFormula: filterFormula,
      sort: [{ field: "Created At", direction: "desc" }],
      pageSize: limit + 1, // fetch one extra to check for hasMore
      fields: [
        "Title", "Body", "Type", "Severity", "Read", "Action URL", "Source", "Created At", "Recipient", "Updated At"
      ],
    };
    if (offset) selectOptions.offset = offset;

    const result = await base("Notifications")
      .select(selectOptions)
      .firstPage();

    logger.info(`Fetched ${result.length} notifications for user ${staffName}`);

    // 5. Format response
    let notifications = result;
    let hasMore = false;
    if (notifications.length > limit) {
      hasMore = true;
      notifications = notifications.slice(0, limit);
    }
    const notificationsFormatted = notifications.map((rec) => ({
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
    }));

    // 6. Get totalUnread (all unread notifications for this user, regardless of pagination)
    let totalUnread = 0;
    try {
      const unreadResult = await base("Notifications")
        .select({
          filterByFormula: `AND({Recipient} = '${escapeAirtableValue(staffName)}', {Read} = FALSE())`,
          fields: ["Read"],
        })
        .all();
      totalUnread = unreadResult.length;
    } catch (e) {
      logger.error("Failed to fetch totalUnread count", e);
    }

    return Response.json({ notifications: notificationsFormatted, hasMore, totalUnread });
  } catch (error) {
    logger.error("Failed to fetch notifications:", error);
    return Response.json({ error: error.message || "Failed to fetch notifications" }, { status: 500 });
  }
}