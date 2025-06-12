import Airtable from "airtable"
import { cookies } from "next/headers"
import { unsealData } from "iron-session"
import logger from "@/lib/utils/logger"

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

// Helper to get current staff record ID
async function getCurrentStaffRecord() {
  const cookieStore = await cookies()
  const sealedSession = cookieStore.get("session")?.value
  if (!sealedSession) throw new Error("Not authenticated: No session cookie")
  const session = await unsealData(sealedSession, { password: process.env.SESSION_SECRET })
  if (!session.userEmail) throw new Error("Not authenticated: No user email in session")

  const staffRecords = await base("Staff")
    .select({ filterByFormula: `{Email} = '${session.userEmail}'`, maxRecords: 1 })
    .firstPage()
  if (!staffRecords.length) throw new Error("Staff user not found")
  return staffRecords[0]
}

// GET: Fetch user's notification preferences
export async function GET(req) {
  try {
    const staffRecord = await getCurrentStaffRecord()
    // Assuming your Staff table has fields like:
    // 'Notification Channels' (MultiSelect: ["Email", "Slack"])
    // 'NotifyOnNewHires' (Checkbox)
    // 'NotifyOnTaskAssignments' (Checkbox)
    // 'NotifyOnTaskCompletions' (Checkbox)
    // Adjust field names as per your actual Airtable schema
    const preferences = {
      channels: staffRecord.fields["Notification Channels"] || [],
      newHires: !!staffRecord.fields["NotifyOnNewHires"],
      taskAssignments: !!staffRecord.fields["NotifyOnTaskAssignments"],
      taskCompletions: !!staffRecord.fields["NotifyOnTaskCompletions"],
      // Add other preference fields from your Staff table
    }
    logger.info(`[Prefs API] Fetched preferences for ${staffRecord.fields.Email}: ${JSON.stringify(preferences)}`)
    return new Response(JSON.stringify(preferences), { status: 200 })
  } catch (e) {
    logger.error(`[Prefs API] GET Error: ${e.message}`)
    return new Response(JSON.stringify({ error: e.message }), {
      status: e.message.startsWith("Not authenticated") || e.message === "Staff user not found" ? 401 : 500,
    })
  }
}

// PATCH: Update user's notification preferences
export async function PATCH(req) {
  try {
    const staffRecord = await getCurrentStaffRecord()
    const body = await req.json()

    // Construct fields to update based on your Airtable schema
    // Example: if body is { newHires: true } or { channels: ["Email"] }
    const fieldsToUpdate = {}
    if (body.hasOwnProperty("channels")) fieldsToUpdate["Notification Channels"] = body.channels
    if (body.hasOwnProperty("newHires")) fieldsToUpdate["NotifyOnNewHires"] = body.newHires
    if (body.hasOwnProperty("taskAssignments")) fieldsToUpdate["NotifyOnTaskAssignments"] = body.taskAssignments
    if (body.hasOwnProperty("taskCompletions")) fieldsToUpdate["NotifyOnTaskCompletions"] = body.taskCompletions
    // Add other preference fields

    if (Object.keys(fieldsToUpdate).length === 0) {
      return new Response(JSON.stringify({ message: "No preferences to update" }), { status: 400 })
    }

    await base("Staff").update([{ id: staffRecord.id, fields: fieldsToUpdate }])
    logger.info(`[Prefs API] Updated preferences for ${staffRecord.fields.Email}: ${JSON.stringify(fieldsToUpdate)}`)
    return new Response(JSON.stringify({ success: true }), { status: 200 })
  } catch (e) {
    logger.error(`[Prefs API] PATCH Error: ${e.message}`)
    return new Response(JSON.stringify({ error: e.message }), {
      status: e.message.startsWith("Not authenticated") || e.message === "Staff user not found" ? 401 : 500,
    })
  }
}
