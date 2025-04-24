import { cookies } from "next/headers"
import logger from "@/lib/logger"
import { unsealData } from "iron-session"
import { logAuditEvent } from "@/lib/auditLogger"

export async function GET(request) {
  let userEmail, userRole, userName

  try {
    // Session Cookie and Validation
    const sessionCookie = (await cookies()).get("session")?.value
    if (!sessionCookie) {
      logger.debug("API GET ASSIGNED-LOGS: No session cookie")
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
        { status: 401 },
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
    const status = searchParams.get("status") || ""
    const week = searchParams.get("week") || ""
    const day = searchParams.get("day") || ""
    const jobRole = searchParams.get("jobRole") || ""
    const startDate = searchParams.get("startDate") || ""
    const endDate = searchParams.get("endDate") || ""
    const sortBy = searchParams.get("sortBy") || "createdTime"
    const sortDirection = searchParams.get("sortDirection") === "desc" ? "desc" : "asc"
    const pageSize = Number.parseInt(searchParams.get("pageSize") || "10", 10)
    const clientCursor = searchParams.get("cursor")

    // Airtable credentials check
    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      logger.error("Server configuration error: Missing Airtable credentials")
      return Response.json({ error: "Server configuration error" }, { status: 500 })
    }

    // Build filter formula
    const conditions = []

    const safeSearch = search.replace(/'/g, "\\'").replace(/\n/g, " ")
    if (search) {
      conditions.push(`OR(
        FIND(LOWER("${safeSearch}"), LOWER({Display Title})) > 0,
        FIND(LOWER("${safeSearch}"), LOWER({Folder Name})) > 0,
        FIND(LOWER("${safeSearch}"), LOWER({Applicant Name})) > 0
      )`)
    }

    if (status) {
      conditions.push(`{Status} = '${status}'`)
    }

    if (week) {
      conditions.push(`{Task Week Number} = '${week}'`)
    }

    if (day) {
      conditions.push(`{Day Number} = '${day}'`)
    }

    if (jobRole) {
      conditions.push(`{Job} = '${jobRole}'`)
    }

    if (startDate && endDate) {
      conditions.push(`AND(IS_AFTER({Created}, '${startDate}'), IS_BEFORE({Created}, '${endDate}'))`)
    } else if (startDate) {
      conditions.push(`IS_AFTER({Created}, '${startDate}')`)
    } else if (endDate) {
      conditions.push(`IS_BEFORE({Created}, '${endDate}')`)
    }

    const filterByFormula = conditions.length > 0 ? conditions.join(" AND ") : ""

    // Fetch via REST API for reliable pagination
    const apiUrl = new URL(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Onboarding%20Tasks%20Logs`)
    const params = apiUrl.searchParams
    params.set("pageSize", pageSize)
    if (clientCursor) params.set("offset", clientCursor)
    if (filterByFormula) params.set("filterByFormula", filterByFormula)

    // Map sortBy field names to Airtable field names
    const sortFieldMap = {
      createdTime: "Created",
      title: "Display Title",
      status: "Status",
      applicant: "Applicant Name",
    }
    const sortField = sortFieldMap[sortBy] || sortBy

    params.set("sort[0][field]", sortField)
    params.set("sort[0][direction]", sortDirection)

    logger.debug(`Airtable REST URL: ${apiUrl.toString()}`)

    const airtableRes = await fetch(apiUrl.toString(), {
      headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` },
    })

    if (!airtableRes.ok) {
      throw new Error(`Airtable REST error: ${airtableRes.statusText}`)
    }

    const { records: rawRecords, offset } = await airtableRes.json()
    const records = rawRecords || []
    const nextCursor = offset || null

    // Format task logs for frontend
    const taskLogs = records.map((rec) => ({
      id: rec.id,
      title: rec.fields["Display Title"] || "Untitled Task",
      description: rec.fields["Display Desc"] || "",
      status: rec.fields["Status"] || "Assigned",
      applicantName: rec.fields["Applicant Name"] || "",
      applicantEmail: rec.fields["Applicant Email"] || "",
      week: rec.fields["Task Week Number"] || "",
      day: rec.fields["Day Number"] || "",
      folderName: rec.fields["Folder Name"] || "",
      urgency: rec.fields["Urgency"] || "Medium",
      isCustom: rec.fields["isCustom"] || false,
      resourceUrl: rec.fields["Display Resource Link"] || "",
      createdTime: rec.fields["Created"] || "",
    }))

    // Get status counts (for filters)
    const statusCounts = {
      assigned: records.filter((r) => r.fields["Status"] === "Assigned").length,
      completed: records.filter((r) => r.fields["Status"] === "Completed").length,
      overdue: records.filter((r) => r.fields["Status"] === "Overdue").length,
      total: records.length,
    }

    // Log the successful request
    logAuditEvent({
      eventType: "Task Page Query",
      eventStatus: "Success",
      userRole: userRole,
      userName,
      userIdentifier: userEmail,
      detailedMessage: `Admin fetched assigned task logs with ${taskLogs.length} results`,
      request,
    })

    return Response.json({
      taskLogs,
      statusCounts,
      pagination: {
        pageSize,
        hasNextPage: Boolean(nextCursor),
        nextCursor,
      },
    })
  } catch (error) {
    logger.error("Error in assigned-logs GET:", error)
    logAuditEvent({
      eventType: "Task Page Query",
      eventStatus: "Error",
      userRole: userRole || "Unknown",
      userName: userName || "Unknown",
      userIdentifier: userEmail,
      detailedMessage: `Error fetching assigned task logs: ${error.message}`,
      request,
    })
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request) {
  let userEmail, userRole, userName

  try {
    // Session validation
    const sessionCookie = (await cookies()).get("session")?.value
    if (!sessionCookie) {
      logger.debug("API DELETE ASSIGNED-LOGS: No session cookie")
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
        { status: 401 },
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
    const { taskLogIds } = await request.json()
    if (!Array.isArray(taskLogIds) || taskLogIds.length === 0) {
      return Response.json({ error: "Invalid request: taskLogIds is required" }, { status: 400 })
    }

    // Airtable setup
    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      logger.error("Server configuration error: Missing Airtable credentials")
      return Response.json({ error: "Server configuration error" }, { status: 500 })
    }

    // Use Airtable REST API for batch deletion
    const deletedIds = []
    const failedIds = []

    // Process deletions in batches of 10 (Airtable limit)
    for (let i = 0; i < taskLogIds.length; i += 10) {
      const batch = taskLogIds.slice(i, i + 10)

      try {
        const deleteUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Onboarding%20Tasks%20Logs`
        const recordIds = batch.map((id) => `records[]=${id}`).join("&")

        const response = await fetch(`${deleteUrl}?${recordIds}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          throw new Error(`Airtable deletion error: ${response.statusText}`)
        }

        const result = await response.json()

        // Add successfully deleted IDs
        result.records.forEach((record) => {
          if (record.deleted) {
            deletedIds.push(record.id)
          } else {
            failedIds.push(record.id)
          }
        })
      } catch (error) {
        logger.error(`Error deleting batch of task logs:`, error)
        // Add all IDs in this batch to failed
        failedIds.push(...batch)
      }
    }

    // Log the deletion event
    logAuditEvent({
      eventType: "Task Log Deletion",
      eventStatus: failedIds.length === 0 ? "Success" : "Partial Success",
      userRole: userRole,
      userName,
      userIdentifier: userEmail,
      detailedMessage: `Admin deleted ${deletedIds.length} task logs${
        failedIds.length > 0 ? `, ${failedIds.length} failed` : ""
      }`,
      request,
    })

    return Response.json({
      success: true,
      message: `${deletedIds.length} task logs deleted successfully${
        failedIds.length > 0 ? `, ${failedIds.length} failed` : ""
      }`,
      deletedIds,
      failedIds,
    })
  } catch (error) {
    logger.error("Error in assigned-logs DELETE:", error)
    logAuditEvent({
      eventType: "Task Log Deletion",
      eventStatus: "Error",
      userRole: userRole || "Unknown",
      userName: userName || "Unknown",
      userIdentifier: userEmail,
      detailedMessage: `Error deleting task logs: ${error.message}`,
      request,
    })
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
