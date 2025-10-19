import Airtable from "airtable"
import { cookies } from "next/headers"
import { unsealData } from "iron-session"
import logger from "@/lib/utils/logger"
import { logAuditEvent } from "@/lib/auditLogger"

// Removed fallback notification types to ensure UI reflects only configured types

function toBooleanChannels(channelsArr) {
  const set = new Set(Array.isArray(channelsArr) ? channelsArr : [])
  return {
    email: set.has("Email"),
    slack: set.has("Slack"),
  }
}

function fromBooleanChannels(channelBools) {
  const channels = []
  if (channelBools?.email) channels.push("Email")
  if (channelBools?.slack) channels.push("Slack")
  return channels
}

function normalizeChannels(input) {
  if (!Array.isArray(input)) return []
  const allowed = new Set(["email", "slack"]) // compare in lowercase
  const out = []
  for (const ch of input) {
    if (typeof ch !== "string") continue
    const key = ch.trim().toLowerCase()
    if (!allowed.has(key)) continue
    const canonical = key === "email" ? "Email" : "Slack"
    if (!out.includes(canonical)) out.push(canonical)
  }
  return out
}

function normalizeEnabledTypes(input) {
  if (!Array.isArray(input)) return []
  const out = []
  for (const t of input) {
    if (typeof t !== "string") continue
    const trimmed = t.trim()
    if (trimmed.length === 0) continue
    if (!out.includes(trimmed)) out.push(trimmed)
  }
  return out
}

async function getSession() {
  const sessionCookie = (await cookies()).get("session")?.value
  if (!sessionCookie) return null
  try {
    const session = await unsealData(sessionCookie, {
      password: process.env.SESSION_SECRET,
      ttl: 60 * 60 * 8,
    })
    return session
  } catch (err) {
    logger.debug(`Invalid session in notification-prefs: ${err.message}`)
    return null
  }
}

function ensureAirtable() {
  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
    throw new Error("Airtable environment variables are missing")
  }
  return new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)
}

export async function GET(request) {
  let userEmail
  let userRole
  try {
    const session = await getSession()
    if (!session?.userEmail) {
      return Response.json({ error: "Unauthorised" }, { status: 401 })
    }
    userEmail = session.userEmail
    userRole = session.userRole

    // Optional role check (align with other admin endpoints)
    if (userRole && userRole !== "admin" && userRole !== "Admin") {
      return Response.json({ error: "Insufficient privileges" }, { status: 403 })
    }

    const base = ensureAirtable()
    const escapedEmail = userEmail.replace(/'/g, "''")
    const staff = await base("Staff")
      .select({
        filterByFormula: `{Email}='${escapedEmail}'`,
        maxRecords: 1,
        fields: [
          "Email",
          "Notification Preferences",
          "Notification Channels",
        ],
      })
      .firstPage()

    if (!staff || staff.length === 0) {
      // No staff row yet: return defaults without fallback types
      return Response.json({
        channels: [],
        enabledTypes: [],
        allTypes: [],
      })
    }

    const record = staff[0]
    const enabledTypes = record.fields["Notification Preferences"] || []
    const channelsArr = record.fields["Notification Channels"] || []

    // Return only the types currently enabled/configured for the user
    const allTypes = Array.isArray(enabledTypes) ? enabledTypes.slice() : []

    return Response.json({
      channels: channelsArr,
      enabledTypes,
      allTypes,
    })
  } catch (error) {
    logger.error("GET notification-preferences failed:", error)
    try {
      await logAuditEvent({
        eventType: "Notification Preferences Read",
        eventStatus: "Error",
        userRole: userRole || "Unknown",
        userIdentifier: userEmail,
        detailedMessage: `Failed to read preferences: ${error.message}`,
        request,
      })
    } catch {}
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request) {
  let userEmail
  let userRole
  try {
    const session = await getSession()
    if (!session?.userEmail) {
      return Response.json({ error: "Unauthorised" }, { status: 401 })
    }
    userEmail = session.userEmail
    userRole = session.userRole

    if (userRole && userRole !== "admin" && userRole !== "Admin") {
      return Response.json({ error: "Insufficient privileges" }, { status: 403 })
    }

    let body
    try {
      body = await request.json()
    } catch (e) {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const channelsInput = Array.isArray(body?.channels)
      ? body.channels
      : fromBooleanChannels(body?.channelBools)
    const channels = normalizeChannels(channelsInput)
    const enabledTypes = normalizeEnabledTypes(body?.enabledTypes)

    // Basic validation: at least one of arrays provided (allow empty to clear settings)
    if (!Array.isArray(channels) || !Array.isArray(enabledTypes)) {
      return Response.json({ error: "Invalid payload format" }, { status: 422 })
    }

    const base = ensureAirtable()
    const escapedEmail = userEmail.replace(/'/g, "''")
    const staff = await base("Staff")
      .select({
        filterByFormula: `{Email}='${escapedEmail}'`,
        maxRecords: 1,
        fields: ["Email"],
      })
      .firstPage()

    if (!staff || staff.length === 0) {
      return Response.json({ error: "Staff not found" }, { status: 404 })
    }

    const staffId = staff[0].id
    try {
      await base("Staff").update([
        {
          id: staffId,
          fields: {
            "Notification Preferences": enabledTypes,
            "Notification Channels": channels,
          },
        },
      ])
    } catch (airtableError) {
      const message = airtableError?.message || "Airtable update failed"
      const isValidation = /INVALID_|Unknown field|Invalid/i.test(message)
      return Response.json(
        { error: isValidation ? "Invalid values for Airtable fields" : "Failed to persist preferences", details: message },
        { status: isValidation ? 400 : 500 }
      )
    }

    try {
      await logAuditEvent({
        eventType: "Notification Preferences Update",
        eventStatus: "Success",
        userRole: userRole || "Admin",
        userIdentifier: userEmail,
        detailedMessage: `Channels: ${JSON.stringify(channels)}; EnabledTypes: ${JSON.stringify(enabledTypes)}`,
        request,
      })
    } catch {}

    return Response.json({ success: true })
  } catch (error) {
    logger.error("PUT notification-preferences failed:", error)
    try {
      await logAuditEvent({
        eventType: "Notification Preferences Update",
        eventStatus: "Error",
        userRole: userRole || "Unknown",
        userIdentifier: userEmail,
        detailedMessage: `Update failed: ${error.message}`,
        request,
      })
    } catch {}
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}


