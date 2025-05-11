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

    // 3. Airtable credentials check
    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      logger.error("Server configuration error: Missing Airtable credentials")
      return Response.json({ error: "Server configuration error" }, { status: 500 })
    }

    // 4. Build filter formula
    const conditions = []
    if (search) {
      const safeSearch = search.replace(/'/g, "\\'").replace(/\n/g, ' ')
      conditions.push(`OR(
        FIND(LOWER(\"${safeSearch}\"), LOWER({Applicant Name})) > 0,
        FIND(LOWER(\"${safeSearch}\"), LOWER({Display Title})) > 0,
        FIND(LOWER(\"${safeSearch}\"), LOWER({Folder Name})) > 0
      )`)
    }
    if (folder) conditions.push(`{Folder Name} = '${folder}'`)
    if (name) conditions.push(`{Applicant Name} = '${name}'`)
    if (assignedDate) conditions.push(`IS_SAME({Created Date}, '${assignedDate}', 'day')`)
    const filterByFormula = conditions.length ? `AND(${conditions.join(",")})` : ""

    // 5. Sort field mapping
    const sortFieldMap = { assignedDate: 'Created Date', name: 'Applicant Name' }
    const sortField = sortFieldMap[sortBy] || sortBy

    // 6. Fetch via REST API for reliable pagination
    const apiUrl = new URL(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Onboarding%20Tasks%20Logs`
    )
    const params = apiUrl.searchParams
    params.set('pageSize', pageSize)
    if (clientCursor) params.set('offset', clientCursor)
    if (filterByFormula) params.set('filterByFormula', filterByFormula)
    params.set('sort[0][field]', sortField)
    params.set('sort[0][direction]', sortDirection)

    logger.debug(`Assigned Tasks Logs Filter Formula: ${filterByFormula}`)

    const airtableRes = await fetch(apiUrl.toString(), {
      headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` },
    })
    if (!airtableRes.ok) {
      throw new Error(`Airtable REST error: ${airtableRes.statusText}`)
    }

    const { records: rawRecords, offset } = await airtableRes.json()
    const records = rawRecords || []
    const nextCursor = offset || null

    // Debug logging for folder data
    logger.debug('Raw Airtable records:', JSON.stringify(records.map(rec => ({
      id: rec.id,
      folder: rec.fields['Folder Name']
    })), null, 2))

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