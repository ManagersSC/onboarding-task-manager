import { cookies } from "next/headers"
import logger from "@/lib/utils/logger"
import { unsealData } from "iron-session"
import Airtable from "airtable"
import { logAuditEvent } from "@/lib/auditLogger"

export async function GET(request) {
  let userEmail
  let userRole
  let userName
  try {
    // Session Cookie
    const sessionCookie = (await cookies()).get("session")?.value
    if (!sessionCookie) {
      logger.debug("API GET ACTIVITY: No sessionCookie")
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
          error: "invalid Session",
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

    // Get Filter Query Params
    const { searchParams } = new URL(request.url)
    const filter = searchParams.get("filter") || "all"
    const eventType = searchParams.get("eventType") || "all"
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const search = searchParams.get("search") || ""
    const page = Number.parseInt(searchParams.get("page") || "1", 10)
    const limit = Number.parseInt(searchParams.get("limit") || "15", 10)
    const offset = searchParams.get("offset") // For cursor-based pagination

    // Airtable
    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      logger.error("Server configuration error: Missing Airtable credentials")
      return Response.json({ error: "Server configuration error" }, { status: 500 })
    }

    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

    // Build filter formula based on the filter parameter
    const formulaParts = []

    // Role
    if (filter === "user") {
      formulaParts.push("{Role}='User'")
    } else if (filter === "admin") {
      formulaParts.push("{Role} = 'Admin'")
    }

    // Event Type
    if (eventType !== "all") {
      formulaParts.push(`{Event Type}='${eventType.replace("'", "\\'")}'`)
    }

    // Date Range
    if (startDate && endDate) {
      formulaParts.push(`IS_AFTER({Timestamp}, '${startDate}') & IS_BEFORE({Timestamp}, '${endDate}')`)
    } else if (startDate) {
      formulaParts.push(`IS_AFTER({Timestamp}, '${startDate}')`)
    } else if (endDate) {
      formulaParts.push(`IS_BEFORE({Timestamp}, '${endDate}')`)
    }

    // Search
    if (search) {
      formulaParts.push(
        `OR(
          FIND(LOWER('${search.toLowerCase()}'), LOWER({Name})) > 0,
          FIND(LOWER('${search.toLowerCase()}'), LOWER({User Identifier})) > 0,
          FIND(LOWER('${search.toLowerCase()}'), LOWER({Detailed Message})) > 0
        )`,
      )
    }

    const filterFormula = formulaParts.length > 0 ? formulaParts.join(" & ") : "TRUE()"

    // Query options
    const queryOptions = {
      maxRecords: limit,
      sort: [{ field: "Timestamp", direction: "desc" }],
      filterByFormula: filterFormula,
      fields: ["Timestamp", "Event Type", "Role", "Name", "Event Status", "User Identifier", "Detailed Message"],
    }

    // Add offset for pagination if provided
    if (offset) {
      queryOptions.offset = offset
    }

    // Get activities with pagination
    let activityRecords = []
    let nextOffset = null

    try {
      // Use firstPage instead of all() to respect pagination
      const response = await base("Website Audit Log").select(queryOptions).firstPage()
      activityRecords = response

      // Get the offset for the next page if available
      const airtableResponse = base("Website Audit Log")._lastResponse
      nextOffset = airtableResponse && airtableResponse.offset ? airtableResponse.offset : null
    } catch (error) {
      logger.error("Error fetching records from Airtable:", error)
      throw error
    }

    // Get total count for pagination info
    // Only do this if we're on the first page or if total count is explicitly requested
    let totalCount = 0
    if (page === 1 || searchParams.get("countTotal") === "true") {
      try {
        // Use a separate query to count total records
        const countQueryOptions = {
          filterByFormula: filterFormula,
          fields: ["ID"], // Minimal fields to reduce data transfer
        }

        // For large datasets, consider implementing an approximate count or caching
        const countResponse = await base("Website Audit Log").select(countQueryOptions).all()
        totalCount = countResponse.length
      } catch (error) {
        logger.error("Error counting total records:", error)
        // Continue with the request even if count fails
      }
    }

    logger.debug(`Activity records length: ${activityRecords.length}, total: ${totalCount}`)

    // Format activities for frontend
    const activities = activityRecords.map((record) => {
      const fields = record.fields
      const timestamp = new Date(fields.Timestamp)
      const now = new Date()

      // Calculate time ago
      const diffMs = now - timestamp
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMins / 60)
      const diffDays = Math.floor(diffHours / 24)

      let timeAgo
      if (diffDays > 0) {
        timeAgo = `${diffDays} day${diffDays > 1 ? "s" : ""} ago`
      } else if (diffHours > 0) {
        timeAgo = `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`
      } else if (diffMins > 0) {
        timeAgo = `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`
      } else {
        timeAgo = "Just now"
      }

      // Map event type to activity map
      let type
      switch (fields["Event Type"]) {
        case "Task Complete":
          type = "task_completed"
          break
        case "Sign Up":
          type = "signup"
          break
        case "Login":
          type = "login"
          break
        case "Logout":
          type = "logout"
          break
        case "Reset Password":
          type = "reset_password"
          break
        default:
          type = "other"
      }

      // Extract User Info
      userName = fields["Name"]
      const userIdentifier = fields["User Identifier"] || "Unknown"
      const isEmail = userIdentifier.includes("@")
      const activityRole = fields["Role"]

      if (!userName) {
        if (isEmail) {
          userName = userIdentifier.split("@")[0]
        }
      }

      return {
        type,
        description: fields["Detailed Message"] || "Activity recorded",
        timeAgo,
        timestamp: fields.Timestamp,
        status: fields["Event Status"],
        user: {
          email: isEmail ? userIdentifier : null,
          name: userName,
          role: activityRole,
        },
      }
    })

    return Response.json({
      activities,
      total: totalCount,
      page,
      limit,
      offset: nextOffset,
    })
  } catch (error) {
    logger.error("Error fetching admin activities: ", error)
    logAuditEvent({
      eventType: "Server",
      eventStatus: "Error",
      userRole: userRole || "Unknown",
      userIdentifier: userEmail,
      detailedMessage: `Admin activity fetch failed, error message: ${error.message}`,
      request,
    })
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
