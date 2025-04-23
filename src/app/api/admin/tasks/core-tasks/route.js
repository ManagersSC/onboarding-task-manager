import { cookies } from "next/headers"
import logger from "@/lib/logger"
import { unsealData } from "iron-session"
import Airtable from "airtable"
import { logAuditEvent } from "@/lib/auditLogger"

// Core Tasks Route
export async function GET(request) {
  let userEmail
  let userRole
  let userName

  try {
    // Session Cookie
    const sessionCookie = (await cookies()).get("session")?.value
    if (!sessionCookie) {
      logger.debug("API GET CORE-TASKS: No sessionCookie")
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
    const week = searchParams.get("week") || ""
    const day = searchParams.get("day") || ""
    const jobRole = searchParams.get("jobRole") || ""
    const sortBy = searchParams.get("sortBy") || "Task"
    const sortDirection = searchParams.get("sortDirection") === "desc" ? "desc" : "asc"
    const page = Number.parseInt(searchParams.get("page") || "1", 10)
    const pageSize = Number.parseInt(searchParams.get("pageSize") || "10", 10)
    const clientCursor = searchParams.get("cursor")

    // Airtable setup
    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      logger.error("Server configuration error: Missing Airtable credentials")
      return Response.json({ error: "Server configuration error" }, { status: 500 })
    }

    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

    // Build filter formula
    const filterConditions = []

    // Only get Core tasks
    filterConditions.push("{Task Function} = 'Core'")

    // Escape user input
    const safeSearch = search.replace(/'/g,"\\'").replace(/\n/g,' ')

    // This needs to include userEmail as well
    if (search) {
      filterConditions.push(`OR(
        FIND(LOWER("${safeSearch}"), LOWER({Task})) > 0,
        FIND(LOWER("${safeSearch}"), LOWER({Folder Name})) > 0
      )`)
    }

    if (week) {
      filterConditions.push(`{Week Number} = '${week}'`)
    }

    if (day) {
      filterConditions.push(`{Day Number} = '${day}'`)
    }

    if (jobRole) {
      filterConditions.push(`{Job} = '${jobRole}'`)
    }

    const filterFormula = filterConditions.length > 0 ? filterConditions.join(" AND ") : ""

    
    // Sort options
    const sortFieldMap = { createdTime: "Created Time" }
    const sortField = sortFieldMap[sortBy] ?? sortBy
    const sortOptions = [
      {
        field: sortField,
        direction: sortDirection,
      },
    ]

    // Query options
    const queryOptions = {
      pageSize,
      sort: sortOptions,
      filterByFormula: filterFormula,
    }
    
    // Add offset for pagination if we have a cursor from the client
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
        fields: ["Task"],
        returnFieldsByFieldId: false,
      }
      
      try {
        const countResult = await base("Onboarding Tasks").select(countQueryOptions).all()
        totalRecords = countResult.length
      } catch (countError) {
        logger.error("Error counting total records:", countError)
        totalRecords = 0 // Default to 0 if count fails
      }
      
      // Then fetch the current page of records
      await new Promise((resolve, reject) => {
        base("Onboarding Tasks")
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
      logger.error("Error fetching tasks from Airtable:", error)
      throw error
    }

    // Log the raw records for debugging
    console.log("Raw Airtable records:", records.map(r => r.fields));
    
    // Format tasks for frontend
    const tasks = records.map(record => {
      // Log each record's fields for debugging
      console.log("Record fields:", record.fields);
      
      return {
        id: record.id,
        title:        record.fields["Task"] || record.get("Task") || "Untitled Task",
        description:  record.fields["Task Body"] || record.get("Task Body") || "",
        week:         record.fields["Week Number"] || record.get("Week Number") || "",
        day:          record.fields["Day Number"] || record.get("Day Number") || "",
        folderName:   record.fields["Folder Name"] || record.get("Folder Name") || "",
        type:         record.fields["Type"] || record.get("Type") || "",
        taskFunction: record.fields["Task Function"] || record.get("Task Function") || "Core",
        job:          record.fields["Job"] || record.get("Job") || "",
        location:     record.fields["Location"] || record.get("Location") || "",
        resourceUrl:  record.fields["Link"] || record.get("Link") || "",
        createdTime:  record.fields["Created Time"] || record.get("Created Time") || "",
      };
    });
    
    // Log the formatted tasks for debugging
    console.log("Formatted tasks:", tasks);

    return Response.json({
      tasks,
      pagination: {
        page,
        pageSize,
        totalRecords,
        totalPages: Math.ceil(totalRecords / pageSize),
        hasNextPage: !!nextCursor,
        nextCursor: nextCursor || null
      }
    })
  } catch (error) {
    logger.error("Error in core-tasks API:", error)
    logAuditEvent({
      eventType: "Task Page Query",
      eventStatus: "Error",
      userRole: userRole || "Unknown",
      userName: userName || "unknown",
      userIdentifier: userEmail,
      detailedMessage: `Error fetching core tasks: ${error.message}`,
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
      logger.debug("API DELETE CORE-TASKS: No sessionCookie")
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
    const { taskIds } = body

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return Response.json({ error: "Invalid request: taskIds is required" }, { status: 400 })
    }

    // Airtable setup
    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      logger.error("Server configuration error: Missing Airtable credentials")
      return Response.json({ error: "Server configuration error" }, { status: 500 })
    }

    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

    // Delete tasks
    const deletedIds = []
    const failedIds = []

    for (const taskId of taskIds) {
      try {
        await base("Onboarding Tasks").destroy(taskId)
        deletedIds.push(taskId)
      } catch (error) {
        logger.error(`Error deleting task ${taskId}:`, error)
        failedIds.push(taskId)
      }
    }

    // Log the deletion event
    logAuditEvent({
      eventType: "Task Deletion",
      eventStatus: failedIds.length === 0 ? "Success" : "Partial Success",
      userRole: userRole,
      userName,
      userIdentifier: userEmail,
      detailedMessage: `Admin deleted ${deletedIds.length} core tasks${
        failedIds.length > 0 ? `, ${failedIds.length} failed` : ""
      }`,
      request,
    })

    return Response.json({
      success: true,
      message: `${deletedIds.length} tasks deleted successfully${
        failedIds.length > 0 ? `, ${failedIds.length} failed` : ""
      }`,
      deletedIds,
      failedIds,
    })
  } catch (error) {
    logger.error("Error in delete core-tasks API:", error)
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
