import { cookies } from "next/headers"
import { unsealData } from "iron-session"
import Airtable from "airtable"
import logger from "@/lib/utils/logger"
import { logAuditEvent } from "@/lib/auditLogger"

export async function DELETE(request) {
  let userEmail, userRole, userName

  try {
    const sessionCookie = (await cookies()).get("session")?.value
    if (!sessionCookie) {
      return Response.json({ error: "Unauthorised" }, { status: 401 })
    }

    let session
    try {
      session = await unsealData(sessionCookie, {
        password: process.env.SESSION_SECRET,
        ttl: 60 * 60 * 8,
      })
    } catch (err) {
      return Response.json({ error: "Invalid Session" }, { status: 401 })
    }

    if (!session.userEmail) {
      return Response.json({ error: "Invalid session format" }, { status: 401 })
    }

    userRole = session.userRole
    if (userRole !== "admin") {
      return Response.json({ error: "Unauthorised" }, { status: 403 })
    }

    userEmail = session.userEmail
    userName = session.userName

    const { taskIds } = await request.json()

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return Response.json({ error: "Invalid request: taskIds is required" }, { status: 400 })
    }

    const MAX_BULK_DELETE = 50
    if (taskIds.length > MAX_BULK_DELETE) {
      return Response.json(
        { error: `Cannot delete more than ${MAX_BULK_DELETE} records at once` },
        { status: 400 }
      )
    }

    const airtableIdPattern = /^rec[a-zA-Z0-9]{14}$/
    const invalidIds = taskIds.filter((id) => !airtableIdPattern.test(id))
    if (invalidIds.length > 0) {
      return Response.json({ error: "Invalid record ID format detected" }, { status: 400 })
    }

    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      logger.error("Server configuration error: Missing Airtable credentials")
      return Response.json({ error: "Server configuration error" }, { status: 500 })
    }

    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

    const deletedIds = []
    const failedIds = []

    for (const id of taskIds) {
      try {
        await base("Onboarding Tasks Logs").destroy(id)
        deletedIds.push(id)
      } catch (err) {
        logger.error(`Error deleting assigned task log ${id}:`, err)
        failedIds.push(id)
      }
    }

    logAuditEvent({
      eventType: "Bulk Assigned Task Deletion",
      eventStatus: failedIds.length === 0 ? "Success" : "Partial Success",
      userRole,
      userName,
      userIdentifier: userEmail,
      detailedMessage: `Deleted ${deletedIds.length} assigned task logs${failedIds.length ? `, ${failedIds.length} failed` : ""}`,
      request,
    })

    return Response.json({
      success: true,
      deletedIds,
      failedIds,
      deletedCount: deletedIds.length,
      failedCount: failedIds.length,
    })
  } catch (error) {
    logger.error("Error in bulk delete assigned tasks:", error)
    logAuditEvent({
      eventType: "Bulk Assigned Task Deletion",
      eventStatus: "Error",
      userRole: userRole || "Unknown",
      userName: userName || "Unknown",
      userIdentifier: userEmail,
      detailedMessage: `Error: ${error.message}`,
      request,
    })
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
