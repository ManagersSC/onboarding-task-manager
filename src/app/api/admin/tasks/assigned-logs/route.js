import { cookies } from "next/headers"
import logger from "@/lib/logger"
import { unsealData } from "iron-session"
import Airtable from "airtable"
import { logAuditEvent } from "@/lib/auditLogger"

// Assigned Logs Route
export async function GET(request) {
  let userEmail
  let userRole
  let userName

  try {
    // Session Cookie
    const sessionCookie = (await cookies()).get("session")?.value
    if (!sessionCookie) {
      logger.debug("API GET ASSIGNED-LOGS: No sessionCookie")
      return Response.json({ error: "Unauthorised" }, { status: 401 })
    }

    let session
    try {
      session = await unsealData(sessionCookie, {
        password: process.env.SESSION_SECRET,
        ttl: 60 * 60 * 8,
      })
    } catch (error) {
      logger.debug(`Invalid session: ${error.message}`)
      return Response.json(
        {
          error: "Invalid Session",
          details: process.env.NODE_ENV === "development" ? error.message : null,
        },
        { status: 401 },
      )
    }

    if (!session.userEmail) {
      logger.debug(`Invalid session format`)
      return Response.json({ error: "Invalid session format" }, { status: 401 })
    }

    // Get Role
    userRole = session.userRole
    if (userRole !== "admin") {
      return Response.json({ error: "Unauthorised" }, { status: 401 })
    }

    userEmail = session.userEmail
    userName = session.userName

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") || ""
    const week = searchParams.get("week") || ""
    const day = searchParams.get("day") || ""
    const jobRole = searchParams.get("jobRole") || ""
    const startDate = searchParams.get("startDate") || ""
    const endDate = searchParams.get("endDate") || ""
    const sortBy = searchParams.get("sortBy") || "Created"
    const sortDirection = searchParams.get("sortDirection") || "desc"
    const page = Number.parseInt(searchParams.get("page") || "1", 10)
    const pageSize = Number.parseInt(searchParams.get("pageSize") || "10", 10)

    // Airtable setup
    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      logger.error("Server configuration error: Missing Airtable credentials")
      return Response.json({ error: "Server configuration error" }, { status: 500 })
    }

    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

    // Build filter formula
    const filterConditions = []

    if (search) {
      filterConditions.push(`OR(
        FIND(LOWER('${search.toLowerCase()}'), LOWER({Display Title})) > 0,
        FIND(LOWER('${search.toLowerCase()}'), LOWER({Folder Name})) > 0,
        FIND(LOWER('${search.toLowerCase()}'), LOWER({Applicant Name})) > 0
      )`)
    }

    if (status) {
      filterConditions.push(`{Status} = '${status}'`)
    }

    if (week) {
      filterConditions.push(`{Task Week Number} = '${week}'`)
    }

    if (day) {
      // For day, we need to check both the task day and the applicant day
      filterConditions.push(`{Task Day Number} = '${day}'`)
    }

    if (jobRole) {
      // Based on the Airtable schema, we can filter by the Job field
      // This field is available in the Onboarding Tasks Logs table via lookup
      filterConditions.push(`{Applicant Job} = '${jobRole}'`)
    }

    if (startDate) {
      filterConditions.push(`IS_AFTER({Created}, '${startDate}')`)
    }

    if (endDate) {
      filterConditions.push(`IS_BEFORE({Created}, '${endDate}')`)
    }

    const filterFormula = filterConditions.length > 0 ? filterConditions.join(" AND ") : ""

    // Map sortBy field to Airtable field name
    let sortField = "Created"
    switch (sortBy) {
      case "title":
        sortField = "Display Title"
        break
      case "status":
        sortField = "Status"
        break
      case "applicant":
        sortField = "Applicant Name"
        break
      case "week":
        sortField = "Task Week Number"
        break
      case "created":
      default:
        sortField = "Created"
        break
    }

    // Sort options
    const sortOptions = [
      {
        field: sortField,
        direction: sortDirection === "desc" ? "desc" : "asc",
      },
    ]

    // Query options
    const queryOptions = {
      pageSize,
      sort: sortOptions,
      filterByFormula: filterFormula,
    }

    // Add offset for pagination if we have a cursor from the client
    const clientCursor = searchParams.get("cursor")
    if (clientCursor) {
      queryOptions.offset = clientCursor
    }

    // Fetch tasks from Airtable with proper pagination
    let records = []
    let nextCursor = null
    let totalRecords = 0
    
    // Improved approach: Use a single query to get both the records and the total count
    // This is more efficient than running two separate queries
    try {
      // First, get the total count using a lightweight query
      const countQueryOptions = {
        filterByFormula: filterFormula,
        fields: ["id"], // Only fetch the ID field to minimize data transfer
        returnFieldsByFieldId: false,
      }
      
      try {
        const countResult = await base("Onboarding Tasks Logs").select(countQueryOptions).all()
        totalRecords = countResult.length
      } catch (countError) {
        logger.error("Error counting total records:", countError)
        totalRecords = 0 // Default to 0 if count fails
      }
      
      // Then fetch the current page of records
      await new Promise((resolve, reject) => {
        base("Onboarding Tasks Logs")
          .select(queryOptions)
          .eachPage(
            function page(pageRecords, fetchNextPage) {
              // This function gets called for each page of records
              records = pageRecords
              
              // Store the cursor for the next page - improved extraction method
              try {
                // First try to extract from the function's toString representation
                const fetchNextPageStr = fetchNextPage.toString()
                const offsetMatch = fetchNextPageStr.match(/"offset":"([^"]+)"/)
                
                if (offsetMatch && offsetMatch[1]) {
                  nextCursor = offsetMatch[1]
                } else {
                  // Fallback: Try to access the offset property directly
                  // This is a more reliable approach if available
                  const fetchNextPageObj = fetchNextPage
                  if (fetchNextPageObj && typeof fetchNextPageObj === 'object' && fetchNextPageObj.offset) {
                    nextCursor = fetchNextPageObj.offset
                  }
                }
                
                // If we still don't have a cursor, log a warning
                if (!nextCursor) {
                  logger.warn("Could not extract next cursor using available methods")
                }
              } catch (err) {
                logger.error("Error extracting next cursor:", err)
              }
              
              // We only need one page, so we're done
              resolve()
            },
            function done(err) {
              if (err) {
                logger.error("Error in Airtable pagination:", err)
                reject(err)
                return
              }
              resolve()
            }
          )
      })
    } catch (error) {
      logger.error("Error fetching task logs from Airtable:", error)
      throw error
    }

    // Format tasks for frontend
    const taskLogs = records.map((record) => {
      const fields = record.fields
      return {
        id: record.id,
        title: fields["Display Title"] || "Untitled Task",
        description: fields["Display Desc"] || "",
        status: fields["Status"] || "Assigned",
        applicantName: fields["Applicant Name"] || "",
        applicantEmail: fields["Applicant Email"] || "",
        week: fields["Task Week Number"] || "",
        folderName: fields["Folder Name"] || "",
        resourceUrl: fields["Display Resource Link"] || "",
        isCustom: fields["isCustom"] || false,
        urgency: fields["Urgency"] || "Medium",
        createdTime: fields["Created"] || record.createdTime,
        lastStatusChange: fields["Last Status Change Time"] || null,
      }
    })

    // Get status counts
    let statusCounts = {
      assigned: 0,
      completed: 0,
      overdue: 0,
      total: totalRecords,
    }

    try {
      const countByStatusOptions = {
        fields: ["Status"],
        returnFieldsByFieldId: false,
      }
      const statusRecords = await base("Onboarding Tasks Logs").select(countByStatusOptions).all()

      statusCounts = statusRecords.reduce(
        (counts, record) => {
          const status = record.fields["Status"]?.toLowerCase() || "assigned"
          counts[status] = (counts[status] || 0) + 1
          return counts
        },
        { assigned: 0, completed: 0, overdue: 0, total: statusRecords.length },
      )
    } catch (error) {
      logger.error("Error counting status records:", error)
      // Continue with the request even if count fails
    }

    // Log the successful request
    logAuditEvent({
      eventType: "Task Log Query",
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
        page,
        pageSize,
        totalRecords,
        totalPages: Math.ceil(totalRecords / pageSize),
        hasNextPage: !!nextCursor,
        nextCursor: nextCursor || null
      },
    })
  } catch (error) {
    logger.error("Error in assigned-logs API:", error)
    logAuditEvent({
      eventType: "Task Log Query",
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
  let userEmail
  let userRole
  let userName

  try {
    // Session Cookie
    const sessionCookie = (await cookies()).get("session")?.value
    if (!sessionCookie) {
      logger.debug("API DELETE ASSIGNED-LOGS: No sessionCookie")
      return Response.json({ error: "Unauthorised" }, { status: 401 })
    }

    let session
    try {
      session = await unsealData(sessionCookie, {
        password: process.env.SESSION_SECRET,
        ttl: 60 * 60 * 8,
      })
    } catch (error) {
      logger.debug(`Invalid session: ${error.message}`)
      return Response.json(
        {
          error: "Invalid Session",
          details: process.env.NODE_ENV === "development" ? error.message : null,
        },
        { status: 401 },
      )
    }

    if (!session.userEmail) {
      logger.debug(`Invalid session format`)
      return Response.json({ error: "Invalid session format" }, { status: 401 })
    }

    // Get Role
    userRole = session.userRole
    if (userRole !== "admin") {
      return Response.json({ error: "Unauthorised" }, { status: 401 })
    }

    userEmail = session.userEmail
    userName = session.userName

    // Parse request body
    const body = await request.json()
    const { taskLogIds } = body

    if (!taskLogIds || !Array.isArray(taskLogIds) || taskLogIds.length === 0) {
      return Response.json({ error: "Invalid request: taskLogIds is required" }, { status: 400 })
    }

    // Airtable setup
    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      logger.error("Server configuration error: Missing Airtable credentials")
      return Response.json({ error: "Server configuration error" }, { status: 500 })
    }

    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

    // Delete task logs
    const deletedIds = []
    const failedIds = []

    for (const taskLogId of taskLogIds) {
      try {
        await base("Onboarding Tasks Logs").destroy(taskLogId)
        deletedIds.push(taskLogId)
      } catch (error) {
        logger.error(`Error deleting task log ${taskLogId}:`, error)
        failedIds.push(taskLogId)
      }
    }

    // Log the deletion event
    logAuditEvent({
      eventType: "Task Log Deletion",
      eventStatus: failedIds.length === 0 ? "Success" : "Partial Success",
      userRole: userRole,
      userIdentifier: userEmail,
      userName,
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
    logger.error("Error in delete assigned-logs API:", error)
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
