import { cookies } from "next/headers"
import logger from "@/lib/logger"
import { unsealData } from "iron-session"
import Airtable from "airtable"
import { logAuditEvent } from "@/lib/auditLogger"

// Core Tasks Route
export async function GET(request) {
  let userEmail, userRole, userName

  try {
    // Session Cookie and Validation
    const sessionCookie = (await cookies()).get("session")?.value
    if (!sessionCookie) {
      logger.debug("API GET CORE-TASKS: No session cookie")
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

    // Parse Query Parameters
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""
    const week = searchParams.get("week") || ""
    const day = searchParams.get("day") || ""
    const jobRole = searchParams.get("jobRole") || ""
    const sortBy = searchParams.get("sortBy") || "Task"
    const sortDirection = searchParams.get("sortDirection") === "desc" ? "desc" : "asc"
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10)
    const clientCursor = searchParams.get("cursor")

    // Airtable credentials check
    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      logger.error("Server configuration error: Missing Airtable credentials")
      return Response.json({ error: "Server configuration error" }, { status: 500 })
    }

    // Build filter formula
    const conditions = ["{Task Function} = 'Core'"]
    const safeSearch = search.replace(/'/g, "\\'").replace(/\n/g, ' ')
    if (search) {
      conditions.push(`OR(
        FIND(LOWER("${safeSearch}"), LOWER({Task})) > 0,
        FIND(LOWER("${safeSearch}"), LOWER({Folder Name})) > 0
      )`)
    }
    if (week) conditions.push(`{Week Number} = '${week}'`)
    if (day) conditions.push(`{Day Number} = '${day}'`)
    if (jobRole) conditions.push(`{Job} = '${jobRole}'`)
    const filterByFormula = conditions.join(' AND ')

    // Sort field mapping
    const sortFieldMap = { createdTime: 'Created Time' }
    const sortField = sortFieldMap[sortBy] || sortBy

    // Initialize Airtable SDK
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
      .base(process.env.AIRTABLE_BASE_ID)

    // Prepare query options
    const queryOptions = {
      pageSize,
      filterByFormula,
      sort: [{ field: sortField, direction: sortDirection }],
      ...(clientCursor ? { offset: clientCursor } : {}),
    }

    // Fetch first page of records
    let records = []
    let nextCursor = null
    await new Promise((resolve, reject) => {
      base('Onboarding Tasks')
        .select(queryOptions)
        .eachPage(
          (pageRecords, fetchNextPage) => {
            records = pageRecords
            // Attempt to extract next offset token
            try {
              const fnStr = fetchNextPage.toString()
              const match = fnStr.match(/"offset":"([^"]+)"/)
              if (match && match[1]) nextCursor = match[1]
            } catch (e) {
              logger.warn('Could not extract nextCursor', e)
            }
            // Stop after first page
            resolve()
          },
          (err) => {
            if (err) reject(err)
            else resolve()
          }
        )
    })

    // Format tasks for frontend
    const tasks = records.map(rec => ({
      id: rec.id,
      title: rec.fields['Task'] || 'Untitled Task',
      description: rec.fields['Task Body'] || '',
      week: rec.fields['Week Number'] || '',
      day: rec.fields['Day Number'] || '',
      folderName: rec.fields['Folder Name'] || '',
      type: rec.fields['Type'] || '',
      taskFunction: rec.fields['Task Function'] || 'Core',
      job: rec.fields['Job'] || '',
      location: rec.fields['Location'] || '',
      resourceUrl: rec.fields['Link'] || '',
      createdTime: rec.fields['Created Time'] || '',
    }))

    return Response.json({
      tasks,
      pagination: {
        pageSize,
        hasNextPage: Boolean(nextCursor),
        nextCursor,
      }
    })

  } catch (error) {
    logger.error('Error in core-tasks GET:', error)
    logAuditEvent({
      eventType: 'Task Page Query',
      eventStatus: 'Error',
      userRole: userRole || 'Unknown',
      userName: userName || 'Unknown',
      userIdentifier: userEmail,
      detailedMessage: `Error fetching core tasks: ${error.message}`,
      request,
    })
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request) {
  let userEmail, userRole, userName

  try {
    // Session Cookie and Validation
    const sessionCookie = (await cookies()).get("session")?.value
    if (!sessionCookie) {
      logger.debug("API DELETE CORE-TASKS: No session cookie")
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

    // Parse request body
    const { taskIds } = await request.json()
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return Response.json({ error: "Invalid request: taskIds is required" }, { status: 400 })
    }

    // Airtable credentials check
    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      logger.error("Server configuration error: Missing Airtable credentials")
      return Response.json({ error: "Server configuration error" }, { status: 500 })
    }

    // Initialize Airtable SDK
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

    // Delete tasks
    const deletedIds = []
    const failedIds = []
    for (const id of taskIds) {
      try {
        await base('Onboarding Tasks').destroy(id)
        deletedIds.push(id)
      } catch (err) {
        logger.error(`Error deleting task ${id}:`, err)
        failedIds.push(id)
      }
    }

    // Audit log
    logAuditEvent({
      eventType: "Task Deletion",
      eventStatus: failedIds.length === 0 ? "Success" : "Partial Success",
      userRole,
      userName,
      userIdentifier: userEmail,
      detailedMessage: `Deleted ${deletedIds.length} tasks${failedIds.length ? `, ${failedIds.length} failed` : ""}`,
      request,
    })

    return Response.json({
      success: true,
      message: `${deletedIds.length} tasks deleted successfully${failedIds.length ? `, ${failedIds.length} failed` : ""}`,
      deletedIds,
      failedIds,
    })

  } catch (error) {
    logger.error("Error in core-tasks DELETE:", error)
    logAuditEvent({
      eventType: "Task Deletion",
      eventStatus: "Error",
      userRole: userRole || "Unknown",
      userName: userName || "Unknown",
      userIdentifier: userEmail,
      detailedMessage: `Error deleting core tasks: ${error.message}`,
      request,
    })
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
