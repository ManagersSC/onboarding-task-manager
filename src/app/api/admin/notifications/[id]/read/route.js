import Airtable from "airtable";
import { cookies } from "next/headers";
import { unsealData } from "iron-session";

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

async function getCurrentUserId() {
  const cookieStore = await cookies();
  const sealedSession = cookieStore.get("session")?.value;
  if (!sealedSession) throw new Error("Not authenticated");
  const session = await unsealData(sealedSession, { password: process.env.SESSION_SECRET });
  if (!session.userEmail) throw new Error("No user email in session");
  const staffRecords = await base("Staff")
    .select({ filterByFormula: `{Email} = '${session.userEmail}'`, maxRecords: 1 })
    .firstPage();
  if (!staffRecords.length) throw new Error("Staff user not found");
  return staffRecords[0].id;
}

export async function PATCH(req, { params }) {
  try {
    const userId = await getCurrentUserId();
    const { id } = params;
    // Fetch the notification to verify ownership
    const rec = await base("Notifications").find(id);
    const recipients = rec.fields["Recipient"] || [];
    if (!recipients.includes(userId)) {
      return new Response(JSON.stringify({ error: "Not authorized" }), { status: 403 });
    }
    await base("Notifications").update([{ id, fields: { Read: true } }]);
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }
} 