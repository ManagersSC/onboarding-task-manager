import { cookies } from "next/headers"
import { unsealData } from "iron-session"
import Airtable from "airtable"
import logger from "@/lib/utils/logger"
import { logAuditEvent } from "@/lib/auditLogger"

function toInt(value, def, min, max) {
  const n = Number.parseInt(value ?? "", 10)
  if (Number.isNaN(n)) return def
  return Math.min(Math.max(n, min), max)
}

function parseCsv(value) {
  if (!value) return []
  return value.split(",").map((v) => v.trim()).filter(Boolean)
}

function isIsoDate(value) {
  if (!value) return false
  const d = new Date(value)
  return !Number.isNaN(d.getTime())
}

export async function GET(request) {
  let userEmail, userRole
  try {
    const sessionCookie = (await cookies()).get("session")?.value
    if (!sessionCookie) return new Response(JSON.stringify({ error: "Unauthorised" }), { status: 401 })
    let session
    try {
      session = await unsealData(sessionCookie, { password: process.env.SESSION_SECRET, ttl: 60 * 60 * 8 })
    } catch {
      return new Response(JSON.stringify({ error: "Invalid Session" }), { status: 401 })
    }
    if (!session?.userEmail || session?.userRole !== "admin") return new Response(JSON.stringify({ error: "Unauthorised" }), { status: 401 })
    userEmail = session.userEmail
    userRole = session.userRole

    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      logger.error("Missing Airtable envs")
      return new Response(JSON.stringify({ error: "Server configuration error" }), { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const format = (searchParams.get("format") || "csv").toLowerCase()
    const limitPreset = [50, 100, 250, 500, 1000]
    const custom = toInt(searchParams.get("limit"), 250, 1, 5000)
    const limit = limitPreset.includes(custom) ? custom : custom

    const eventType = parseCsv(searchParams.get("eventType"))
    const status = parseCsv(searchParams.get("status"))
    const role = parseCsv(searchParams.get("role"))
    const q = (searchParams.get("q") || "").trim()
    const userId = (searchParams.get("userId") || "").trim()
    const ip = (searchParams.get("ip") || "").trim()
    const ua = (searchParams.get("ua") || "").trim()
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")

    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

    const parts = []
    if (eventType.length) parts.push(`OR(${eventType.map((t) => `{Event Type}='${t.replace(/'/g, "\\'")}'`).join(",")})`)
    if (status.length) parts.push(`OR(${status.map((s) => `{Event Status}='${s.replace(/'/g, "\\'")}'`).join(",")})`)
    if (role.length) parts.push(`OR(${role.map((r) => `{Role}='${r.replace(/'/g, "\\'")}'`).join(",")})`)
    if (userId) parts.push(`FIND(LOWER('${userId.toLowerCase()}'), LOWER({User Identifier}))>0`)
    if (ip) parts.push(`FIND('${ip.replace(/'/g, "\\'")}', {IP Address})>0`)
    if (ua) parts.push(`FIND(LOWER('${ua.toLowerCase()}'), LOWER({User Agent}))>0`)
    if (q) {
      const s = q.replace(/'/g, "\\'")
      parts.push(`OR(FIND(LOWER('${s.toLowerCase()}'), LOWER({Name}))>0, FIND(LOWER('${s.toLowerCase()}'), LOWER({Detailed Message}))>0, FIND(LOWER('${s.toLowerCase()}'), LOWER({User Agent}))>0)`)
    }
    if (isIsoDate(dateFrom) && isIsoDate(dateTo)) parts.push(`AND(IS_AFTER({Timestamp}, '${dateFrom}'), IS_BEFORE({Timestamp}, '${dateTo}'))`)
    else if (isIsoDate(dateFrom)) parts.push(`IS_AFTER({Timestamp}, '${dateFrom}')`)
    else if (isIsoDate(dateTo)) parts.push(`IS_BEFORE({Timestamp}, '${dateTo}')`)
    const filterByFormula = parts.length ? parts.join(",") : "TRUE()"

    const fields = [
      "Timestamp",
      "Event Type",
      "Event Status",
      "Role",
      "Name",
      "User Identifier",
      "Detailed Message",
      "IP Address",
      "User Agent",
    ]

    const select = base("Website Audit Log").select({
      filterByFormula,
      sort: [{ field: "Timestamp", direction: "desc" }],
      fields,
      pageSize: 100,
    })

    const rows = []
    await new Promise((resolve, reject) => {
      select.eachPage(
        function pageFn(records, fetchNextPage) {
          for (const r of records) {
            if (rows.length >= limit) return resolve()
            rows.push(r)
          }
          if (rows.length >= limit) return resolve()
          fetchNextPage()
        },
        function done(err) {
          if (err) reject(err)
          else resolve()
        },
      )
    })

    const data = rows.map((r) => ({
      timestamp: r.fields["Timestamp"],
      eventType: r.fields["Event Type"],
      status: r.fields["Event Status"],
      role: r.fields["Role"],
      name: r.fields["Name"] || "",
      userIdentifier: r.fields["User Identifier"] || "",
      message: r.fields["Detailed Message"] || "",
      ip: r.fields["IP Address"] || "",
      ua: r.fields["User Agent"] || "",
    }))

    if (format === "json") {
      const body = JSON.stringify({ data, count: data.length })
      return new Response(body, {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="audit-logs-${new Date().toISOString()}.json"`,
        },
      })
    }

    // CSV
    const headers = [
      "timestamp",
      "eventType",
      "status",
      "role",
      "name",
      "userIdentifier",
      "message",
      "ip",
      "ua",
    ]
    const escape = (s) => {
      if (s == null) return ""
      const str = String(s)
      if (str.includes(",") || str.includes("\n") || str.includes('"')) {
        return '"' + str.replace(/"/g, '""') + '"'
      }
      return str
    }
    const csv = [headers.join(",")]
    for (const row of data) {
      csv.push(headers.map((h) => escape(row[h])).join(","))
    }
    const body = csv.join("\n")
    return new Response(body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="audit-logs-${new Date().toISOString()}-${limit}.csv"`,
      },
    })
  } catch (error) {
    logger.error("audit-logs export failed:", error)
    logAuditEvent({
      eventType: "Server",
      eventStatus: "Error",
      userRole: userRole || "Unknown",
      userIdentifier: userEmail,
      detailedMessage: `Audit logs export failed: ${error.message}`,
      request,
    })
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 })
  }
}


