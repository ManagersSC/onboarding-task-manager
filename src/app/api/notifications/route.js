import Airtable from "airtable";
import { cookies } from "next/headers";
import { unsealData } from "iron-session";
import logger from "@/lib/utils/logger";
import { escapeAirtableValue } from "@/lib/airtable/sanitize";

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

export async function GET(request) {
  try {
    logger.info("GET /api/notifications called");

    // 1. Authenticate user
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
    } catch {
      return Response.json({ error: "Invalid session" }, { status: 401 });
    }

    const userEmail = session.userEmail;
    if (!userEmail) {
      return Response.json({ error: "No email in session" }, { status: 401 });
    }

    // 2. Look up Staff record by email to get their Name (source of truth for linked-record filter)
    //    The Notifications.Recipient field is a multipleRecordLinks to Staff.
    //    Airtable filterByFormula resolves linked record fields to their primary field value (Name),
    //    so we filter by the exact Name stored in Airtable rather than trusting session.userName.
    const staffRecords = await base("Staff")
      .select({
        filterByFormula: `{Email} = '${escapeAirtableValue(userEmail)}'`,
        maxRecords: 1,
        fields: ["Name"],
      })
      .firstPage();

    if (!staffRecords || staffRecords.length === 0) {
      logger.warn(`[GET /api/notifications] No Staff record found for email=${userEmail}`);
      return Response.json({ notifications: [], hasMore: false, totalUnread: 0 });
    }

    const staffName = staffRecords[0].fields["Name"];
    if (!staffName) {
      logger.warn(`[GET /api/notifications] Staff record has no Name for email=${userEmail}`);
      return Response.json({ notifications: [], hasMore: false, totalUnread: 0 });
    }

    // 3. Parse query params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit")) || 10;
    const offset = searchParams.get("offset");
    const unread = searchParams.get("unread") === "true";
    const since = searchParams.get("since"); // ISO timestamp

    // 4. Build filter formula
    //    {Recipient} against a multipleRecordLinks field resolves to the linked record's primary
    //    field (Name). SEARCH handles exact-name matching without case sensitivity edge cases.
    let filterFormula = `FIND('${escapeAirtableValue(staffName)}', {Recipient})`;
    if (unread) {
      filterFormula = `AND(${filterFormula}, {Read} = FALSE())`;
    }
    if (since) {
      filterFormula = `AND(${filterFormula}, IS_AFTER(LAST_MODIFIED_TIME(), '${since}'))`;
    }

    logger.info(`[GET /api/notifications] staffName=${staffName}, formula=${filterFormula}`);

    // 5. Query Airtable (fetch limit + 1 to check for hasMore)
    const selectOptions = {
      filterByFormula: filterFormula,
      sort: [{ field: "Created At", direction: "desc" }],
      pageSize: limit + 1,
      fields: ["Title", "Body", "Type", "Severity", "Read", "Action URL", "Source", "Created At", "Updated At"],
    };
    if (offset) selectOptions.offset = offset;

    const result = await base("Notifications").select(selectOptions).firstPage();

    logger.info(`[GET /api/notifications] Fetched ${result.length} records for ${staffName}`);

    // 6. Format response
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
    }));

    // 7. Count total unread (separate query, no pagination)
    let totalUnread = 0;
    try {
      const unreadResult = await base("Notifications")
        .select({
          filterByFormula: `AND(FIND('${escapeAirtableValue(staffName)}', {Recipient}), {Read} = FALSE())`,
          fields: ["Read"],
        })
        .all();
      totalUnread = unreadResult.length;
    } catch (e) {
      logger.error("[GET /api/notifications] Failed to fetch totalUnread count", e);
    }

    return Response.json({ notifications: notificationsFormatted, hasMore, totalUnread });
  } catch (error) {
    logger.error("GET /api/notifications failed:", error);
    return Response.json({ error: error.message || "Failed to fetch notifications" }, { status: 500 });
  }
}
