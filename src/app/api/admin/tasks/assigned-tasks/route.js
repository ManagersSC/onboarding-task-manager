import { cookies } from "next/headers"
import logger from "@/lib/utils/logger"
import { unsealData } from "iron-session"
import Airtable from "airtable"
import { logAuditEvent } from "@/lib/auditLogger"

// Assigned Tasks Logs Route
export async function GET(request) {
  let userEmail, userRole, userName

  try {
    // 1. Session Cookie and Validation
    const sessionCookie = (await cookies()).get("session")?.value
    if (!sessionCookie) {
      logger.debug("API GET ASSIGNED-TASKS: No session cookie")
      return Response.json({ error: "Unauthorised" }, { status: 401 })
    }
    let session
    try {
      session = await unsealData(sessionCookie, {
        password: process.env.SESSION_SECRET,
        ttl: 60 * 60 * 8,
      })
    } catch (err) {
      logger.debug(`Invalid session: ${err.message}`)
      return Response.json(
        { error: "Invalid Session", details: process.env.NODE_ENV === "development" ? err.message : null },
        { status: 401 }
      )
    }
    if (!session.userEmail) {
      logger.debug("Invalid session format")
      return Response.json({ error: "Invalid session format" }, { status: 401 })
    }
    userRole = session.userRole
    if (userRole !== "admin") {
      return Response.json({ error: "Unauthorised" }, { status: 401 })
    }
    userEmail = session.userEmail
    userName = session.userName

    // 2. Parse Query Parameters
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""
    const sortBy = searchParams.get("sortBy") || "Created Date"
    const sortDirection = searchParams.get("sortDirection") === "desc" ? "desc" : "asc"
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10)
    const clientCursor = searchParams.get("cursor")
    const folder = searchParams.get("folder") || ""
    const name = searchParams.get("name") || ""
    const assignedDate = searchParams.get("assignedDate") || ""
    const status = searchParams.get("status") || ""
    const hasDocuments = searchParams.get("hasDocuments") || ""

    // 3. Airtable credentials check
    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      logger.error("Server configuration error: Missing Airtable credentials")
      return Response.json({ error: "Server configuration error" }, { status: 500 })
    }

    // 4. Build filter formula
    // Note: string values use double-quotes to match Airtable's preferred formula syntax
    const escapeStr = (v) => (v || "").replace(/"/g, '""')
    const conditions = []
    if (search) {
      const s = escapeStr(search).replace(/\n/g, ' ')
      conditions.push(`OR(FIND(LOWER("${s}"),LOWER({Display Title}))>0,FIND(LOWER("${s}"),LOWER({Applicant Name}))>0,FIND(LOWER("${s}"),LOWER({Applicant Email}))>0)`)
    }
    if (folder) conditions.push(`ARRAYJOIN({Folder Name}) = "${escapeStr(folder)}"`)
    if (name) conditions.push(`ARRAYJOIN({Applicant Name}) = "${escapeStr(name)}"`)
    if (assignedDate) conditions.push(`IS_SAME({Created Date}, "${assignedDate}", "day")`)
    if (status) conditions.push(`{Status} = "${escapeStr(status)}"`)
    if (hasDocuments === "yes") conditions.push(`OR({File(s)} != BLANK(), {Display Resource Link} != BLANK())`)
    if (hasDocuments === "no") conditions.push(`AND({File(s)} = BLANK(), {Display Resource Link} = BLANK())`)
    const filterByFormula = conditions.length ? `AND(${conditions.join(",")})` : ""

    // 5. Sort field mapping
    const sortFieldMap = {
      assignedDate: 'Created Date',
      name: 'Applicant Name',
      status: 'Status',
    }
    const sortField = sortFieldMap[sortBy] || sortBy

    // 6. Fetch via REST API for reliable pagination
    // Use new URL().searchParams for all params (matches core-tasks pattern) so that
    // sort[0][field] bracket notation is preserved and the formula is encoded consistently.
    const airtableUrl = new URL(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Onboarding%20Tasks%20Logs`
    )
    const urlParams = airtableUrl.searchParams
    urlParams.set('pageSize', String(pageSize))
    if (clientCursor) urlParams.set('offset', clientCursor)
    if (filterByFormula) urlParams.set('filterByFormula', filterByFormula)
    urlParams.set('sort[0][field]', sortField)
    urlParams.set('sort[0][direction]', sortDirection)

    logger.debug(`Assigned Tasks Logs Filter Formula: ${filterByFormula}`)
    logger.debug(`Assigned Tasks Logs Airtable URL: ${airtableUrl.toString()}`)

    const airtableRes = await fetch(airtableUrl.toString(), {
      headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` },
    })
    if (!airtableRes.ok) {
      const errBody = await airtableRes.text().catch(() => '')
      throw new Error(`Airtable REST error: ${airtableRes.status} ${airtableRes.statusText}${errBody ? ` — ${errBody}` : ''}`)
    }

    const { records: rawRecords, offset } = await airtableRes.json()
    const records = rawRecords || []
    const nextCursor = offset || null

    // 7. Format logs for frontend
    const logs = records.map(rec => {
      const rawAttachments = rec.fields['File(s)'] || []
      return {
        id: rec.id,
        name: rec.fields['Applicant Name'] || '',
        email: rec.fields['Applicant Email'] || '',
        title: rec.fields['Display Title'] || '',
        description: rec.fields['Display Desc'] || '',
        folder: rec.fields['Folder Name'] || '',
        resource: rec.fields['Display Resource Link'] || '',
        assignedDate: rec.fields['Created Date'] || '',
        status: rec.fields['Status'] || '',
        attachments: rawAttachments,
        attachmentCount: rawAttachments.length,
      }
    })

    // 8. Return JSON with pagination info
    return Response.json({
      logs,
      pagination: {
        pageSize,
        hasNextPage: Boolean(nextCursor),
        nextCursor,
      }
    })

  } catch (error) {
    logger.error('Error in assigned-tasks GET:', error)
    logAuditEvent({
      eventType: 'Assigned Tasks Logs Query',
      eventStatus: 'Error',
      userRole: userRole || 'Unknown',
      userName: userName || 'Unknown',
      userIdentifier: userEmail,
      detailedMessage: `Error fetching assigned tasks logs: ${error.message}`,
      request,
    })
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
} 