import { cookies } from "next/headers"
import { unsealData } from "iron-session"
import Airtable from "airtable"
import logger from "@/lib/utils/logger"
import { logAuditEvent } from "@/lib/auditLogger"

// Helpers
function toInt(value, def, min, max) {
  const n = Number.parseInt(value ?? "", 10)
  if (Number.isNaN(n)) return def
  return Math.min(Math.max(n, min), max)
}

function clampEnum(value, allowed, def) {
  if (!value) return def
  return allowed.includes(value) ? value : def
}

function parseCsv(value) {
  if (!value) return []
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
}

function isIsoDate(value) {
  if (!value) return false
  const d = new Date(value)
  return !Number.isNaN(d.getTime())
}

export async function GET(request) {
  let userEmail, userRole
  try {
    // Session check
    const sessionCookie = (await cookies()).get("session")?.value
    if (!sessionCookie) return Response.json({ error: "Unauthorised" }, { status: 401 })

    let session
    try {
      session = await unsealData(sessionCookie, { password: process.env.SESSION_SECRET, ttl: 60 * 60 * 8 })
    } catch {
      return Response.json({ error: "Invalid Session" }, { status: 401 })
    }
    if (!session?.userEmail || session?.userRole !== "admin") return Response.json({ error: "Unauthorised" }, { status: 401 })
    userEmail = session.userEmail
    userRole = session.userRole

    // Env
    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      logger.error("Missing Airtable envs")
      return Response.json({ error: "Server configuration error" }, { status: 500 })
    }

    // Params
    const { searchParams } = new URL(request.url)
    const page = toInt(searchParams.get("page"), 1, 1, 100000)
    const pageSize = toInt(searchParams.get("pageSize"), 25, 1, 200)
    const sortBy = clampEnum(searchParams.get("sortBy"), ["timestamp", "eventType", "status", "role", "name", "userIdentifier"], "timestamp")
    const sortOrder = clampEnum(searchParams.get("sortOrder"), ["asc", "desc"], "desc")
    const q = (searchParams.get("q") || "").trim()
    const eventType = parseCsv(searchParams.get("eventType"))
    const status = parseCsv(searchParams.get("status"))
    const role = parseCsv(searchParams.get("role"))
    const userId = (searchParams.get("userId") || "").trim()
    const ip = (searchParams.get("ip") || "").trim()
    const ua = (searchParams.get("ua") || "").trim()
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")

    // Airtable base
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

    // Build filter formula
    const parts = []
    if (eventType.length) {
      const ors = eventType.map((t) => `{Event Type}='${t.replace(/'/g, "\\'")}'`)
      parts.push(`OR(${ors.join(",")})`)
    }
    if (status.length) {
      const ors = status.map((s) => `{Event Status}='${s.replace(/'/g, "\\'")}'`)
      parts.push(`OR(${ors.join(",")})`)
    }
    if (role.length) {
      const ors = role.map((r) => `{Role}='${r.replace(/'/g, "\\'")}'`)
      parts.push(`OR(${ors.join(",")})`)
    }
    if (userId) parts.push(`FIND(LOWER('${userId.toLowerCase()}'), LOWER({User Identifier}))>0`)
    if (ip) parts.push(`FIND('${ip.replace(/'/g, "\\'")}', {IP Address})>0`)
    if (ua) parts.push(`FIND(LOWER('${ua.toLowerCase()}'), LOWER({User Agent}))>0`)
    if (q) {
      const s = q.replace(/'/g, "\\'")
      parts.push(
        `OR(
          FIND(LOWER('${s.toLowerCase()}'), LOWER({Name}))>0,
          FIND(LOWER('${s.toLowerCase()}'), LOWER({User Identifier}))>0,
          FIND(LOWER('${s.toLowerCase()}'), LOWER({Detailed Message}))>0,
          FIND(LOWER('${s.toLowerCase()}'), LOWER({User Agent}))>0
        )`
      )
    }
    if (isIsoDate(dateFrom) && isIsoDate(dateTo)) {
      parts.push(`AND(IS_AFTER({Timestamp}, '${dateFrom}'), IS_BEFORE({Timestamp}, '${dateTo}'))`)
    } else if (isIsoDate(dateFrom)) {
      parts.push(`IS_AFTER({Timestamp}, '${dateFrom}')`)
    } else if (isIsoDate(dateTo)) {
      parts.push(`IS_BEFORE({Timestamp}, '${dateTo}')`)
    }
    let filterByFormula = "TRUE()"
    if (parts.length === 1) filterByFormula = parts[0]
    else if (parts.length > 1) filterByFormula = `AND(${parts.join(",")})`

    // Sort mapping
    const sortFieldMap = {
      timestamp: "Timestamp",
      eventType: "Event Type",
      status: "Event Status",
      role: "Role",
      name: "Name",
      userIdentifier: "User Identifier",
    }

    // Because Airtable pagination is cursor-based, emulate page with offsets
    const select = base("Website Audit Log").select({
      filterByFormula,
      sort: [{ field: sortFieldMap[sortBy], direction: sortOrder }],
      fields: [
        "Timestamp",
        "Event Type",
        "Event Status",
        "Role",
        "Name",
        "User Identifier",
        "Detailed Message",
        "IP Address",
        "User Agent",
      ],
      pageSize: pageSize,
    })

    // Walk pages until desired page
    let pageIndex = 1
    let records = []
    let total = 0
    const allForCount = await base("Website Audit Log").select({ filterByFormula, fields: ["Timestamp"] }).all()
    total = allForCount.length

    // Iterate using eachPage to reach desired page quickly
    await new Promise((resolve, reject) => {
      select.eachPage(
        function pageFn(rows, fetchNextPage) {
          if (pageIndex === page) {
            records = rows
            resolve()
          } else {
            pageIndex += 1
            fetchNextPage()
          }
        },
        function done(err) {
          if (err) reject(err)
          else resolve()
        },
      )
    })

    const data = records.map((r) => {
      const f = r.fields
      return {
        id: r.id,
        timestamp: f["Timestamp"],
        eventType: f["Event Type"],
        status: f["Event Status"],
        role: f["Role"],
        name: f["Name"] || null,
        userIdentifier: f["User Identifier"] || null,
        message: f["Detailed Message"] || null,
        ip: f["IP Address"] || null,
        ua: f["User Agent"] || null,
      }
    })

    // Aggregates (type breakdown, failures)
    const byType = {}
    let failures = 0
    for (const r of allForCount) {
      const t = r.fields["Event Type"] || "Unknown"
      byType[t] = (byType[t] || 0) + 1
      if ((r.fields["Event Status"] || "").toLowerCase().includes("fail") || (r.fields["Event Status"] === "Error")) {
        failures += 1
      }
    }

    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    return Response.json({ data, page, pageSize, total, totalPages, aggregates: { byType, failures } })
  } catch (error) {
    logger.error("audit-logs list failed:", error)
    logAuditEvent({
      eventType: "Server",
      eventStatus: "Error",
      userRole: userRole || "Unknown",
      userIdentifier: userEmail,
      detailedMessage: `Audit logs list failed: ${error.message}`,
      request,
    })
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}


